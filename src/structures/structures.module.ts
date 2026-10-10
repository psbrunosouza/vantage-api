import { Module } from '@nestjs/common';
import { SystemsModule } from '../systems/systems.module.js';
import { StructuresController } from './structures.controller.js';
import { StructuresService } from './structures.service.js';

@Module({
  imports: [SystemsModule],
  controllers: [StructuresController],
  providers: [StructuresService],
  exports: [StructuresService],
})
export class StructuresModule {}
