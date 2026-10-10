import { Controller, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Session, type UserSession } from '@thallesp/nestjs-better-auth';
import type { Auth } from '../auth/auth.js';
import { InvitesService } from './invites.service.js';

@ApiTags('invites')
@Controller()
export class InvitesController {
  constructor(private readonly invitesService: InvitesService) {}

  @Post('systems/:systemId/invite')
  codeOf(
    @Session() session: UserSession<Auth>,
    @Param('systemId', ParseUUIDPipe) systemId: string,
  ) {
    return this.invitesService.codeOf(session.user.id, systemId);
  }

  @Get('invites/:code')
  preview(@Session() session: UserSession<Auth>, @Param('code') code: string) {
    return this.invitesService.preview(session.user.id, code);
  }

  @Post('invites/:code/accept')
  accept(@Session() session: UserSession<Auth>, @Param('code') code: string) {
    return this.invitesService.accept(session.user.id, code);
  }
}
