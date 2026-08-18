import {
  DEFAULT_LEARNER_PROFILE_SETTINGS,
  type LearnerProfile,
} from '../../domain/profile';

export interface CreateLearnerProfileInput {
  userId: string;
  displayName: string;
  contentProfileId: string;
}

export interface LearnerProfileRepository {
  listByUser(userId: string): Promise<LearnerProfile[]>;
  create(input: CreateLearnerProfileInput): Promise<LearnerProfile>;
}

export interface LearnerProfileLocalStore {
  listAll(): Promise<LearnerProfile[]>;
  listByUser(userId: string): Promise<LearnerProfile[]>;
  replaceForUser(userId: string, profiles: readonly LearnerProfile[]): Promise<void>;
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
  userId: string,
  local: LearnerProfileLocalStore,
): Promise<LearnerProfile[]> {
  return local.listByUser(userId);
}

export async function loadLearnerProfiles(
  userId: string,
  remote: LearnerProfileRepository,
  local: LearnerProfileLocalStore,
): Promise<LearnerProfile[]> {
  const profiles = await remote.listByUser(userId);
  await local.replaceForUser(userId, profiles);
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
