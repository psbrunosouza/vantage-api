import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthModule } from '@thallesp/nestjs-better-auth';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { AiModule } from './ai/ai.module.js';
import { createAuth } from './auth/auth.js';
import { AvatarModule } from './avatar/avatar.module.js';
import { CampaignsModule } from './campaigns/campaigns.module.js';
import { DATABASE, DatabaseModule } from './database/database.module.js';
import { type Env, envSchema } from './env.js';
import { FieldsModule } from './fields/fields.module.js';
import { HealthModule } from './health/health.module.js';
import { InvitesModule } from './invites/invites.module.js';
import { JourneysModule } from './journeys/journeys.module.js';
import { LinksModule } from './links/links.module.js';
import { MembersModule } from './members/members.module.js';
import { PlaySessionsModule } from './play-sessions/play-sessions.module.js';
import { ResourcesModule } from './resources/resources.module.js';
import { StorageModule } from './storage/storage.module.js';
import { StructuresModule } from './structures/structures.module.js';
import { TagsModule } from './tags/tags.module.js';
import { TemplatesModule } from './templates/templates.module.js';

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
    TagsModule,
    ResourcesModule,
    LinksModule,
    PlaySessionsModule,
    MembersModule,
    CampaignsModule,
    InvitesModule,
    AiModule,
    FieldsModule,
    TemplatesModule,
  ],
})
export class AppModule {}
