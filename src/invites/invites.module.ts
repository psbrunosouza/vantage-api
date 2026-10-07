import { Module } from '@nestjs/common';
import { JourneysModule } from '../journeys/journeys.module.js';
import { InvitesController } from './invites.controller.js';
import { InvitesService } from './invites.service.js';

@Module({
  imports: [JourneysModule],
  controllers: [InvitesController],
  providers: [InvitesService],
})
export class InvitesModule {}
