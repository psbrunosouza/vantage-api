import { Module } from '@nestjs/common';
import { SystemsModule } from '../systems/systems.module.js';
import { MembersController } from './members.controller.js';
import { MembersService } from './members.service.js';

@Module({
  imports: [SystemsModule],
  controllers: [MembersController],
  providers: [MembersService],
  exports: [MembersService],
})
export class MembersModule {}
