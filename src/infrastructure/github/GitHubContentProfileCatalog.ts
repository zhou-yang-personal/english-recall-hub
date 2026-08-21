import { z } from 'zod';
import type {
  ContentProfileCatalog,
  ContentProfileSummary,
} from '../../features/profiles/contentProfileCatalog';

const directoryEntrySchema = z.object({
  name: z.string(),
  type: z.string(),
});

const contentProfileIdPattern = /^[a-z0-9][a-z0-9_-]{0,63}$/u;

export class GitHubContentProfileCatalog implements ContentProfileCatalog {
  constructor(
    private readonly catalogUrl: string,
    private readonly fetcher: typeof fetch = fetch,
  ) {}

  async list(): Promise<ContentProfileSummary[]> {
    const response = await this.fetcher.call(globalThis, this.catalogUrl, {
      headers: { accept: 'application/vnd.github+json' },
    });

    if (!response.ok) {
      throw new Error(`读取 GitHub 学习者目录失败（${response.status}）。`);
    }

    const entries = z.array(directoryEntrySchema).parse(await response.json());
    return entries
      .filter(({ name, type }) => type === 'dir' && contentProfileIdPattern.test(name))
      .map(({ name }) => ({ contentProfileId: name, displayName: name }))
      .sort((left, right) => left.displayName.localeCompare(right.displayName));
  }
}
