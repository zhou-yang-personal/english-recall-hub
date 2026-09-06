import { describe, expect, it, vi } from 'vitest';
import { GitHubContentProfileCatalog } from '../../src/infrastructure/github/GitHubContentProfileCatalog';

describe('GitHubContentProfileCatalog', () => {
  it('lists only valid profile directories from the card branch', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify([
      { name: 'manman', type: 'dir' },
      { name: 'README.md', type: 'file' },
      { name: 'xiaoming', type: 'dir' },
    ])));
    const catalog = new GitHubContentProfileCatalog(
      'https://api.github.com/repos/example/repo/contents/profiles?ref=card',
      fetcher,
    );

    await expect(catalog.list()).resolves.toEqual([
      { contentProfileId: 'manman', displayName: 'manman' },
      { contentProfileId: 'xiaoming', displayName: 'xiaoming' },
    ]);
    expect(fetcher).toHaveBeenCalledOnce();
  });

  it('fails clearly when GitHub cannot provide the directory', async () => {
    const catalog = new GitHubContentProfileCatalog(
      'https://api.github.com/repos/example/repo/contents/profiles?ref=card',
      vi.fn().mockResolvedValue(new Response('', { status: 403 })),
    );

    await expect(catalog.list()).rejects.toThrow('读取 GitHub 学习者目录失败（403）');
  });
});
