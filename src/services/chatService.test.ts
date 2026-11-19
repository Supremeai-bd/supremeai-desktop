import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { chatService } from './chatService';
import type { ChatMessage } from '../types';

function createSseStream(frames: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      for (const frame of frames) {
        controller.enqueue(encoder.encode(frame));
      }
      controller.close();
    },
  });
}

describe('chatService', () => {
  beforeEach(() => {
    const store = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => {
        store.set(k, v);
      },
      removeItem: (k: string) => {
        store.delete(k);
      },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('forwards multimodal vision parts, run_config, and tuning params while parsing SSE metadata', async () => {
    let capturedBody: any = null;
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (_url, init) => {
      capturedBody = JSON.parse(String(init?.body || '{}'));
      return new Response(
        createSseStream([
          'data: {"choices":[{"delta":{"content":"Hello "}}]}\n\n',
          'data: {"choices":[{"delta":{"content":"world"}}]}\n\n',
          'data: {"groundingSources":[{"title":"Example","uri":"https://example.com"}],"tokenUsage":{"promptTokens":25,"candidateTokens":10,"totalTokens":35}}\n\n',
          'data: [DONE]\n\n',
        ]),
        { status: 200, headers: { 'Content-Type': 'text/event-stream' } }
      );
    });

    const imgAttachment = {
      name: 'diagram.png',
      mimeType: 'image/png',
      data: 'data:image/png;base64,iVBORw0KGgo=',
    };
    const messages: ChatMessage[] = [
      {
        id: 'm1',
        role: 'user',
        content: 'Analyze this diagram',
        timestamp: 1000,
        attachment: imgAttachment,
      },
    ];

    const chunks: string[] = [];
    let metaReceived: any = null;
    let doneText = '';

    await chatService.streamChat({
      model: 'supreme-spark',
      messages,
      temperature: 0.7,
      topP: 0.95,
      maxTokens: 2048,
      thinkingBudget: 1024,
      runConfig: {
        thinkingLevel: 'XHIGH',
        enableSearchGrounding: true,
        responseMimeType: 'text/plain',
        jsonSchemaText: '',
        agentLoopEnabled: true,
      },
      onChunk: (c) => chunks.push(c),
      onMeta: (m) => {
        metaReceived = m;
      },
      onDone: (full) => {
        doneText = full;
      },
      onError: (err) => {
        throw err;
      },
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(capturedBody.model).toBe('supreme-spark');
    expect(capturedBody.task_type).toBe('vision');
    expect(capturedBody.prompt).toBeUndefined();
    expect(capturedBody.temperature).toBe(0.7);
    expect(capturedBody.top_p).toBe(0.95);
    expect(capturedBody.max_tokens).toBe(2048);
    expect(capturedBody.thinking_budget).toBe(1024);

    const userMsg = capturedBody.messages.find((m: any) => m.role === 'user');
    expect(Array.isArray(userMsg.content)).toBe(true);
    expect(userMsg.content).toEqual([
      { type: 'text', text: 'Analyze this diagram' },
      {
        type: 'image_url',
        image_url: { url: 'data:image/png;base64,iVBORw0KGgo=' },
      },
    ]);
    expect(userMsg.attachment).toEqual(imgAttachment);
    expect(userMsg.parts[1].inlineData).toEqual({
      mimeType: 'image/png',
      data: 'iVBORw0KGgo=',
    });
    expect(capturedBody.run_config).toEqual({
      thinking_level: 'XHIGH',
      google_search: true,
      response_mime_type: 'text/plain',
    });

    expect(chunks.join('')).toBe('Hello world');
    expect(doneText).toBe('Hello world');
    expect(metaReceived?.groundingSources).toEqual([
      { title: 'Example', uri: 'https://example.com' },
    ]);
    expect(metaReceived?.tokenUsage?.totalTokens).toBe(35);
  });

  it('embeds plain and base64 text attachments cleanly without corrupting source code', async () => {
    let capturedBody: any = null;
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (_url, init) => {
      capturedBody = JSON.parse(String(init?.body || '{}'));
      return new Response(
        createSseStream([
          'data: {"choices":[{"delta":{"content":"Reviewed."}}]}\n\n',
          'data: [DONE]\n\n',
        ]),
        { status: 200, headers: { 'Content-Type': 'text/event-stream' } }
      );
    });

    await chatService.streamChat({
      model: 'supreme-spark',
      messages: [
        {
          id: 'm2',
          role: 'user',
          content: 'Review this script',
          timestamp: 2000,
          attachment: {
            name: 'script.py',
            mimeType: 'text/x-python',
            data: 'print("hello world")',
          },
        },
      ],
      onChunk: () => {},
      onDone: () => {},
      onError: (err) => {
        throw err;
      },
    });

    expect(capturedBody.task_type).toBe('chat');
    const userMsg = capturedBody.messages.find((m: any) => m.role === 'user');
    expect(userMsg.content).toContain('Review this script');
    expect(userMsg.content).toContain('[Attached Document: script.py (text/x-python)]');
    expect(userMsg.content).toContain('print("hello world")');
  });

  it('forwards multiple image attachments as inlineData parts with default analysis prompt when text is empty', async () => {
    let capturedBody: any = null;
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (_url, init) => {
      capturedBody = JSON.parse(String(init?.body || '{}'));
      return new Response(
        createSseStream([
          'data: {"choices":[{"delta":{"content":"Compared both images."}}]}\n\n',
          'data: [DONE]\n\n',
        ]),
        { status: 200, headers: { 'Content-Type': 'text/event-stream' } }
      );
    });

    const img1 = { name: 'before.png', mimeType: 'image/png', data: 'data:image/png;base64,AAA=' };
    const img2 = { name: 'after.jpg', mimeType: 'image/jpeg', data: 'data:image/jpeg;base64,BBB=' };

    await chatService.streamChat({
      model: 'supreme-core',
      messages: [
        {
          id: 'm3',
          role: 'user',
          content: '',
          timestamp: 3000,
          attachment: img1,
          attachments: [img1, img2],
        },
      ],
      onChunk: () => {},
      onDone: () => {},
      onError: (err) => {
        throw err;
      },
    });

    expect(capturedBody.task_type).toBe('vision');
    const userMsg = capturedBody.messages.find((m: any) => m.role === 'user');
    expect(Array.isArray(userMsg.content)).toBe(true);
    expect(userMsg.content).toHaveLength(3);
    expect(userMsg.content[0]).toEqual({
      type: 'text',
      text: expect.stringContaining('analyze'),
    });
    expect(userMsg.content[1]).toEqual({
      type: 'image_url',
      image_url: { url: 'data:image/png;base64,AAA=' },
    });
    expect(userMsg.content[2]).toEqual({
      type: 'image_url',
      image_url: { url: 'data:image/jpeg;base64,BBB=' },
    });
    expect(userMsg.attachment).toEqual(img1);
    expect(userMsg.attachments).toEqual([img1, img2]);
    expect(userMsg.parts).toHaveLength(3);
    expect(userMsg.parts[0].text).toContain('analyze');
    expect(userMsg.parts[1].inlineData).toEqual({ mimeType: 'image/png', data: 'AAA=' });
    expect(userMsg.parts[2].inlineData).toEqual({ mimeType: 'image/jpeg', data: 'BBB=' });
  });

  it('forwards derived reasoning_effort and extracts API Pool routeMeta and firstTokenMs latency', async () => {
    let capturedBody: any = null;
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (_url, init) => {
      capturedBody = JSON.parse(String(init?.body || '{}'));
      return new Response(
        createSseStream([
          'data: {"model":"supreme-reason","supremeai":{"provider":"supremeai-dynamic-squad","engine":"groq-pool","badge":"API Pool"},"choices":[{"delta":{"content":"Deep reasoning answer"}}]}\n\n',
          'data: [DONE]\n\n',
        ]),
        {
          status: 200,
          headers: {
            'Content-Type': 'text/event-stream',
            'X-SupremeAI-Provider': 'supremeai-dynamic-squad',
            'X-SupremeAI-Slot': 'slot-groq-1',
            'X-SupremeAI-Tier': 'Fast API Pool',
          },
        }
      );
    });

    const metaEvents: any[] = [];
    await chatService.streamChat({
      model: 'auto',
      messages: [
        {
          id: 'm4',
          role: 'user',
          content: 'Analyze distributed consensus tradeoffs',
          timestamp: 4000,
        },
      ],
      runConfig: {
        thinkingLevel: 'HIGH',
        enableSearchGrounding: false,
        responseMimeType: 'text/plain',
        jsonSchemaText: '',
        agentLoopEnabled: false,
      },
      onChunk: () => {},
      onMeta: (m) => {
        metaEvents.push(m);
      },
      onDone: () => {},
      onError: (err) => {
        throw err;
      },
    });

    expect(capturedBody.model).toBe('auto');
    expect(capturedBody.reasoning_effort).toBe('high');
    expect(capturedBody.thinking_budget).toBe(8192);

    const finalRoute = metaEvents.at(-1)?.routeMeta;
    expect(finalRoute).toBeDefined();
    expect(finalRoute.poolType).toBe('api-pool');
    expect(finalRoute.provider).toBe('supremeai-dynamic-squad');
    expect(finalRoute.engine).toBe('groq-pool');
    expect(finalRoute.servedModel).toBe('supreme-reason');
    expect(finalRoute.thinkingLevel).toBe('HIGH');
    expect(finalRoute.reasoningEffort).toBe('high');
    expect(typeof finalRoute.firstTokenMs).toBe('number');
    expect(finalRoute.firstTokenMs).toBeGreaterThanOrEqual(1);
  });

  it('identifies Webhook relay routes from X-SupremeAI-Provider header and supremeai-web', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
      return new Response(
        createSseStream([
          'data: {"choices":[{"delta":{"content":"Webhook response"}}]}\n\n',
          'data: [DONE]\n\n',
        ]),
        {
          status: 200,
          headers: {
            'Content-Type': 'text/event-stream',
            'X-SupremeAI-Provider': 'stealth-webhook',
            'X-SupremeAI-Tier': 'Web Relay',
          },
        }
      );
    });

    let latestMeta: any = null;
    await chatService.streamChat({
      model: 'supremeai-web',
      messages: [
        {
          id: 'm5',
          role: 'user',
          content: 'Latest updates today',
          timestamp: 5000,
        },
      ],
      runConfig: {
        thinkingLevel: 'MEDIUM',
        enableSearchGrounding: true,
        responseMimeType: 'text/plain',
        jsonSchemaText: '',
        agentLoopEnabled: false,
      },
      onChunk: () => {},
      onMeta: (m) => {
        if (m.routeMeta) latestMeta = m.routeMeta;
      },
      onDone: () => {},
      onError: (err) => {
        throw err;
      },
    });

    expect(latestMeta?.poolType).toBe('webhook');
    expect(latestMeta?.provider).toBe('stealth-webhook');
    expect(latestMeta?.reasoningEffort).toBe('medium');
  });
});
