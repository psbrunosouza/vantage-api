import { Module } from '@nestjs/common';
import { JourneysModule } from '../journeys/journeys.module.js';
import { PlaySessionsController } from './play-sessions.controller.js';
import { PlaySessionsService } from './play-sessions.service.js';

@Module({
  imports: [JourneysModule],
  controllers: [PlaySessionsController],
  providers: [PlaySessionsService],
  exports: [PlaySessionsService],
})
export class PlaySessionsModule {}
