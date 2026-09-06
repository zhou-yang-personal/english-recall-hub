import { useEffect, useState } from 'react';
import { useApp } from '../../app/AppContext';
import { appServices } from '../../app/services';
import type { LearnerProfile } from '../../domain/profile';

export function useSelectedLearnerProfile(): {
  loading: boolean;
  profile: LearnerProfile | undefined;
} {
  const { selectedLearnerProfileId } = useApp();
  const [loading, setLoading] = useState(Boolean(selectedLearnerProfileId));
  const [profile, setProfile] = useState<LearnerProfile>();

  useEffect(() => {
    let active = true;

    if (!selectedLearnerProfileId) {
      setProfile(undefined);
      setLoading(false);
      return () => {
        active = false;
      };
    }

    setLoading(true);
    void appServices.localProfiles
      .getById(selectedLearnerProfileId)
      .then((nextProfile) => {
        if (active) {
          setProfile(nextProfile);
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [selectedLearnerProfileId]);

  return { loading, profile };
}
