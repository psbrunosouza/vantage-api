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
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Session, type UserSession } from '@thallesp/nestjs-better-auth';
import type { Auth } from '../auth/auth.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import {
  type SystemDraftDto,
  systemDraftSchema,
} from './dto/system-draft.dto.js';
import { TagsService } from '../tags/tags.service.js';
import { SystemDraftsService } from './system-drafts.service.js';

@ApiTags('system-drafts')
@Controller('system-drafts')
export class SystemDraftsController {
  constructor(
    private readonly systemDraftsService: SystemDraftsService,
    private readonly tagsService: TagsService,
  ) {}

  @Get()
  findIncomplete(@Session() session: UserSession<Auth>) {
    return this.systemDraftsService.findIncomplete(session.user.id);
  }

  @Get('tags')
  async systemTags() {
    const [structureTags, fieldTags] = await Promise.all([
      this.tagsService.findGlobalStructureTags(),
      this.tagsService.findGlobalFieldTags(),
    ]);
    return { structureTags, fieldTags };
  }

  @Get(':id')
  findOne(
    @Session() session: UserSession<Auth>,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.systemDraftsService.findOne(session.user.id, id);
  }

  @Post()
  create(
    @Session() session: UserSession<Auth>,
    @Body(new ZodValidationPipe(systemDraftSchema)) dto: SystemDraftDto,
  ) {
    return this.systemDraftsService.create(session.user.id, dto);
  }

  @Patch(':id')
  update(
    @Session() session: UserSession<Auth>,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(systemDraftSchema)) dto: SystemDraftDto,
  ) {
    return this.systemDraftsService.update(session.user.id, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Session() session: UserSession<Auth>,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.systemDraftsService.remove(session.user.id, id);
  }

  @Post(':id/commit')
  commit(
    @Session() session: UserSession<Auth>,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.systemDraftsService.commit(session.user.id, id);
  }
}
