import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Home, RotateCw, RefreshCw, ExternalLink } from 'lucide-react';
import { useI18n } from '../../utils/i18n';

interface MobileDeviceFrameProps {
  orientation?: 'portrait' | 'landscape';
  onRotate?: () => void;
  onBack?: () => void;
  onHome?: () => void;
  onReload?: () => void;
  onOpenExternal?: () => void;
  canGoBack?: boolean;
  darkChrome?: boolean;
  children: React.ReactNode;
}

export const MobileDeviceFrame: React.FC<MobileDeviceFrameProps> = ({
  orientation = 'portrait',
  onRotate,
  onBack,
  onHome,
  onReload,
  onOpenExternal,
  canGoBack = true,
  darkChrome = true,
  children,
}) => {
  const { t } = useI18n();
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  const frameWidth = orientation === 'portrait' ? 372 : 680;
  const frameHeight = orientation === 'portrait' ? 720 : 372;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const computeScale = () => {
      const availW = Math.max(240, el.clientWidth - 88);
      const availH = Math.max(240, el.clientHeight - 36);
      const next = Math.min(1, availW / frameWidth, availH / frameHeight);
      setScale(Math.max(0.45, Number(next.toFixed(3))));
    };

    computeScale();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(computeScale);
    ro.observe(el);
    return () => ro.disconnect();
  }, [frameWidth, frameHeight]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full flex items-center justify-center overflow-hidden p-3 select-none"
    >
      <div
        className="flex items-center gap-4 origin-center transition-transform duration-200"
        style={{ transform: `scale(${scale})` }}
      >
        {/* Pixel / Android Device Bezel */}
        <div
          style={{ width: `${frameWidth}px`, height: `${frameHeight}px` }}
          className="relative rounded-[38px] p-[10px] bg-[#0a0d14] border-2 border-slate-700/80 ring-1 ring-white/10 shadow-[0_24px_60px_rgba(0,0,0,0.65)] flex flex-col shrink-0 transition-all duration-200"
        >
          {/* Screen Viewport */}
          <div className="w-full h-full rounded-[29px] overflow-hidden flex flex-col bg-black border border-slate-800/80 relative">
            {/* Android Status Bar */}
            <div
              className={`h-7 px-5 flex items-center justify-between text-[11px] font-medium shrink-0 ${
                darkChrome
                  ? 'bg-[#090d16] text-slate-100 border-b border-slate-800/60'
                  : 'bg-slate-900 text-white'
              }`}
            >
              <div className="flex items-center gap-2 tabular-nums">
                <span>5:15</span>
                <span className="w-2.5 h-2.5 rounded-[3px] border border-slate-400/70 inline-block" />
              </div>
              <div className="flex items-center gap-1.5 opacity-90">
                {/* Wi-Fi indicator */}
                <svg
                  className="w-3.5 h-3.5"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M12 18.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Zm-4.95-2.64a7 7 0 0 1 9.9 0l1.41-1.41a9 9 0 0 0-12.72 0l1.41 1.41Zm-2.83-2.83a11 11 0 0 1 15.56 0l1.41-1.41a13 13 0 0 0-18.38 0l1.41 1.41Z" />
                </svg>
                {/* Signal bars */}
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M2 22h20V2L2 22Z" />
                </svg>
                {/* Battery icon */}
                <svg
                  className="w-3.5 h-3.5"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M15.67 4H14V2h-4v2H8.33A1.33 1.33 0 0 0 7 5.33v15.34C7 21.4 7.6 22 8.33 22h7.34c.73 0 1.33-.6 1.33-1.33V5.33C17 4.6 16.4 4 15.67 4Z" />
                </svg>
              </div>
            </div>

            {/* Active App / Browser Content */}
            <div className="flex-1 min-h-0 relative bg-white dark:bg-[#080b11]">{children}</div>

            {/* Android Navigation Gesture Bar */}
            <div className="h-4 flex items-center justify-center bg-[#090d16] shrink-0">
              <div className="w-24 h-1 rounded-full bg-slate-300/75" />
            </div>
          </div>
        </div>

        {/* Google AI Studio Floating Side Control Bar */}
        <div
          role="toolbar"
          aria-label="Mobile Device Controls"
          className="flex flex-col items-center gap-1.5 py-2.5 px-1.5 rounded-full bg-[#151a24] border border-slate-700/80 shadow-xl shrink-0"
        >
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              disabled={!canGoBack}
              title={t.wsMobileBack}
              aria-label={t.wsMobileBack}
              className="w-8 h-8 rounded-full flex items-center justify-center text-slate-200 hover:bg-slate-800 hover:text-white disabled:opacity-35 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}

          {onHome && (
            <button
              type="button"
              onClick={onHome}
              title={t.wsMobileHome}
              aria-label={t.wsMobileHome}
              className="w-8 h-8 rounded-full flex items-center justify-center text-slate-200 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
            >
              <Home className="w-4 h-4" />
            </button>
          )}

          {onRotate && (
            <button
              type="button"
              onClick={onRotate}
              title={t.wsMobileRotate}
              aria-label={t.wsMobileRotate}
              className="w-8 h-8 rounded-full flex items-center justify-center text-slate-200 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
            >
              <RotateCw className="w-4 h-4" />
            </button>
          )}

          {onReload && (
            <button
              type="button"
              onClick={onReload}
              title={t.wsReloadPreview}
              aria-label={t.wsReloadPreview}
              className="w-8 h-8 rounded-full flex items-center justify-center text-slate-200 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}

          {onOpenExternal && (
            <button
              type="button"
              onClick={onOpenExternal}
              title={t.wsPopoutPreview}
              aria-label={t.wsPopoutPreview}
              className="w-8 h-8 rounded-full flex items-center justify-center text-slate-200 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
            >
              <ExternalLink className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
