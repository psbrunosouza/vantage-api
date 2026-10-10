import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Session, type UserSession } from '@thallesp/nestjs-better-auth';
import type { Auth } from '../auth/auth.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { AiService } from './ai.service.js';
import {
  type CharacterDraftDto,
  characterDraftSchema,
} from './dto/character-draft.dto.js';
import { type PopulationDto, populationSchema } from './dto/population.dto.js';
import {
  type StructureProposalsDto,
  structureProposalsSchema,
} from './dto/structure-proposals.dto.js';
import {
  type CampaignOptionsDto,
  campaignOptionsSchema,
} from './dto/campaign-options.dto.js';
import {
  type UpdateAiSettingsDto,
  updateAiSettingsSchema,
} from './dto/update-ai-settings.dto.js';
import { CampaignStartFlow } from './flows/campaign-start.flow.js';
import { CharacterDraftFlow } from './flows/character-draft.flow.js';
import { CharacterOptionsFlow } from './flows/character-options.flow.js';
import { NarrationFlow } from './flows/narration.flow.js';
import { PopulationFlow } from './flows/population.flow.js';
import { SessionZeroQuestionsFlow } from './flows/session-zero-questions.flow.js';
import { StructureProposalsFlow } from './flows/structure-proposals.flow.js';
import { CampaignOptionsFlow } from './flows/campaign-options.flow.js';
import { SystemWorldsFlow } from './flows/system-worlds.flow.js';
import { WorldSources } from './world-source.js';

@ApiTags('ai')
@Controller('ai')
export class AiController {
  constructor(
    private readonly aiService: AiService,
    private readonly campaignOptionsFlow: CampaignOptionsFlow,
    private readonly campaignStartFlow: CampaignStartFlow,
    private readonly characterOptionsFlow: CharacterOptionsFlow,
    private readonly characterDraftFlow: CharacterDraftFlow,
    private readonly narrationFlow: NarrationFlow,
    private readonly structureProposalsFlow: StructureProposalsFlow,
    private readonly populationFlow: PopulationFlow,
    private readonly sessionZeroQuestionsFlow: SessionZeroQuestionsFlow,
    private readonly systemWorldsFlow: SystemWorldsFlow,
    private readonly worldSources: WorldSources,
  ) {}

  @Get('models')
  listModels() {
    return this.aiService.listModels();
  }

  @Get('settings')
  findSettings(@Session() session: UserSession<Auth>) {
    return this.aiService.findSettings(session.user.id);
  }

  @Put('settings')
  updateSettings(
    @Session() session: UserSession<Auth>,
    @Body(new ZodValidationPipe(updateAiSettingsSchema))
    dto: UpdateAiSettingsDto,
  ) {
    return this.aiService.updateSettings(session.user.id, dto);
  }

  @Delete('settings/key')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeKey(@Session() session: UserSession<Auth>) {
    return this.aiService.removeKey(session.user.id);
  }

  @Post('campaign-options')
  campaignOptions(
    @Session() session: UserSession<Auth>,
    @Body(new ZodValidationPipe(campaignOptionsSchema)) dto: CampaignOptionsDto,
  ) {
    return this.campaignOptionsFlow.run(session.user.id, dto);
  }

  @Post('system-drafts/:draftId/worlds')
  systemWorlds(
    @Session() session: UserSession<Auth>,
    @Param('draftId', ParseUUIDPipe) draftId: string,
    @Body(new ZodValidationPipe(campaignOptionsSchema)) dto: CampaignOptionsDto,
  ) {
    return this.systemWorldsFlow.run(session.user.id, draftId, dto);
  }

  @Post('systems/:systemId/campaign-start')
  campaignStart(
    @Session() session: UserSession<Auth>,
    @Param('systemId', ParseUUIDPipe) systemId: string,
  ) {
    return this.campaignStartFlow.run(session.user.id, systemId);
  }

  @Post('systems/:systemId/structures')
  async structureProposals(
    @Session() session: UserSession<Auth>,
    @Param('systemId', ParseUUIDPipe) systemId: string,
    @Body(new ZodValidationPipe(structureProposalsSchema))
    dto: StructureProposalsDto,
  ) {
    const userId = session.user.id;
    const source = await this.worldSources.ofSystem(userId, systemId);
    return this.structureProposalsFlow.run(userId, source, dto);
  }

