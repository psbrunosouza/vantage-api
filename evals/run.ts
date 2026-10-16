import { mkdir, readFile, writeFile } from 'node:fs/promises';
import type { ConfigService } from '@nestjs/config';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { z } from 'zod';
import {
  type CampaignOption,
  PitchesFlow,
} from '../src/ai/building/pitches/pitches.flow.js';
import { AgentRunner } from '../src/ai/runtime/agent-runner.js';
import { OpenRouterClient } from '../src/ai/runtime/openrouter.client.js';
import { AiKeyCipher } from '../src/ai/settings/ai-key.cipher.js';
import { AiService } from '../src/ai/settings/ai.service.js';
import { users } from '../src/core/auth/auth.schema.js';
import { LOCALES } from '../src/core/auth/locales.js';
import { type Env, envSchema } from '../src/env.js';
import type { CatalogService } from '../src/onboarding/catalog/catalog.service.js';
import { judge, type Verdict } from './judge.js';

const PASSING_GENRE = 4;

const env = envSchema
  .pick({ DATABASE_URL: true, AI_KEY_SECRET: true })
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
  pitches?: CampaignOption[];
  verdict?: Verdict;
  hits?: string[];
  error?: string;
}

function flag(args: readonly string[], name: string): string | undefined {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

function caseIds(args: readonly string[]): string[] {
  return args.filter(
    (arg, index) => !arg.startsWith('--') && !args[index - 1]?.startsWith('--'),
  );
}

function hitsOf(pitches: CampaignOption[], forbidden: string[]): string[] {
  const text = JSON.stringify(
    pitches.map(({ theme, structures }) => ({ theme, structures })),
  );
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

const args = process.argv.slice(2);
const email = flag(args, '--user');

if (!email) {
  throw new Error('Pass the account to use: npm run eval -- --user you@email');
}

const cases = z
  .array(caseSchema)
  .parse(
    JSON.parse(
      await readFile(new URL('./cases.json', import.meta.url), 'utf8'),
    ),
  );
const only = caseIds(args);
const selected =
  only.length > 0 ? cases.filter((item) => only.includes(item.id)) : cases;

const db = drizzle(env.DATABASE_URL);
const [user] = await db
  .select({ id: users.id })
  .from(users)
  .where(eq(users.email, email));

if (!user) {
  await db.$client.end();
  throw new Error(`No user with the email ${email}`);
}

const openRouter = new OpenRouterClient();
const aiService = new AiService(
  db,
  openRouter,
  new AiKeyCipher({
    get: () => env.AI_KEY_SECRET,
  } as unknown as ConfigService<Env, true>),
);
const runner = new AgentRunner(openRouter);
const credentials = await aiService.credentialsOf(user.id);
const judgeCredentials = {
  ...credentials,
  model: flag(args, '--judge') ?? credentials.model,
};
const pitchesFlow = new PitchesFlow(
  aiService,
  { randomThemes: () => Promise.resolve([]) } as unknown as CatalogService,
  runner,
);

async function evaluate(item: EvalCase): Promise<Result> {
  try {
    const pitches = await pitchesFlow.run(
      user.id,
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

await db.$client.end();
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
