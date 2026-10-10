import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, asc, count, eq, isNull, min } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DATABASE } from '../database/database.module.js';
import { SystemsService } from '../systems/systems.service.js';
import { memberResources } from '../members/members.schema.js';
import { resources } from '../resources/resources.schema.js';
import { structures } from '../structures/structures.schema.js';
import { hasActorsTag } from '../tags/actors.js';
import type { ArrangeSessionTreeDto } from './dto/arrange-session-tree.dto.js';
import type { CreatePlaySessionDto } from './dto/create-play-session.dto.js';
import type { CreateSessionEntryDto } from './dto/create-session-entry.dto.js';
import type { CreateSessionFolderDto } from './dto/create-session-folder.dto.js';
import type { UpdatePlaySessionDto } from './dto/update-play-session.dto.js';
import type { UpdateSessionFolderDto } from './dto/update-session-folder.dto.js';
import {
  type PlaySession,
  type SessionEntry,
  type SessionFolder,
  playSessions,
  sessionEntries,
  sessionFolders,
} from './play-sessions.schema.js';

export interface SessionTree {
  folders: SessionFolder[];
  sessions: PlaySession[];
}

interface Placement {
  folderId: string | null;
  position: number;
}

@Injectable()
export class PlaySessionsService {
  constructor(
    @Inject(DATABASE) private readonly db: NodePgDatabase,
    private readonly systemsService: SystemsService,
  ) {}

  async findTree(userId: string, systemId: string): Promise<SessionTree> {
    await this.systemsService.ensureVisible(userId, systemId);
    return this.treeOf(systemId);
  }

  async createFolder(
    userId: string,
    systemId: string,
    dto: CreateSessionFolderDto,
  ): Promise<SessionFolder> {
    await this.systemsService.ensureOwner(userId, systemId);
    const [folder] = await this.db
      .insert(sessionFolders)
      .values({
        ...dto,
        systemId,
        position: await this.topPosition(systemId),
      })
      .returning();
    return folder;
  }

  async updateFolder(
    userId: string,
    systemId: string,
    id: string,
    dto: UpdateSessionFolderDto,
  ): Promise<SessionFolder> {
    await this.systemsService.ensureOwner(userId, systemId);
    const [folder] = await this.db
      .update(sessionFolders)
      .set(dto)
      .where(
        and(eq(sessionFolders.systemId, systemId), eq(sessionFolders.id, id)),
      )
      .returning();

    if (!folder)
      throw new NotFoundException({
        code: 'FOLDER_NOT_FOUND',
        message: 'Folder not found.',
      });
    return folder;
  }

  async removeFolder(
    userId: string,
    systemId: string,
    id: string,
  ): Promise<void> {
    await this.systemsService.ensureOwner(userId, systemId);
    await this.db.transaction(async (tx) => {
      await tx
        .delete(playSessions)
        .where(
          and(
            eq(playSessions.systemId, systemId),
            eq(playSessions.folderId, id),
          ),
        );
      const [folder] = await tx
        .delete(sessionFolders)
        .where(
          and(
            eq(sessionFolders.systemId, systemId),
            eq(sessionFolders.id, id),
          ),
        )
        .returning({ id: sessionFolders.id });

      if (!folder)
        throw new NotFoundException({
          code: 'FOLDER_NOT_FOUND',
          message: 'Folder not found.',
        });
    });
  }

  async createSession(
    userId: string,
    systemId: string,
    dto: CreatePlaySessionDto,
  ): Promise<PlaySession> {
    await this.systemsService.ensureOwner(userId, systemId);
    const folderId = dto.folderId ?? null;

    if (folderId !== null) {
      await this.ensureFolder(systemId, folderId);
    }

    const [{ total }] = await this.db
      .select({ total: count() })
      .from(playSessions)
      .where(eq(playSessions.systemId, systemId));
    const [session] = await this.db
      .insert(playSessions)
      .values({
        systemId,
        folderId,
        title: `Session ${total + 1}`,
        position:
          folderId === null
            ? await this.topPosition(systemId)
            : await this.folderTopPosition(folderId),
      })
      .returning();
    return session;
  }

