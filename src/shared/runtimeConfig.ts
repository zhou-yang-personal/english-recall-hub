import { z } from 'zod';

const runtimeConfigSchema = z.object({
  VITE_SUPABASE_URL: z.url().refine((value) => value.startsWith('https://'), {
    message: 'VITE_SUPABASE_URL must use HTTPS.',
  }),
  VITE_SUPABASE_PUBLISHABLE_KEY: z.string().startsWith('sb_publishable_').min(32),
  VITE_CARD_REPOSITORY_BASE_URL: z.url().refine((value) => value.startsWith('https://'), {
    message: 'VITE_CARD_REPOSITORY_BASE_URL must use HTTPS.',
  }),
});

export type RuntimeConfig = z.infer<typeof runtimeConfigSchema>;

export function parseRuntimeConfig(values: Record<string, unknown>): RuntimeConfig {
  return runtimeConfigSchema.parse(values);
}

export function getRuntimeConfig(): RuntimeConfig {
  return parseRuntimeConfig(import.meta.env);
}
