import { describe, expect, it, vi } from 'vitest';
import type { LearnerProfile } from '../../src/domain/profile';
import {
  createLocalLearnerProfile,
  createLearnerProfile,
  linkLocalLearnerProfile,
  listLocalLearnerProfiles,
  loadCachedLearnerProfiles,
  loadLearnerProfiles,
  type LearnerProfileLocalStore,
  type LearnerProfileRepository,
} from '../../src/features/profiles/profileRepository';

const profile: LearnerProfile = {
  learnerProfileId: 'profile-1',
  cloudSyncId: 'family',
  displayName: 'Manman',
  contentProfileId: 'manman',
  uiLang: 'zh-CN',
  nativeLang: 'zh-CN',
  defaultLearningLang: 'en',
  englishVoiceLocale: 'en-US',
  spanishVoiceLocale: 'es-MX',
  ttsRate: 1,
  listeningModeDefault: false,
  dailyNewCardLimit: 10,
};

function dependencies() {
  const remote: LearnerProfileRepository = {
    list: vi.fn().mockResolvedValue([profile]),
    create: vi.fn().mockResolvedValue(profile),
  };
  const local: LearnerProfileLocalStore = {
    listAll: vi.fn().mockResolvedValue([profile]),
    getById: vi.fn().mockResolvedValue(profile),
    listCloudLinked: vi.fn().mockResolvedValue([profile]),
    replaceCloudLinked: vi.fn().mockResolvedValue(undefined),
    put: vi.fn().mockResolvedValue(undefined),
  };

  return { remote, local };
}

describe('LearnerProfile use cases', () => {
  it('lists every locally available learner without an account', async () => {
    const { local } = dependencies();

    await expect(listLocalLearnerProfiles(local)).resolves.toEqual([profile]);
    expect(local.listAll).toHaveBeenCalledOnce();
  });

  it('loads cached profiles without requiring the remote repository', async () => {
    const { local } = dependencies();

    await expect(loadCachedLearnerProfiles(local)).resolves.toEqual([profile]);
    expect(local.listCloudLinked).toHaveBeenCalledOnce();
  });

  it('refreshes the local cache after loading remote profiles', async () => {
    const { remote, local } = dependencies();

    await expect(loadLearnerProfiles(remote, local)).resolves.toEqual([profile]);
    expect(local.replaceCloudLinked).toHaveBeenCalledWith([profile]);
  });

  it('writes a newly created remote profile to the local store', async () => {
    const { remote, local } = dependencies();
    const input = { displayName: 'Manman', contentProfileId: 'manman' };

    await expect(createLearnerProfile(input, remote, local)).resolves.toEqual(profile);
    expect(remote.create).toHaveBeenCalledWith(input);
    expect(local.put).toHaveBeenCalledWith(profile);
  });

  it('links an existing local learner without changing its identifier', async () => {
    const { remote, local } = dependencies();
    const localProfile = { ...profile };
    delete localProfile.cloudSyncId;

    await expect(linkLocalLearnerProfile(localProfile, remote, local)).resolves.toEqual(profile);
    expect(remote.create).toHaveBeenCalledWith({
      learnerProfileId: 'profile-1',
      displayName: 'Manman',
      contentProfileId: 'manman',
    });
  });

  it('creates a local-only learner without an account identifier', async () => {
    const { local } = dependencies();

    const created = await createLocalLearnerProfile(
      { displayName: '  本机学习者  ', contentProfileId: 'manman' },
      local,
      () => 'local-profile-1',
    );

    expect(created).toMatchObject({
      learnerProfileId: 'local-profile-1',
      displayName: '本机学习者',
      contentProfileId: 'manman',
      dailyNewCardLimit: 10,
    });
    expect(created).not.toHaveProperty('cloudSyncId');
    expect(local.put).toHaveBeenCalledWith(created);
  });
});
