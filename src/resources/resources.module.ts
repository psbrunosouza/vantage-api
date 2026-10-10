import { Module } from '@nestjs/common';
import { SystemsModule } from '../systems/systems.module.js';
import { MembersModule } from '../members/members.module.js';
import { ResourcesController } from './resources.controller.js';
import { ResourcesService } from './resources.service.js';

@Module({
  imports: [SystemsModule, MembersModule],
  controllers: [ResourcesController],
  providers: [ResourcesService],
  exports: [ResourcesService],
})
export class ResourcesModule {}
