import { Injectable } from '@nestjs/common';
import type { Campaign } from '../../../story/campaigns/campaigns.schema.js';
import { CampaignsService } from '../../../story/campaigns/campaigns.service.js';
import { createCampaignSchema } from '../../../story/campaigns/dto/create-campaign.dto.js';
import { SystemsService } from '../../../system/systems/systems.service.js';
import type {
  PlaySession,
  SessionEntry,
} from '../../../story/play-sessions/play-sessions.schema.js';
import { PlaySessionsService } from '../../../story/play-sessions/play-sessions.service.js';
import { StructuresService } from '../../../model/structures/structures.service.js';
import { TagsService } from '../../../model/tags/tags.service.js';
import { AgentRunner } from '../../runtime/agent-runner.js';
import { AiService } from '../../settings/ai.service.js';
import { describeSystem } from '../../context/describe.js';
import { describeProfile } from '../../context/genre-kits.js';
import { WorldsService } from '../../../world/worlds/worlds.service.js';
import { PROMPT } from './arc-start.prompt.js';

const OUTPUT = {
  name: 'submit_campaign',
  description: 'Submits the campaign.',
  input: createCampaignSchema,
};

export interface CampaignStart {
  campaign: Campaign;
  session: PlaySession;
  opening: SessionEntry;
}

@Injectable()
export class ArcStartFlow {
  constructor(
    private readonly aiService: AiService,
    private readonly systemsService: SystemsService,
    private readonly structuresService: StructuresService,
    private readonly tagsService: TagsService,
    private readonly worldsService: WorldsService,
    private readonly campaignsService: CampaignsService,
    private readonly playSessionsService: PlaySessionsService,
    private readonly runner: AgentRunner,
  ) {}

  async run(userId: string, systemId: string): Promise<CampaignStart> {
    await this.systemsService.ensureOwner(userId, systemId);

    const [credentials, system, world, structures, fieldTags] =
      await Promise.all([
        this.aiService.credentialsOf(userId),
        this.systemsService.findOne(userId, systemId),
        this.worldsService.find(userId, systemId),
        this.structuresService.findAll(userId, systemId),
        this.tagsService.findFieldTags(userId, systemId),
      ]);

    const draft = await this.runner.submit(
      credentials,
      [
        { role: 'system', content: PROMPT },
        {
          role: 'user',
          content: [
            describeSystem(system, structures, fieldTags),
            describeProfile(world?.profile ?? null),
          ]
            .filter((part) => part !== null)
            .join('\n\n'),
        },
      ],
      OUTPUT,
    );

    const campaign = await this.campaignsService.replace(
      userId,
      systemId,
      draft,
    );
    const folder = await this.playSessionsService.createFolder(
      userId,
      systemId,
      { name: campaign.title },
    );
    const session = await this.playSessionsService.createSession(
      userId,
      systemId,
      { folderId: folder.id },
    );
    const opening = await this.playSessionsService.createAiNarration(
      session.id,
      campaign.brief.opening,
    );

    return { campaign, session, opening };
  }
}
