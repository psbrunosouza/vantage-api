import { Module } from '@nestjs/common';
import { CampaignsModule } from '../campaigns/campaigns.module.js';
import { JourneysModule } from '../journeys/journeys.module.js';
import { MembersModule } from '../members/members.module.js';
import { PlaySessionsModule } from '../play-sessions/play-sessions.module.js';
import { ResourcesModule } from '../resources/resources.module.js';
import { StructuresModule } from '../structures/structures.module.js';
import { AgentRunner } from './agent-runner.js';
import { AiKeyCipher } from './ai-key.cipher.js';
import { AiController } from './ai.controller.js';
import { AiService } from './ai.service.js';
import { CampaignOptionsFlow } from './flows/campaign-options.flow.js';
import { CharacterDraftFlow } from './flows/character-draft.flow.js';
import { NarrationFlow } from './flows/narration.flow.js';
import { OpenRouterClient } from './openrouter.client.js';

@Module({
  imports: [
    JourneysModule,
    StructuresModule,
    ResourcesModule,
    MembersModule,
    PlaySessionsModule,
    CampaignsModule,
  ],
  controllers: [AiController],
  providers: [
    AiService,
    AiKeyCipher,
    OpenRouterClient,
    AgentRunner,
    CampaignOptionsFlow,
    CharacterDraftFlow,
    NarrationFlow,
  ],
  exports: [AiService],
})
export class AiModule {}
