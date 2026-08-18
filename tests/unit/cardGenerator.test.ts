import { describe, expect, it } from 'vitest';
import { generateCardsForNote } from '../../src/domain/cardGenerator';
import { sha256Hex } from '../../src/shared/sha256';

describe('generateCardsForNote', () => {
  it('creates the required lowercase SHA-256 stable id', async () => {
    await expect(sha256Hex('note-1|phrase.v1|recognition')).resolves.toBe(
      '4f84f0d28c0abc6adb2c20634bfc83a733475b882ad8c2f1c6351d56ee40fca8',
    );
  });

  it('generates only supported cards with stable canonical ids', async () => {
    const result = await generateCardsForNote(
      {
        contentProfileId: 'manman',
        noteId: 'note-1',
        noteType: 'phrase',
        status: 'active',
        core: 'work out',
        meaningCn: '奏效',
        pronunciationText: 'work out',
      },
      [
        {
          templateId: 'phrase.v1',
          noteType: 'phrase',
          cards: [
            { cardType: 'recognition', front: '{{core}} 是什么意思？', back: '{{meaning_cn}}' },
            { cardType: 'production', front: '{{meaning_cn}} 用英文怎么说？', back: '{{core}}' },
            { cardType: 'cloze', front: '{{missing}}', back: '{{core}}' },
          ],
        },
      ],
      async (canonical) => `hash:${canonical}`,
    );

    expect(result.cards).toHaveLength(2);
    expect(result.cards.map(({ cardId }) => cardId)).toEqual([
      'hash:note-1|phrase.v1|recognition',
      'hash:note-1|phrase.v1|production',
    ]);
    expect(result.cards[0]).toMatchObject({
      prompt: 'work out 是什么意思？',
      answer: '奏效',
      pronunciationText: 'work out',
    });
    expect(result.warnings).toEqual([]);
  });
});
