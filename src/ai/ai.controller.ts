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
  type SystemOptionsDto,
  systemOptionsSchema,
} from './dto/system-options.dto.js';
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
import { SystemOptionsFlow } from './flows/system-options.flow.js';

@ApiTags('ai')
@Controller('ai')
export class AiController {
  constructor(
    private readonly aiService: AiService,
    private readonly systemOptionsFlow: SystemOptionsFlow,
    private readonly campaignStartFlow: CampaignStartFlow,
    private readonly characterOptionsFlow: CharacterOptionsFlow,
    private readonly characterDraftFlow: CharacterDraftFlow,
    private readonly narrationFlow: NarrationFlow,
    private readonly structureProposalsFlow: StructureProposalsFlow,
    private readonly populationFlow: PopulationFlow,
    private readonly sessionZeroQuestionsFlow: SessionZeroQuestionsFlow,
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

  @Post('system-options')
  systemOptions(
    @Session() session: UserSession<Auth>,
    @Body(new ZodValidationPipe(systemOptionsSchema)) dto: SystemOptionsDto,
  ) {
    return this.systemOptionsFlow.run(session.user.id, dto);
  }

  @Post('journeys/:journeyId/campaign-start')
  campaignStart(
    @Session() session: UserSession<Auth>,
    @Param('journeyId', ParseUUIDPipe) journeyId: string,
  ) {
    return this.campaignStartFlow.run(session.user.id, journeyId);
  }

  @Post('journeys/:journeyId/structures')
  structureProposals(
    @Session() session: UserSession<Auth>,
    @Param('journeyId', ParseUUIDPipe) journeyId: string,
    @Body(new ZodValidationPipe(structureProposalsSchema))
    dto: StructureProposalsDto,
  ) {
    return this.structureProposalsFlow.run(session.user.id, journeyId, dto);
  }

  @Post('journeys/:journeyId/session-zero/questions')
  sessionZeroQuestions(
    @Session() session: UserSession<Auth>,
    @Param('journeyId', ParseUUIDPipe) journeyId: string,
  ) {
    return this.sessionZeroQuestionsFlow.run(session.user.id, journeyId);
  }

  @Post('journeys/:journeyId/population')
  population(
    @Session() session: UserSession<Auth>,
    @Param('journeyId', ParseUUIDPipe) journeyId: string,
    @Body(new ZodValidationPipe(populationSchema)) dto: PopulationDto,
  ) {
    return this.populationFlow.run(session.user.id, journeyId, dto);
  }

  @Post('journeys/:journeyId/character-options')
  characterOptions(
    @Session() session: UserSession<Auth>,
    @Param('journeyId', ParseUUIDPipe) journeyId: string,
  ) {
    return this.characterOptionsFlow.run(session.user.id, journeyId);
  }

  @Post('journeys/:journeyId/character-draft')
  characterDraft(
    @Session() session: UserSession<Auth>,
    @Param('journeyId', ParseUUIDPipe) journeyId: string,
    @Body(new ZodValidationPipe(characterDraftSchema)) dto: CharacterDraftDto,
  ) {
    return this.characterDraftFlow.run(session.user.id, journeyId, dto.concept);
  }

  @Post('journeys/:journeyId/play-sessions/:sessionId/narration')
  narrate(
    @Session() session: UserSession<Auth>,
    @Param('journeyId', ParseUUIDPipe) journeyId: string,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
  ) {
    return this.narrationFlow.run(session.user.id, journeyId, sessionId);
  }
}
