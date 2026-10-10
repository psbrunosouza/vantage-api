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
  type CreateSystemDto,
  createSystemSchema,
} from './dto/create-system.dto.js';
import {
  type UpdateSystemDto,
  updateSystemSchema,
} from './dto/update-system.dto.js';
import { SystemsService } from './systems.service.js';

@ApiTags('systems')
@Controller('systems')
export class SystemsController {
  constructor(private readonly systemsService: SystemsService) {}

  @Get()
  findAll(@Session() session: UserSession<Auth>) {
    return this.systemsService.findAll(session.user.id);
  }

  @Post()
  create(
    @Session() session: UserSession<Auth>,
    @Body(new ZodValidationPipe(createSystemSchema)) dto: CreateSystemDto,
  ) {
    return this.systemsService.create(session.user.id, dto);
  }

  @Patch(':id')
  update(
    @Session() session: UserSession<Auth>,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updateSystemSchema)) dto: UpdateSystemDto,
  ) {
    return this.systemsService.update(session.user.id, id, dto);
  }

  @Post(':id/avatar')
  @ImageUpload()
  replaceAvatar(
    @Session() session: UserSession<Auth>,
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: ImageFile | undefined,
  ) {
    return this.systemsService.replaceAvatar(session.user.id, id, file);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Session() session: UserSession<Auth>,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.systemsService.remove(session.user.id, id);
  }
}