  @Post('system-drafts/:draftId/structures')
  async draftStructureProposals(
    @Session() session: UserSession<Auth>,
    @Param('draftId', ParseUUIDPipe) draftId: string,
    @Body(new ZodValidationPipe(structureProposalsSchema))
    dto: StructureProposalsDto,
  ) {
    const userId = session.user.id;
    const source = await this.worldSources.ofDraft(userId, draftId);
    return this.structureProposalsFlow.run(userId, source, dto);
  }

  @Post('systems/:systemId/session-zero/questions')
  async sessionZeroQuestions(
    @Session() session: UserSession<Auth>,
    @Param('systemId', ParseUUIDPipe) systemId: string,
  ) {
    const userId = session.user.id;
    const source = await this.worldSources.ofSystem(userId, systemId);
    return this.sessionZeroQuestionsFlow.run(userId, source);
  }

  @Post('system-drafts/:draftId/session-zero/questions')
  async draftSessionZeroQuestions(
    @Session() session: UserSession<Auth>,
    @Param('draftId', ParseUUIDPipe) draftId: string,
  ) {
    const userId = session.user.id;
    const source = await this.worldSources.ofDraft(userId, draftId);
    return this.sessionZeroQuestionsFlow.run(userId, source);
  }

  @Post('systems/:systemId/population')
  async population(
    @Session() session: UserSession<Auth>,
    @Param('systemId', ParseUUIDPipe) systemId: string,
    @Body(new ZodValidationPipe(populationSchema)) dto: PopulationDto,
  ) {
    const userId = session.user.id;
    const source = await this.worldSources.ofSystem(userId, systemId);
    return this.populationFlow.run(userId, source, dto);
  }

  @Post('system-drafts/:draftId/population')
  async draftPopulation(
    @Session() session: UserSession<Auth>,
    @Param('draftId', ParseUUIDPipe) draftId: string,
    @Body(new ZodValidationPipe(populationSchema)) dto: PopulationDto,
  ) {
    const userId = session.user.id;
    const source = await this.worldSources.ofDraft(userId, draftId);
    return this.populationFlow.run(userId, source, dto);
  }

  @Post('systems/:systemId/character-options')
  async characterOptions(
    @Session() session: UserSession<Auth>,
    @Param('systemId', ParseUUIDPipe) systemId: string,
  ) {
    const userId = session.user.id;
    const source = await this.worldSources.ofSystem(userId, systemId);
    return this.characterOptionsFlow.run(userId, source);
  }

  @Post('system-drafts/:draftId/character-options')
  async draftCharacterOptions(
    @Session() session: UserSession<Auth>,
    @Param('draftId', ParseUUIDPipe) draftId: string,
  ) {
    const userId = session.user.id;
    const source = await this.worldSources.ofDraft(userId, draftId);
    return this.characterOptionsFlow.run(userId, source);
  }

  @Post('systems/:systemId/character-draft')
  async characterDraft(
    @Session() session: UserSession<Auth>,
    @Param('systemId', ParseUUIDPipe) systemId: string,
    @Body(new ZodValidationPipe(characterDraftSchema)) dto: CharacterDraftDto,
  ) {
    const userId = session.user.id;
    const source = await this.worldSources.ofSystem(userId, systemId);
    return this.characterDraftFlow.run(userId, source, dto.concept);
  }

  @Post('system-drafts/:draftId/character-draft')
  async draftCharacterDraft(
    @Session() session: UserSession<Auth>,
    @Param('draftId', ParseUUIDPipe) draftId: string,
    @Body(new ZodValidationPipe(characterDraftSchema)) dto: CharacterDraftDto,
  ) {
    const userId = session.user.id;
    const source = await this.worldSources.ofDraft(userId, draftId);
    return this.characterDraftFlow.run(userId, source, dto.concept);
  }

  @Post('systems/:systemId/play-sessions/:sessionId/narration')
  narrate(
    @Session() session: UserSession<Auth>,
    @Param('systemId', ParseUUIDPipe) systemId: string,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
  ) {
    return this.narrationFlow.run(session.user.id, systemId, sessionId);
  }
}
