import { Module } from '@nestjs/common';
import { SystemsModule } from '../systems/systems.module.js';
import { PlaySessionsController } from './play-sessions.controller.js';
import { PlaySessionsService } from './play-sessions.service.js';

@Module({
  imports: [SystemsModule],
  controllers: [PlaySessionsController],
  providers: [PlaySessionsService],
  exports: [PlaySessionsService],
})
export class PlaySessionsModule {}
