import {{ describe, it, expect }} from 'vitest';
import { Express, Request, Response } from 'express';
import { registerMcpRoutes } from '../server/mcpRouter';

describe('src/server/mcpRouter.ts', () => {
  it('should register mcp routes (placeholder)', () => {
    expect(registerMcpRoutes).toBeDefined();
  });
});
