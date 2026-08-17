export type ContentStatus = 'active' | 'suspended' | 'archived';

export interface NoteRecord {
  contentProfileId: string;
  noteId: string;
  status: ContentStatus;
  source: string;
  updatedAt: string;
  payload: unknown;
}

export interface CardRecord {
  contentProfileId: string;
  cardId: string;
  noteId: string;
  cardType: 'recognition' | 'production';
  status: ContentStatus;
  prompt: string;
  answer: string;
  pronunciationText?: string;
}
