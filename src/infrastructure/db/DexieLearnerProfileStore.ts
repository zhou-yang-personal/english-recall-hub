import type { LearnerProfile } from '../../domain/profile';
import type { LearnerProfileLocalStore } from '../../features/profiles/profileRepository';
import type { RecallDatabase } from './database';

export class DexieLearnerProfileStore implements LearnerProfileLocalStore {
  constructor(private readonly database: RecallDatabase) {}

  listAll(): Promise<LearnerProfile[]> {
    return this.database.learnerProfiles.toArray();
  }

  getById(learnerProfileId: string): Promise<LearnerProfile | undefined> {
    return this.database.learnerProfiles.get(learnerProfileId);
  }

  listCloudLinked(): Promise<LearnerProfile[]> {
    return this.database.learnerProfiles.where('cloudSyncId').equals('family').toArray();
  }

  async replaceCloudLinked(profiles: readonly LearnerProfile[]): Promise<void> {
    await this.database.transaction('rw', this.database.learnerProfiles, async () => {
      const localIds = await this.database.learnerProfiles
        .where('cloudSyncId')
        .equals('family')
        .primaryKeys();
      const remoteIds = new Set(profiles.map(({ learnerProfileId }) => learnerProfileId));
      const removedIds = localIds.filter((id) => !remoteIds.has(id));

      await this.database.learnerProfiles.bulkDelete(removedIds);
      await this.database.learnerProfiles.bulkPut([...profiles]);
    });
  }

  async put(profile: LearnerProfile): Promise<void> {
    await this.database.learnerProfiles.put(profile);
  }
}
