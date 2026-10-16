import { Module } from '@nestjs/common';
import { SystemsModule } from '../../system/systems/systems.module.js';
import { TagsModule } from '../../model/tags/tags.module.js';
import { SystemDraftsController } from './system-drafts.controller.js';
import { SystemDraftsService } from './system-drafts.service.js';

@Module({
  imports: [SystemsModule, TagsModule],
  controllers: [SystemDraftsController],
  providers: [SystemDraftsService],
  exports: [SystemDraftsService],
})
export class SystemDraftsModule {}
