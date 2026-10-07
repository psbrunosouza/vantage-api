import { BadRequestException, Injectable } from '@nestjs/common';
import { CampaignsService } from '../../campaigns/campaigns.service.js';
import { JourneysService } from '../../journeys/journeys.service.js';
import { MembersService } from '../../members/members.service.js';
import type { SessionEntry } from '../../play-sessions/play-sessions.schema.js';
import { PlaySessionsService } from '../../play-sessions/play-sessions.service.js';
import { ResourcesService } from '../../resources/resources.service.js';
import { StructuresService } from '../../structures/structures.service.js';
import { AgentRunner } from '../agent-runner.js';
import { AiService } from '../ai.service.js';
import { describeCampaign } from '../journey-context.js';
import type { ChatMessage } from '../openrouter.client.js';
import { listCharactersTool } from '../tools/list-characters.tool.js';
import { readSheetTool } from '../tools/read-sheet.tool.js';

const HISTORY = 30;

const PROMPT = [
  'You are the narrator of a solo tabletop RPG session in Vantage, where the user invents the rule system.',
  'Describe the world, the NPCs and the consequences of what the player does.',
  "Never decide what the player's character does, says or feels.",
  'Before mentioning an attribute of a character, read the sheet with read_sheet. Never invent stats.',
  'Keep each reply to two to four short paragraphs.',
  'End by giving the turn back to the player.',
  'Stay consistent with the campaign below.',
  'Write in the language the player uses. Before the player speaks, use the language of the campaign.',
].join('\n');

const OPENING =
  'Open the session: set the first scene, bring the player character into it and present the hook.';

const CONTINUE = 'Continue the scene.';

@Injectable()
export class NarrationFlow {
  constructor(
    private readonly aiService: AiService,
    private readonly journeysService: JourneysService,
    private readonly campaignsService: CampaignsService,
    private readonly playSessionsService: PlaySessionsService,
    private readonly structuresService: StructuresService,
    private readonly resourcesService: ResourcesService,
    private readonly membersService: MembersService,
    private readonly runner: AgentRunner,
  ) {}

  async run(
    userId: string,
    journeyId: string,
    sessionId: string,
  ): Promise<SessionEntry> {
    await this.journeysService.ensureOwner(userId, journeyId);

    const [credentials, journey, campaign, entries] = await Promise.all([
      this.aiService.credentialsOf(userId),
      this.journeysService.findOne(userId, journeyId),
      this.campaignsService.find(userId, journeyId),
      this.playSessionsService.findEntries(userId, journeyId, sessionId),
    ]);

    if (!journey.aiNarrator) {
      throw new BadRequestException({
        code: 'AI_NOT_NARRATOR',
        message: "The AI doesn't narrate this journey.",
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
          `Journey: ${journey.name}. ${journey.description ?? ''}`,
          describeCampaign(campaign),
        ].join('\n\n'),
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
      listCharactersTool(source, userId, journeyId),
      readSheetTool(source, userId, journeyId),
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
