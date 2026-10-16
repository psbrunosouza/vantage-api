import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthModule } from '@thallesp/nestjs-better-auth';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { AiModule } from './ai/ai.module.js';
import { createAuth } from './core/auth/auth.js';
import { AvatarModule } from './system/avatar/avatar.module.js';
import { CampaignsModule } from './story/campaigns/campaigns.module.js';
import { WorldsModule } from './world/worlds/worlds.module.js';
import { DATABASE, DatabaseModule } from './core/database/database.module.js';
import { type Env, envSchema } from './env.js';
import { FieldsModule } from './model/fields/fields.module.js';
import { HealthModule } from './core/health/health.module.js';
import { InvitesModule } from './system/invites/invites.module.js';
import { SystemsModule } from './system/systems/systems.module.js';
import { LinksModule } from './model/links/links.module.js';
import { MembersModule } from './system/members/members.module.js';
import { PlaySessionsModule } from './story/play-sessions/play-sessions.module.js';
import { ResourcesModule } from './model/resources/resources.module.js';
import { StorageModule } from './core/storage/storage.module.js';
import { StructuresModule } from './model/structures/structures.module.js';
import { SystemDraftsModule } from './onboarding/system-drafts/system-drafts.module.js';
import { SessionZeroModule } from './story/session-zero/session-zero.module.js';
import { TagsModule } from './model/tags/tags.module.js';
import { TemplatesModule } from './model/templates/templates.module.js';

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
    SystemsModule,
    StructuresModule,
    TagsModule,
    SessionZeroModule,
    SystemDraftsModule,
    ResourcesModule,
    LinksModule,
    PlaySessionsModule,
    MembersModule,
    CampaignsModule,
    WorldsModule,
    InvitesModule,
    AiModule,
    FieldsModule,
    TemplatesModule,
  ],
})
export class AppModule {}
