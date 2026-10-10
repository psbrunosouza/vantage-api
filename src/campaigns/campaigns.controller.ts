import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Session, type UserSession } from '@thallesp/nestjs-better-auth';
import type { Auth } from '../auth/auth.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { CampaignsService } from './campaigns.service.js';
import {
  type CreateCampaignDto,
  createCampaignSchema,
} from './dto/create-campaign.dto.js';

@ApiTags('campaigns')
@Controller('systems/:systemId/campaign')
export class CampaignsController {
  constructor(private readonly campaignsService: CampaignsService) {}

  @Get()
  find(
    @Session() session: UserSession<Auth>,
    @Param('systemId', ParseUUIDPipe) systemId: string,
  ) {
    return this.campaignsService.find(session.user.id, systemId);
  }

  @Post()
  create(
    @Session() session: UserSession<Auth>,
    @Param('systemId', ParseUUIDPipe) systemId: string,
    @Body(new ZodValidationPipe(createCampaignSchema)) dto: CreateCampaignDto,
  ) {
    return this.campaignsService.create(session.user.id, systemId, dto);
  }

  @Put()
  replace(
    @Session() session: UserSession<Auth>,
    @Param('systemId', ParseUUIDPipe) systemId: string,
    @Body(new ZodValidationPipe(createCampaignSchema)) dto: CreateCampaignDto,
  ) {
    return this.campaignsService.replace(session.user.id, systemId, dto);
  }
}
