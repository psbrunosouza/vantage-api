import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, asc, eq, inArray, ne } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { users } from '../auth/auth.schema.js';
import { DATABASE } from '../database/database.module.js';
import { systemMembers } from '../systems/systems.schema.js';
import { SystemsService } from '../systems/systems.service.js';
import { resources } from '../resources/resources.schema.js';
import { structures } from '../structures/structures.schema.js';
import { hasActorsTag } from '../tags/actors.js';
import type { SetMemberResourcesDto } from './dto/set-member-resources.dto.js';
import { memberResources } from './members.schema.js';

export interface Member {
  userId: string;
  name: string;
  image: string | null;
  color: string;
  resourceIds: string[];
}

@Injectable()
export class MembersService {
  constructor(
    @Inject(DATABASE) private readonly db: NodePgDatabase,
    private readonly systemsService: SystemsService,
  ) {}

  async findAll(userId: string, systemId: string): Promise<Member[]> {
    await this.systemsService.ensureVisible(userId, systemId);

    const [members, controlled] = await Promise.all([
      this.db
        .select({
          userId: systemMembers.userId,
          name: users.name,
          image: users.image,
          color: systemMembers.color,
        })
        .from(systemMembers)
        .innerJoin(users, eq(users.id, systemMembers.userId))
        .where(eq(systemMembers.systemId, systemId))
        .orderBy(asc(systemMembers.createdAt)),
      this.db
        .select({
          userId: memberResources.userId,
          resourceId: memberResources.resourceId,
        })
        .from(memberResources)
        .where(eq(memberResources.systemId, systemId))
        .orderBy(asc(memberResources.createdAt)),
    ]);

    return members.map((member) => ({
      ...member,
      resourceIds: controlled
        .filter((entry) => entry.userId === member.userId)
        .map((entry) => entry.resourceId),
    }));
  }

  async setResources(
    userId: string,
    systemId: string,
    memberId: string,
    dto: SetMemberResourcesDto,
  ): Promise<{ resourceIds: string[] }> {
    const system = await this.systemsService.ensureVisible(userId, systemId);

    if (
      userId !== memberId &&
      userId !== system.ownerId &&
      userId !== system.narratorId
    ) {
      throw new ForbiddenException({
        code: 'SHEETS_FORBIDDEN',
        message:
          "Only the narrator or the owner can change another player's sheets.",
      });
    }

    const resourceIds = [...new Set(dto.resourceIds)];

    await this.db.transaction(async (tx) => {
      const [member] = await tx
        .select({ userId: systemMembers.userId })
        .from(systemMembers)
        .where(
          and(
            eq(systemMembers.systemId, systemId),
            eq(systemMembers.userId, memberId),
          ),
        );

      if (!member)
        throw new NotFoundException({
          code: 'MEMBER_NOT_FOUND',
          message: 'Member not found.',
        });

      if (resourceIds.length > 0) {
        const found = await tx
          .select({ id: resources.id, isActor: hasActorsTag(structures.id) })
          .from(resources)
          .innerJoin(structures, eq(structures.id, resources.structureId))
          .where(
            and(
              eq(structures.systemId, systemId),
              inArray(resources.id, resourceIds),
            ),
          );

        if (found.length !== resourceIds.length) {
          throw new NotFoundException({
            code: 'RESOURCE_NOT_FOUND',
            message: 'Resource not found.',
          });
        }

        if (found.some((resource) => !resource.isActor)) {
          throw new BadRequestException({
            code: 'ACTOR_SHEETS_ONLY',
            message: 'Only actor sheets can be controlled.',
          });
        }

        const taken = await tx
          .select({ resourceId: memberResources.resourceId })
          .from(memberResources)
          .where(
            and(
              inArray(memberResources.resourceId, resourceIds),
              ne(memberResources.userId, memberId),
            ),
          );

        if (taken.length > 0) {
          throw new ConflictException({
            code: 'SHEET_TAKEN',
            message: 'A sheet is already controlled by another player.',
          });
        }
      }

      await tx
        .delete(memberResources)
        .where(
          and(
            eq(memberResources.systemId, systemId),
            eq(memberResources.userId, memberId),
          ),
        );

      if (resourceIds.length > 0) {
        await tx.insert(memberResources).values(
          resourceIds.map((resourceId) => ({
            resourceId,
            systemId,
            userId: memberId,
          })),
        );
      }
    });

    return { resourceIds };
  }

  async ensureEditor(
    userId: string,
    systemId: string,
    resourceId: string,
  ): Promise<void> {
    const system = await this.systemsService.ensureVisible(userId, systemId);

    if (system.ownerId === userId) {
      return;
    }

    const [controlled] = await this.db
      .select({ resourceId: memberResources.resourceId })
      .from(memberResources)
      .where(
        and(
          eq(memberResources.resourceId, resourceId),
          eq(memberResources.systemId, systemId),
          eq(memberResources.userId, userId),
        ),
      );

    if (!controlled) {
      throw new ForbiddenException({
        code: 'SHEET_EDIT_FORBIDDEN',
        message:
          'Only the owner or the player controlling this sheet can change it.',
      });
    }
  }
}
