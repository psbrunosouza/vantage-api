import { Module } from '@nestjs/common';
import { SystemsModule } from '../systems/systems.module.js';
import { TagsModule } from '../tags/tags.module.js';
import { SystemDraftsController } from './system-drafts.controller.js';
import { SystemDraftsService } from './system-drafts.service.js';

@Module({
  imports: [SystemsModule, TagsModule],
  controllers: [SystemDraftsController],
  providers: [SystemDraftsService],
  exports: [SystemDraftsService],
})
export class SystemDraftsModule {}
