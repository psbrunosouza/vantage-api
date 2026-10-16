import {
  Body,
  Controller,
  Param,
  ParseUUIDPipe,
  Post,
  Res,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Session, type UserSession } from '@thallesp/nestjs-better-auth';
import type { Response } from 'express';
import type { Auth } from '../../core/auth/auth.js';
import { localeOf } from '../../core/auth/locales.js';
import { closedSignal } from '../../core/common/closed-signal.js';
import { streamLines } from '../../core/common/ndjson.js';
import { ZodValidationPipe } from '../../core/common/zod-validation.pipe.js';
import {
  type PopulationDto,
  populationSchema,
} from './population/population.dto.js';
import {
  type StructureProposalsDto,
  structureProposalsSchema,
} from './structures/structure-proposals.dto.js';
import {
  type CampaignOptionsDto,
  campaignOptionsSchema,
} from './pitches/campaign-options.dto.js';
import { PopulationFlow } from './population/population.flow.js';
import { SessionZeroFlow } from './session-zero/session-zero.flow.js';
import { StructuresFlow } from './structures/structures.flow.js';
import { PitchesFlow } from './pitches/pitches.flow.js';
import { DraftPitchesFlow } from './pitches/draft-pitches.flow.js';
import { WorldSources } from '../context/world-source.js';

@ApiTags('ai')
@Controller('ai')
export class BuildingController {
  constructor(
    private readonly pitchesFlow: PitchesFlow,
    private readonly structuresFlow: StructuresFlow,
    private readonly populationFlow: PopulationFlow,
    private readonly sessionZeroFlow: SessionZeroFlow,
    private readonly draftPitchesFlow: DraftPitchesFlow,
    private readonly worldSources: WorldSources,
  ) {}

  @Post('campaign-options')
  campaignOptions(
    @Session() session: UserSession<Auth>,
    @Body(new ZodValidationPipe(campaignOptionsSchema)) dto: CampaignOptionsDto,
  ) {
    return this.pitchesFlow.run(
      session.user.id,
      dto,
      localeOf(session.user.locale),
    );
  }

  @Post('system-drafts/:draftId/worlds')
  async systemWorlds(
    @Session() session: UserSession<Auth>,
    @Param('draftId', ParseUUIDPipe) draftId: string,
    @Body(new ZodValidationPipe(campaignOptionsSchema)) dto: CampaignOptionsDto,
    @Res() response: Response,
  ): Promise<void> {
    const signal = closedSignal(response);
    await streamLines(response, (send) =>
      this.draftPitchesFlow.run(
        session.user.id,
        draftId,
        dto,
        localeOf(session.user.locale),
        send,
        signal,
      ),
    );
  }

  @Post('systems/:systemId/structures')
  async structureProposals(
    @Session() session: UserSession<Auth>,
    @Param('systemId', ParseUUIDPipe) systemId: string,
    @Body(new ZodValidationPipe(structureProposalsSchema))
    dto: StructureProposalsDto,
    @Res() response: Response,
  ): Promise<void> {
    const userId = session.user.id;
    const source = await this.worldSources.ofSystem(userId, systemId);
    const signal = closedSignal(response);
    await streamLines(response, (send) =>
      this.structuresFlow.run(
        userId,
        source,
        dto,
        localeOf(session.user.locale),
        send,
        signal,
      ),
    );
  }

  @Post('system-drafts/:draftId/structures')
  async draftStructureProposals(
    @Session() session: UserSession<Auth>,
    @Param('draftId', ParseUUIDPipe) draftId: string,
    @Body(new ZodValidationPipe(structureProposalsSchema))
    dto: StructureProposalsDto,
    @Res() response: Response,
  ): Promise<void> {
    const userId = session.user.id;
    const source = await this.worldSources.ofDraft(userId, draftId);
    const signal = closedSignal(response);
    await streamLines(response, (send) =>
      this.structuresFlow.run(
        userId,
        source,
        dto,
        localeOf(session.user.locale),
        send,
        signal,
      ),
    );
  }

  @Post('systems/:systemId/session-zero/questions')
  async sessionZeroQuestions(
    @Session() session: UserSession<Auth>,
    @Param('systemId', ParseUUIDPipe) systemId: string,
    @Res() response: Response,
  ): Promise<void> {
    const userId = session.user.id;
    const source = await this.worldSources.ofSystem(userId, systemId);
    const signal = closedSignal(response);
    await streamLines(response, (send) =>
      this.sessionZeroFlow.run(userId, source, send, signal),
    );
  }

  @Post('system-drafts/:draftId/session-zero/questions')
  async draftSessionZeroQuestions(
    @Session() session: UserSession<Auth>,
    @Param('draftId', ParseUUIDPipe) draftId: string,
    @Res() response: Response,
  ): Promise<void> {
    const userId = session.user.id;
    const source = await this.worldSources.ofDraft(userId, draftId);
    const signal = closedSignal(response);
    await streamLines(response, (send) =>
      this.sessionZeroFlow.run(userId, source, send, signal),
    );
  }

  @Post('systems/:systemId/population')
  async population(
    @Session() session: UserSession<Auth>,
    @Param('systemId', ParseUUIDPipe) systemId: string,
    @Body(new ZodValidationPipe(populationSchema)) dto: PopulationDto,
    @Res() response: Response,
  ): Promise<void> {
    const userId = session.user.id;
    const source = await this.worldSources.ofSystem(userId, systemId);
    const signal = closedSignal(response);
    await streamLines(response, async (send) =>
      send(
        await this.populationFlow.run(
          userId,
          source,
          dto,
          (records) => send({ records }),
          signal,
        ),
      ),
    );
  }

  @Post('system-drafts/:draftId/population')
  async draftPopulation(
    @Session() session: UserSession<Auth>,
    @Param('draftId', ParseUUIDPipe) draftId: string,
    @Body(new ZodValidationPipe(populationSchema)) dto: PopulationDto,
    @Res() response: Response,
  ): Promise<void> {
    const userId = session.user.id;
    const source = await this.worldSources.ofDraft(userId, draftId);
    const signal = closedSignal(response);
    await streamLines(response, async (send) =>
      send(
        await this.populationFlow.run(
          userId,
          source,
          dto,
          (records) => send({ records }),
          signal,
        ),
      ),
    );
  }
}
