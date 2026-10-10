import { Module } from '@nestjs/common';
import { SystemsModule } from '../systems/systems.module.js';
import { MembersModule } from '../members/members.module.js';
import { LinksController } from './links.controller.js';
import { LinksService } from './links.service.js';

@Module({
  imports: [SystemsModule, MembersModule],
  controllers: [LinksController],
  providers: [LinksService],
})
export class LinksModule {}
