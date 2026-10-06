import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import {
  type CreateCampaignDto,
  createCampaignSchema,
} from '../../campaigns/dto/create-campaign.dto.js';
import { JourneysService } from '../../journeys/journeys.service.js';
import { StructuresService } from '../../structures/structures.service.js';
import { AgentRunner } from '../agent-runner.js';
import { AiService } from '../ai.service.js';
import { describeJourney } from '../journey-context.js';

const PROMPT = [
  'You design campaigns for a solo tabletop RPG played in Vantage, where the user invents the rule system.',
  'Create three distinct campaigns that fit the journey: different conflicts, places and stakes.',
  'Each premise is a pitch of two or three sentences. Each brief gives the narrator what it needs to run the story.',
  'Use only concepts that fit the journey and its structures.',
  'Write in the language of the journey name and description.',
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
    private readonly structuresService: StructuresService,
    private readonly runner: AgentRunner,
  ) {}

  async run(userId: string, journeyId: string): Promise<CreateCampaignDto[]> {
    await this.journeysService.ensureOwner(userId, journeyId);

    const [credentials, journey, structures] = await Promise.all([
      this.aiService.credentialsOf(userId),
      this.journeysService.findOne(userId, journeyId),
      this.structuresService.findAll(userId, journeyId),
    ]);
    const { campaigns } = await this.runner.submit(
      credentials,
      [
        { role: 'system', content: PROMPT },
        { role: 'user', content: describeJourney(journey, structures) },
      ],
      OUTPUT,
    );

    return campaigns;
  }
}
