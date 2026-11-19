import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldCheck,
  KeyRound,
  AlertCircle,
  X,
  Copy,
  Check,
  QrCode,
  RefreshCw,
} from 'lucide-react';
import { TotpInputForm } from './two-factor/TotpInputForm';
import { TrustedBrowserCheckbox } from './two-factor/TrustedBrowserCheckbox';
import { authService } from '../../services/authService';
import { logger } from '../../utils/logger';

interface AdminTwoFactorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (trustedUntil: number | null) => void;
  userEmail: string;
}

const getUtcTotpSecondsRemaining = () => 30 - (Math.floor(Date.now() / 1000) % 30);

export const AdminTwoFactorModal: React.FC<AdminTwoFactorModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  userEmail,
}) => {
  const [totpDigits, setTotpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [trustBrowser, setTrustBrowser] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);
  const [isEnrolled, setIsEnrolled] = useState<boolean>(true);
  const [setupData, setSetupData] = useState<{
    secret: string;
    qrDataUrl: string;
    otpauthUrl: string;
  } | null>(null);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [secondsRemaining, setSecondsRemaining] = useState(getUtcTotpSecondsRemaining);

  const loadEnrollmentState = useCallback(async () => {
    if (!userEmail) return;
    setIsLoadingStatus(true);
    setError(null);
    setTotpDigits(['', '', '', '', '', '']);

    try {
      const status = await authService.getTotpStatus(userEmail);
      if (status.enrolled) {
        setIsEnrolled(true);
        setSetupData(null);
      } else {
        setIsEnrolled(false);
        const setup = await authService.setupTotp({ userEmail });
        setSetupData({
          secret: setup.secret,
          qrDataUrl: setup.qrDataUrl,
          otpauthUrl: setup.otpauthUrl,
        });
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to check Authenticator TOTP status.');
    } finally {
      setIsLoadingStatus(false);
    }
  }, [userEmail]);

  useEffect(() => {
    if (!isOpen) return;
    loadEnrollmentState();
    setSecondsRemaining(getUtcTotpSecondsRemaining());
    const timer = setInterval(() => {
      setSecondsRemaining(getUtcTotpSecondsRemaining());
    }, 1000);
    return () => clearInterval(timer);
  }, [isOpen, loadEnrollmentState]);

  if (!isOpen) return null;

  const handleDigitChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const updated = [...totpDigits];
    updated[index] = digit;
    setTotpDigits(updated);

    if (digit && index < 5) {
      const nextInput = document.getElementById(`totp-cell-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handlePasteDigits = (pasted: string) => {
    const chars = pasted.replace(/\D/g, '').slice(0, 6).split('');
    if (chars.length === 0) return;
    const updated = ['', '', '', '', '', ''];
    chars.forEach((c, i) => {
      updated[i] = c;
    });
    setTotpDigits(updated);
    const focusIdx = Math.min(5, chars.length - 1);
    document.getElementById(`totp-cell-${focusIdx}`)?.focus();
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !totpDigits[index] && index > 0) {
      const prevInput = document.getElementById(`totp-cell-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handleCopySecret = async () => {
    if (!setupData?.secret) return;
    try {
      await navigator.clipboard.writeText(setupData.secret);
      setCopiedSecret(true);
      setTimeout(() => setCopiedSecret(false), 1800);
    } catch (error) {
      logger.debug('AdminTwoFactorModal: suppressed non-fatal error', error);
    }
  };

  const handleVerifyTotp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const fullCode = totpDigits.join('');
    if (fullCode.length !== 6) {
      setError('Please enter all 6 digits from your Authenticator app.');
      return;
    }

    setIsVerifying(true);
    setError(null);

    try {
      const data = isEnrolled
        ? await authService.verify2FA({
            token: fullCode,
            method: 'totp',
            trustFor7Days: trustBrowser,
            userEmail,
          })
        : await authService.confirmTotp({
            userEmail,
            token: fullCode,
            trustFor7Days: trustBrowser,
          });

      if (!data.verified) {
        throw new Error('2-Step Verification failed.');
      }

      onSuccess(data.trustedUntil);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Verification failed.';
      if (msg.toLowerCase().includes('not enrolled')) {
        await loadEnrollmentState();
      } else {
        setError(msg);
      }
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-md rounded-3xl bg-white dark:bg-[#0b0f19] border border-slate-200 dark:border-cyan-500/30 p-6 shadow-2xl relative cyber-hud-glass max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {isEnrolled ? 'Admin TOTP Verification' : 'Pair Authenticator App'}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Identity: <span className="font-mono text-cyan-500">{userEmail}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close 2FA modal"
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Real TOTP Only Badge */}
        <div className="mt-3 flex items-center justify-between px-3 py-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-[11px] text-cyan-700 dark:text-cyan-300">
          <span className="inline-flex items-center gap-1.5 font-medium">
            <KeyRound className="w-3.5 h-3.5 shrink-0" />
            <span>RFC 6238 Authenticator Only</span>
          </span>
          <span className="font-mono text-[10px] uppercase tracking-wider">SHA-1 · 6-Digit</span>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Loading or TOTP Enrollment QR + Verification */}
        {isLoadingStatus ? (
          <div className="py-10 flex flex-col items-center justify-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <RefreshCw className="w-5 h-5 animate-spin text-cyan-500" />
            <span>Checking Authenticator enrollment...</span>
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            {!isEnrolled && setupData && (
              <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60 space-y-3">
                <div className="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-300">
                  <QrCode className="w-4 h-4 text-cyan-500 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">
                    Scan this QR code with <strong>Google Authenticator</strong>,{' '}
                    <strong>Authy</strong>, or <strong>1Password</strong>, then enter the live
                    6-digit code below.
                  </p>
                </div>

                <div className="flex justify-center">
                  <img
                    src={setupData.qrDataUrl}
                    alt="TOTP Authenticator QR Code"
                    className="w-40 h-40 rounded-xl border border-slate-200 dark:border-slate-700 bg-white p-1.5 shadow-sm"
                  />
                </div>

                <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                  <div className="min-w-0">
                    <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                      Manual Setup Key
                    </div>
                    <code className="text-[11px] font-mono text-slate-800 dark:text-cyan-300 break-all">
                      {setupData.secret}
                    </code>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopySecret}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-cyan-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
                    title="Copy TOTP setup key"
                  >
                    {copiedSecret ? (
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
            )}

            <TotpInputForm
              digits={totpDigits}
              onChangeDigit={handleDigitChange}
              onPasteDigits={handlePasteDigits}
              onKeyDown={handleKeyDown}
              onSubmit={handleVerifyTotp}
              isVerifying={isVerifying}
              secondsRemaining={secondsRemaining}
              submitLabel={
                isEnrolled ? 'Verify & Access Admin Command' : 'Activate TOTP & Enter Admin'
              }
            />
          </div>
        )}

        {/* 7-Day Trusted Browser Checkbox */}
        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800">
          <TrustedBrowserCheckbox checked={trustBrowser} onChange={setTrustBrowser} />
        </div>
      </div>
    </div>
  );
};
