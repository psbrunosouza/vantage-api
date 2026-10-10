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
import type { Auth } from '../auth/auth.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { type SetLinksDto, setLinksSchema } from './dto/set-links.dto.js';
import { LinksService } from './links.service.js';

@ApiTags('links')
@Controller('systems/:systemId')
export class LinksController {
  constructor(private readonly linksService: LinksService) {}

  @Get('links')
  findAll(
    @Session() session: UserSession<Auth>,
    @Param('systemId', ParseUUIDPipe) systemId: string,
  ) {
    return this.linksService.findAll(session.user.id, systemId);
  }

  @Put('resources/:id/links')
  set(
    @Session() session: UserSession<Auth>,
    @Param('systemId', ParseUUIDPipe) systemId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(setLinksSchema)) dto: SetLinksDto,
  ) {
    return this.linksService.set(session.user.id, systemId, id, dto);
  }
}
