import type { CardContentSource } from '../../features/content-sync/contentSource';

export class GitHubCardSource implements CardContentSource {
  private readonly baseUrl: string;

  constructor(
    baseUrl: string,
    private readonly fetcher: typeof fetch = fetch,
  ) {
    this.baseUrl = `${baseUrl.replace(/\/+$/, '')}/`;
  }

  async readText(path: string): Promise<string> {
    if (path.startsWith('/') || path.split('/').includes('..')) {
      throw new Error(`拒绝访问卡片源之外的路径：${path}`);
    }

    const response = await this.fetcher(new URL(path, this.baseUrl));

    if (!response.ok) {
      throw new Error(`读取卡片内容失败（${response.status}）：${path}`);
    }

    return response.text();
  }
}
