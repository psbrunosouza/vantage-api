import { Controller, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Session, type UserSession } from '@thallesp/nestjs-better-auth';
import type { Auth } from '../../core/auth/auth.js';
import { ArcStartFlow } from './arc-start/arc-start.flow.js';
import { NarrationFlow } from './narration/narration.flow.js';

@ApiTags('ai')
@Controller('ai')
export class PlayController {
  constructor(
    private readonly arcStartFlow: ArcStartFlow,
    private readonly narrationFlow: NarrationFlow,
  ) {}

  @Post('systems/:systemId/campaign-start')
  campaignStart(
    @Session() session: UserSession<Auth>,
    @Param('systemId', ParseUUIDPipe) systemId: string,
  ) {
    return this.arcStartFlow.run(session.user.id, systemId);
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
