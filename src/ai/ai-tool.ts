import { z } from 'zod';
import type { ChatTool } from './openrouter.client.js';

export interface AiFunction<T = unknown> {
  name: string;
  description: string;
  input: z.ZodType<T>;
}

export interface AiTool extends AiFunction {
  call(args: unknown): Promise<unknown>;
}

export function aiTool<T>(
  definition: AiFunction<T> & { run(input: T): Promise<unknown> },
): AiTool {
  return {
    name: definition.name,
    description: definition.description,
    input: definition.input,
    call: async (args) => definition.run(definition.input.parse(args)),
  };
}

export function chatToolOf({ name, description, input }: AiFunction): ChatTool {
  return {
    type: 'function',
    function: {
      name,
      description,
      parameters: Object.fromEntries(
        Object.entries(z.toJSONSchema(input, { io: 'input' })).filter(
          ([key]) => key !== '$schema',
        ),
      ),
    },
  };
}
