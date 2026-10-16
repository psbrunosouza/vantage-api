import { Module } from '@nestjs/common';
import { CampaignsModule } from '../story/campaigns/campaigns.module.js';
import { CatalogModule } from '../onboarding/catalog/catalog.module.js';
import { SystemsModule } from '../system/systems/systems.module.js';
import { MembersModule } from '../system/members/members.module.js';
import { PlaySessionsModule } from '../story/play-sessions/play-sessions.module.js';
import { ResourcesModule } from '../model/resources/resources.module.js';
import { StructuresModule } from '../model/structures/structures.module.js';
import { SystemDraftsModule } from '../onboarding/system-drafts/system-drafts.module.js';
import { TagsModule } from '../model/tags/tags.module.js';
import { WorldsModule } from '../world/worlds/worlds.module.js';
import { AgentRunner } from './runtime/agent-runner.js';
import { AiKeyCipher } from './settings/ai-key.cipher.js';
import { BuildingController } from './building/building.controller.js';
import { PlayController } from './play/play.controller.js';
import { AiSettingsController } from './settings/ai-settings.controller.js';
import { AiService } from './settings/ai.service.js';
import { ArcStartFlow } from './play/arc-start/arc-start.flow.js';
import { NarrationFlow } from './play/narration/narration.flow.js';
import { PopulationFlow } from './building/population/population.flow.js';
import { SessionZeroFlow } from './building/session-zero/session-zero.flow.js';
import { StructuresFlow } from './building/structures/structures.flow.js';
import { PitchesFlow } from './building/pitches/pitches.flow.js';
import { DraftPitchesFlow } from './building/pitches/draft-pitches.flow.js';
import { OpenRouterClient } from './runtime/openrouter.client.js';
import { WorldSources } from './context/world-source.js';

@Module({
  imports: [
    SystemsModule,
    StructuresModule,
    TagsModule,
    ResourcesModule,
    MembersModule,
    PlaySessionsModule,
    CampaignsModule,
    CatalogModule,
    SystemDraftsModule,
    WorldsModule,
  ],
  controllers: [AiSettingsController, BuildingController, PlayController],
  providers: [
    AiService,
    AiKeyCipher,
    OpenRouterClient,
    AgentRunner,
    PitchesFlow,
    ArcStartFlow,
    NarrationFlow,
    StructuresFlow,
    PopulationFlow,
    SessionZeroFlow,
    DraftPitchesFlow,
    WorldSources,
  ],
  exports: [AiService],
})
export class AiModule {}