  async updateSession(
    userId: string,
    systemId: string,
    id: string,
    dto: UpdatePlaySessionDto,
  ): Promise<PlaySession> {
    await this.systemsService.ensureOwner(userId, systemId);
    const [session] = await this.db
      .update(playSessions)
      .set(dto)
      .where(
        and(eq(playSessions.systemId, systemId), eq(playSessions.id, id)),
      )
      .returning();

    if (!session)
      throw new NotFoundException({
        code: 'SESSION_NOT_FOUND',
        message: 'Session not found.',
      });
    return session;
  }

  async removeSession(
    userId: string,
    systemId: string,
    id: string,
  ): Promise<void> {
    await this.systemsService.ensureOwner(userId, systemId);
    const [session] = await this.db
      .delete(playSessions)
      .where(
        and(eq(playSessions.systemId, systemId), eq(playSessions.id, id)),
      )
      .returning({ id: playSessions.id });

    if (!session)
      throw new NotFoundException({
        code: 'SESSION_NOT_FOUND',
        message: 'Session not found.',
      });
  }

  async arrange(
    userId: string,
    systemId: string,
    dto: ArrangeSessionTreeDto,
  ): Promise<SessionTree> {
    await this.systemsService.ensureOwner(userId, systemId);
    const current = await this.treeOf(systemId);

    const folderPositions = new Map<string, number>();
    const placements = new Map<string, Placement>();

    dto.items.forEach((item, position) => {
      if (item.kind === 'folder') {
        folderPositions.set(item.id, position);
        item.sessionIds.forEach((id, index) =>
          placements.set(id, { folderId: item.id, position: index }),
        );
      } else {
        placements.set(item.id, { folderId: null, position });
      }
    });

    const listed = dto.items.reduce(
      (total, item) =>
        total + 1 + (item.kind === 'folder' ? item.sessionIds.length : 0),
      0,
    );

    if (
      listed !== folderPositions.size + placements.size ||
      folderPositions.size !== current.folders.length ||
      placements.size !== current.sessions.length ||
      current.folders.some((folder) => !folderPositions.has(folder.id)) ||
      current.sessions.some((session) => !placements.has(session.id))
    ) {
      throw new BadRequestException({
        code: 'SESSION_LAYOUT_INVALID',
        message: 'Layout must list every folder and session once.',
      });
    }

    await this.db.transaction(async (tx) => {
      for (const folder of current.folders) {
        const position = folderPositions.get(folder.id);

        if (position !== undefined && position !== folder.position) {
          await tx
            .update(sessionFolders)
            .set({ position })
            .where(eq(sessionFolders.id, folder.id));
        }
      }

      for (const session of current.sessions) {
        const placement = placements.get(session.id);

        if (
          placement !== undefined &&
          (placement.folderId !== session.folderId ||
            placement.position !== session.position)
        ) {
          await tx
            .update(playSessions)
            .set(placement)
            .where(eq(playSessions.id, session.id));
        }
      }
    });

    return this.treeOf(systemId);
  }

  async findEntries(
    userId: string,
    systemId: string,
    sessionId: string,
  ): Promise<SessionEntry[]> {
    await this.systemsService.ensureVisible(userId, systemId);
    await this.ensureSession(systemId, sessionId);
    return this.db
      .select()
      .from(sessionEntries)
      .where(eq(sessionEntries.sessionId, sessionId))
      .orderBy(asc(sessionEntries.createdAt));
  }

