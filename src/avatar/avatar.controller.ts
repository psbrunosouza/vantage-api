import { Controller, Post, UploadedFile } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Session, type UserSession } from '@thallesp/nestjs-better-auth';
import type { Auth } from '../auth/auth.js';
import type { ImageFile } from '../storage/image-storage.service.js';
import { ImageUpload } from '../storage/image-upload.decorator.js';
import { AvatarService } from './avatar.service.js';

@ApiTags('avatar')
@Controller('avatar')
export class AvatarController {
  constructor(private readonly avatarService: AvatarService) {}

  @Post()
  @ImageUpload()
  replace(
    @Session() session: UserSession<Auth>,
    @UploadedFile() file: ImageFile | undefined,
  ) {
    return this.avatarService.replaceUserImage(session.user.id, file);
  }
}
