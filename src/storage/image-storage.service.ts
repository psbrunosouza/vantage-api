import { randomUUID } from 'node:crypto';
import {
  BadGatewayException,
  BadRequestException,
  Inject,
  Injectable,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { STORAGE, type StorageClient } from './storage.client.js';

export const IMAGE_MAX_BYTES = 2 * 1024 * 1024;

const EXTENSIONS: Partial<Record<string, string>> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
};

export interface ImageFile {
  buffer: Buffer;
  mimetype: string;
}

@Injectable()
export class ImageStorageService {
  constructor(@Inject(STORAGE) private readonly storage: StorageClient) {}

  async replace(
    bucketName: string,
    folder: string,
    file: ImageFile | undefined,
    persist?: (url: string) => PromiseLike<unknown>,
  ): Promise<string> {
    if (!file) throw new BadRequestException('Missing file.');

    const extension = EXTENSIONS[file.mimetype];
    if (!extension) {
      throw new UnsupportedMediaTypeException('Use PNG, JPEG or WebP.');
    }

    const bucket = this.storage.from(bucketName);
    const { data: previous } = await bucket.list(folder);

    const path = `${folder}/${randomUUID()}.${extension}`;
    const { error } = await bucket.upload(path, file.buffer, {
      contentType: file.mimetype,
    });
    if (error) throw new BadGatewayException(error.message);

    const url = bucket.getPublicUrl(path).data.publicUrl;
    await persist?.(url);

    if (previous?.length) {
      await bucket.remove(previous.map((object) => `${folder}/${object.name}`));
    }

    return url;
  }
}
