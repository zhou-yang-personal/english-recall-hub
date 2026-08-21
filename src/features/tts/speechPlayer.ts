export interface SpeechRequest {
  text: string;
  locale: string;
  rate: 0.75 | 1 | 1.25;
}

export interface SpeechPlayer {
  isAvailable(): boolean;
  speak(request: SpeechRequest): Promise<void>;
  stop(): void;
}
