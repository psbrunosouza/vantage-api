import { Module } from '@nestjs/common';
import { JourneysModule } from '../journeys/journeys.module.js';
import { StructuresController } from './structures.controller.js';
import { StructuresService } from './structures.service.js';

@Module({
  imports: [JourneysModule],
  controllers: [StructuresController],
  providers: [StructuresService],
})
export class StructuresModule {}
