import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthModule } from '@thallesp/nestjs-better-auth';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { createAuth } from './auth/auth.js';
import { AvatarModule } from './avatar/avatar.module.js';
import { DATABASE, DatabaseModule } from './database/database.module.js';
import { type Env, envSchema } from './env.js';
import { HealthModule } from './health/health.module.js';
import { JourneysModule } from './journeys/journeys.module.js';
import { LinksModule } from './links/links.module.js';
import { ResourcesModule } from './resources/resources.module.js';
import { StorageModule } from './storage/storage.module.js';
import { StructuresModule } from './structures/structures.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: (config) => envSchema.parse(config),
    }),
    DatabaseModule,
    StorageModule,
    AuthModule.forRootAsync({
      inject: [DATABASE, ConfigService],
      useFactory: (db: NodePgDatabase, config: ConfigService<Env, true>) => ({
        auth: createAuth(db, config),
      }),
    }),
    HealthModule,
    AvatarModule,
    JourneysModule,
    StructuresModule,
    ResourcesModule,
    LinksModule,
  ],
})
export class AppModule {}
