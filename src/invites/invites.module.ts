import { Module } from '@nestjs/common';
import { SystemsModule } from '../systems/systems.module.js';
import { InvitesController } from './invites.controller.js';
import { InvitesService } from './invites.service.js';

@Module({
  imports: [SystemsModule],
  controllers: [InvitesController],
  providers: [InvitesService],
})
export class InvitesModule {}
