interface ApiErrorBody {
  error?: {
    code?: string;
    message?: string;
  };
}

export class WorkerApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
  ) {
    super(message);
  }
}

export class WorkerApiClient {
  private readonly baseUrl: string;

  constructor(baseUrl = '') {
    this.baseUrl = baseUrl.replace(/\/$/u, '');
  }

  async request<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await fetch(`${this.baseUrl}/api${path}`, {
      ...init,
      credentials: 'include',
      headers: {
        accept: 'application/json',
        ...(init?.body ? { 'content-type': 'application/json' } : {}),
        ...init?.headers,
      },
    });

    if (!response.ok) {
      let body: ApiErrorBody = {};

      try {
        body = await response.json() as ApiErrorBody;
      } catch {
        // Keep the stable fallback below when a proxy returns a non-JSON error.
      }

      throw new WorkerApiError(
        body.error?.message ?? '云端暂时不可用，本机数据未受影响。',
        response.status,
        body.error?.code ?? 'WORKER_API_ERROR',
      );
    }

    return response.json() as Promise<T>;
  }
}
