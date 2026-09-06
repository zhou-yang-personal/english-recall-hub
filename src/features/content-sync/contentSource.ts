export interface CardContentSource {
  readText(path: string): Promise<string>;
}
