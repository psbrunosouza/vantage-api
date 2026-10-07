import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import {
  type CreateCampaignDto,
  createCampaignSchema,
} from '../../campaigns/dto/create-campaign.dto.js';
import { JourneysService } from '../../journeys/journeys.service.js';
import { AgentRunner } from '../agent-runner.js';
import { AiService } from '../ai.service.js';
import type { CampaignOptionsDto } from '../dto/campaign-options.dto.js';

const PROMPT = [
  'You design campaign worlds for Vantage.',
  'Create three short campaign concepts with radically different premises.',
  'Invent every concept from scratch.',
  'Focus on bold, fun and surprising worlds with strong central ideas.',
  'Each concept should create interesting situations, conflicts, discoveries and choices.',
  'The three concepts must feel completely unrelated to each other.',
  'Do not define the playable entity yet.',
  'Write everything in Brazilian Portuguese.',
].join('\n');

const OUTPUT = {
  name: 'submit_campaigns',
  description: 'Submits the three campaign options.',
  input: z.object({ campaigns: z.array(createCampaignSchema).length(3) }),
};

@Injectable()
export class CampaignOptionsFlow {
  constructor(
    private readonly aiService: AiService,
    private readonly journeysService: JourneysService,
    private readonly runner: AgentRunner,
  ) {}

  async run(
    userId: string,
    journeyId: string,
    dto: CampaignOptionsDto,
  ): Promise<CreateCampaignDto[]> {
    await this.journeysService.ensureOwner(userId, journeyId);

    const credentials = await this.aiService.credentialsOf(userId);
    const { campaigns } = await this.runner.submit(
      credentials,
      [
        { role: 'system', content: PROMPT },
        {
          role: 'user',
          content: [
            'Create the three campaigns.',
            dto.direction ? `Player direction: ${dto.direction}` : null,
            dto.moods?.length ? `Moods: ${dto.moods.join(', ')}` : null,
          ]
            .filter((part) => part !== null)
            .join('\n\n'),
        },
      ],
      OUTPUT,
    );

    return campaigns;
  }
}
