import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient } from '@supabase/supabase-js';
import type { Env } from '../env.js';
import { ImageStorageService } from './image-storage.service.js';
import { STORAGE, type StorageClient } from './storage.client.js';

@Global()
@Module({
  providers: [
    {
      provide: STORAGE,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>): StorageClient =>
        createClient(
          config.get('SUPABASE_URL', { infer: true }),
          config.get('SUPABASE_SECRET_KEY', { infer: true }),
          { auth: { persistSession: false, autoRefreshToken: false } },
        ).storage,
    },
    ImageStorageService,
  ],
  exports: [ImageStorageService],
})
export class StorageModule {}
