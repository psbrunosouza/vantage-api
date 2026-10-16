import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Put,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Session, type UserSession } from '@thallesp/nestjs-better-auth';
import type { Auth } from '../../core/auth/auth.js';
import { ZodValidationPipe } from '../../core/common/zod-validation.pipe.js';
import { AiService } from './ai.service.js';
import {
  type UpdateAiSettingsDto,
  updateAiSettingsSchema,
} from './dto/update-ai-settings.dto.js';

@ApiTags('ai')
@Controller('ai')
export class AiSettingsController {
  constructor(private readonly aiService: AiService) {}

  @Get('models')
  listModels() {
    return this.aiService.listModels();
  }

  @Get('settings')
  findSettings(@Session() session: UserSession<Auth>) {
    return this.aiService.findSettings(session.user.id);
  }

  @Put('settings')
  updateSettings(
    @Session() session: UserSession<Auth>,
    @Body(new ZodValidationPipe(updateAiSettingsSchema))
    dto: UpdateAiSettingsDto,
  ) {
    return this.aiService.updateSettings(session.user.id, dto);
  }

  @Delete('settings/key')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeKey(@Session() session: UserSession<Auth>) {
    return this.aiService.removeKey(session.user.id);
  }
}
