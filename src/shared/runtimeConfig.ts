import { z } from 'zod';

const runtimeConfigSchema = z.object({
  VITE_CARD_REPOSITORY_BASE_URL: z.url().refine((value) => value.startsWith('https://'), {
    message: 'VITE_CARD_REPOSITORY_BASE_URL must use HTTPS.',
  }),
  VITE_PROGRESS_API_BASE_URL: z.union([
    z.literal(''),
    z.url().refine((value) => value.startsWith('https://'), {
      message: 'VITE_PROGRESS_API_BASE_URL must be empty or use HTTPS.',
    }),
  ]).default(''),
});

export type RuntimeConfig = z.infer<typeof runtimeConfigSchema>;

export function parseRuntimeConfig(values: Record<string, unknown>): RuntimeConfig {
  return runtimeConfigSchema.parse(values);
}

export function getRuntimeConfig(): RuntimeConfig {
  return parseRuntimeConfig(import.meta.env);
}
