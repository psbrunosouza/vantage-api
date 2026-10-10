import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Session, type UserSession } from '@thallesp/nestjs-better-auth';
import type { Auth } from '../auth/auth.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import {
  type ArrangeSessionTreeDto,
  arrangeSessionTreeSchema,
} from './dto/arrange-session-tree.dto.js';
import {
  type CreatePlaySessionDto,
  createPlaySessionSchema,
} from './dto/create-play-session.dto.js';
import {
  type CreateSessionEntryDto,
  createSessionEntrySchema,
} from './dto/create-session-entry.dto.js';
import {
  type CreateSessionFolderDto,
  createSessionFolderSchema,
} from './dto/create-session-folder.dto.js';
import {
  type UpdatePlaySessionDto,
  updatePlaySessionSchema,
} from './dto/update-play-session.dto.js';
import {
  type UpdateSessionFolderDto,
  updateSessionFolderSchema,
} from './dto/update-session-folder.dto.js';
import { PlaySessionsService } from './play-sessions.service.js';

@ApiTags('play-sessions')
@Controller('systems/:systemId')
export class PlaySessionsController {
  constructor(private readonly playSessionsService: PlaySessionsService) {}

  @Get('session-tree')
  findTree(
    @Session() session: UserSession<Auth>,
    @Param('systemId', ParseUUIDPipe) systemId: string,
  ) {
    return this.playSessionsService.findTree(session.user.id, systemId);
  }

  @Put('session-tree')
  arrange(
    @Session() session: UserSession<Auth>,
    @Param('systemId', ParseUUIDPipe) systemId: string,
    @Body(new ZodValidationPipe(arrangeSessionTreeSchema))
    dto: ArrangeSessionTreeDto,
  ) {
    return this.playSessionsService.arrange(session.user.id, systemId, dto);
  }

  @Post('session-folders')
  createFolder(
    @Session() session: UserSession<Auth>,
    @Param('systemId', ParseUUIDPipe) systemId: string,
    @Body(new ZodValidationPipe(createSessionFolderSchema))
    dto: CreateSessionFolderDto,
  ) {
    return this.playSessionsService.createFolder(
      session.user.id,
      systemId,
      dto,
    );
  }

  @Patch('session-folders/:id')
  updateFolder(
    @Session() session: UserSession<Auth>,
    @Param('systemId', ParseUUIDPipe) systemId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updateSessionFolderSchema))
    dto: UpdateSessionFolderDto,
  ) {
    return this.playSessionsService.updateFolder(
      session.user.id,
      systemId,
      id,
      dto,
    );
  }

  @Delete('session-folders/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeFolder(
    @Session() session: UserSession<Auth>,
    @Param('systemId', ParseUUIDPipe) systemId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.playSessionsService.removeFolder(
      session.user.id,
      systemId,
      id,
    );
  }

  @Post('play-sessions')
  createSession(
    @Session() session: UserSession<Auth>,
    @Param('systemId', ParseUUIDPipe) systemId: string,
    @Body(new ZodValidationPipe(createPlaySessionSchema))
    dto: CreatePlaySessionDto,
  ) {
    return this.playSessionsService.createSession(
      session.user.id,
      systemId,
      dto,
    );
  }

  @Patch('play-sessions/:id')
  updateSession(
    @Session() session: UserSession<Auth>,
    @Param('systemId', ParseUUIDPipe) systemId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updatePlaySessionSchema))
    dto: UpdatePlaySessionDto,
  ) {
    return this.playSessionsService.updateSession(
      session.user.id,
      systemId,
      id,
      dto,
    );
  }

  @Delete('play-sessions/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeSession(
    @Session() session: UserSession<Auth>,
    @Param('systemId', ParseUUIDPipe) systemId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.playSessionsService.removeSession(
      session.user.id,
      systemId,
      id,
    );
  }

  @Get('play-sessions/:sessionId/entries')
  findEntries(
    @Session() session: UserSession<Auth>,
    @Param('systemId', ParseUUIDPipe) systemId: string,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
  ) {
    return this.playSessionsService.findEntries(
      session.user.id,
      systemId,
      sessionId,
    );
  }

  @Post('play-sessions/:sessionId/entries')
  createEntry(
    @Session() session: UserSession<Auth>,
    @Param('systemId', ParseUUIDPipe) systemId: string,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Body(new ZodValidationPipe(createSessionEntrySchema))
    dto: CreateSessionEntryDto,
  ) {
    return this.playSessionsService.createEntry(
      session.user.id,
      systemId,
      sessionId,
      dto,
    );
  }
}
