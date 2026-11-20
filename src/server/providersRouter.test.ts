import {{ describe, it, expect }} from 'vitest';
import { Express, Request, Response } from 'express';
import { registerProvidersRoutes } from '../server/providersRouter';

describe('src/server/providersRouter.ts', () => {
  it('should register providers routes (placeholder)', () => {
    expect(registerProvidersRoutes).toBeDefined();
  });
});
