export const APP_REFRESH_QUERY = 'app-refresh';

interface CacheStorageLike {
  keys(): Promise<string[]>;
  delete(cacheName: string): Promise<boolean>;
}

interface ServiceWorkerRegistrationLike {
  unregister(): Promise<boolean>;
}

interface ServiceWorkerContainerLike {
  getRegistrations(): Promise<readonly ServiceWorkerRegistrationLike[]>;
}

interface LocationLike {
  href: string;
  replace(url: string): void;
}

export interface AppResourceResetDependencies {
  cacheStorage: CacheStorageLike | undefined;
  serviceWorker: ServiceWorkerContainerLike | undefined;
  location: LocationLike;
  now: () => number;
}

function browserDependencies(): AppResourceResetDependencies {
  return {
    cacheStorage: typeof caches === 'undefined' ? undefined : caches,
    serviceWorker: typeof navigator !== 'undefined' && 'serviceWorker' in navigator
      ? navigator.serviceWorker
      : undefined,
    location: window.location,
    now: Date.now,
  };
}

export function createCacheBustedUrl(currentHref: string, nonce: number): string {
  const url = new URL(currentHref);
  url.searchParams.set(APP_REFRESH_QUERY, String(nonce));
  return url.toString();
}

export async function resetAppResources(
  dependencies: AppResourceResetDependencies = browserDependencies(),
): Promise<void> {
  const cacheStorage = dependencies.cacheStorage;
  const [registrations, cacheNames] = await Promise.all([
    dependencies.serviceWorker?.getRegistrations().catch(() => []) ?? [],
    cacheStorage?.keys().catch(() => []) ?? [],
  ]);

  await Promise.allSettled([
    ...registrations.map((registration) => registration.unregister()),
    ...(cacheStorage ? cacheNames.map((cacheName) => cacheStorage.delete(cacheName)) : []),
  ]);

  dependencies.location.replace(
    createCacheBustedUrl(dependencies.location.href, dependencies.now()),
  );
}
