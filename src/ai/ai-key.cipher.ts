import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../env.js';

const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12;

@Injectable()
export class AiKeyCipher {
  private readonly secret: Buffer;

  constructor(config: ConfigService<Env, true>) {
    this.secret = config.get('AI_KEY_SECRET', { infer: true });
  }

  encrypt(plain: string): string {
    const iv = randomBytes(IV_BYTES);
    const cipher = createCipheriv(ALGORITHM, this.secret, iv);
    const encrypted = Buffer.concat([
      cipher.update(plain, 'utf8'),
      cipher.final(),
    ]);
    return [iv, cipher.getAuthTag(), encrypted]
      .map((part) => part.toString('base64'))
      .join(':');
  }

  decrypt(sealed: string): string {
    const [iv, tag, encrypted] = sealed
      .split(':')
      .map((part) => Buffer.from(part, 'base64'));
    const decipher = createDecipheriv(ALGORITHM, this.secret, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]).toString('utf8');
  }
}
