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
import {
  type SetMemberResourcesDto,
  setMemberResourcesSchema,
} from './dto/set-member-resources.dto.js';
import { MembersService } from './members.service.js';

@ApiTags('members')
@Controller('systems/:systemId/members')
export class MembersController {
  constructor(private readonly membersService: MembersService) {}

  @Get()
  findAll(
    @Session() session: UserSession<Auth>,
    @Param('systemId', ParseUUIDPipe) systemId: string,
  ) {
    return this.membersService.findAll(session.user.id, systemId);
  }

  @Put(':userId/resources')
  setResources(
    @Session() session: UserSession<Auth>,
    @Param('systemId', ParseUUIDPipe) systemId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body(new ZodValidationPipe(setMemberResourcesSchema))
    dto: SetMemberResourcesDto,
  ) {
    return this.membersService.setResources(
      session.user.id,
      systemId,
      userId,
      dto,
    );
  }
}
