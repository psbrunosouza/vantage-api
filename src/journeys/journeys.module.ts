import { Module } from '@nestjs/common';
import { AvatarModule } from '../avatar/avatar.module.js';
import { JourneysController } from './journeys.controller.js';
import { JourneysService } from './journeys.service.js';

@Module({
  imports: [AvatarModule],
  controllers: [JourneysController],
  providers: [JourneysService],
  exports: [JourneysService],
})
export class JourneysModule {}
