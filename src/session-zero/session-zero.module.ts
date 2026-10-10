import { Module } from '@nestjs/common';
import { SystemsModule } from '../systems/systems.module.js';
import { SessionZeroController } from './session-zero.controller.js';
import { SessionZeroService } from './session-zero.service.js';

@Module({
  imports: [SystemsModule],
  controllers: [SessionZeroController],
  providers: [SessionZeroService],
  exports: [SessionZeroService],
})
export class SessionZeroModule {}
