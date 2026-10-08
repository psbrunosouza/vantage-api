import { Injectable } from '@nestjs/common';
import type { Campaign } from '../../campaigns/campaigns.schema.js';
import { CampaignsService } from '../../campaigns/campaigns.service.js';
import { createCampaignSchema } from '../../campaigns/dto/create-campaign.dto.js';
import { JourneysService } from '../../journeys/journeys.service.js';
import type {
  PlaySession,
  SessionEntry,
} from '../../play-sessions/play-sessions.schema.js';
import { PlaySessionsService } from '../../play-sessions/play-sessions.service.js';
import { StructuresService } from '../../structures/structures.service.js';
import { AgentRunner } from '../agent-runner.js';
import { AiService } from '../ai.service.js';
import { describeJourney } from '../journey-context.js';

const PROMPT = [
  'You write the campaign that starts a solo tabletop RPG played in Vantage.',
  'The campaign is one adventure set in a small part of the world of the journey, around the place where the story begins.',
  'It does not need to face the main villain or the greater conflict of the world. The world has problems of every size.',
  'The title is the name of the adventure: short, catchy and specific, something players would say out loud at the table. No vague poetic titles.',
  'Make it exciting: a strong hook, stakes that matter to the people there, a mystery or a twist, and clear things to do like explore, investigate, negotiate, fight or escape.',
  'Prefer action and curiosity over melancholy. Humor is welcome when it fits.',
  'Use concrete and vivid details: names, objects, customs, sounds and smells. No generic filler.',
  'Give the campaign a local theme and one central problem that drives the whole campaign.',
  'The central problem can escalate and comes with two or three related problems.',
  'Describe the place, its culture and people, its politics, and two to four NPCs with strong personalities, each with a role and a short description that makes them memorable.',
  'The hook is an intriguing event happening right now that connects the local story to the theme of the journey.',
  'The premise is a one or two sentence pitch: what is happening, why it is urgent and what makes it intriguing.',
  'The opening reads like the first page of a book chapter: two or three short paragraphs that show the surroundings and the event in motion, clear and without exaggeration.',
  'The tone is two or three adjectives separated by commas.',
  'Never mention the player character.',
  'Be creative but believable inside the world.',
  'Write in the language of the journey.',
].join('\n');

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
export class CampaignStartFlow {
  constructor(
    private readonly aiService: AiService,
    private readonly journeysService: JourneysService,
    private readonly structuresService: StructuresService,
    private readonly campaignsService: CampaignsService,
    private readonly playSessionsService: PlaySessionsService,
    private readonly runner: AgentRunner,
  ) {}

  async run(userId: string, journeyId: string): Promise<CampaignStart> {
    await this.journeysService.ensureOwner(userId, journeyId);

    const [credentials, journey, structures] = await Promise.all([
      this.aiService.credentialsOf(userId),
      this.journeysService.findOne(userId, journeyId),
      this.structuresService.findAll(userId, journeyId),
    ]);

    const draft = await this.runner.submit(
      credentials,
      [
        { role: 'system', content: PROMPT },
        { role: 'user', content: describeJourney(journey, structures) },
      ],
      OUTPUT,
    );

    const campaign = await this.campaignsService.replace(
      userId,
      journeyId,
      draft,
    );
    const folder = await this.playSessionsService.createFolder(
      userId,
      journeyId,
      { name: campaign.title },
    );
    const session = await this.playSessionsService.createSession(
      userId,
      journeyId,
      { folderId: folder.id },
    );
    const opening = await this.playSessionsService.createAiNarration(
      session.id,
      campaign.brief.opening,
    );

    return { campaign, session, opening };
  }
}
