import { describe, expect, it } from 'vitest';
import { handleApiRequest, type WorkerEnv } from '../../worker/index';

function environment(): WorkerEnv {
  return {
    ASSETS: { fetch: async () => new Response('asset') },
    SUPABASE_URL: 'https://example.supabase.co',
    SUPABASE_SECRET_KEY: `sb_secret_${'s'.repeat(40)}`,
    FAMILY_OWNER_USER_ID: '11111111-1111-4111-8111-111111111111',
    FAMILY_PAIRING_CODE: 'family-code-1234',
    DEVICE_SESSION_SECRET: 'session-secret-that-is-at-least-32-characters',
  };
}

describe('Worker device pairing', () => {
  it('rejects an incorrect pairing code without issuing a cookie', async () => {
    const response = await handleApiRequest(
      new Request('https://app.example/api/device/pair', {
        method: 'POST',
        headers: { origin: 'https://app.example', 'content-type': 'application/json' },
        body: JSON.stringify({ pairingCode: 'incorrect-code' }),
      }),
      environment(),
    );

    expect(response.status).toBe(401);
    expect(response.headers.get('set-cookie')).toBeNull();
  });

  it('issues a signed HttpOnly cookie that authorizes later API requests', async () => {
    const env = environment();
    const pairResponse = await handleApiRequest(
      new Request('https://app.example/api/device/pair', {
        method: 'POST',
        headers: { origin: 'https://app.example', 'content-type': 'application/json' },
        body: JSON.stringify({ pairingCode: env.FAMILY_PAIRING_CODE }),
      }),
      env,
    );
    const setCookie = pairResponse.headers.get('set-cookie');

    expect(pairResponse.status).toBe(200);
    expect(setCookie).toContain('HttpOnly');
    expect(setCookie).toContain('SameSite=Strict');

    const statusResponse = await handleApiRequest(
      new Request('https://app.example/api/device/status', {
        headers: { cookie: setCookie!.split(';')[0]! },
      }),
      env,
    );

    await expect(statusResponse.json()).resolves.toEqual({ paired: true });
  });

  it('does not authorize a tampered session cookie', async () => {
    const response = await handleApiRequest(
      new Request('https://app.example/api/device/status', {
        headers: { cookie: 'erh_device_session=tampered.value' },
      }),
      environment(),
    );

    await expect(response.json()).resolves.toEqual({ paired: false });
  });
});
