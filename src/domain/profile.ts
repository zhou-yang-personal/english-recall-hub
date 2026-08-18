export interface LearnerProfile {
  learnerProfileId: string;
  /** Present only when this learner is linked to a Supabase account. */
  userId?: string;
  displayName: string;
  contentProfileId: string;
  uiLang: 'zh-CN';
  nativeLang: string;
  defaultLearningLang: string;
  englishVoiceLocale: 'en-US' | 'en-GB';
  spanishVoiceLocale: 'es-MX' | 'es-US' | 'es-ES';
  ttsRate: 0.75 | 1 | 1.25;
  listeningModeDefault: boolean;
  dailyNewCardLimit: number;
}

export const DEFAULT_LEARNER_PROFILE_SETTINGS = {
  uiLang: 'zh-CN',
  nativeLang: 'zh-CN',
  defaultLearningLang: 'en',
  englishVoiceLocale: 'en-US',
  spanishVoiceLocale: 'es-MX',
  ttsRate: 1,
  listeningModeDefault: false,
  dailyNewCardLimit: 10,
} as const satisfies Omit<
  LearnerProfile,
  'learnerProfileId' | 'userId' | 'displayName' | 'contentProfileId'
>;
