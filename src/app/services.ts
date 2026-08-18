import { ContentSyncCoordinator } from '../features/content-sync/ContentSyncCoordinator';
import { ProgressSyncCoordinator } from '../features/progress-sync/ProgressSyncCoordinator';
import { DexieContentStore } from '../infrastructure/db/DexieContentStore';
import { DexieLearnerProfileStore } from '../infrastructure/db/DexieLearnerProfileStore';
import { db } from '../infrastructure/db/database';
import { GitHubCardSource } from '../infrastructure/github/GitHubCardSource';
import { GitHubContentProfileCatalog } from '../infrastructure/github/GitHubContentProfileCatalog';
import { WorkerApiClient } from '../infrastructure/worker/WorkerApiClient';
import { WorkerDeviceAccessClient } from '../infrastructure/worker/WorkerDeviceAccessClient';
import { WorkerLearnerProfileRepository } from '../infrastructure/worker/WorkerLearnerProfileRepository';
import { WorkerProgressRemote } from '../infrastructure/worker/WorkerProgressRemote';
import { getRuntimeConfig } from '../shared/runtimeConfig';

const config = getRuntimeConfig();
const cardSource = new GitHubCardSource(config.VITE_CARD_REPOSITORY_BASE_URL);
const contentStore = new DexieContentStore(db);
const workerApi = new WorkerApiClient(config.VITE_PROGRESS_API_BASE_URL);
const progressRemote = new WorkerProgressRemote(workerApi);

export const appServices = {
  deviceAccess: new WorkerDeviceAccessClient(workerApi),
  profiles: new WorkerLearnerProfileRepository(workerApi),
  localProfiles: new DexieLearnerProfileStore(db),
  contentProfiles: new GitHubContentProfileCatalog(config.VITE_CARD_PROFILE_CATALOG_URL),
  cardSource,
  contentStore,
  contentSync: new ContentSyncCoordinator(cardSource, contentStore),
  progressSync: new ProgressSyncCoordinator(db, progressRemote),
  database: db,
};
