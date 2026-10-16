import { Module } from '@nestjs/common';
import { SystemsModule } from '../../system/systems/systems.module.js';
import { MembersModule } from '../../system/members/members.module.js';
import { LinksController } from './links.controller.js';
import { LinksService } from './links.service.js';

@Module({
  imports: [SystemsModule, MembersModule],
  controllers: [LinksController],
  providers: [LinksService],
})
export class LinksModule {}
