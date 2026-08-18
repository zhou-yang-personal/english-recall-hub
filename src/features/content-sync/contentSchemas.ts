import { z } from 'zod';

const repositoryPathSchema = z
  .string()
  .min(1)
  .refine((path) => !path.startsWith('/') && !path.split('/').includes('..'), {
    message: 'Repository path must stay within the configured card source.',
  });

export const manifestSchema = z
  .object({
    profile_id: z.string().min(1),
    schema_version: z.string().min(1),
    updated_at: z.string().min(1),
    note_count: z.number().int().nonnegative(),
    packs: z
      .array(
        z
          .object({
            pack_id: z.string().min(1),
            path: repositoryPathSchema,
            format: z.literal('jsonl'),
            note_count: z.number().int().nonnegative(),
            sha256: z.string().nullable().optional(),
          })
          .passthrough(),
      )
      .min(1),
    templates: z.array(repositoryPathSchema).min(1),
  })
  .passthrough();

export const templateSchema = z
  .object({
    template_id: z.string().min(1),
    note_type: z.string().min(1),
    cards: z.array(
      z
        .object({
          card_type: z.string().min(1),
          front: z.string().min(1),
          back: z.string().min(1),
        })
        .passthrough(),
    ),
  })
  .passthrough();

export const noteSchema = z
  .object({
    note_id: z.string().min(1),
    profile_id: z.string().min(1),
    type: z.enum(['word', 'phrase', 'expression', 'sentence']),
    core: z.string().min(1),
    meaning_cn: z.string().min(1),
    status: z.enum(['active', 'mature', 'suspended', 'archived']),
    updated_at: z.string().min(1).optional(),
    pronunciation: z
      .object({
        text: z.string().min(1),
        lang: z.string().min(1),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();

export type CardManifest = z.infer<typeof manifestSchema>;
export type CardTemplatePayload = z.infer<typeof templateSchema>;
export type NotePayload = z.infer<typeof noteSchema>;
