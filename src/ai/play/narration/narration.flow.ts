import { BadRequestException, Injectable } from '@nestjs/common';
import { CampaignsService } from '../../../story/campaigns/campaigns.service.js';
import { SystemsService } from '../../../system/systems/systems.service.js';
import { MembersService } from '../../../system/members/members.service.js';
import type { SessionEntry } from '../../../story/play-sessions/play-sessions.schema.js';
import { PlaySessionsService } from '../../../story/play-sessions/play-sessions.service.js';
import { ResourcesService } from '../../../model/resources/resources.service.js';
import { StructuresService } from '../../../model/structures/structures.service.js';
import { AgentRunner } from '../../runtime/agent-runner.js';
import { AiService } from '../../settings/ai.service.js';
import { describeCampaign, describeMoods } from '../../context/describe.js';
import { describeProfile } from '../../context/genre-kits.js';
import { WorldsService } from '../../../world/worlds/worlds.service.js';
import type { ChatMessage } from '../../runtime/openrouter.client.js';
import { listCharactersTool } from '../tools/list-characters.tool.js';
import { readSheetTool } from '../tools/read-sheet.tool.js';
import { PROMPT, OPENING, CONTINUE } from './narration.prompt.js';

const HISTORY = 30;

@Injectable()
export class NarrationFlow {
  constructor(
    private readonly aiService: AiService,
    private readonly systemsService: SystemsService,
    private readonly campaignsService: CampaignsService,
    private readonly playSessionsService: PlaySessionsService,
    private readonly structuresService: StructuresService,
    private readonly resourcesService: ResourcesService,
    private readonly membersService: MembersService,
    private readonly worldsService: WorldsService,
    private readonly runner: AgentRunner,
  ) {}

  async run(
    userId: string,
    systemId: string,
    sessionId: string,
  ): Promise<SessionEntry> {
    await this.systemsService.ensureOwner(userId, systemId);

    const [credentials, system, world, campaign, entries] = await Promise.all([
      this.aiService.credentialsOf(userId),
      this.systemsService.findOne(userId, systemId),
      this.worldsService.find(userId, systemId),
      this.campaignsService.find(userId, systemId),
      this.playSessionsService.findEntries(userId, systemId, sessionId),
    ]);

    if (!system.aiNarrator) {
      throw new BadRequestException({
        code: 'AI_NOT_NARRATOR',
        message: "The AI doesn't narrate this system.",
      });
    }

    if (!campaign) {
      throw new BadRequestException({
        code: 'CAMPAIGN_MISSING',
        message: 'Choose a campaign first.',
      });
    }

    const history = entries.slice(-HISTORY).map(messageOf);
    const last = history.at(-1);
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: [
          PROMPT,
          `System: ${system.name}. ${system.description ?? ''}`,
          describeMoods(system.moods),
          describeProfile(world?.profile ?? null),
          describeCampaign(campaign),
        ]
          .filter((part) => part !== null)
          .join('\n\n'),
      },
      ...history,
    ];

    if (last === undefined) {
      messages.push({ role: 'user', content: OPENING });
    } else if (last.role === 'assistant') {
      messages.push({ role: 'user', content: CONTINUE });
    }

    const source = {
      structures: this.structuresService,
      resources: this.resourcesService,
      members: this.membersService,
    };
    const text = await this.runner.reply(credentials, messages, [
      listCharactersTool(source, userId, systemId),
      readSheetTool(source, userId, systemId),
    ]);

    return this.playSessionsService.createAiNarration(sessionId, text);
  }
}

function messageOf(entry: SessionEntry): ChatMessage {
  if (entry.source === 'ai') {
    return { role: 'assistant', content: entry.data.text };
  }

  return {
    role: 'user',
    content:
      entry.kind === 'player'
        ? `${entry.data.name ?? 'Player'}: ${entry.data.text}`
        : `[Narrator] ${entry.data.text}`,
  };
}
