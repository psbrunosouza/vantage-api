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
  type CreateStructureDto,
  createStructureSchema,
} from './dto/create-structure.dto.js';
import {
  type UpdateStructureDto,
  updateStructureSchema,
} from './dto/update-structure.dto.js';
import { StructuresService } from './structures.service.js';

@ApiTags('structures')
@Controller('systems/:systemId/structures')
export class StructuresController {
  constructor(private readonly structuresService: StructuresService) {}

  @Get()
  findAll(
    @Session() session: UserSession<Auth>,
    @Param('systemId', ParseUUIDPipe) systemId: string,
  ) {
    return this.structuresService.findAll(session.user.id, systemId);
  }

  @Post()
  create(
    @Session() session: UserSession<Auth>,
    @Param('systemId', ParseUUIDPipe) systemId: string,
    @Body(new ZodValidationPipe(createStructureSchema))
    dto: CreateStructureDto,
  ) {
    return this.structuresService.create(session.user.id, systemId, dto);
  }

  @Patch(':id')
  update(
    @Session() session: UserSession<Auth>,
    @Param('systemId', ParseUUIDPipe) systemId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updateStructureSchema))
    dto: UpdateStructureDto,
  ) {
    return this.structuresService.update(session.user.id, systemId, id, dto);
  }

  @Post(':id/prune')
  @HttpCode(HttpStatus.NO_CONTENT)
  prune(
    @Session() session: UserSession<Auth>,
    @Param('systemId', ParseUUIDPipe) systemId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.structuresService.prune(session.user.id, systemId, id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Session() session: UserSession<Auth>,
    @Param('systemId', ParseUUIDPipe) systemId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.structuresService.remove(session.user.id, systemId, id);
  }
}
