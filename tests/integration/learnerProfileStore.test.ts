import 'fake-indexeddb/auto';
import Dexie from 'dexie';
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

  it('upgrades an existing v1 database without losing learner profiles', async () => {
    const databaseName = 'local-database-v1-upgrade-test';
    const legacyDatabase = new Dexie(databaseName);
    legacyDatabase.version(1).stores({
      learnerProfiles: '&learnerProfileId, userId, contentProfileId',
      notes: '&[contentProfileId+noteId], contentProfileId, [contentProfileId+status]',
      cards:
        '&[contentProfileId+cardId], contentProfileId, [contentProfileId+noteId], [contentProfileId+status]',
      reviewEvents:
        '&eventId, learnerProfileId, [learnerProfileId+cardId], [learnerProfileId+syncStatus], remoteSeq',
      reviewStates:
        '&[learnerProfileId+cardId], [learnerProfileId+dueAt], [learnerProfileId+state]',
      syncStates: '&learnerProfileId',
    });
    await legacyDatabase.table('learnerProfiles').put({
      learnerProfileId: 'existing-profile',
      displayName: '已有学习者',
      contentProfileId: 'manman',
      uiLang: 'zh-CN',
      nativeLang: 'zh-CN',
      defaultLearningLang: 'en',
      englishVoiceLocale: 'en-US',
      spanishVoiceLocale: 'es-MX',
      ttsRate: 1,
      listeningModeDefault: false,
      dailyNewCardLimit: 10,
    });
    legacyDatabase.close();

    database = new RecallDatabase(databaseName);

    await expect(database.learnerProfiles.get('existing-profile')).resolves.toMatchObject({
      displayName: '已有学习者',
    });
    await expect(database.contentSyncStates.count()).resolves.toBe(0);
  });
});
