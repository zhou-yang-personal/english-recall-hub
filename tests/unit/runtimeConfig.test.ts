import { describe, expect, it } from 'vitest';
import { parseRuntimeConfig } from '../../src/shared/runtimeConfig';

const validConfig = {
  VITE_SUPABASE_URL: 'https://example.supabase.co',
  VITE_SUPABASE_PUBLISHABLE_KEY: `sb_publishable_${'a'.repeat(32)}`,
  VITE_CARD_REPOSITORY_BASE_URL: 'https://raw.githubusercontent.com/example/repo/card',
};

describe('runtime configuration', () => {
  it('accepts public HTTPS application settings', () => {
    expect(parseRuntimeConfig(validConfig)).toEqual(validConfig);
  });

  it('rejects a secret key in the browser key slot', () => {
    expect(() =>
      parseRuntimeConfig({
        ...validConfig,
        VITE_SUPABASE_PUBLISHABLE_KEY: `sb_secret_${'a'.repeat(40)}`,
      }),
    ).toThrow();
  });

  it('rejects non-HTTPS remote URLs', () => {
    expect(() =>
      parseRuntimeConfig({
        ...validConfig,
        VITE_SUPABASE_URL: 'http://example.supabase.co',
      }),
    ).toThrow();
  });
});
