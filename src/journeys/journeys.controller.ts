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
  UploadedFile,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Session, type UserSession } from '@thallesp/nestjs-better-auth';
import type { Auth } from '../auth/auth.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import type { ImageFile } from '../storage/image-storage.service.js';
import { ImageUpload } from '../storage/image-upload.decorator.js';
import {
  type CreateJourneyDto,
  createJourneySchema,
} from './dto/create-journey.dto.js';
import {
  type UpdateJourneyDto,
  updateJourneySchema,
} from './dto/update-journey.dto.js';
import { JourneysService } from './journeys.service.js';

@ApiTags('journeys')
@Controller('journeys')
export class JourneysController {
  constructor(private readonly journeysService: JourneysService) {}

  @Get()
  findAll(@Session() session: UserSession<Auth>) {
    return this.journeysService.findAll(session.user.id);
  }

  @Post()
  create(
    @Session() session: UserSession<Auth>,
    @Body(new ZodValidationPipe(createJourneySchema)) dto: CreateJourneyDto,
  ) {
    return this.journeysService.create(session.user.id, dto);
  }

  @Patch(':id')
  update(
    @Session() session: UserSession<Auth>,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updateJourneySchema)) dto: UpdateJourneyDto,
  ) {
    return this.journeysService.update(session.user.id, id, dto);
  }

  @Post(':id/avatar')
  @ImageUpload()
  replaceAvatar(
    @Session() session: UserSession<Auth>,
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: ImageFile | undefined,
  ) {
    return this.journeysService.replaceAvatar(session.user.id, id, file);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Session() session: UserSession<Auth>,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.journeysService.remove(session.user.id, id);
  }
}
