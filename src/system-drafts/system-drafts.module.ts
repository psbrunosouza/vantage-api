import { Module } from '@nestjs/common';
import { JourneysModule } from '../journeys/journeys.module.js';
import { SystemDraftsController } from './system-drafts.controller.js';
import { SystemDraftsService } from './system-drafts.service.js';

@Module({
  imports: [JourneysModule],
  controllers: [SystemDraftsController],
  providers: [SystemDraftsService],
  exports: [SystemDraftsService],
})
export class SystemDraftsModule {}
