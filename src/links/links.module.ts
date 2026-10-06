import { Module } from '@nestjs/common';
import { JourneysModule } from '../journeys/journeys.module.js';
import { MembersModule } from '../members/members.module.js';
import { LinksController } from './links.controller.js';
import { LinksService } from './links.service.js';

@Module({
  imports: [JourneysModule, MembersModule],
  controllers: [LinksController],
  providers: [LinksService],
})
export class LinksModule {}
