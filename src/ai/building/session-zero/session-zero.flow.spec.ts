import { describe, expect, it } from 'vitest';
import { questionOf } from './session-zero.flow.js';

describe('questionOf', () => {
  it('keeps the options of a choice with their meanings', () => {
    expect(
      questionOf({
        format: 'single',
        prompt: 'Quem a bordo te deve a vida?',
        options: [
          { option: 'O capitão', meaning: 'Você o tirou do naufrágio' },
          { option: 'Ninguém', meaning: 'Ainda não' },
        ],
      }),
    ).toEqual({
      prompt: 'Quem a bordo te deve a vida?',
      format: 'single',
      options: ['O capitão', 'Ninguém'],
      min: null,
      max: null,
      reword: true,
      details: {
        'O capitão': 'Você o tirou do naufrágio',
        Ninguém: 'Ainda não',
      },
    });
  });

  it('keeps the limits of a number', () => {
    expect(
      questionOf({
        format: 'number',
        prompt: 'Há quantos anos navega?',
        min: 0,
        max: 30,
      }),
    ).toMatchObject({ format: 'number', options: [], min: 0, max: 30 });
  });

  it('drops limits that do not make a range', () => {
    expect(
      questionOf({
        format: 'number',
        prompt: 'Há quantos anos navega?',
        min: 9,
        max: 3,
      }),
    ).toMatchObject({ min: null, max: null });
  });

  it('asks text questions without options', () => {
    expect(
      questionOf({
        format: 'text',
        prompt: 'O que você carrega e nunca venderia?',
      }),
    ).toMatchObject({ format: 'text', options: [], details: {} });
  });
});