  async createEntry(
    userId: string,
    systemId: string,
    sessionId: string,
    dto: CreateSessionEntryDto,
  ): Promise<SessionEntry> {
    const system = await this.systemsService.ensureVisible(userId, systemId);
    await this.ensureSession(systemId, sessionId);

    if (dto.kind === 'narrator') {
      if (system.narratorId !== userId) {
        throw new ForbiddenException({
          code: 'NARRATOR_ONLY',
          message: 'Only the narrator can narrate.',
        });
      }

      const [entry] = await this.db
        .insert(sessionEntries)
        .values({ sessionId, userId, kind: dto.kind, data: { text: dto.text } })
        .returning();
      return entry;
    }

    const [sheet] = await this.db
      .select({ name: resources.name, isActor: hasActorsTag(structures.id) })
      .from(memberResources)
      .innerJoin(resources, eq(resources.id, memberResources.resourceId))
      .innerJoin(structures, eq(structures.id, resources.structureId))
      .where(
        and(
          eq(memberResources.resourceId, dto.resourceId),
          eq(memberResources.systemId, systemId),
          eq(memberResources.userId, userId),
        ),
      );

    if (!sheet || !sheet.isActor) {
      throw new ForbiddenException({
        code: 'SHEET_NOT_CONTROLLED',
        message: 'You can only speak as an actor sheet you control.',
      });
    }

    const [entry] = await this.db
      .insert(sessionEntries)
      .values({
        sessionId,
        userId,
        kind: dto.kind,
        resourceId: dto.resourceId,
        data: { text: dto.text, name: sheet.name },
      })
      .returning();
    return entry;
  }

  async createAiNarration(
    sessionId: string,
    text: string,
  ): Promise<SessionEntry> {
    const [entry] = await this.db
      .insert(sessionEntries)
      .values({ sessionId, kind: 'narrator', source: 'ai', data: { text } })
      .returning();
    return entry;
  }

  private async ensureSession(
    systemId: string,
    sessionId: string,
  ): Promise<void> {
    const [session] = await this.db
      .select({ id: playSessions.id })
      .from(playSessions)
      .where(
        and(
          eq(playSessions.systemId, systemId),
          eq(playSessions.id, sessionId),
        ),
      );

    if (!session)
      throw new NotFoundException({
        code: 'SESSION_NOT_FOUND',
        message: 'Session not found.',
      });
  }

  private async ensureFolder(
    systemId: string,
    folderId: string,
  ): Promise<void> {
    const [folder] = await this.db
      .select({ id: sessionFolders.id })
      .from(sessionFolders)
      .where(
        and(
          eq(sessionFolders.systemId, systemId),
          eq(sessionFolders.id, folderId),
        ),
      );

    if (!folder)
      throw new NotFoundException({
        code: 'FOLDER_NOT_FOUND',
        message: 'Folder not found.',
      });
  }

  private async folderTopPosition(folderId: string): Promise<number> {
    const [{ top }] = await this.db
      .select({ top: min(playSessions.position) })
      .from(playSessions)
      .where(eq(playSessions.folderId, folderId));
    return top === null ? 0 : top - 1;
  }

  private async treeOf(systemId: string): Promise<SessionTree> {
    const [folders, sessions] = await Promise.all([
      this.db
        .select()
        .from(sessionFolders)
        .where(eq(sessionFolders.systemId, systemId))
        .orderBy(asc(sessionFolders.position), asc(sessionFolders.createdAt)),
      this.db
        .select()
        .from(playSessions)
        .where(eq(playSessions.systemId, systemId))
        .orderBy(asc(playSessions.position), asc(playSessions.createdAt)),
    ]);
    return { folders, sessions };
  }

  private async topPosition(systemId: string): Promise<number> {
    const [[folders], [sessions]] = await Promise.all([
      this.db
        .select({ top: min(sessionFolders.position) })
        .from(sessionFolders)
        .where(eq(sessionFolders.systemId, systemId)),
      this.db
        .select({ top: min(playSessions.position) })
        .from(playSessions)
        .where(
          and(
            eq(playSessions.systemId, systemId),
            isNull(playSessions.folderId),
          ),
        ),
    ]);
    const tops = [folders.top, sessions.top].filter((top) => top !== null);
    return tops.length > 0 ? Math.min(...tops) - 1 : 0;
  }
}
