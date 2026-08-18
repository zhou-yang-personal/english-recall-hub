import type { LearnerProfile } from '../../domain/profile';

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
  listByUser(userId: string): Promise<LearnerProfile[]>;
  replaceForUser(userId: string, profiles: readonly LearnerProfile[]): Promise<void>;
  put(profile: LearnerProfile): Promise<void>;
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
