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
import type { CreateJourneyDto } from './dto/create-journey.dto.js';
import type { UpdateJourneyDto } from './dto/update-journey.dto.js';
import {
  type Journey,
  journeyMembers,
  journeys,
} from './journeys.schema.js';
import { pickMemberColor } from './member-colors.js';

@Injectable()
export class JourneysService {
  constructor(
    @Inject(DATABASE) private readonly db: NodePgDatabase,
    private readonly avatarService: AvatarService,
  ) {}

  findAll(userId: string): Promise<Journey[]> {
    return this.db
      .select()
      .from(journeys)
      .where(this.visibleTo(userId))
      .orderBy(asc(journeys.createdAt));
  }

  async create(ownerId: string, dto: CreateJourneyDto): Promise<Journey> {
    return this.db.transaction(async (tx) => {
      const [journey] = await tx
        .insert(journeys)
        .values({ ...dto, ownerId, narratorId: ownerId })
        .returning();
      await tx.insert(journeyMembers).values({
        journeyId: journey.id,
        userId: ownerId,
        color: pickMemberColor([]),
      });
      return journey;
    });
  }

  async update(
    userId: string,
    id: string,
    dto: UpdateJourneyDto,
  ): Promise<Journey> {
    await this.ensureOwner(userId, id);

    if (dto.narratorId) {
      const [member] = await this.db
        .select({ userId: journeyMembers.userId })
        .from(journeyMembers)
        .where(
          and(
            eq(journeyMembers.journeyId, id),
            eq(journeyMembers.userId, dto.narratorId),
          ),
        );

      if (!member) {
        throw new BadRequestException('The narrator must be in the journey.');
      }
    }

    const [journey] = await this.db
      .update(journeys)
      .set(dto)
      .where(eq(journeys.id, id))
      .returning();
    return journey;
  }

  async replaceAvatar(
    userId: string,
    id: string,
    file: ImageFile | undefined,
  ): Promise<{ avatarUrl: string }> {
    await this.ensureOwner(userId, id);
    const avatarUrl = await this.avatarService.replace(
      `journeys/${id}`,
      file,
      (url) =>
        this.db
          .update(journeys)
          .set({ avatarUrl: url })
          .where(eq(journeys.id, id)),
    );
    return { avatarUrl };
  }

  async remove(userId: string, id: string): Promise<void> {
    await this.ensureOwner(userId, id);
    await this.db.delete(journeys).where(eq(journeys.id, id));
  }

  async ensureVisible(
    userId: string,
    id: string,
  ): Promise<{ ownerId: string; narratorId: string | null }> {
    const [journey] = await this.db
      .select({ ownerId: journeys.ownerId, narratorId: journeys.narratorId })
      .from(journeys)
      .where(and(eq(journeys.id, id), this.visibleTo(userId)));

    if (!journey) throw new NotFoundException('Journey not found.');
    return journey;
  }

  async ensureOwner(userId: string, id: string): Promise<void> {
    const journey = await this.ensureVisible(userId, id);
    if (journey.ownerId !== userId) {
      throw new ForbiddenException('Only the owner can change this journey.');
    }
  }

  private visibleTo(userId: string) {
    return or(
      eq(journeys.ownerId, userId),
      inArray(
        journeys.id,
        this.db
          .select({ journeyId: journeyMembers.journeyId })
          .from(journeyMembers)
          .where(eq(journeyMembers.userId, userId)),
      ),
    );
  }
}
