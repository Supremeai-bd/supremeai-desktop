import { CustomerRecord } from '../types';
import { INITIAL_CUSTOMERS } from '../data/customerData';
import { INITIAL_MCP_SERVICES } from '../data/mcpTowerData';
import { apiClient } from './apiClient';
import { DataTransformer } from '../utils/dataTransformer';
import { env } from '../config/env';
import { logger } from '../utils/logger';

export class MockDataSyncService {
  private static instance: MockDataSyncService;
  private syncQueue: Array<{ type: string; data: any }> = [];
  private isSyncing = false;

  private constructor() {}

  public static getInstance(): MockDataSyncService {
    if (!MockDataSyncService.instance) {
      MockDataSyncService.instance = new MockDataSyncService();
    }
    return MockDataSyncService.instance;
  }

  public async queueSync(type: string, data: any): Promise<void> {
    this.syncQueue.push({ type, data });

    if (!this.isSyncing) {
      await this.processQueue();
    }
  }

  private async processQueue(): Promise<void> {
    if (this.syncQueue.length === 0) {
      this.isSyncing = false;
      return;
    }

    this.isSyncing = true;
    const item = this.syncQueue.shift()!;

    try {
      await this.syncItem(item.type, item.data);
    } catch (error) {
      logger.warn(`Failed to sync ${item.type}:`, error);
    }

    await this.processQueue();
  }

  private async syncItem(type: string, data: any): Promise<void> {
    switch (type) {
      case 'customer':
        await this.syncCustomer(data);
        break;
      case 'mcp_service':
        await this.syncMcpService(data);
        break;
      default:
        logger.warn(`Unknown sync type: ${type}`);
    }
  }

  private async syncCustomer(customer: Partial<CustomerRecord>): Promise<void> {
    const transformed = DataTransformer.transformCustomer(customer);
    try {
      const response = await apiClient.post<{ success: boolean; customer: CustomerRecord }>(
        '/api/customers',
        transformed
      );
      if (response && response.customer) {
        logger.debug(`✅ Synced customer: ${response.customer.id}`);
      }
    } catch (error) {
      logger.warn(`Customer sync skipped for: ${customer.id || 'new'}`, error);
    }
  }

  private async syncMcpService(service: any): Promise<void> {
    const transformed = DataTransformer.transformMcpService(service);
    try {
      await apiClient.post('/api/mcp-tower/probe', transformed);
      logger.debug(`✅ Synced MCP service: ${service.id}`);
    } catch (error) {
      logger.warn(`MCP service sync skipped for: ${service.id}`, error);
    }
  }

  public async syncAllMockData(): Promise<void> {
    if (env.isMockEnabled) {
      logger.debug('ℹ️ Running in mock mode: local state used.');
      return;
    }

    logger.debug('🔄 Starting mock to real data sync...');
    for (const customer of INITIAL_CUSTOMERS) {
      await this.queueSync('customer', customer);
    }
    for (const service of INITIAL_MCP_SERVICES) {
      await this.queueSync('mcp_service', service);
    }
    logger.debug('✅ Mock data sync sequence completed!');
  }

  public getSyncStatus(): { isSyncing: boolean; queueLength: number } {
    return {
      isSyncing: this.isSyncing,
      queueLength: this.syncQueue.length,
    };
  }
}

export const mockDataSync = MockDataSyncService.getInstance();
