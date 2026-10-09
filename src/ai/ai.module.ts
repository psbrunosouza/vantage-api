import { Module } from '@nestjs/common';
import { CampaignsModule } from '../campaigns/campaigns.module.js';
import { CatalogModule } from '../catalog/catalog.module.js';
import { JourneysModule } from '../journeys/journeys.module.js';
import { MembersModule } from '../members/members.module.js';
import { PlaySessionsModule } from '../play-sessions/play-sessions.module.js';
import { ResourcesModule } from '../resources/resources.module.js';
import { StructuresModule } from '../structures/structures.module.js';
import { AgentRunner } from './agent-runner.js';
import { AiKeyCipher } from './ai-key.cipher.js';
import { AiController } from './ai.controller.js';
import { AiService } from './ai.service.js';
import { CampaignStartFlow } from './flows/campaign-start.flow.js';
import { CharacterDraftFlow } from './flows/character-draft.flow.js';
import { CharacterOptionsFlow } from './flows/character-options.flow.js';
import { NarrationFlow } from './flows/narration.flow.js';
import { SystemOptionsFlow } from './flows/system-options.flow.js';
import { OpenRouterClient } from './openrouter.client.js';

@Module({
  imports: [
    JourneysModule,
    StructuresModule,
    ResourcesModule,
    MembersModule,
    PlaySessionsModule,
    CampaignsModule,
    CatalogModule,
  ],
  controllers: [AiController],
  providers: [
    AiService,
    AiKeyCipher,
    OpenRouterClient,
    AgentRunner,
    SystemOptionsFlow,
    CampaignStartFlow,
    CharacterOptionsFlow,
    CharacterDraftFlow,
    NarrationFlow,
  ],
  exports: [AiService],
})
export class AiModule {}
