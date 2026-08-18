import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import type { AuthSession } from '../features/auth/authClient';

const SELECTED_PROFILE_KEY = 'english-recall-hub:selected-profile';

interface AppContextValue {
  authStatus: 'loading' | 'ready';
  session: AuthSession | null;
  selectedLearnerProfileId: string | null;
  selectLearnerProfile: (learnerProfileId: string | null) => void;
  signOut: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [authStatus, setAuthStatus] = useState<AppContextValue['authStatus']>('loading');
  const [session, setSession] = useState<AuthSession | null>(null);
  const [selectedLearnerProfileId, setSelectedLearnerProfileId] = useState<string | null>(() =>
    localStorage.getItem(SELECTED_PROFILE_KEY),
  );

  useEffect(() => {
    let active = true;
    let unsubscribe = () => {};

    void import('./services').then(async ({ appServices }) => {
      if (!active) {
        return;
      }

      unsubscribe = appServices.auth.onSessionChange((nextSession) => {
        setSession(nextSession);
        setAuthStatus('ready');
      });

      try {
        const nextSession = await appServices.auth.getSession();

        if (active) {
          setSession(nextSession);
        }
      } finally {
        if (active) {
          setAuthStatus('ready');
        }
      }
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const value = useMemo<AppContextValue>(
    () => ({
      authStatus,
      session,
      selectedLearnerProfileId,
      selectLearnerProfile: (learnerProfileId) => {
        setSelectedLearnerProfileId(learnerProfileId);

        if (learnerProfileId) {
          localStorage.setItem(SELECTED_PROFILE_KEY, learnerProfileId);
        } else {
          localStorage.removeItem(SELECTED_PROFILE_KEY);
        }
      },
      signOut: async () => {
        const { appServices } = await import('./services');
        await appServices.auth.signOut();
      },
    }),
    [authStatus, selectedLearnerProfileId, session],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const value = useContext(AppContext);

  if (!value) {
    throw new Error('useApp must be used inside AppProvider.');
  }

  return value;
}
