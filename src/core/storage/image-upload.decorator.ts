import { applyDecorators, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes } from '@nestjs/swagger';
import { IMAGE_MAX_BYTES } from './image-storage.service.js';

export const ImageUpload = () =>
  applyDecorators(
    ApiConsumes('multipart/form-data'),
    ApiBody({
      schema: {
        type: 'object',
        properties: { file: { type: 'string', format: 'binary' } },
        required: ['file'],
      },
    }),
    UseInterceptors(
      FileInterceptor('file', { limits: { fileSize: IMAGE_MAX_BYTES } }),
    ),
  );
