import { EventEmitter } from 'node:events';
import { HttpException } from '@nestjs/common';
import type { Response } from 'express';
import { describe, expect, it } from 'vitest';
import { closedSignal } from './closed-signal.js';

function response(writableFinished: boolean) {
  return Object.assign(new EventEmitter(), {
    writableFinished,
  }) as unknown as Response;
}

describe('closedSignal', () => {
  it('aborts when the client leaves before the answer is sent', () => {
    const closed = response(false);
    const signal = closedSignal(closed);

    closed.emit('close');

    expect(signal.aborted).toBe(true);
    expect(signal.reason).toBeInstanceOf(HttpException);
    expect((signal.reason as HttpException).getStatus()).toBe(499);
  });

  it('stays open when the answer was sent', () => {
    const answered = response(true);
    const signal = closedSignal(answered);

    answered.emit('close');

    expect(signal.aborted).toBe(false);
  });
});
