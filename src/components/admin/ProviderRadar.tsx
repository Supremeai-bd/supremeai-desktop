import React, { useEffect, useState } from 'react';
import { Cpu } from 'lucide-react';
import { apiKeyService } from '../../services/apiKeyService';
import { GatewayProviderLatency } from '../../types';
import { useI18n } from '../../utils/i18n';

export const ProviderRadar: React.FC = () => {
  const { t } = useI18n();
  const [providers, setProviders] = useState<GatewayProviderLatency[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [muted, setMuted] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const res = await apiKeyService.fetchGatewayProviderLatencies();
        if (active && Array.isArray(res?.list)) {
          setProviders(res.list);
        }
      } catch {
        if (active) setProviders([]);
      } finally {
        if (active) setIsLoading(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, []);

  const toggleMute = (key: string) => {
    setMuted((m) => ({ ...m, [key]: !m[key] }));
  };

  return (
    <div className="bg-slate-950/80 backdrop-blur-md border border-slate-800/80 rounded-2xl p-5 text-slate-100 shadow-xl space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2">
          <Cpu className="w-5 h-5 text-purple-400" />
          <h3 className="text-base font-bold text-white tracking-tight">{t.providerRadarTitle}</h3>
        </div>
        <span className="text-[11px] font-mono text-slate-400">{t.providerRadarBadge}</span>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="h-28 rounded-xl border border-slate-800 bg-slate-900/60 animate-pulse"
            />
          ))}
        </div>
      ) : providers.length === 0 ? (
        <div className="p-6 rounded-xl border border-dashed border-slate-800 text-center text-xs text-slate-400">
          {t.loadingLabel === 'Loading...'
            ? 'No provider telemetry samples available yet.'
            : t.loadingLabel}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {providers.map((p) => {
            const key = p.provider || p.displayName;
            const isMuted = !!muted[key];
            const isHighLatency = p.avgLatencyMs > 500 || p.status !== 'healthy';
            const statusColor = isMuted
              ? 'text-slate-500'
              : isHighLatency
                ? 'text-amber-400'
                : 'text-emerald-400';
            const borderColor = isMuted
              ? 'border-slate-800 bg-slate-900/40'
              : isHighLatency
                ? 'border-amber-500/40 bg-amber-950/20'
                : 'border-emerald-500/40 bg-emerald-950/20';

            return (
              <div
                key={key}
                className={`rounded-xl border p-3.5 flex flex-col justify-between transition-all ${borderColor}`}
              >
                <div>
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-200">
                    <span className="truncate">{p.displayName || p.provider}</span>
                    <span
                      className={`w-2 h-2 rounded-full ${
                        isMuted
                          ? 'bg-slate-600'
                          : isHighLatency
                            ? 'bg-amber-400 animate-pulse'
                            : 'bg-emerald-400'
                      }`}
                    />
                  </div>

                  <div className={`text-2xl font-black font-mono mt-2 ${statusColor}`}>
                    {Math.round(p.avgLatencyMs)}
                    <span className="text-xs font-normal text-slate-400 ml-1">ms</span>
                  </div>

                  <div className="text-[11px] font-mono text-slate-400 mt-1">
                    Success:{' '}
                    <span className="text-slate-200">{Number(p.successRate).toFixed(1)}%</span>
                  </div>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-800/60">
                  <button
                    type="button"
                    onClick={() => toggleMute(key)}
                    className={`w-full py-1 px-2 rounded-lg text-[10px] font-bold font-mono transition-colors cursor-pointer ${
                      isMuted
                        ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        : 'bg-red-950/60 text-red-300 border border-red-500/40 hover:bg-red-900/60'
                    }`}
                  >
                    {isMuted ? t.unmuteProviderBtn : t.muteProviderBtn}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ProviderRadar;
