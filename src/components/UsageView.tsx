import React, { useMemo, useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Activity, TrendingUp, Sparkles, Wallet, Zap } from 'lucide-react';
import { ChatSession } from '../types';
import {
  usageService,
  WalletData,
  BillingAnalytics,
  DailyUsageMetric,
} from '../services/usageService';
import { useI18n } from '../utils/i18n';

interface UsageViewProps {
  sessions: ChatSession[];
  darkMode?: boolean;
}

interface DayActivity {
  date: string;
  dayName: string;
  userMessages: number;
  assistantMessages: number;
  totalMessages: number;
  estimatedTokens: number;
}

export const UsageView: React.FC<UsageViewProps> = ({ sessions, darkMode }) => {
  const { t, lang } = useI18n();
  const [metricView, setMetricView] = useState<'stacked' | 'total'>('stacked');
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [analytics, setAnalytics] = useState<BillingAnalytics | null>(null);
  const [dbMetrics, setDbMetrics] = useState<DailyUsageMetric[]>([]);

  // Fetch real backend metrics and wallet
  useEffect(() => {
    let isMounted = true;
    Promise.all([
      usageService.getWallet(),
      usageService.getAnalytics(),
      usageService.getUsageMetrics(7),
    ]).then(([w, a, m]) => {
      if (!isMounted) return;
      if (w) setWallet(w);
      if (a) setAnalytics(a);
      if (m && m.length > 0) setDbMetrics(m);
    });
    return () => {
      isMounted = false;
    };
  }, []);

  // Compute 7-day activity data purely from actual sessions and backend dbMetrics
  const activityData: DayActivity[] = useMemo(() => {
    const days: DayActivity[] = [];
    const now = new Date();
    const locale = lang === 'bn' ? 'bn-BD' : 'en-US';

    const sessionDayCounts: Record<string, { user: number; assistant: number; tokens: number }> =
      {};
    sessions.forEach((s) => {
      s.messages.forEach((m) => {
        const d = new Date(m.timestamp);
        if (Number.isNaN(d.getTime())) return;
        const dateKey = d.toISOString().slice(0, 10);
        if (!sessionDayCounts[dateKey]) {
          sessionDayCounts[dateKey] = { user: 0, assistant: 0, tokens: 0 };
        }
        if (m.role === 'user') sessionDayCounts[dateKey].user++;
        if (m.role === 'assistant') sessionDayCounts[dateKey].assistant++;
        sessionDayCounts[dateKey].tokens += Math.max(12, Math.ceil((m.content?.length || 0) / 4));
      });
    });

    for (let offset = 6; offset >= 0; offset--) {
      const targetDate = new Date(now);
      targetDate.setDate(now.getDate() - offset);
      const dateKey = targetDate.toISOString().slice(0, 10);
      const dayName = targetDate.toLocaleDateString(locale, { weekday: 'short' });

      const dbMatch = dbMetrics.find((m) => m.metric_date === dateKey);
      const real = sessionDayCounts[dateKey] || { user: 0, assistant: 0, tokens: 0 };
      const total = real.user + real.assistant;
      const totalTokens = dbMatch ? dbMatch.total_tokens : real.tokens;

      days.push({
        date: dateKey,
        dayName,
        userMessages: real.user,
        assistantMessages: real.assistant,
        totalMessages: total,
        estimatedTokens: totalTokens,
      });
    }

    return days;
  }, [sessions, dbMetrics, lang]);

  // Aggregate statistics
  const totalMessages7Days = activityData.reduce((acc, d) => acc + d.totalMessages, 0);
  const totalTokens7Days = activityData.reduce((acc, d) => acc + d.estimatedTokens, 0);
  const avgMessagesPerDay = Math.round(totalMessages7Days / 7);

  const peakDay =
    activityData.length > 0
      ? activityData.reduce(
          (max, cur) => (cur.totalMessages > max.totalMessages ? cur : max),
          activityData[0]
        )
      : undefined;

  // Custom Recharts Tooltip
  const CustomTooltip = ({
    active,
    payload,
  }: {
    active?: boolean;
    payload?: Array<{ payload: DayActivity }>;
  }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload as DayActivity;
      return (
        <div className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xl text-xs space-y-1.5 font-sans z-50">
          <div className="font-bold text-slate-900 dark:text-white flex items-center justify-between gap-4">
            <span>
              {data.dayName} · {data.date}
            </span>
            <span className="font-mono tabular-nums text-slate-500">
              {data.totalMessages} {t.messagesWord}
            </span>
          </div>
          <div className="pt-1 space-y-1 text-[11px] border-t border-slate-100 dark:border-slate-700">
            <div className="flex items-center justify-between text-blue-600 dark:text-blue-400">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
                {t.userInquiriesTooltip}:
              </span>
              <span className="font-mono font-semibold tabular-nums">{data.userMessages}</span>
            </div>
            <div className="flex items-center justify-between text-purple-600 dark:text-purple-400">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-purple-500 inline-block" />
                {t.aiResponsesTooltip}:
              </span>
              <span className="font-mono font-semibold tabular-nums">{data.assistantMessages}</span>
            </div>
            <div className="flex items-center justify-between text-slate-500 pt-1 border-t border-slate-100 dark:border-slate-700">
              <span>{t.tokenIngestionTooltip}:</span>
              <span className="font-mono tabular-nums">
                ~{(data.estimatedTokens / 1000).toFixed(1)}k
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="flex-1 overflow-y-auto px-6 py-8 workspace-container space-y-6 text-slate-800 dark:text-slate-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 dark:border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <Activity className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            <span>{t.usageAnalyticsTitle}</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {t.usageAnalyticsSubtitle}
          </p>
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-full self-start sm:self-auto text-xs">
          <button
            type="button"
            onClick={() => setMetricView('stacked')}
            className={`px-3 py-1.5 rounded-full font-medium transition-all cursor-pointer ${
              metricView === 'stacked'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            {t.userVsAiBreakdownBtn}
          </button>
          <button
            type="button"
            onClick={() => setMetricView('total')}
            className={`px-3 py-1.5 rounded-full font-medium transition-all cursor-pointer ${
              metricView === 'total'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            {t.totalTrafficBtn}
          </button>
        </div>
      </div>

      {/* Real Token Meter & Wallet Cockpit */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Live Wallet & Quota */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">
              {t.liveWalletBalanceLabel}
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
              ${(wallet?.balanceUsd ?? 0).toFixed(2)}
            </div>
            <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
              <span>{t.monthlyAllowanceLabel}:</span>
              <span className="font-mono text-emerald-400 font-semibold">
                ${(wallet?.monthlyAllowanceUsd ?? 0).toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Total Cost & Spend */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">
              {t.totalModelSpendLabel}
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
              ${(analytics?.totalSpent ?? 0).toFixed(2)}
            </div>
            <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
              <span>{t.cacheSavingsLabel}:</span>
              <span className="font-mono text-blue-400 font-semibold">
                +${(analytics?.totalSaved ?? 0).toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* 7-Day Ingestion */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">
              {t.ingestion7DayLabel}
            </span>
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-500">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
              {(totalTokens7Days / 1000).toFixed(1)}k
            </div>
            <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
              <span>{t.peakLabel}:</span>
              <span className="font-semibold text-purple-400">{peakDay?.dayName || '—'}</span>
              <span>({((peakDay?.estimatedTokens ?? 0) / 1000).toFixed(1)}k)</span>
            </div>
          </div>
        </div>

        {/* Daily Velocity */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">
              {t.interactionRateLabel}
            </span>
            <div className="w-8 h-8 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-500">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
              {avgMessagesPerDay}{' '}
              <span className="text-xs font-normal text-slate-400 font-sans">
                {t.msgsPerDayUnit}
              </span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
              <span>{t.totalVolumeLabel}:</span>
              <span className="font-mono text-cyan-400 font-semibold">{totalMessages7Days}</span>
              <span>{t.turnsUnit}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recharts Bar Chart Container */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              {t.dailyActivityTitle}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">{t.dailyActivityChartDesc}</p>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-blue-500 inline-block" />
              <span className="text-slate-600 dark:text-slate-300 font-medium">
                {t.userMessagesLegend}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-purple-500 inline-block" />
              <span className="text-slate-600 dark:text-slate-300 font-medium">
                {t.aiResponsesLegend}
              </span>
            </div>
          </div>
        </div>

        {/* The Recharts Bar Chart */}
        <div className="h-80 w-full pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={activityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke={darkMode ? '#1E293B' : '#F1F5F9'}
              />
              <XAxis
                dataKey="dayName"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 12, fill: '#94A3B8' }}
              />
              <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#94A3B8' }} />
              <Tooltip content={<CustomTooltip />} />
              {metricView === 'stacked' ? (
                <>
                  <Bar
                    dataKey="userMessages"
                    name={t.userInquiriesTooltip}
                    stackId="a"
                    fill="#3B82F6"
                    radius={[0, 0, 0, 0]}
                    maxBarSize={44}
                  />
                  <Bar
                    dataKey="assistantMessages"
                    name={t.aiResponsesTooltip}
                    stackId="a"
                    fill="#8B5CF6"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={44}
                  />
                </>
              ) : (
                <Bar
                  dataKey="totalMessages"
                  name={t.totalTrafficBtn}
                  fill="#3B82F6"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={44}
                />
              )}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Daily Activity Breakdown Table */}
      <div className="bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
            {t.dailyActivityLogTitle}
          </h3>
          <span className="text-xs text-slate-400">{t.rollingWindow7Days}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200/80 dark:border-slate-800">
              <tr>
                <th className="p-3.5">{t.colDayDate}</th>
                <th className="p-3.5">{t.colUserPrompts}</th>
                <th className="p-3.5">{t.colAiResponses}</th>
                <th className="p-3.5">{t.colTotalExchanges}</th>
                <th className="p-3.5">{t.colEstTokens}</th>
                <th className="p-3.5">{t.colActivityShare}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-sans">
              {activityData.map((d) => {
                const sharePercent =
                  totalMessages7Days > 0
                    ? Math.round((d.totalMessages / totalMessages7Days) * 100)
                    : 0;
                return (
                  <tr
                    key={d.date}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="p-3.5 font-medium text-slate-900 dark:text-white">
                      <span>{d.dayName}</span>
                      <span className="text-slate-400 ml-2 font-mono text-[11px]">{d.date}</span>
                    </td>
                    <td className="p-3.5 font-mono tabular-nums text-blue-600 dark:text-blue-400 font-semibold">
                      {d.userMessages}
                    </td>
                    <td className="p-3.5 font-mono tabular-nums text-purple-600 dark:text-purple-400 font-semibold">
                      {d.assistantMessages}
                    </td>
                    <td className="p-3.5 font-mono tabular-nums font-bold text-slate-900 dark:text-white">
                      {d.totalMessages}
                    </td>
                    <td className="p-3.5 font-mono tabular-nums text-slate-600 dark:text-slate-400">
                      {(d.estimatedTokens / 1000).toFixed(1)}k
                    </td>
                    <td className="p-3.5 min-w-[120px]">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                          <div
                            className="h-full bg-blue-600 dark:bg-blue-400 rounded-full"
                            style={{ width: `${Math.min(100, sharePercent * 2)}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-mono tabular-nums text-slate-400">
                          {sharePercent}%
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
