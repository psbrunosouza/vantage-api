import { describe, expect, it } from 'vitest';
import type { SessionZeroQuestionDto } from './dto/replace-questions.dto.js';
import { questionRows } from './session-zero.service.js';

const question = (
  changes: Partial<SessionZeroQuestionDto>,
): SessionZeroQuestionDto => ({
  prompt: 'Pra quem você deve?',
  format: 'text',
  options: [],
  min: null,
  max: null,
  reword: true,
  details: {},
  ...changes,
});

describe('questionRows', () => {
  it('keeps the order of the questions', () => {
    expect(
      questionRows('system', [
        question({ prompt: 'Primeira' }),
        question({ prompt: 'Segunda' }),
      ]).map(({ prompt, position, systemId }) => [prompt, position, systemId]),
    ).toEqual([
      ['Primeira', 0, 'system'],
      ['Segunda', 1, 'system'],
    ]);
  });

  it('keeps options and their meanings only on choices', () => {
    const [choice, text] = questionRows('system', [
      question({
        format: 'single',
        options: ['Capitão', 'Cozinheiro'],
        details: { Capitão: 'Você o tirou do naufrágio' },
      }),
      question({ options: ['Sobra'], details: { Sobra: 'Sobra' } }),
    ]);

    expect([choice.options, choice.details]).toEqual([
      ['Capitão', 'Cozinheiro'],
      { Capitão: 'Você o tirou do naufrágio' },
    ]);
    expect([text.options, text.details]).toEqual([[], {}]);
  });

  it('keeps limits only on numbers', () => {
    const [number, text] = questionRows('system', [
      question({ format: 'number', min: 0, max: 30 }),
      question({ min: 0, max: 30 }),
    ]);

    expect([number.min, number.max, text.min, text.max]).toEqual([
      0,
      30,
      null,
      null,
    ]);
  });
});
