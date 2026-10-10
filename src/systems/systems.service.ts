import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, asc, eq, inArray, or } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { AvatarService } from '../avatar/avatar.service.js';
import { DATABASE } from '../database/database.module.js';
import type { ImageFile } from '../storage/image-storage.service.js';
import type { CreateSystemDto } from './dto/create-system.dto.js';
import type { UpdateSystemDto } from './dto/update-system.dto.js';
import { type System, systemMembers, systems } from './systems.schema.js';
import { pickMemberColor } from './member-colors.js';

type Transaction = Parameters<Parameters<NodePgDatabase['transaction']>[0]>[0];

@Injectable()
export class SystemsService {
  constructor(
    @Inject(DATABASE) private readonly db: NodePgDatabase,
    private readonly avatarService: AvatarService,
  ) {}

  findAll(userId: string): Promise<System[]> {
    return this.db
      .select()
      .from(systems)
      .where(this.visibleTo(userId))
      .orderBy(asc(systems.createdAt));
  }

  async create(ownerId: string, dto: CreateSystemDto): Promise<System> {
    return this.db.transaction((tx) => this.insert(tx, ownerId, dto));
  }

  async insert(
    tx: Transaction,
    ownerId: string,
    dto: CreateSystemDto,
  ): Promise<System> {
    const [system] = await tx
      .insert(systems)
      .values({
        ...dto,
        ownerId,
        narratorId: dto.aiNarrator ? null : ownerId,
      })
      .returning();
    await tx.insert(systemMembers).values({
      systemId: system.id,
      userId: ownerId,
      color: pickMemberColor([]),
    });
    return system;
  }

  async update(
    userId: string,
    id: string,
    dto: UpdateSystemDto,
  ): Promise<System> {
    await this.ensureOwner(userId, id);

    if (dto.narratorId && dto.aiNarrator) {
      throw new BadRequestException({
        code: 'NARRATOR_CONFLICT',
        message: 'Choose either a narrator or the AI narrator.',
      });
    }

    if (dto.narratorId) {
      const [member] = await this.db
        .select({ userId: systemMembers.userId })
        .from(systemMembers)
        .where(
          and(
            eq(systemMembers.systemId, id),
            eq(systemMembers.userId, dto.narratorId),
          ),
        );

      if (!member) {
        throw new BadRequestException({
          code: 'NARRATOR_NOT_MEMBER',
          message: 'The narrator must be in the system.',
        });
      }
    }

    const [system] = await this.db
      .update(systems)
      .set({
        ...dto,
        ...(dto.aiNarrator ? { narratorId: null } : {}),
        ...(dto.aiNarrator === false && dto.narratorId === undefined
          ? { narratorId: userId }
          : {}),
        ...(dto.narratorId ? { aiNarrator: false } : {}),
      })
      .where(eq(systems.id, id))
      .returning();
    return system;
  }

  async replaceAvatar(
    userId: string,
    id: string,
    file: ImageFile | undefined,
  ): Promise<{ avatarUrl: string }> {
    await this.ensureOwner(userId, id);
    const avatarUrl = await this.avatarService.replace(
      `systems/${id}`,
      file,
      (url) =>
        this.db
          .update(systems)
          .set({ avatarUrl: url })
          .where(eq(systems.id, id)),
    );
    return { avatarUrl };
  }

  async remove(userId: string, id: string): Promise<void> {
    await this.ensureOwner(userId, id);
    await this.db.delete(systems).where(eq(systems.id, id));
  }

  async findOne(userId: string, id: string): Promise<System> {
    const [system] = await this.db
      .select()
      .from(systems)
      .where(and(eq(systems.id, id), this.visibleTo(userId)));

    if (!system)
      throw new NotFoundException({
        code: 'SYSTEM_NOT_FOUND',
        message: 'System not found.',
      });
    return system;
  }

  async ensureVisible(
    userId: string,
    id: string,
  ): Promise<{ ownerId: string; narratorId: string | null }> {
    const [system] = await this.db
      .select({ ownerId: systems.ownerId, narratorId: systems.narratorId })
      .from(systems)
      .where(and(eq(systems.id, id), this.visibleTo(userId)));

    if (!system)
      throw new NotFoundException({
        code: 'SYSTEM_NOT_FOUND',
        message: 'System not found.',
      });
    return system;
  }

  async ensureOwner(userId: string, id: string): Promise<void> {
    const system = await this.ensureVisible(userId, id);
    if (system.ownerId !== userId) {
      throw new ForbiddenException({
        code: 'OWNER_ONLY',
        message: 'Only the owner can change this system.',
      });
    }
  }

  private visibleTo(userId: string) {
    return or(
      eq(systems.ownerId, userId),
      inArray(
        systems.id,
        this.db
          .select({ systemId: systemMembers.systemId })
          .from(systemMembers)
          .where(eq(systemMembers.userId, userId)),
      ),
    );
  }
}
