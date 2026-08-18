import { describe, expect, it } from 'vitest';
import { parseRuntimeConfig } from '../../src/shared/runtimeConfig';

const validConfig = {
  VITE_CARD_REPOSITORY_BASE_URL: 'https://raw.githubusercontent.com/example/repo/card',
  VITE_CARD_PROFILE_CATALOG_URL: 'https://api.github.com/repos/example/repo/contents/profiles?ref=card',
  VITE_PROGRESS_API_BASE_URL: '',
};

describe('runtime configuration', () => {
  it('accepts public HTTPS application settings', () => {
    expect(parseRuntimeConfig(validConfig)).toEqual(validConfig);
  });

  it('accepts an HTTPS progress API override', () => {
    const config = {
      ...validConfig,
      VITE_PROGRESS_API_BASE_URL: 'https://preview.example.workers.dev',
    };

    expect(parseRuntimeConfig(config)).toEqual(config);
  });

  it('rejects a non-HTTPS progress API override', () => {
    expect(() =>
      parseRuntimeConfig({
        ...validConfig,
        VITE_PROGRESS_API_BASE_URL: 'http://preview.example.workers.dev',
      }),
    ).toThrow();
  });

  it('rejects non-HTTPS remote URLs', () => {
    expect(() =>
      parseRuntimeConfig({
        ...validConfig,
        VITE_CARD_REPOSITORY_BASE_URL: 'http://example.test/card',
      }),
    ).toThrow();
  });
});
