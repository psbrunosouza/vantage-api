import { Module } from '@nestjs/common';
import { JourneysModule } from '../journeys/journeys.module.js';
import { SessionZeroController } from './session-zero.controller.js';
import { SessionZeroService } from './session-zero.service.js';

@Module({
  imports: [JourneysModule],
  controllers: [SessionZeroController],
  providers: [SessionZeroService],
  exports: [SessionZeroService],
})
export class SessionZeroModule {}
