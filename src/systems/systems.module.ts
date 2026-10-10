import { Module } from '@nestjs/common';
import { AvatarModule } from '../avatar/avatar.module.js';
import { SystemsController } from './systems.controller.js';
import { SystemsService } from './systems.service.js';

@Module({
  imports: [AvatarModule],
  controllers: [SystemsController],
  providers: [SystemsService],
  exports: [SystemsService],
})
export class SystemsModule {}
