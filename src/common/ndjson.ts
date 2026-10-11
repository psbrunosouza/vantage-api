import { HttpException, HttpStatus, Logger } from '@nestjs/common';
import type { Response } from 'express';

const logger = new Logger('Ndjson');

export async function streamLines(
  response: Response,
  run: (send: (line: unknown) => void) => Promise<void>,
): Promise<void> {
  const open = () => {
    if (!response.headersSent) {
      response.status(HttpStatus.OK);
      response.setHeader('Content-Type', 'application/x-ndjson');
      response.setHeader('Cache-Control', 'no-cache');
      response.setHeader('X-Accel-Buffering', 'no');
    }
  };

  const send = (line: unknown) => {
    if (response.destroyed || response.writableEnded) {
      return;
    }

    open();
    response.write(`${JSON.stringify(line)}\n`);
  };

  try {
    await run(send);
  } catch (error) {
    if (!response.headersSent) {
      throw error;
    }

    if (!(error instanceof HttpException)) {
      logger.error(error);
    }

    send({
      error:
        error instanceof HttpException
          ? error.getResponse()
          : { message: 'Internal server error' },
    });
  }

  open();
  response.end();
}
