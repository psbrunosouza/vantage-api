import {
  Body,
  Controller,
  Get,
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
  type CreateCharacterDto,
  createCharacterSchema,
} from './dto/create-character.dto.js';
import {
  type CreateResourceDto,
  createResourceSchema,
} from './dto/create-resource.dto.js';
import {
  type UpdateResourceDto,
  updateResourceSchema,
} from './dto/update-resource.dto.js';
import { ResourcesService } from './resources.service.js';

@ApiTags('resources')
@Controller('systems/:systemId')
export class ResourcesController {
  constructor(private readonly resourcesService: ResourcesService) {}

  @Get('resources')
  findAll(
    @Session() session: UserSession<Auth>,
    @Param('systemId', ParseUUIDPipe) systemId: string,
  ) {
    return this.resourcesService.findAll(session.user.id, systemId);
  }

  @Post('structures/:structureId/resources')
  create(
    @Session() session: UserSession<Auth>,
    @Param('systemId', ParseUUIDPipe) systemId: string,
    @Param('structureId', ParseUUIDPipe) structureId: string,
    @Body(new ZodValidationPipe(createResourceSchema)) dto: CreateResourceDto,
  ) {
    return this.resourcesService.create(
      session.user.id,
      systemId,
      structureId,
      dto,
    );
  }

  @Post('characters')
  createCharacter(
    @Session() session: UserSession<Auth>,
    @Param('systemId', ParseUUIDPipe) systemId: string,
    @Body(new ZodValidationPipe(createCharacterSchema))
    dto: CreateCharacterDto,
  ) {
    return this.resourcesService.createCharacter(
      session.user.id,
      systemId,
      dto,
    );
  }

  @Patch('resources/:id')
  update(
    @Session() session: UserSession<Auth>,
    @Param('systemId', ParseUUIDPipe) systemId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updateResourceSchema)) dto: UpdateResourceDto,
  ) {
    return this.resourcesService.update(session.user.id, systemId, id, dto);
  }

  @Post('resources/:id/fields/:fieldId/image')
  @ImageUpload()
  uploadImage(
    @Session() session: UserSession<Auth>,
    @Param('systemId', ParseUUIDPipe) systemId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('fieldId') fieldId: string,
    @UploadedFile() file: ImageFile | undefined,
  ) {
    return this.resourcesService.uploadImage(
      session.user.id,
      systemId,
      id,
      fieldId,
      file,
    );
  }
}
