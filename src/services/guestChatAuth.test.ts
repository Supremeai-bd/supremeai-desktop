import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { authService } from './authService';
import { chatService } from './chatService';

function createMemoryStorage(): Storage {
  const store: Record<string, string> = {};
  return {
    getItem: (key: string) => (key in store ? store[key] : null),
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      for (const k of Object.keys(store)) delete store[k];
    },
    key: (i: number) => Object.keys(store)[i] ?? null,
    get length() {
      return Object.keys(store).length;
    },
  };
}

describe('Guest Mode Chat Trial Token Flow', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    (globalThis as unknown as { localStorage: Storage }).localStorage = createMemoryStorage();
    (globalThis as unknown as { sessionStorage: Storage }).sessionStorage = createMemoryStorage();
    authService.clearGuestToken();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    localStorage.clear();
    sessionStorage.clear();
    authService.clearGuestToken();
    vi.restoreAllMocks();
  });

  it('automatically acquires a guest trial token on 401 and reuses it across guest chat requests', async () => {
    const calls: Array<{ url: string; auth?: string; key?: string }> = [];

    globalThis.fetch = vi.fn(async (url, init) => {
      const urlStr = String(url);
      const headers = new Headers(init?.headers);
      calls.push({
        url: urlStr,
        auth: headers.get('Authorization') || undefined,
        key: headers.get('X-SupremeAI-Key') || undefined,
      });

      if (urlStr.includes('/api/v1/auth/guest')) {
        return new Response(
          JSON.stringify({
            status: 'ok',
            access_token: 'sk-supreme-guest.test.token',
            token_type: 'bearer',
            expires_in: 3600,
            class: 'guest',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      if (urlStr.includes('/api/v1/stream/chat')) {
        const auth = headers.get('Authorization');
        if (auth !== 'Bearer sk-supreme-guest.test.token') {
          return new Response(
            JSON.stringify({
              detail: 'Unauthorized: Invalid or missing X-SupremeAI-Key / Bearer token',
            }),
            { status: 401, headers: { 'Content-Type': 'application/json' } }
          );
        }

        const stream = new ReadableStream({
          start(controller) {
            controller.enqueue(
              new TextEncoder().encode(
                'data: {"choices":[{"delta":{"content":"Hello guest!"}}]}\n\ndata: [DONE]\n\n'
              )
            );
            controller.close();
          },
        });
        return new Response(stream, {
          status: 200,
          headers: { 'Content-Type': 'text/event-stream' },
        });
      }

      return new Response('{}', { status: 404 });
    }) as typeof fetch;

    let doneText = '';
    const errors: Error[] = [];

    await chatService.streamChat({
      model: 'supreme-core',
      messages: [{ id: '1', role: 'user', content: 'hi', timestamp: Date.now() }],
      onChunk: () => {},
      onDone: (full) => {
        doneText = full;
      },
      onError: (err) => {
        errors.push(err);
      },
    });

    expect(errors).toHaveLength(0);
    expect(doneText).toBe('Hello guest!');
    expect(calls.map((c) => c.url)).toEqual([
      '/api/v1/stream/chat',
      '/api/v1/auth/guest',
      '/api/v1/stream/chat',
    ]);
    expect(calls[2].auth).toBe('Bearer sk-supreme-guest.test.token');
    expect(calls[2].key).toBe('sk-supreme-guest.test.token');

    // Second guest chat message should reuse cached guest token directly without extra /auth/guest call
    let secondText = '';
    await chatService.streamChat({
      model: 'supremeai-web',
      messages: [{ id: '2', role: 'user', content: 'next', timestamp: Date.now() }],
      onChunk: () => {},
      onDone: (full) => {
        secondText = full;
      },
      onError: (err) => {
        errors.push(err);
      },
    });

    expect(errors).toHaveLength(0);
    expect(secondText).toBe('Hello guest!');
    expect(calls).toHaveLength(4);
    expect(calls[3].auth).toBe('Bearer sk-supreme-guest.test.token');
  });
});
