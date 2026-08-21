import type { SpeechPlayer, SpeechRequest } from '../../features/tts/speechPlayer';

export function selectSpeechVoice(
  voices: readonly SpeechSynthesisVoice[],
  locale: string,
): SpeechSynthesisVoice | undefined {
  const normalizedLocale = locale.toLocaleLowerCase();
  const language = normalizedLocale.split('-')[0];
  return voices.find((voice) => voice.lang.toLocaleLowerCase() === normalizedLocale)
    ?? voices.find((voice) => voice.lang.toLocaleLowerCase().split('-')[0] === language)
    ?? voices.find((voice) => voice.default);
}

export class WebSpeechPlayer implements SpeechPlayer {
  isAvailable(): boolean {
    return typeof window !== 'undefined'
      && 'speechSynthesis' in window
      && 'SpeechSynthesisUtterance' in window;
  }

  speak(request: SpeechRequest): Promise<void> {
    if (!this.isAvailable()) {
      return Promise.reject(new Error('当前浏览器不支持语音朗读。'));
    }

    this.stop();
    const utterance = new SpeechSynthesisUtterance(request.text);
    utterance.lang = request.locale;
    utterance.rate = request.rate;
    const voice = selectSpeechVoice(window.speechSynthesis.getVoices(), request.locale);

    if (voice) {
      utterance.voice = voice;
    }

    return new Promise((resolve, reject) => {
      utterance.addEventListener('end', () => resolve(), { once: true });
      utterance.addEventListener(
        'error',
        () => reject(new Error('语音播放失败，请检查浏览器语音设置。')),
        { once: true },
      );
      window.speechSynthesis.speak(utterance);
    });
  }

  stop(): void {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }
}
