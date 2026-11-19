import { describe, expect, it, vi } from 'vitest';

vi.mock('../config/env', () => ({
  env: { isMockEnabled: false, apiBaseUrl: '' },
}));

vi.mock('./apiClient', () => ({
  apiClient: { get: vi.fn(), post: vi.fn() },
}));

import { normalizeHitlPayload } from './hitlService';

describe('normalizeHitlPayload', () => {
  it('maps a bare array of gateway records', () => {
    const records = normalizeHitlPayload([
      {
        id: 'rec_1',
        action_name: 'Rotate provider key',
        command: 'rotate --all',
        module: 'gateway',
        severity: 'critical',
        context: { record_id: 'rec_1' },
        created_at: '2026-11-18T10:00:00Z',
      },
    ]);

    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({
      id: 'rec_1',
      action_name: 'Rotate provider key',
      severity: 'critical',
      status: 'pending',
    });
  });

  it('reads the pending envelope and drops settled records', () => {
    const records = normalizeHitlPayload({
      pending: [
        { id: 'a', message: 'Approve deploy', status: 'pending', severity: 'high' },
        { id: 'b', action: 'Approve deploy', status: 'approved' },
      ],
    });

    expect(records.map((record) => record.id)).toEqual(['a']);
    expect(records[0].action_name).toBe('Approve deploy');
  });

  it('falls back to safe defaults for unknown fields', () => {
    const [record] = normalizeHitlPayload({ items: [{ context: { record_id: 'ctx_9' } }] });

    expect(record.id).toBe('ctx_9');
    expect(record.severity).toBe('high');
    expect(record.status).toBe('pending');
    expect(record.action_name).toContain('Approval');
  });

  it('returns an empty list for unusable payloads', () => {
    expect(normalizeHitlPayload(null)).toEqual([]);
    expect(normalizeHitlPayload({})).toEqual([]);
    expect(normalizeHitlPayload('nope')).toEqual([]);
  });
});
