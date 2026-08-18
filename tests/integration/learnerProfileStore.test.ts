import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it } from 'vitest';
import { createLocalLearnerProfile } from '../../src/features/profiles/profileRepository';
import { DexieLearnerProfileStore } from '../../src/infrastructure/db/DexieLearnerProfileStore';
import { RecallDatabase } from '../../src/infrastructure/db/database';

let database: RecallDatabase | undefined;

afterEach(async () => {
  if (database) {
    await database.delete();
    database = undefined;
  }
});

describe('DexieLearnerProfileStore', () => {
  it('persists and lists a learner without a cloud account', async () => {
    database = new RecallDatabase('local-learner-profile-test');
    const store = new DexieLearnerProfileStore(database);

    const created = await createLocalLearnerProfile(
      { displayName: '本机学习者', contentProfileId: 'manman' },
      store,
      () => 'local-profile-1',
    );

    await expect(store.listAll()).resolves.toEqual([created]);
    await expect(store.listByUser('cloud-user')).resolves.toEqual([]);
  });
});
