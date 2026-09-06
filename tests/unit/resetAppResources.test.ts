import { describe, expect, it, vi } from 'vitest';
import {
  createCacheBustedUrl,
  resetAppResources,
} from '../../src/features/app-update/resetAppResources';

describe('application resource reset', () => {
  it('preserves the current route while replacing the refresh marker', () => {
    const url = createCacheBustedUrl(
      'https://example.test/settings?tab=app#update',
      1234,
    );

    expect(url).toBe('https://example.test/settings?tab=app&app-refresh=1234#update');
  });

  it('clears only service-worker registrations and Cache Storage before reloading', async () => {
    const unregisterFirst = vi.fn().mockResolvedValue(true);
    const unregisterSecond = vi.fn().mockResolvedValue(true);
    const deleteCache = vi.fn().mockResolvedValue(true);
    const replace = vi.fn();

    await resetAppResources({
      cacheStorage: {
        keys: vi.fn().mockResolvedValue(['workbox-precache', 'runtime-public-content']),
        delete: deleteCache,
      },
      serviceWorker: {
        getRegistrations: vi.fn().mockResolvedValue([
          { unregister: unregisterFirst },
          { unregister: unregisterSecond },
        ]),
      },
      location: {
        href: 'https://example.test/settings',
        replace,
      },
      now: () => 5678,
    });

    expect(unregisterFirst).toHaveBeenCalledOnce();
    expect(unregisterSecond).toHaveBeenCalledOnce();
    expect(deleteCache).toHaveBeenCalledTimes(2);
    expect(deleteCache).toHaveBeenNthCalledWith(1, 'workbox-precache');
    expect(deleteCache).toHaveBeenNthCalledWith(2, 'runtime-public-content');
    expect(replace).toHaveBeenCalledWith('https://example.test/settings?app-refresh=5678');
  });

  it('still performs a cache-busted reload when browser cleanup APIs fail', async () => {
    const replace = vi.fn();

    await resetAppResources({
      cacheStorage: {
        keys: vi.fn().mockRejectedValue(new Error('cache unavailable')),
        delete: vi.fn(),
      },
      serviceWorker: {
        getRegistrations: vi.fn().mockRejectedValue(new Error('worker unavailable')),
      },
      location: {
        href: 'https://example.test/',
        replace,
      },
      now: () => 9012,
    });

    expect(replace).toHaveBeenCalledWith('https://example.test/?app-refresh=9012');
  });
});
