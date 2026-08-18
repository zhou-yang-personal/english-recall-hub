import type { RecallDatabase } from '../../infrastructure/db/database';
import type { ProgressRemote } from './progressRemote';
import { syncProgress, type ProgressSyncReport } from './syncProgress';

export class ProgressSyncCoordinator {
  private readonly running = new Map<string, Promise<ProgressSyncReport>>();

  constructor(
    private readonly database: RecallDatabase,
    private readonly remote: ProgressRemote,
  ) {}

  run(learnerProfileId: string): Promise<ProgressSyncReport> {
    const existing = this.running.get(learnerProfileId);

    if (existing) {
      return existing;
    }

    const task = syncProgress(this.database, learnerProfileId, this.remote)
      .finally(() => this.running.delete(learnerProfileId));
    this.running.set(learnerProfileId, task);
    return task;
  }
}
