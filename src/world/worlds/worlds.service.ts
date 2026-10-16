import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DATABASE } from '../../core/database/database.module.js';
import { SystemsService } from '../../system/systems/systems.service.js';
import type { ReplaceWorldDto } from './dto/replace-world.dto.js';
import { type World, worlds } from './worlds.schema.js';

@Injectable()
export class WorldsService {
  constructor(
    @Inject(DATABASE) private readonly db: NodePgDatabase,
    private readonly systemsService: SystemsService,
  ) {}

  async find(userId: string, systemId: string): Promise<World | null> {
    await this.systemsService.ensureVisible(userId, systemId);

    const [world] = await this.db
      .select()
      .from(worlds)
      .where(eq(worlds.systemId, systemId));

    return world ?? null;
  }

  async replace(
    userId: string,
    systemId: string,
    dto: ReplaceWorldDto,
  ): Promise<World> {
    await this.systemsService.ensureOwner(userId, systemId);

    const [world] = await this.db
      .insert(worlds)
      .values({ ...dto, systemId })
      .onConflictDoUpdate({
        target: worlds.systemId,
        set: { ...dto, updatedAt: new Date() },
      })
      .returning();

    return world;
  }
}
