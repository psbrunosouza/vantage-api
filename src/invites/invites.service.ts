import { randomBytes } from 'node:crypto';
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { users } from '../auth/auth.schema.js';
import { DATABASE } from '../database/database.module.js';
import {
  type Journey,
  journeyMembers,
  journeys,
} from '../journeys/journeys.schema.js';
import { JourneysService } from '../journeys/journeys.service.js';
import { pickMemberColor } from '../journeys/member-colors.js';

const CODE_BYTES = 9;

export interface InvitePreview {
  journeyId: string;
  name: string;
  initials: string;
  icon: string | null;
  color: string | null;
  avatarUrl: string | null;
  ownerName: string;
  member: boolean;
}

@Injectable()
export class InvitesService {
  constructor(
    @Inject(DATABASE) private readonly db: NodePgDatabase,
    private readonly journeysService: JourneysService,
  ) {}

  async codeOf(userId: string, journeyId: string): Promise<{ code: string }> {
    await this.journeysService.ensureOwner(userId, journeyId);

    const [journey] = await this.db
      .select({ inviteCode: journeys.inviteCode })
      .from(journeys)
      .where(eq(journeys.id, journeyId));

    if (journey.inviteCode) {
      return { code: journey.inviteCode };
    }

    const code = randomBytes(CODE_BYTES).toString('base64url');
    await this.db
      .update(journeys)
      .set({ inviteCode: code })
      .where(eq(journeys.id, journeyId));

    return { code };
  }

  async preview(userId: string, code: string): Promise<InvitePreview> {
    const [found] = await this.db
      .select({
        journeyId: journeys.id,
        name: journeys.name,
        initials: journeys.initials,
        icon: journeys.icon,
        color: journeys.color,
        avatarUrl: journeys.avatarUrl,
        ownerName: users.name,
      })
      .from(journeys)
      .innerJoin(users, eq(users.id, journeys.ownerId))
      .where(eq(journeys.inviteCode, code));

    if (!found)
      throw new NotFoundException({
        code: 'INVITE_NOT_FOUND',
        message: 'Invite not found.',
      });

    return {
      ...found,
      member: await this.isMember(found.journeyId, userId),
    };
  }

  async accept(userId: string, code: string): Promise<Journey> {
    const [journey] = await this.db
      .select()
      .from(journeys)
      .where(eq(journeys.inviteCode, code));

    if (!journey)
      throw new NotFoundException({
        code: 'INVITE_NOT_FOUND',
        message: 'Invite not found.',
      });

    await this.db.transaction(async (tx) => {
      const members = await tx
        .select({ userId: journeyMembers.userId, color: journeyMembers.color })
        .from(journeyMembers)
        .where(eq(journeyMembers.journeyId, journey.id));

      if (members.some((member) => member.userId === userId)) {
        return;
      }

      await tx.insert(journeyMembers).values({
        journeyId: journey.id,
        userId,
        color: pickMemberColor(members.map((member) => member.color)),
      });
    });

    return journey;
  }

  private async isMember(journeyId: string, userId: string): Promise<boolean> {
    const [member] = await this.db
      .select({ userId: journeyMembers.userId })
      .from(journeyMembers)
      .where(
        and(
          eq(journeyMembers.journeyId, journeyId),
          eq(journeyMembers.userId, userId),
        ),
      );
    return member !== undefined;
  }
}
