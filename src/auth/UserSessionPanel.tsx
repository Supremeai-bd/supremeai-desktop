import { useEffect, useState, type FormEvent } from 'react';
import { ChevronUp, ChevronDown, Lock, LogOut, ShieldCheck } from 'lucide-react';
import { getUserSession, loginUser, logoutUser } from '../bridge/desktopBridge';
import { format, useI18n } from '../i18n';

const PASSKEY_ENABLED_KEY = 'supremeai.desktop.passkey_enabled.v1';
const PASSKEY_CODE_KEY = 'supremeai.desktop.passkey_pin.v1';

interface UserSessionPanelProps {
  onSessionChange?: (email: string | null) => void;
}

export default function UserSessionPanel({ onSessionChange }: UserSessionPanelProps) {
  const { t } = useI18n();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');

  // Quick-lock PIN state
  const [passkeyEnabled, setPasskeyEnabled] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [inputPin, setInputPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [showPinSetup, setShowPinSetup] = useState(false);

  useEffect(() => {
    void getUserSession().then((value) => {
      setSessionEmail(value);
      onSessionChange?.(value);
    });

    try {
      const savedPasskey = localStorage.getItem(PASSKEY_ENABLED_KEY) === 'true';
      setPasskeyEnabled(savedPasskey);
      if (savedPasskey && localStorage.getItem(PASSKEY_CODE_KEY)) {
        setIsLocked(true);
      }
    } catch {
      // Ignore storage read errors
    }
  }, [onSessionChange]);

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setNotice('');
    try {
      const result = await loginUser(email, password);
      if (result.status !== 'authenticated') {
        throw new Error(t.signInFailed);
      }
      const nextEmail = result.email || email;
      setSessionEmail(nextEmail);
      onSessionChange?.(nextEmail);
      setExpanded(false);
    } catch (error) {
      setNotice(
        typeof error === 'string'
          ? error
          : error instanceof Error
            ? error.message
            : t.signInFailed
      );
    } finally {
      setPassword('');
      setBusy(false);
    }
  }

  async function signOut() {
    setBusy(true);
    await logoutUser();
    setSessionEmail(null);
    onSessionChange?.(null);
    setNotice('');
    setExpanded(false);
    setBusy(false);
  }

  function handleUnlock(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const storedPin = localStorage.getItem(PASSKEY_CODE_KEY);
    if (!storedPin || inputPin === storedPin) {
      setIsLocked(false);
      setInputPin('');
      setNotice('');
    } else {
      setNotice(t.incorrectPin);
      setInputPin('');
    }
  }

  function togglePasskey() {
    if (passkeyEnabled) {
      localStorage.removeItem(PASSKEY_ENABLED_KEY);
      localStorage.removeItem(PASSKEY_CODE_KEY);
      setPasskeyEnabled(false);
      setShowPinSetup(false);
      setIsLocked(false);
    } else {
      setShowPinSetup(true);
    }
  }

  function saveNewPin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (newPin.length < 4) {
      setNotice(t.pinTooShort);
      return;
    }
    localStorage.setItem(PASSKEY_CODE_KEY, newPin);
    localStorage.setItem(PASSKEY_ENABLED_KEY, 'true');
    setPasskeyEnabled(true);
    setShowPinSetup(false);
    setNewPin('');
    setNotice('');
  }

  const initial = (sessionEmail || 'G').trim().charAt(0).toUpperCase();

  if (isLocked) {
    return (
      <div className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-white/85 dark:bg-slate-900/90 space-y-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold theme-accent-text">
          <Lock className="w-3.5 h-3.5" />
          <span>{t.quickLockActive}</span>
        </div>
        <form onSubmit={handleUnlock} className="space-y-1.5">
          <input
            type="password"
            placeholder={t.enterPinPlaceholder}
            value={inputPin}
            onChange={(e) => setInputPin(e.target.value)}
            required
            autoFocus
            className="w-full px-2.5 py-1.5 rounded-lg text-xs border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
          />
          <button
            type="submit"
            className="w-full py-1.5 px-3 rounded-lg text-xs font-semibold theme-btn-primary cursor-pointer"
          >
            {t.unlock}
          </button>
          {notice && (
            <p role="alert" className="text-[11px] text-rose-600 dark:text-rose-400">
              {notice}
            </p>
          )}
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        disabled={busy && !!sessionEmail}
        className="w-full flex items-center gap-2.5 px-2 py-2 rounded-xl text-left hover:bg-slate-200/50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer"
      >
        <span className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold theme-btn-primary">
          {initial}
        </span>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
            {sessionEmail || t.guestUser}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
            {sessionEmail
              ? format(t.signedInState, {
                  state: passkeyEnabled ? t.passkeyProtected : t.sessionSaved,
                })
              : t.localHistoryHint}
          </div>
        </div>
        {expanded ? (
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        ) : (
          <ChevronUp className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        )}
      </button>

      {expanded && !sessionEmail && (
        <form
          onSubmit={signIn}
          className="p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-700/70 bg-white/85 dark:bg-slate-900/85 space-y-2"
        >
          <input
            type="email"
            placeholder={t.emailLabel}
            value={email}
            autoComplete="username"
            onChange={(event) => setEmail(event.target.value)}
            required
            className="w-full px-2.5 py-1.5 rounded-lg text-xs border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
          />
          <input
            type="password"
            placeholder={t.passwordLabel}
            value={password}
            autoComplete="current-password"
            onChange={(event) => setPassword(event.target.value)}
            required
            className="w-full px-2.5 py-1.5 rounded-lg text-xs border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
          />
          <button
            type="submit"
            disabled={busy || !email.trim() || !password}
            className="w-full py-1.5 px-3 rounded-lg text-xs font-semibold theme-btn-primary disabled:opacity-50 cursor-pointer"
          >
            {busy ? t.signingIn : t.signIn}
          </button>
          {notice && (
            <p role="alert" className="text-[11px] text-rose-600 dark:text-rose-400">
              {notice}
            </p>
          )}
          <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed">
            {t.accountNote}
          </p>
        </form>
      )}

      {sessionEmail && expanded && (
        <div className="p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-700/70 bg-white/85 dark:bg-slate-900/85 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="inline-flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
              <ShieldCheck className="w-3.5 h-3.5 theme-accent-text" />
              {t.passkeyLockLabel}
            </span>
            <button
              type="button"
              onClick={togglePasskey}
              className={`px-2 py-0.5 rounded-md text-[11px] font-medium border transition-colors cursor-pointer ${
                passkeyEnabled
                  ? 'theme-accent-active'
                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
              }`}
            >
              {passkeyEnabled ? t.passkeyEnabledOn : t.passkeyDisabledOff}
            </button>
          </div>

          {showPinSetup && (
            <form onSubmit={saveNewPin} className="space-y-1.5">
              <input
                type="password"
                placeholder={t.setPinPlaceholder}
                value={newPin}
                onChange={(e) => setNewPin(e.target.value)}
                required
                className="w-full px-2.5 py-1.5 rounded-lg text-xs border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
              <button
                type="submit"
                className="w-full py-1.5 px-3 rounded-lg text-xs font-semibold theme-btn-primary cursor-pointer"
              >
                {t.savePasskeyPin}
              </button>
            </form>
          )}

          {passkeyEnabled && (
            <button
              type="button"
              onClick={() => setIsLocked(true)}
              className="w-full py-1.5 px-2.5 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              {t.lockWorkspaceNow}
            </button>
          )}

          <button
            type="button"
            onClick={() => void signOut()}
            disabled={busy}
            className="w-full inline-flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg text-xs font-medium border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>{t.signOut}</span>
          </button>

          {notice && (
            <p role="alert" className="text-[11px] text-rose-600 dark:text-rose-400">
              {notice}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
