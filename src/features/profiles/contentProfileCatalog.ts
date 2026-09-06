export interface ContentProfileSummary {
  contentProfileId: string;
  displayName: string;
}

export interface ContentProfileCatalog {
  list(): Promise<ContentProfileSummary[]>;
}
