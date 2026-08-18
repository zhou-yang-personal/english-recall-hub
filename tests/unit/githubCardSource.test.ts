import { describe, expect, it, vi } from 'vitest';
import { GitHubCardSource } from '../../src/infrastructure/github/GitHubCardSource';

describe('GitHubCardSource', () => {
  it('calls browser fetch with the global receiver', async () => {
    const fetcher = vi.fn(function (this: unknown, input: RequestInfo | URL) {
      if (this !== globalThis) {
        throw new TypeError('Illegal invocation');
      }

      expect(String(input)).toBe('https://content.example/card/profiles/manman/manifest.json');
      return Promise.resolve(new Response('manifest'));
    }) as typeof fetch;
    const source = new GitHubCardSource('https://content.example/card', fetcher);

    await expect(source.readText('profiles/manman/manifest.json')).resolves.toBe('manifest');
  });
});
