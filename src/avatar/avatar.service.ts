import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { users } from '../auth/auth.schema.js';
import { DATABASE } from '../database/database.module.js';
import {
  type ImageFile,
  ImageStorageService,
} from '../storage/image-storage.service.js';

const BUCKET = 'avatars';

@Injectable()
export class AvatarService {
  constructor(
    @Inject(DATABASE) private readonly db: NodePgDatabase,
    private readonly imageStorage: ImageStorageService,
  ) {}

  async replaceUserImage(
    userId: string,
    file: ImageFile | undefined,
  ): Promise<{ image: string }> {
    const image = await this.replace(userId, file, (url) =>
      this.db.update(users).set({ image: url }).where(eq(users.id, userId)),
    );
    return { image };
  }

  replace(
    folder: string,
    file: ImageFile | undefined,
    persist: (url: string) => PromiseLike<unknown>,
  ): Promise<string> {
    return this.imageStorage.replace(BUCKET, folder, file, persist);
  }
}
