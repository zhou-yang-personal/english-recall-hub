import type {
  CardGenerationNote,
  CardRecord,
  CardTemplateDefinition,
} from './content';

const SUPPORTED_CARD_TYPES = new Set(['recognition', 'production']);
const VARIABLE_PATTERN = /{{\s*([a-z_]+)\s*}}/g;

export type CardIdFactory = (canonicalValue: string) => Promise<string>;

function render(template: string, values: Record<string, string>): string | null {
  let missingValue = false;
  const rendered = template.replace(VARIABLE_PATTERN, (_match, key: string) => {
    const value = values[key];

    if (value === undefined) {
      missingValue = true;
      return '';
    }

    return value;
  });

  return missingValue ? null : rendered;
}

export async function generateCardsForNote(
  note: CardGenerationNote,
  templates: readonly CardTemplateDefinition[],
  createCardId: CardIdFactory,
): Promise<{ cards: CardRecord[]; warnings: string[] }> {
  const cards: CardRecord[] = [];
  const warnings: string[] = [];
  const matchingTemplates = templates.filter(({ noteType }) => noteType === note.noteType);

  if (matchingTemplates.length === 0) {
    return { cards, warnings: [`${note.noteId}: 未找到 ${note.noteType} 模板。`] };
  }

  for (const template of matchingTemplates) {
    for (const definition of template.cards) {
      if (!SUPPORTED_CARD_TYPES.has(definition.cardType)) {
        continue;
      }

      const values = { core: note.core, meaning_cn: note.meaningCn };
      const prompt = render(definition.front, values);
      const answer = render(definition.back, values);

      if (!prompt || !answer) {
        warnings.push(
          `${note.noteId}/${template.templateId}/${definition.cardType}: 模板引用了缺失字段。`,
        );
        continue;
      }

      const cardType = definition.cardType as CardRecord['cardType'];
      const cardId = await createCardId(
        `${note.noteId}|${template.templateId}|${cardType}`,
      );

      cards.push({
        contentProfileId: note.contentProfileId,
        cardId,
        noteId: note.noteId,
        templateId: template.templateId,
        cardType,
        status: note.status,
        prompt,
        answer,
        ...(note.pronunciationText
          ? { pronunciationText: note.pronunciationText }
          : {}),
      });
    }
  }

  return { cards, warnings };
}
