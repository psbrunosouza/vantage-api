import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { z } from 'zod';
import { PitchesFlow } from '../src/ai/building/pitches/pitches.flow.js';
import { AgentRunner } from '../src/ai/runtime/agent-runner.js';
import { OpenRouterClient } from '../src/ai/runtime/openrouter.client.js';
import type {
  AiCredentials,
  AiService,
} from '../src/ai/settings/ai.service.js';
import { LOCALES } from '../src/core/auth/locales.js';
import type { CatalogService } from '../src/onboarding/catalog/catalog.service.js';
import { judge, type Verdict } from './judge.js';

const PASSING_GENRE = 4;

const env = z
  .object({
    EVAL_API_KEY: z.string().min(1),
    EVAL_MODEL: z.string().min(1),
    EVAL_JUDGE_MODEL: z.string().min(1).optional(),
  })
  .parse(process.env);

const caseSchema = z.object({
  id: z.string().min(1),
  theme: z.string().min(1).max(80),
  moods: z.array(z.string()).default([]),
  direction: z.string().optional(),
  locale: z.enum(LOCALES).default('pt-BR'),
  expect: z.string().min(1),
  forbidden: z.array(z.string()).default([]),
});

type EvalCase = z.infer<typeof caseSchema>;

interface Result {
  id: string;
  pitches?: unknown[];
  verdict?: Verdict;
  hits?: string[];
  error?: string;
}

function hitsOf(pitches: unknown[], forbidden: string[]): string[] {
  const text = JSON.stringify(pitches);
  return forbidden.filter((pattern) => new RegExp(pattern, 'iu').test(text));
}

function mean(values: number[]): number {
  return values.length === 0
    ? 0
    : Number((values.reduce((a, b) => a + b, 0) / values.length).toFixed(1));
}

function rowOf(result: Result) {
  if (!result.verdict) {
    return { id: result.id, pass: false, error: result.error };
  }

  const scores = result.verdict.pitches;
  const genre = mean(scores.map((pitch) => pitch.genre));
  const hits = result.hits ?? [];

  return {
    id: result.id,
    pass: genre >= PASSING_GENRE && hits.length === 0,
    genre,
    tone: mean(scores.map((pitch) => pitch.tone)),
    playable: mean(scores.map((pitch) => pitch.playable)),
    variety: result.verdict.variety,
    hits: hits.length,
    leaks: scores.flatMap((pitch) => pitch.leaks).length,
  };
}

const cases = z
  .array(caseSchema)
  .parse(
    JSON.parse(
      await readFile(new URL('./cases.json', import.meta.url), 'utf8'),
    ),
  );
const only = process.argv.slice(2);
const selected =
  only.length > 0 ? cases.filter((item) => only.includes(item.id)) : cases;

const runner = new AgentRunner(new OpenRouterClient());
const credentials: AiCredentials = {
  model: env.EVAL_MODEL,
  apiKey: env.EVAL_API_KEY,
};
const judgeCredentials: AiCredentials = {
  model: env.EVAL_JUDGE_MODEL ?? env.EVAL_MODEL,
  apiKey: env.EVAL_API_KEY,
};
const pitchesFlow = new PitchesFlow(
  { credentialsOf: () => Promise.resolve(credentials) } as unknown as AiService,
  { randomThemes: () => Promise.resolve([]) } as unknown as CatalogService,
  runner,
);

async function evaluate(item: EvalCase): Promise<Result> {
  try {
    const pitches = await pitchesFlow.run(
      'eval',
      { theme: item.theme, moods: item.moods, direction: item.direction },
      item.locale,
    );
    const verdict = await judge(runner, judgeCredentials, { ...item, pitches });

    return {
      id: item.id,
      pitches,
      verdict,
      hits: hitsOf(pitches, item.forbidden),
    };
  } catch (error) {
    return {
      id: item.id,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

const results = await Promise.all(selected.map(evaluate));
const rows = results.map(rowOf);

console.table(rows);

const reports = new URL('./reports/', import.meta.url);
const report = new URL(
  `${new Date().toISOString().replace(/[:.]/g, '-')}.json`,
  reports,
);

await mkdir(reports, { recursive: true });
await writeFile(
  report,
  JSON.stringify(
    { model: credentials.model, judge: judgeCredentials.model, rows, results },
    null,
    2,
  ),
);

console.log(`Report: ${report.pathname}`);
process.exitCode = rows.every((row) => row.pass) ? 0 : 1;
