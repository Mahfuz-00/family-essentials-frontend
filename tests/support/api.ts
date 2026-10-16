import type { Mock } from 'vitest';

export interface ApiMock {
  get: Mock;
  post: Mock;
  patch: Mock;
  delete: Mock;
}

/**
 * Returns a resolved-axios-response shape. Pages read `response.data`, so the
 * payload is nested exactly as the real API nests it (`{ data: ... }`).
 */
export function jsonResponse(payload: unknown): Promise<unknown> {
  return Promise.resolve({
    data: payload,
    status: 200,
    statusText: 'OK',
    headers: {},
    config: {},
  });
}

/**
 * Stubs GET calls by URL prefix. Anything unstubbed rejects loudly, so a test
 * that forgets an endpoint fails with the URL instead of a confusing render.
 */
export function installGetRoutes(api: ApiMock, routes: Record<string, unknown>): void {
  api.get.mockImplementation((url: string) => {
    const match = Object.keys(routes)
      .sort((a, b) => b.length - a.length)
      .find((prefix) => url.startsWith(prefix));

    if (!match) {
      return Promise.reject(new Error(`Unstubbed GET ${url}`));
    }

    return jsonResponse(routes[match]);
  });
}
