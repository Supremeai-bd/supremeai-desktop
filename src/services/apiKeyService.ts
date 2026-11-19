import { apiClient } from './apiClient';
import { env } from '../config/env';
import { ApiKeyItem, GatewayProviderLatency } from '../types';
import { INITIAL_API_KEYS } from '../data/customerWorkspaceData';

export interface GatewayLatencyResponse {
  gatewayStatus: string;
  fetchedAt: string;
  providers: Record<string, GatewayProviderLatency>;
  list: GatewayProviderLatency[];
}

export const apiKeyService = {
  async fetchApiKeys(): Promise<ApiKeyItem[]> {
    if (env.isMockEnabled) {
      return INITIAL_API_KEYS;
    }
    try {
      const res = await apiClient.get<{ keys: ApiKeyItem[] }>('/api/api-keys');
      if (res && Array.isArray(res.keys)) {
        return res.keys;
      }
      return [];
    } catch {
      return [];
    }
  },

  async createApiKey(
    newKey: Omit<ApiKeyItem, 'id' | 'createdAt' | 'lastUsed'> & { rawSecret?: string }
  ): Promise<ApiKeyItem> {
    const fallbackItem: ApiKeyItem = {
      ...newKey,
      id: `key_${Date.now()}`,
      createdAt: new Date().toISOString().slice(0, 10),
      lastUsed: 'Never',
      healthStatus: newKey.healthStatus || 'healthy',
      lastChecked: 'Just now',
    };
    if (env.isMockEnabled) {
      return fallbackItem;
    }
    const res = await apiClient.post<{
      id?: string | number;
      name?: string;
      provider?: string;
      key?: string;
      keyPrefix?: string;
      key_masked?: string;
      secretMasked?: string;
      rateLimitRpm?: number;
      rate_limit_rps?: number;
      created_at?: string;
      createdAt?: string;
      scopes?: string[];
      permissions?: ApiKeyItem['permissions'];
      healthStatus?: ApiKeyItem['healthStatus'];
      lastChecked?: string;
    }>('/api/api-keys/create', {
      user_id: 'current_user',
      name: newKey.name,
      provider: newKey.provider || 'supremeai',
      secret: newKey.rawSecret,
      rateLimitRpm: newKey.rateLimitRpm,
      rate_limit_rps: Math.max(1, Math.floor(newKey.rateLimitRpm / 60)) || 6,
      scopes: newKey.permissions,
    });

    return {
      id: String(res.id || fallbackItem.id),
      name: res.name || newKey.name,
      provider: res.provider || newKey.provider || 'supremeai',
      keyPrefix: res.keyPrefix || (res.key ? res.key.slice(0, 12) : newKey.keyPrefix),
      secretMasked: res.secretMasked || res.key_masked || newKey.secretMasked,
      createdAt:
        res.createdAt ||
        (res.created_at ? String(res.created_at).slice(0, 10) : fallbackItem.createdAt),
      lastUsed: 'Never',
      rateLimitRpm:
        res.rateLimitRpm || (res.rate_limit_rps ? res.rate_limit_rps * 60 : newKey.rateLimitRpm),
      status: 'active',
      healthStatus: res.healthStatus || 'healthy',
      lastChecked: res.lastChecked || 'Just now',
      permissions:
        res.permissions || (res.scopes as ApiKeyItem['permissions']) || newKey.permissions,
    };
  },

  async updateApiKey(
    id: string,
    updates: Partial<ApiKeyItem> & { rawSecret?: string }
  ): Promise<ApiKeyItem | null> {
    if (env.isMockEnabled) {
      return null;
    }
    try {
      const payload: Record<string, unknown> = { ...updates };
      if (updates.rawSecret) {
        payload.secret = updates.rawSecret;
        delete payload.rawSecret;
      }
      const res = await apiClient.patch<{ success: boolean; key: ApiKeyItem }>(
        `/api/api-keys/${encodeURIComponent(id)}`,
        payload
      );
      return res?.key || null;
    } catch {
      return null;
    }
  },

  async probeApiKey(
    id: string
  ): Promise<{ success: boolean; latencyMs: number; message: string; key?: ApiKeyItem }> {
    if (env.isMockEnabled) {
      return {
        success: true,
        latencyMs: 24,
        message: 'Simulated probe succeeded.',
      };
    }
    return apiClient.post<{
      success: boolean;
      latencyMs: number;
      message: string;
      key?: ApiKeyItem;
    }>(`/api/api-keys/${encodeURIComponent(id)}/probe`, {});
  },

  async revokeApiKey(id: string): Promise<boolean> {
    if (env.isMockEnabled) {
      return true;
    }
    try {
      await apiClient.post(`/api/api-keys/${encodeURIComponent(id)}/revoke`, {});
      return true;
    } catch {
      return false;
    }
  },

  async deleteApiKey(id: string): Promise<boolean> {
    if (env.isMockEnabled) {
      return true;
    }
    try {
      await apiClient.delete(`/api/api-keys/${encodeURIComponent(id)}`);
      return true;
    } catch {
      return false;
    }
  },

  async fetchGatewayProviderLatencies(): Promise<GatewayLatencyResponse> {
    if (env.isMockEnabled) {
      return {
        gatewayStatus: 'offline',
        fetchedAt: new Date().toISOString(),
        providers: {},
        list: [],
      };
    }
    return apiClient.get<GatewayLatencyResponse>('/api/llm-gateway/latency');
  },
};
