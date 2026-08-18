import type { AuthClient, AuthSession } from '../../features/auth/authClient';
import type { supabase } from './client';

type AppSupabaseClient = typeof supabase;

function toAuthSession(session: Awaited<ReturnType<AppSupabaseClient['auth']['getSession']>>['data']['session']): AuthSession | null {
  if (!session) {
    return null;
  }

  return {
    userId: session.user.id,
    email: session.user.email,
  };
}

export class SupabaseAuthClient implements AuthClient {
  constructor(private readonly client: AppSupabaseClient) {}

  async getSession(): Promise<AuthSession | null> {
    const { data, error } = await this.client.auth.getSession();

    if (error) {
      throw error;
    }

    return toAuthSession(data.session);
  }

  onSessionChange(listener: (session: AuthSession | null) => void): () => void {
    const { data } = this.client.auth.onAuthStateChange((_event, session) => {
      listener(toAuthSession(session));
    });

    return () => data.subscription.unsubscribe();
  }

  async requestEmailOtp(email: string, redirectTo: string): Promise<void> {
    const { error } = await this.client.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: redirectTo,
        shouldCreateUser: true,
      },
    });

    if (error) {
      throw error;
    }
  }

  async verifyEmailOtp(email: string, token: string): Promise<void> {
    const { error } = await this.client.auth.verifyOtp({
      email,
      token,
      type: 'email',
    });

    if (error) {
      throw error;
    }
  }

  async signOut(): Promise<void> {
    const { error } = await this.client.auth.signOut();

    if (error) {
      throw error;
    }
  }
}
