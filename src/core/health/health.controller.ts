import {
  Controller,
  Get,
  Inject,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';
import { sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DATABASE } from '../database/database.module.js';

@AllowAnonymous()
@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(@Inject(DATABASE) private readonly db: NodePgDatabase) {}

  @Get()
  async check() {
    try {
      await this.db.execute(sql`select 1`);
    } catch {
      throw new ServiceUnavailableException('Database unavailable');
    }
    return { status: 'ok' };
  }
}
