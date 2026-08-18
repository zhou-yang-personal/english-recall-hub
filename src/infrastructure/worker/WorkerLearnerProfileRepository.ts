import { z } from 'zod';
import type { LearnerProfile } from '../../domain/profile';
import type {
  CreateLearnerProfileInput,
  LearnerProfileRepository,
} from '../../features/profiles/profileRepository';
import type { WorkerApiClient } from './WorkerApiClient';

const profileSchema = z.object({
  learnerProfileId: z.uuid(),
  cloudSyncId: z.literal('family'),
  displayName: z.string().min(1).max(80),
  contentProfileId: z.string().regex(/^[a-z0-9][a-z0-9_-]{0,63}$/u),
  uiLang: z.literal('zh-CN'),
  nativeLang: z.string().min(2).max(16),
  defaultLearningLang: z.string().min(2).max(16),
  englishVoiceLocale: z.enum(['en-US', 'en-GB']),
  spanishVoiceLocale: z.enum(['es-MX', 'es-US', 'es-ES']),
  ttsRate: z.union([z.literal(0.75), z.literal(1), z.literal(1.25)]),
  listeningModeDefault: z.boolean(),
  dailyNewCardLimit: z.number().int().min(0).max(100),
});

export class WorkerLearnerProfileRepository implements LearnerProfileRepository {
  constructor(private readonly api: WorkerApiClient) {}

  async list(): Promise<LearnerProfile[]> {
    const result = await this.api.request<{ profiles: unknown[] }>('/profiles');
    return z.array(profileSchema).parse(result.profiles);
  }

  async create(input: CreateLearnerProfileInput): Promise<LearnerProfile> {
    const result = await this.api.request<{ profile: unknown }>('/profiles', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    return profileSchema.parse(result.profile);
  }
}
