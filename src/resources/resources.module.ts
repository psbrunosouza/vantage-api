import { Module } from '@nestjs/common';
import { JourneysModule } from '../journeys/journeys.module.js';
import { MembersModule } from '../members/members.module.js';
import { ResourcesController } from './resources.controller.js';
import { ResourcesService } from './resources.service.js';

@Module({
  imports: [JourneysModule, MembersModule],
  controllers: [ResourcesController],
  providers: [ResourcesService],
})
export class ResourcesModule {}
