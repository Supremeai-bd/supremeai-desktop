export type AnomalySensitivity = 'strict' | 'balanced' | 'high';
export type AnomalySeverity = 'normal' | 'warning' | 'critical';

export interface TokenTrendPoint {
  key: string;
  label: string;
  tokens: number;
  requests: number;
  activeUsers: number;
}

export interface TokenAnomalyPoint extends TokenTrendPoint {
  baselineMean: number;
  baselineStdDev: number;
  zScore: number;
  deviationPct: number;
  momPct: number;
  severity: AnomalySeverity;
  reason: string | null;
}

export interface TokenAnomalyAnalysis {
  points: TokenAnomalyPoint[];
  anomalies: TokenAnomalyPoint[];
  peakAnomaly: TokenAnomalyPoint | null;
  highestSeverity: AnomalySeverity;
  upperThresholdTokens: number;
  baselineMeanTokens: number;
  sensitivity: AnomalySensitivity;
}

interface SensitivityPreset {
  label: string;
  minPctAboveBaseline: number;
  minZScore: number;
  criticalPct: number;
  criticalZScore: number;
}

export const ANOMALY_SENSITIVITY_PRESETS: Record<AnomalySensitivity, SensitivityPreset> = {
  strict: {
    label: 'Strict',
    minPctAboveBaseline: 20,
    minZScore: 1.15,
    criticalPct: 45,
    criticalZScore: 2.0,
  },
  balanced: {
    label: 'Balanced',
    minPctAboveBaseline: 30,
    minZScore: 1.45,
    criticalPct: 60,
    criticalZScore: 2.25,
  },
  high: {
    label: 'High',
    minPctAboveBaseline: 45,
    minZScore: 1.85,
    criticalPct: 80,
    criticalZScore: 2.6,
  },
};

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function stdDev(values: number[], avg: number): number {
  if (values.length < 2) return 0;
  const variance = values.reduce((sum, v) => sum + (v - avg) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

/**
 * Detects statistically significant upward spikes/anomalies in monthly token usage trends.
 * Uses a rolling historical baseline (falling back to leave-one-out for early points)
 * combining Z-score and percentage deviation above baseline.
 */
export function detectTokenAnomalies(
  series: TokenTrendPoint[],
  sensitivity: AnomalySensitivity = 'balanced'
): TokenAnomalyAnalysis {
  const preset = ANOMALY_SENSITIVITY_PRESETS[sensitivity];

  if (series.length === 0) {
    return {
      points: [],
      anomalies: [],
      peakAnomaly: null,
      highestSeverity: 'normal',
      upperThresholdTokens: 0,
      baselineMeanTokens: 0,
      sensitivity,
    };
  }

  const enriched: TokenAnomalyPoint[] = series.map((point, idx) => {
    const baselineSource =
      idx >= 2
        ? series.slice(0, idx).map((p) => p.tokens)
        : series.filter((_, j) => j !== idx).map((p) => p.tokens);

    const nonZeroBaseline = baselineSource.filter((v) => v > 0);
    const refValues = nonZeroBaseline.length > 0 ? nonZeroBaseline : baselineSource;

    const baselineMean = mean(refValues);
    const baselineStdDev = stdDev(refValues, baselineMean);

    const prevTokens = idx > 0 ? series[idx - 1].tokens : 0;
    const momPct =
      idx > 0 && prevTokens > 0
        ? Number((((point.tokens - prevTokens) / prevTokens) * 100).toFixed(1))
        : 0;

    const deviationPct =
      baselineMean > 0
        ? Number((((point.tokens - baselineMean) / baselineMean) * 100).toFixed(1))
        : 0;

    const zScore =
      baselineStdDev > 0
        ? Number(((point.tokens - baselineMean) / baselineStdDev).toFixed(2))
        : deviationPct >= preset.minPctAboveBaseline
          ? 2.0
          : 0;

    let severity: AnomalySeverity = 'normal';
    let reason: string | null = null;

    const isAboveBaseline =
      point.tokens > 0 &&
      baselineMean > 0 &&
      deviationPct >= preset.minPctAboveBaseline &&
      (zScore >= preset.minZScore || momPct >= preset.minPctAboveBaseline);

    if (isAboveBaseline) {
      if (
        deviationPct >= preset.criticalPct ||
        zScore >= preset.criticalZScore ||
        momPct >= preset.criticalPct
      ) {
        severity = 'critical';
        reason = `+${Math.round(deviationPct)}% above baseline (${zScore >= 0 ? '+' : ''}${zScore.toFixed(1)}σ)`;
      } else {
        severity = 'warning';
        reason = `+${Math.round(deviationPct)}% above baseline (${zScore >= 0 ? '+' : ''}${zScore.toFixed(1)}σ)`;
      }
    }

    return {
      ...point,
      baselineMean,
      baselineStdDev,
      zScore,
      deviationPct,
      momPct,
      severity,
      reason,
    };
  });

  const anomalies = enriched.filter((p) => p.severity !== 'normal');
  const peakAnomaly =
    anomalies.length > 0
      ? [...anomalies].sort((a, b) => {
          if (a.severity !== b.severity) return a.severity === 'critical' ? -1 : 1;
          return b.deviationPct - a.deviationPct;
        })[0]
      : null;

  const highestSeverity: AnomalySeverity = anomalies.some((a) => a.severity === 'critical')
    ? 'critical'
    : anomalies.length > 0
      ? 'warning'
      : 'normal';

  const normalValues = enriched
    .filter((p) => p.severity === 'normal' && p.tokens > 0)
    .map((p) => p.tokens);
  const baselineMeanTokens =
    normalValues.length > 0
      ? mean(normalValues)
      : mean(enriched.filter((p) => p.tokens > 0).map((p) => p.tokens));

  const upperThresholdTokens = Math.round(
    baselineMeanTokens * (1 + preset.minPctAboveBaseline / 100)
  );

  return {
    points: enriched,
    anomalies,
    peakAnomaly,
    highestSeverity,
    upperThresholdTokens,
    baselineMeanTokens: Math.round(baselineMeanTokens),
    sensitivity,
  };
}
