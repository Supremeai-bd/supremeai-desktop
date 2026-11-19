import React, { useMemo } from 'react';
import { Layers, RotateCcw, Trash2, ArrowRight } from 'lucide-react';
import { useAdminStore } from '../../stores/useAdminStore';
import { useI18n } from '../../utils/i18n';

export const VisualQueueConveyor: React.FC = () => {
  const { t } = useI18n();
  const queueJobs = useAdminStore((s) => s.queueJobs);
  const retryAllDlq = useAdminStore((s) => s.retryAllDlq);
  const clearCompletedJobs = useAdminStore((s) => s.clearCompletedJobs);

  const stageMetrics = useMemo(() => {
    const waiting = queueJobs.filter((j) => j.status === 'waiting').length;
    const active = queueJobs.filter((j) => j.status === 'active').length;
    const failed = queueJobs.filter((j) => j.status === 'failed').length;
    const completed = queueJobs.filter((j) => j.status === 'completed').length;
    const dlq = queueJobs.filter((j) => j.status === 'dlq').length;

    return {
      dlq,
      totalInFlight: waiting + active + failed,
      stages: [
        { label: 'Total Queued', count: queueJobs.length, isDlq: false },
        { label: 'Waiting', count: waiting, isDlq: false },
        { label: 'Active Workers', count: active, isDlq: false },
        { label: 'Failed Retries', count: failed, isDlq: false },
        { label: 'Completed', count: completed, isDlq: false },
        { label: 'DLQ', count: dlq, isDlq: true },
      ],
    };
  }, [queueJobs]);

  return (
    <div className="bg-slate-950/80 backdrop-blur-md border border-slate-800/80 rounded-2xl p-5 text-slate-100 shadow-xl space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-amber-400" />
          <h3 className="text-base font-bold text-white tracking-tight">{t.queueConveyorTitle}</h3>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-slate-400">
            In-flight: <strong className="text-cyan-400">{stageMetrics.totalInFlight}</strong>
          </span>
          <span
            className={`px-2.5 py-0.5 rounded-full text-xs font-bold font-mono ${
              stageMetrics.dlq > 0
                ? 'bg-red-950 text-red-300 border border-red-500/50 animate-pulse'
                : 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
            }`}
          >
            {stageMetrics.dlq > 0 ? `DLQ: ${stageMetrics.dlq} Failed` : 'DLQ Clean: 0'}
          </span>
        </div>
      </div>

      {/* Visual Pipeline Stages */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {stageMetrics.stages.map((stage, idx) => {
          const isBottleneck = !stage.isDlq && stage.count > 15;

          return (
            <React.Fragment key={stage.label}>
              <div
                className={`p-3 rounded-xl border min-w-[110px] text-center flex-1 transition-all ${
                  stage.isDlq && stage.count > 0
                    ? 'border-red-500/50 bg-red-950/30'
                    : isBottleneck
                      ? 'border-amber-500/50 bg-amber-950/30'
                      : 'border-slate-800 bg-slate-900/60'
                }`}
              >
                <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider truncate">
                  {stage.label}
                </div>
                <div
                  className={`text-xl font-bold font-mono mt-1 ${
                    stage.isDlq && stage.count > 0
                      ? 'text-red-400'
                      : isBottleneck
                        ? 'text-amber-400'
                        : 'text-white'
                  }`}
                >
                  {stage.count}
                </div>
              </div>

              {idx < stageMetrics.stages.length - 1 && (
                <ArrowRight className="w-4 h-4 text-slate-600 shrink-0" />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap items-center justify-between text-xs pt-1 gap-2 border-t border-slate-800/60">
        <span className="text-[11px] font-mono text-slate-500">
          Synchronized with store & backend queue state
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={retryAllDlq}
            disabled={stageMetrics.dlq === 0}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs cursor-pointer disabled:opacity-50"
          >
            <RotateCcw className="w-3 h-3" />
            <span>{t.requeueDlqBtn}</span>
          </button>
          <button
            type="button"
            onClick={clearCompletedJobs}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border border-slate-700 hover:bg-slate-800 text-slate-300 font-medium text-xs cursor-pointer"
          >
            <Trash2 className="w-3 h-3 text-red-400" />
            <span>{t.purgeDlqBtn}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default VisualQueueConveyor;
