import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import type { DeviceAccessStatus } from '../features/sync-access/deviceAccessClient';

const SELECTED_PROFILE_KEY = 'english-recall-hub:selected-profile';

interface AppContextValue {
  cloudStatus: DeviceAccessStatus;
  selectedLearnerProfileId: string | null;
  selectLearnerProfile: (learnerProfileId: string | null) => void;
  pairDevice: (pairingCode: string) => Promise<void>;
  refreshCloudStatus: () => Promise<void>;
  unpairDevice: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [cloudStatus, setCloudStatus] = useState<DeviceAccessStatus>('loading');
  const [selectedLearnerProfileId, setSelectedLearnerProfileId] = useState<string | null>(() =>
    localStorage.getItem(SELECTED_PROFILE_KEY),
  );

  useEffect(() => {
    let active = true;

    void import('./services').then(async ({ appServices }) => {
      try {
        const paired = await appServices.deviceAccess.getStatus();

        if (active) {
          setCloudStatus(paired ? 'paired' : 'unpaired');
        }
      } catch {
        if (active) {
          setCloudStatus('unavailable');
        }
      }
    });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (cloudStatus !== 'paired' || !selectedLearnerProfileId) {
      return;
    }

    const synchronize = () => {
      void import('./services').then(({ appServices }) =>
        appServices.progressSync.run(selectedLearnerProfileId).catch(() => undefined),
      );
    };
    window.addEventListener('online', synchronize);
    return () => window.removeEventListener('online', synchronize);
  }, [cloudStatus, selectedLearnerProfileId]);

  const value = useMemo<AppContextValue>(
    () => ({
      cloudStatus,
      selectedLearnerProfileId,
      selectLearnerProfile: (learnerProfileId) => {
        setSelectedLearnerProfileId(learnerProfileId);

        if (learnerProfileId) {
          localStorage.setItem(SELECTED_PROFILE_KEY, learnerProfileId);
        } else {
          localStorage.removeItem(SELECTED_PROFILE_KEY);
        }
      },
      pairDevice: async (pairingCode) => {
        const { appServices } = await import('./services');
        await appServices.deviceAccess.pair(pairingCode);
        setCloudStatus('paired');
      },
      refreshCloudStatus: async () => {
        const { appServices } = await import('./services');

        try {
          const paired = await appServices.deviceAccess.getStatus();
          setCloudStatus(paired ? 'paired' : 'unpaired');
        } catch {
          setCloudStatus('unavailable');
        }
      },
      unpairDevice: async () => {
        const { appServices } = await import('./services');

        try {
          await appServices.deviceAccess.unpair();
          setCloudStatus('unpaired');
        } catch {
          setCloudStatus('unavailable');
        }
      },
    }),
    [cloudStatus, selectedLearnerProfileId],
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
