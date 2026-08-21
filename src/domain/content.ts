export type ContentStatus = 'active' | 'mature' | 'suspended' | 'archived';

export interface NoteRecord {
  contentProfileId: string;
  noteId: string;
  status: ContentStatus;
  source: string;
  updatedAt: string;
  noteType: string;
  core: string;
  meaningCn: string;
  pronunciationText?: string;
  pronunciationLang?: string;
  payload: unknown;
}

export interface CardRecord {
  contentProfileId: string;
  cardId: string;
  noteId: string;
  templateId: string;
  cardType: 'recognition' | 'production';
  status: ContentStatus;
  prompt: string;
  answer: string;
  core: string;
  meaningCn: string;
  pronunciationText?: string;
  pronunciationLang?: string;
}

export interface CardTemplateDefinition {
  templateId: string;
  noteType: string;
  cards: Array<{
    cardType: string;
    front: string;
    back: string;
  }>;
}

export interface CardGenerationNote {
  contentProfileId: string;
  noteId: string;
  noteType: string;
  status: ContentStatus;
  core: string;
  meaningCn: string;
  pronunciationText?: string;
  pronunciationLang?: string;
}
