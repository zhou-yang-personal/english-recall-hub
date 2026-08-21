import { describe, expect, it } from 'vitest';
import { selectSpeechVoice } from '../../src/infrastructure/speech/WebSpeechPlayer';

function voice(lang: string, isDefault = false): SpeechSynthesisVoice {
  return { lang, default: isDefault } as SpeechSynthesisVoice;
}

describe('WebSpeechPlayer voice selection', () => {
  it('prefers exact locale, then language, then the default voice', () => {
    const voices = [voice('fr-FR', true), voice('en-GB'), voice('en-US')];

    expect(selectSpeechVoice(voices, 'en-US')?.lang).toBe('en-US');
    expect(selectSpeechVoice(voices, 'en-AU')?.lang).toBe('en-GB');
    expect(selectSpeechVoice(voices, 'ja-JP')?.lang).toBe('fr-FR');
  });
});
