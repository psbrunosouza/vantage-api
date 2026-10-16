import { Module } from '@nestjs/common';
import { SystemsModule } from '../../system/systems/systems.module.js';
import { WorldsController } from './worlds.controller.js';
import { WorldsService } from './worlds.service.js';

@Module({
  imports: [SystemsModule],
  controllers: [WorldsController],
  providers: [WorldsService],
  exports: [WorldsService],
})
export class WorldsModule {}
