import { fetchJson } from '../utils/http';
import { logger } from '../utils/logger';

import type { PlanTier } from '../types';

export interface PlanSpec {
  id: PlanTier;
  monthlyPriceUsd: number;
  monthlyTokensLimit: number;
  maxSeats: number;
  rateLimitRpm: number;
  contextWindowLabel: string;
}

export interface TopUpPackage {
  id: string;
  amountUsd: number;
  tokensBonus: number;
  badgeKey?: 'popular' | 'bestValue';
}

export const PLAN_CATALOG: Record<PlanTier, PlanSpec> = {
  Free: {
    id: 'Free',
    monthlyPriceUsd: 0,
    monthlyTokensLimit: 100_000,
    maxSeats: 1,
    rateLimitRpm: 20,
    contextWindowLabel: '32k',
  },
  Pro: {
    id: 'Pro',
    monthlyPriceUsd: 29,
    monthlyTokensLimit: 1_000_000,
    maxSeats: 10,
    rateLimitRpm: 120,
    contextWindowLabel: '128k',
  },
  Enterprise: {
    id: 'Enterprise',
    monthlyPriceUsd: 199,
    monthlyTokensLimit: 5_000_000,
    maxSeats: 50,
    rateLimitRpm: 600,
    contextWindowLabel: '1M',
  },
};

export const TOPUP_PACKAGES: TopUpPackage[] = [
  { id: 'topup-10', amountUsd: 10, tokensBonus: 250_000 },
  { id: 'topup-50', amountUsd: 50, tokensBonus: 1_500_000, badgeKey: 'popular' },
  { id: 'topup-200', amountUsd: 200, tokensBonus: 7_500_000, badgeKey: 'bestValue' },
];

export function getPlanSpec(tier?: string | null): PlanSpec {
  if (tier === 'Enterprise') return PLAN_CATALOG.Enterprise;
  if (tier === 'Pro') return PLAN_CATALOG.Pro;
  return PLAN_CATALOG.Free;
}

export async function fetchLivePlanCatalog(): Promise<{
  plans: Record<PlanTier, PlanSpec>;
  topupPackages: TopUpPackage[];
}> {
  try {
    const data = await fetchJson<{
      plans?: Record<PlanTier, PlanSpec>;
      topupPackages?: TopUpPackage[];
    }>('/api/billing/plans', { timeoutMs: 8000 });
    if (data?.plans && typeof data.plans === 'object') {
      return {
        plans: data.plans,
        topupPackages: Array.isArray(data.topupPackages) ? data.topupPackages : TOPUP_PACKAGES,
      };
    }
  } catch (error) {
    logger.debug('Live plan catalogue unavailable, using bundled defaults', error);
  }
  return { plans: PLAN_CATALOG, topupPackages: TOPUP_PACKAGES };
}
