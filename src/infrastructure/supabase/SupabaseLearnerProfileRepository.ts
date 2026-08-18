import { z } from 'zod';
import type { LearnerProfile } from '../../domain/profile';
import type {
  CreateLearnerProfileInput,
  LearnerProfileRepository,
} from '../../features/profiles/profileRepository';
import type { supabase } from './client';

type AppSupabaseClient = typeof supabase;

const settingsSchema = z.object({
  uiLang: z.literal('zh-CN'),
  nativeLang: z.string().min(2).max(16),
  defaultLearningLang: z.string().min(2).max(16),
  englishVoiceLocale: z.enum(['en-US', 'en-GB']),
  spanishVoiceLocale: z.enum(['es-MX', 'es-US', 'es-ES']),
  ttsRate: z.union([z.literal(0.75), z.literal(1), z.literal(1.25)]),
  listeningModeDefault: z.boolean(),
  dailyNewCardLimit: z.number().int().min(0).max(100),
});

const remoteProfileSchema = z.object({
  learner_profile_id: z.uuid(),
  user_id: z.uuid(),
  display_name: z.string(),
  content_profile_id: z.string(),
  settings: settingsSchema,
});

const defaultSettings = {
  uiLang: 'zh-CN',
  nativeLang: 'zh-CN',
  defaultLearningLang: 'en',
  englishVoiceLocale: 'en-US',
  spanishVoiceLocale: 'es-MX',
  ttsRate: 1,
  listeningModeDefault: false,
  dailyNewCardLimit: 10,
} as const;

function toLearnerProfile(value: unknown): LearnerProfile {
  const row = remoteProfileSchema.parse(value);

  return {
    learnerProfileId: row.learner_profile_id,
    userId: row.user_id,
    displayName: row.display_name,
    contentProfileId: row.content_profile_id,
    ...row.settings,
  };
}

export class SupabaseLearnerProfileRepository implements LearnerProfileRepository {
  constructor(private readonly client: AppSupabaseClient) {}

  async listByUser(userId: string): Promise<LearnerProfile[]> {
    const { data, error } = await this.client
      .from('learner_profiles')
      .select('learner_profile_id,user_id,display_name,content_profile_id,settings')
      .eq('user_id', userId)
      .order('created_at');

    if (error) {
      throw error;
    }

    return z.array(remoteProfileSchema).parse(data).map(toLearnerProfile);
  }

  async create(input: CreateLearnerProfileInput): Promise<LearnerProfile> {
    const { data, error } = await this.client
      .from('learner_profiles')
      .insert({
        learner_profile_id: crypto.randomUUID(),
        user_id: input.userId,
        display_name: input.displayName.trim(),
        content_profile_id: input.contentProfileId,
        settings: defaultSettings,
      })
      .select('learner_profile_id,user_id,display_name,content_profile_id,settings')
      .single();

    if (error) {
      throw error;
    }

    return toLearnerProfile(data);
  }
}
