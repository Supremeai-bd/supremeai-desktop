import React from 'react';
import { KeyRound, Clock, ArrowRight } from 'lucide-react';

interface TotpInputFormProps {
  digits: string[];
  onChangeDigit: (index: number, val: string) => void;
  onPasteDigits?: (pasted: string) => void;
  onKeyDown: (index: number, e: React.KeyboardEvent<HTMLInputElement>) => void;
  onSubmit: (e?: React.FormEvent) => void;
  isVerifying: boolean;
  secondsRemaining: number;
  submitLabel?: string;
}

export const TotpInputForm: React.FC<TotpInputFormProps> = ({
  digits,
  onChangeDigit,
  onPasteDigits,
  onKeyDown,
  onSubmit,
  isVerifying,
  secondsRemaining,
  submitLabel = 'Verify & Access Admin Command',
}) => {
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted && onPasteDigits) {
      e.preventDefault();
      onPasteDigits(pasted);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
        <span className="flex items-center gap-1.5 font-medium">
          <KeyRound className="w-3.5 h-3.5 text-cyan-500" />
          Enter 6-Digit Authenticator Code
        </span>
        <span
          title="RFC 6238 30-second TOTP window"
          className="flex items-center gap-1 font-mono text-[11px] text-cyan-500 tabular-nums"
        >
          <Clock className="w-3 h-3" />
          <span>{secondsRemaining}s</span>
        </span>
      </div>

      {/* 6 Digit Input Cells */}
      <div className="flex justify-between gap-2">
        {digits.map((digit, idx) => (
          <input
            key={idx}
            id={`totp-cell-${idx}`}
            type="text"
            inputMode="numeric"
            autoComplete={idx === 0 ? 'one-time-code' : 'off'}
            maxLength={1}
            value={digit}
            onChange={(e) => onChangeDigit(idx, e.target.value)}
            onPaste={handlePaste}
            onKeyDown={(e) => onKeyDown(idx, e)}
            autoFocus={idx === 0}
            className="w-12 h-14 text-center text-xl font-bold font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-cyan-400 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 outline-none transition-all shadow-inner"
          />
        ))}
      </div>

      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-0.5">
        <span>Google Authenticator · Authy · 1Password</span>
        <span className="font-mono">RFC 6238 TOTP</span>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isVerifying || digits.join('').length !== 6}
        className="w-full mt-2 py-3 px-4 rounded-xl font-semibold text-xs tracking-wider uppercase font-mono bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
      >
        {isVerifying ? (
          <span>VALIDATING RFC 6238 TOTP...</span>
        ) : (
          <>
            <span>{submitLabel}</span>
            <ArrowRight className="w-4 h-4" />
          </>
        )}
      </button>
    </form>
  );
};
