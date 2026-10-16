import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Put,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Session, type UserSession } from '@thallesp/nestjs-better-auth';
import type { Auth } from '../../core/auth/auth.js';
import { ZodValidationPipe } from '../../core/common/zod-validation.pipe.js';
import {
  type ReplaceWorldDto,
  replaceWorldSchema,
} from './dto/replace-world.dto.js';
import { WorldsService } from './worlds.service.js';

@ApiTags('worlds')
@Controller('systems/:systemId/world')
export class WorldsController {
  constructor(private readonly worldsService: WorldsService) {}

  @Get()
  find(
    @Session() session: UserSession<Auth>,
    @Param('systemId', ParseUUIDPipe) systemId: string,
  ) {
    return this.worldsService.find(session.user.id, systemId);
  }

  @Put()
  replace(
    @Session() session: UserSession<Auth>,
    @Param('systemId', ParseUUIDPipe) systemId: string,
    @Body(new ZodValidationPipe(replaceWorldSchema)) dto: ReplaceWorldDto,
  ) {
    return this.worldsService.replace(session.user.id, systemId, dto);
  }
}
