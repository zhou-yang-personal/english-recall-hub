import type { CardContentSource } from './contentSource';
import type { ContentStore } from './contentStore';
import { syncContent, type ContentSyncReport } from './syncContent';

export class ContentSyncCoordinator {
  private readonly inFlight = new Map<string, Promise<ContentSyncReport>>();

  constructor(
    private readonly source: CardContentSource,
    private readonly store: ContentStore,
  ) {}

  run(contentProfileId: string): Promise<ContentSyncReport> {
    const existing = this.inFlight.get(contentProfileId);

    if (existing) {
      return existing;
    }

    const request = syncContent(contentProfileId, this.source, this.store).finally(() => {
      this.inFlight.delete(contentProfileId);
    });
    this.inFlight.set(contentProfileId, request);
    return request;
  }
}
