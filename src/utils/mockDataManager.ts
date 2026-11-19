import { INITIAL_CUSTOMERS } from '../data/customerData';
import { INITIAL_MCP_SERVICES, INITIAL_ADMIN_METRICS } from '../data/mcpTowerData';
import { INITIAL_WORKSPACE_TEMPLATES } from '../data/customerWorkspaceData';
import { INITIAL_PLUGINS } from '../data/userPlugins';
import { SYSTEM_ROLES } from '../data/roles';

/** A stored mock row; `id` is what update/delete match on. */
type MockRecord = Record<string, unknown> & { id?: string };

function isRecord(value: unknown): value is MockRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export class MockDataManager {
  private static instance: MockDataManager;
  private mockData: Record<string, unknown> = {};

  private constructor() {
    this.initializeMockData();
  }

  public static getInstance(): MockDataManager {
    if (!MockDataManager.instance) {
      MockDataManager.instance = new MockDataManager();
    }
    return MockDataManager.instance;
  }

  public initializeMockData(): void {
    this.mockData = {
      customers: [...INITIAL_CUSTOMERS],
      mcpServices: [...INITIAL_MCP_SERVICES],
      workspaceTemplates: [...INITIAL_WORKSPACE_TEMPLATES],
      userPlugins: [...INITIAL_PLUGINS],
      roles: [...SYSTEM_ROLES],
      adminMetrics: { ...INITIAL_ADMIN_METRICS },
    };
  }

  public getMockData<T = unknown>(key: string): T {
    return (this.mockData[key] ?? []) as T;
  }

  public addMockData(key: string, data: unknown): void {
    const bucket = this.mockData[key];
    if (Array.isArray(bucket)) {
      bucket.unshift(data);
      return;
    }
    this.mockData[key] = [data];
  }

  public updateMockData<T extends object = MockRecord>(
    key: string,
    id: string,
    updates: Partial<T>
  ): T | null {
    const bucket = this.mockData[key];
    if (!Array.isArray(bucket)) return null;

    const index = bucket.findIndex((item) => isRecord(item) && item.id === id);
    if (index === -1) return null;

    const current = isRecord(bucket[index]) ? bucket[index] : {};
    const next = { ...current, ...updates } as unknown as T;
    bucket[index] = next as MockRecord;
    return next;
  }

  public deleteMockData(key: string, id: string): boolean {
    const bucket = this.mockData[key];
    if (!Array.isArray(bucket)) return false;

    const index = bucket.findIndex((item) => isRecord(item) && item.id === id);
    if (index === -1) return false;

    bucket.splice(index, 1);
    return true;
  }

  public resetMockData(): void {
    this.initializeMockData();
  }
}

export const mockDataManager = MockDataManager.getInstance();
