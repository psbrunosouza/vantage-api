import { Body, Controller, Get, Param, ParseUUIDPipe, Put } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Session, type UserSession } from '@thallesp/nestjs-better-auth';
import type { Auth } from '../auth/auth.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import {
  type ReplaceQuestionsDto,
  replaceQuestionsSchema,
} from './dto/replace-questions.dto.js';
import { SessionZeroService } from './session-zero.service.js';

@ApiTags('session-zero')
@Controller('systems/:systemId/session-zero')
export class SessionZeroController {
  constructor(private readonly sessionZeroService: SessionZeroService) {}

  @Get('questions')
  findAll(
    @Session() session: UserSession<Auth>,
    @Param('systemId', ParseUUIDPipe) systemId: string,
  ) {
    return this.sessionZeroService.findAll(session.user.id, systemId);
  }

  @Put('questions')
  replace(
    @Session() session: UserSession<Auth>,
    @Param('systemId', ParseUUIDPipe) systemId: string,
    @Body(new ZodValidationPipe(replaceQuestionsSchema))
    dto: ReplaceQuestionsDto,
  ) {
    return this.sessionZeroService.replace(session.user.id, systemId, dto);
  }
}
