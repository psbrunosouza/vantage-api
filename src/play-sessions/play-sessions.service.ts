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
import { JourneysService } from '../journeys/journeys.service.js';
import { memberResources } from '../members/members.schema.js';
import { ACTOR, resources } from '../resources/resources.schema.js';
import type { ArrangeSessionTreeDto } from './dto/arrange-session-tree.dto.js';
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
    private readonly journeysService: JourneysService,
  ) {}

  async findTree(userId: string, journeyId: string): Promise<SessionTree> {
    await this.journeysService.ensureVisible(userId, journeyId);
    return this.treeOf(journeyId);
  }

  async createFolder(
    userId: string,
    journeyId: string,
    dto: CreateSessionFolderDto,
  ): Promise<SessionFolder> {
    await this.journeysService.ensureOwner(userId, journeyId);
    const [folder] = await this.db
      .insert(sessionFolders)
      .values({
        ...dto,
        journeyId,
        position: await this.topPosition(journeyId),
      })
      .returning();
    return folder;
  }

  async updateFolder(
    userId: string,
    journeyId: string,
    id: string,
    dto: UpdateSessionFolderDto,
  ): Promise<SessionFolder> {
    await this.journeysService.ensureOwner(userId, journeyId);
    const [folder] = await this.db
      .update(sessionFolders)
      .set(dto)
      .where(
        and(eq(sessionFolders.journeyId, journeyId), eq(sessionFolders.id, id)),
      )
      .returning();

    if (!folder) throw new NotFoundException('Folder not found.');
    return folder;
  }

  async createSession(userId: string, journeyId: string): Promise<PlaySession> {
    await this.journeysService.ensureOwner(userId, journeyId);
    const [{ total }] = await this.db
      .select({ total: count() })
      .from(playSessions)
      .where(eq(playSessions.journeyId, journeyId));
    const [session] = await this.db
      .insert(playSessions)
      .values({
        journeyId,
        title: `Session ${total + 1}`,
        position: await this.topPosition(journeyId),
      })
      .returning();
    return session;
  }

  async updateSession(
    userId: string,
    journeyId: string,
    id: string,
    dto: UpdatePlaySessionDto,
  ): Promise<PlaySession> {
    await this.journeysService.ensureOwner(userId, journeyId);
    const [session] = await this.db
      .update(playSessions)
      .set(dto)
      .where(
        and(eq(playSessions.journeyId, journeyId), eq(playSessions.id, id)),
      )
      .returning();

    if (!session) throw new NotFoundException('Session not found.');
    return session;
  }

  async arrange(
    userId: string,
    journeyId: string,
    dto: ArrangeSessionTreeDto,
  ): Promise<SessionTree> {
    await this.journeysService.ensureOwner(userId, journeyId);
    const current = await this.treeOf(journeyId);

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
      throw new BadRequestException(
        'Layout must list every folder and session once.',
      );
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

    return this.treeOf(journeyId);
  }

  async findEntries(
    userId: string,
    journeyId: string,
    sessionId: string,
  ): Promise<SessionEntry[]> {
    await this.journeysService.ensureVisible(userId, journeyId);
    await this.ensureSession(journeyId, sessionId);
    return this.db
      .select()
      .from(sessionEntries)
      .where(eq(sessionEntries.sessionId, sessionId))
      .orderBy(asc(sessionEntries.createdAt));
  }

  async createEntry(
    userId: string,
    journeyId: string,
    sessionId: string,
    dto: CreateSessionEntryDto,
  ): Promise<SessionEntry> {
    const journey = await this.journeysService.ensureVisible(userId, journeyId);
    await this.ensureSession(journeyId, sessionId);

    if (dto.kind === 'narrator') {
      if (journey.narratorId !== userId) {
        throw new ForbiddenException('Only the narrator can narrate.');
      }

      const [entry] = await this.db
        .insert(sessionEntries)
        .values({ sessionId, userId, kind: dto.kind, data: { text: dto.text } })
        .returning();
      return entry;
    }

    const [sheet] = await this.db
      .select({ name: resources.name, capability: resources.capability })
      .from(memberResources)
      .innerJoin(resources, eq(resources.id, memberResources.resourceId))
      .where(
        and(
          eq(memberResources.resourceId, dto.resourceId),
          eq(memberResources.journeyId, journeyId),
          eq(memberResources.userId, userId),
        ),
      );

    if (!sheet || sheet.capability !== ACTOR) {
      throw new ForbiddenException(
        'You can only speak as an actor sheet you control.',
      );
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

  private async ensureSession(
    journeyId: string,
    sessionId: string,
  ): Promise<void> {
    const [session] = await this.db
      .select({ id: playSessions.id })
      .from(playSessions)
      .where(
        and(
          eq(playSessions.journeyId, journeyId),
          eq(playSessions.id, sessionId),
        ),
      );

    if (!session) throw new NotFoundException('Session not found.');
  }

    private async treeOf(journeyId: string): Promise<SessionTree> {
    const [folders, sessions] = await Promise.all([
      this.db
        .select()
        .from(sessionFolders)
        .where(eq(sessionFolders.journeyId, journeyId))
        .orderBy(asc(sessionFolders.position), asc(sessionFolders.createdAt)),
      this.db
        .select()
        .from(playSessions)
        .where(eq(playSessions.journeyId, journeyId))
        .orderBy(asc(playSessions.position), asc(playSessions.createdAt)),
    ]);
    return { folders, sessions };
  }

  private async topPosition(journeyId: string): Promise<number> {
    const [[folders], [sessions]] = await Promise.all([
      this.db
        .select({ top: min(sessionFolders.position) })
        .from(sessionFolders)
        .where(eq(sessionFolders.journeyId, journeyId)),
      this.db
        .select({ top: min(playSessions.position) })
        .from(playSessions)
        .where(
          and(
            eq(playSessions.journeyId, journeyId),
            isNull(playSessions.folderId),
          ),
        ),
    ]);
    const tops = [folders.top, sessions.top].filter((top) => top !== null);
    return tops.length > 0 ? Math.min(...tops) - 1 : 0;
  }
}
