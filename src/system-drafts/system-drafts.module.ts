import { Module } from '@nestjs/common';
import { JourneysModule } from '../journeys/journeys.module.js';
import { TagsModule } from '../tags/tags.module.js';
import { SystemDraftsController } from './system-drafts.controller.js';
import { SystemDraftsService } from './system-drafts.service.js';

@Module({
  imports: [JourneysModule, TagsModule],
  controllers: [SystemDraftsController],
  providers: [SystemDraftsService],
  exports: [SystemDraftsService],
})
export class SystemDraftsModule {}
