import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DATABASE } from '../database/database.module.js';
import { SystemsService } from '../systems/systems.service.js';
import { type Campaign, campaigns } from './campaigns.schema.js';
import type { CreateCampaignDto } from './dto/create-campaign.dto.js';

@Injectable()
export class CampaignsService {
  constructor(
    @Inject(DATABASE) private readonly db: NodePgDatabase,
    private readonly systemsService: SystemsService,
  ) {}

  async find(userId: string, systemId: string): Promise<Campaign | null> {
    await this.systemsService.ensureVisible(userId, systemId);
    const [campaign] = await this.db
      .select()
      .from(campaigns)
      .where(eq(campaigns.systemId, systemId));
    return campaign ?? null;
  }

  async create(
    userId: string,
    systemId: string,
    dto: CreateCampaignDto,
  ): Promise<Campaign> {
    await this.systemsService.ensureOwner(userId, systemId);

    if (await this.find(userId, systemId)) {
      throw new ConflictException({
        code: 'CAMPAIGN_EXISTS',
        message: 'This system already has a campaign.',
      });
    }

    const [campaign] = await this.db
      .insert(campaigns)
      .values({ ...dto, systemId })
      .returning();
    return campaign;
  }

  async replace(
    userId: string,
    systemId: string,
    dto: CreateCampaignDto,
  ): Promise<Campaign> {
    await this.systemsService.ensureOwner(userId, systemId);

    const [campaign] = await this.db
      .insert(campaigns)
      .values({ ...dto, systemId })
      .onConflictDoUpdate({
        target: campaigns.systemId,
        set: { ...dto, updatedAt: new Date() },
      })
      .returning();
    return campaign;
  }
}
