import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Session, type UserSession } from '@thallesp/nestjs-better-auth';
import type { Auth } from '../auth/auth.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { type CreateTagDto, createTagSchema } from './dto/create-tag.dto.js';
import { TagsService } from './tags.service.js';

@ApiTags('tags')
@Controller('journeys/:journeyId')
export class TagsController {
  constructor(private readonly tagsService: TagsService) {}

  @Get('structure-tags')
  findStructureTags(
    @Session() session: UserSession<Auth>,
    @Param('journeyId', ParseUUIDPipe) journeyId: string,
  ) {
    return this.tagsService.findStructureTags(session.user.id, journeyId);
  }

  @Post('structure-tags')
  createStructureTag(
    @Session() session: UserSession<Auth>,
    @Param('journeyId', ParseUUIDPipe) journeyId: string,
    @Body(new ZodValidationPipe(createTagSchema)) dto: CreateTagDto,
  ) {
    return this.tagsService.createStructureTag(session.user.id, journeyId, dto);
  }

  @Get('field-tags')
  findFieldTags(
    @Session() session: UserSession<Auth>,
    @Param('journeyId', ParseUUIDPipe) journeyId: string,
  ) {
    return this.tagsService.findFieldTags(session.user.id, journeyId);
  }

  @Post('field-tags')
  createFieldTag(
    @Session() session: UserSession<Auth>,
    @Param('journeyId', ParseUUIDPipe) journeyId: string,
    @Body(new ZodValidationPipe(createTagSchema)) dto: CreateTagDto,
  ) {
    return this.tagsService.createFieldTag(session.user.id, journeyId, dto);
  }
}
