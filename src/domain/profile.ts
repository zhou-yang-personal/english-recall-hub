export interface LearnerProfile {
  learnerProfileId: string;
  userId: string;
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
