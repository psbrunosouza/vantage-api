import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DATABASE } from '../database/database.module.js';
import { JourneysService } from '../journeys/journeys.service.js';
import { type Campaign, campaigns } from './campaigns.schema.js';
import type { CreateCampaignDto } from './dto/create-campaign.dto.js';

@Injectable()
export class CampaignsService {
  constructor(
    @Inject(DATABASE) private readonly db: NodePgDatabase,
    private readonly journeysService: JourneysService,
  ) {}

  async find(userId: string, journeyId: string): Promise<Campaign | null> {
    await this.journeysService.ensureVisible(userId, journeyId);
    const [campaign] = await this.db
      .select()
      .from(campaigns)
      .where(eq(campaigns.journeyId, journeyId));
    return campaign ?? null;
  }

  async create(
    userId: string,
    journeyId: string,
    dto: CreateCampaignDto,
  ): Promise<Campaign> {
    await this.journeysService.ensureOwner(userId, journeyId);

    if (await this.find(userId, journeyId)) {
      throw new ConflictException({
        code: 'CAMPAIGN_EXISTS',
        message: 'This journey already has a campaign.',
      });
    }

    const [campaign] = await this.db
      .insert(campaigns)
      .values({ ...dto, journeyId })
      .returning();
    return campaign;
  }

  async replace(
    userId: string,
    journeyId: string,
    dto: CreateCampaignDto,
  ): Promise<Campaign> {
    await this.journeysService.ensureOwner(userId, journeyId);

    const [campaign] = await this.db
      .insert(campaigns)
      .values({ ...dto, journeyId })
      .onConflictDoUpdate({
        target: campaigns.journeyId,
        set: { ...dto, updatedAt: new Date() },
      })
      .returning();
    return campaign;
  }
}
