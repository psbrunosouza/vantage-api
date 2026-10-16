import { describe, expect, it } from 'vitest';
import type { CatalogService } from '../../../onboarding/catalog/catalog.service.js';
import type { ChatMessage } from '../../runtime/openrouter.client.js';
import type { AgentRunner } from '../../runtime/agent-runner.js';
import type { AiService } from '../../settings/ai.service.js';
import { campaignThemes, PitchesFlow } from './pitches.flow.js';
import { ANGLES } from './pitches.prompt.js';

describe('campaignThemes', () => {
  it('uses the chosen theme for every campaign', () => {
    expect(campaignThemes('dark fantasy', ['space opera'])).toEqual([
      'dark fantasy',
      'dark fantasy',
      'dark fantasy',
    ]);
  });

  it('falls back to one random theme per campaign', () => {
    expect(campaignThemes(undefined, ['horror', 'wuxia', 'cyberpunk'])).toEqual(
      ['horror', 'wuxia', 'cyberpunk'],
    );
  });
});

describe('PitchesFlow', () => {
  it('gives each campaign of the same theme its own angle', async () => {
    const asked: string[] = [];
    const runner = {
      submit: (_credentials: unknown, messages: ChatMessage[]) => {
        asked.push(String(messages[1].content));
        return Promise.resolve({ theme: 'x', structures: [] });
      },
    } as unknown as AgentRunner;
    const flow = new PitchesFlow(
      {
        credentialsOf: () => Promise.resolve({ model: 'm', apiKey: 'k' }),
      } as unknown as AiService,
      { randomThemes: () => Promise.resolve([]) } as unknown as CatalogService,
      runner,
    );

    await flow.run('user', { theme: 'terror escolar' }, 'pt-BR');

    expect(asked).toHaveLength(ANGLES.length);
    ANGLES.forEach((angle, index) => {
      expect(asked[index]).toContain('Theme: terror escolar');
      expect(asked[index]).toContain(angle);
    });
  });
});
