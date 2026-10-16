import { HttpException } from '@nestjs/common';
import type { Response } from 'express';

const CLIENT_CLOSED_REQUEST = 499;

export function closedSignal(response: Response): AbortSignal {
  const controller = new AbortController();

  response.on('close', () => {
    if (!response.writableFinished) {
      controller.abort(
        new HttpException('Client closed request', CLIENT_CLOSED_REQUEST),
      );
    }
  });

  return controller.signal;
}
