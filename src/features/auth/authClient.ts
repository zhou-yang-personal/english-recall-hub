export interface AuthSession {
  userId: string;
  email: string | undefined;
}

export interface AuthClient {
  getSession(): Promise<AuthSession | null>;
  onSessionChange(listener: (session: AuthSession | null) => void): () => void;
  requestEmailOtp(email: string, redirectTo: string): Promise<void>;
  verifyEmailOtp(email: string, token: string): Promise<void>;
  signOut(): Promise<void>;
}
