import {
  DEFAULT_LEARNER_PROFILE_SETTINGS,
  type LearnerProfile,
} from '../../domain/profile';

export interface CreateLearnerProfileInput {
  learnerProfileId?: string;
  displayName: string;
  contentProfileId: string;
}

export interface LearnerProfileRepository {
  list(): Promise<LearnerProfile[]>;
  create(input: CreateLearnerProfileInput): Promise<LearnerProfile>;
}

export interface LearnerProfileLocalStore {
  listAll(): Promise<LearnerProfile[]>;
  getById(learnerProfileId: string): Promise<LearnerProfile | undefined>;
  listCloudLinked(): Promise<LearnerProfile[]>;
  replaceCloudLinked(profiles: readonly LearnerProfile[]): Promise<void>;
  put(profile: LearnerProfile): Promise<void>;
}

export interface CreateLocalLearnerProfileInput {
  displayName: string;
  contentProfileId: string;
}

export function listLocalLearnerProfiles(
  local: LearnerProfileLocalStore,
): Promise<LearnerProfile[]> {
  return local.listAll();
}

export function loadCachedLearnerProfiles(
  local: LearnerProfileLocalStore,
): Promise<LearnerProfile[]> {
  return local.listCloudLinked();
}

export async function loadLearnerProfiles(
  remote: LearnerProfileRepository,
  local: LearnerProfileLocalStore,
): Promise<LearnerProfile[]> {
  const profiles = await remote.list();
  await local.replaceCloudLinked(profiles);
  return profiles;
}

export async function createLearnerProfile(
  input: CreateLearnerProfileInput,
  remote: LearnerProfileRepository,
  local: LearnerProfileLocalStore,
): Promise<LearnerProfile> {
  const profile = await remote.create(input);
  await local.put(profile);
  return profile;
}

export async function linkLocalLearnerProfile(
  profile: LearnerProfile,
  remote: LearnerProfileRepository,
  local: LearnerProfileLocalStore,
): Promise<LearnerProfile> {
  const linked = await remote.create({
    learnerProfileId: profile.learnerProfileId,
    displayName: profile.displayName,
    contentProfileId: profile.contentProfileId,
  });
  await local.put(linked);
  return linked;
}

export async function createLocalLearnerProfile(
  input: CreateLocalLearnerProfileInput,
  local: LearnerProfileLocalStore,
  createId: () => string = () => crypto.randomUUID(),
): Promise<LearnerProfile> {
  const displayName = input.displayName.trim();

  if (!displayName) {
    throw new Error('请输入学习者名称。');
  }

  const profile: LearnerProfile = {
    learnerProfileId: createId(),
    displayName,
    contentProfileId: input.contentProfileId,
    ...DEFAULT_LEARNER_PROFILE_SETTINGS,
  };

  await local.put(profile);
  return profile;
}
