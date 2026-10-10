import { randomBytes } from 'node:crypto';
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { users } from '../auth/auth.schema.js';
import { DATABASE } from '../database/database.module.js';
import {
  type System,
  systemMembers,
  systems,
} from '../systems/systems.schema.js';
import { SystemsService } from '../systems/systems.service.js';
import { pickMemberColor } from '../systems/member-colors.js';

const CODE_BYTES = 9;

export interface InvitePreview {
  systemId: string;
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
    private readonly systemsService: SystemsService,
  ) {}

  async codeOf(userId: string, systemId: string): Promise<{ code: string }> {
    await this.systemsService.ensureOwner(userId, systemId);

    const [system] = await this.db
      .select({ inviteCode: systems.inviteCode })
      .from(systems)
      .where(eq(systems.id, systemId));

    if (system.inviteCode) {
      return { code: system.inviteCode };
    }

    const code = randomBytes(CODE_BYTES).toString('base64url');
    await this.db
      .update(systems)
      .set({ inviteCode: code })
      .where(eq(systems.id, systemId));

    return { code };
  }

  async preview(userId: string, code: string): Promise<InvitePreview> {
    const [found] = await this.db
      .select({
        systemId: systems.id,
        name: systems.name,
        initials: systems.initials,
        icon: systems.icon,
        color: systems.color,
        avatarUrl: systems.avatarUrl,
        ownerName: users.name,
      })
      .from(systems)
      .innerJoin(users, eq(users.id, systems.ownerId))
      .where(eq(systems.inviteCode, code));

    if (!found)
      throw new NotFoundException({
        code: 'INVITE_NOT_FOUND',
        message: 'Invite not found.',
      });

    return {
      ...found,
      member: await this.isMember(found.systemId, userId),
    };
  }

  async accept(userId: string, code: string): Promise<System> {
    const [system] = await this.db
      .select()
      .from(systems)
      .where(eq(systems.inviteCode, code));

    if (!system)
      throw new NotFoundException({
        code: 'INVITE_NOT_FOUND',
        message: 'Invite not found.',
      });

    await this.db.transaction(async (tx) => {
      const members = await tx
        .select({ userId: systemMembers.userId, color: systemMembers.color })
        .from(systemMembers)
        .where(eq(systemMembers.systemId, system.id));

      if (members.some((member) => member.userId === userId)) {
        return;
      }

      await tx.insert(systemMembers).values({
        systemId: system.id,
        userId,
        color: pickMemberColor(members.map((member) => member.color)),
      });
    });

    return system;
  }

  private async isMember(systemId: string, userId: string): Promise<boolean> {
    const [member] = await this.db
      .select({ userId: systemMembers.userId })
      .from(systemMembers)
      .where(
        and(
          eq(systemMembers.systemId, systemId),
          eq(systemMembers.userId, userId),
        ),
      );
    return member !== undefined;
  }
}
