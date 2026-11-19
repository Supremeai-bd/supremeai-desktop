import React, { useCallback, useEffect, useState } from 'react';
import DOMPurify from 'dompurify';
import { ArrowLeft, Inbox, LogOut, Mail, RefreshCw, Search, ShieldCheck } from 'lucide-react';
import type { User } from 'firebase/auth';
import {
  clearExpiredGmailSession,
  connectGmailWithGooglePopup,
  disconnectGmailAccount,
  fetchGmailInbox,
  fetchGmailMessageDetail,
  getGmailCachedEmail,
  getGmailCachedToken,
  getGmailCurrentUser,
  GmailMessageDetail,
  GmailMessageSummary,
  subscribeGmailAuthState,
} from '../../services/gmailOAuthService';
import { useI18n } from '../../utils/i18n';

export const GmailInboxPanel: React.FC = () => {
  const { t } = useI18n();
  const [user, setUser] = useState<User | null>(() => getGmailCurrentUser());
  const [sessionEmail, setSessionEmail] = useState<string | null>(() => getGmailCachedEmail());
  const [accessToken, setAccessToken] = useState<string | null>(() => getGmailCachedToken());
  const [isRestoringSession, setIsRestoringSession] = useState<boolean>(
    () => !getGmailCachedToken()
  );
  const [needsAuth, setNeedsAuth] = useState<boolean>(() => !getGmailCachedToken());
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [messages, setMessages] = useState<GmailMessageSummary[]>([]);
  const [loadingInbox, setLoadingInbox] = useState(false);
  const [inboxError, setInboxError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [selectedDetail, setSelectedDetail] = useState<GmailMessageDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const loadInbox = useCallback(async (token: string, query = '') => {
    setLoadingInbox(true);
    setInboxError(null);
    try {
      const list = await fetchGmailInbox(token, { maxResults: 18, query });
      setMessages(list);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load Gmail inbox.';
      setInboxError(msg);
      if (msg.toLowerCase().includes('expired')) {
        void clearExpiredGmailSession();
        setNeedsAuth(true);
        setAccessToken(null);
      }
    } finally {
      setLoadingInbox(false);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeGmailAuthState(
      (authedUser, token, restoredEmail) => {
        setUser(authedUser);
        setSessionEmail(authedUser?.email || restoredEmail || null);
        setAccessToken(token);
        setNeedsAuth(false);
        setIsRestoringSession(false);
      },
      () => {
        setUser(null);
        setSessionEmail(null);
        setAccessToken(null);
        setNeedsAuth(true);
        setIsRestoringSession(false);
        setMessages([]);
        setSelectedDetail(null);
      },
      (restoring) => {
        setIsRestoringSession(restoring);
      }
    );
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (accessToken && !needsAuth) {
      void loadInbox(accessToken);
    }
  }, [accessToken, needsAuth, loadInbox]);

  useEffect(() => {
    const handleBrowserRefresh = () => {
      if (accessToken && !needsAuth) {
        void loadInbox(accessToken, searchQuery);
      }
    };
    window.addEventListener('supremeai-gmail-refresh', handleBrowserRefresh);
    return () => window.removeEventListener('supremeai-gmail-refresh', handleBrowserRefresh);
  }, [accessToken, needsAuth, searchQuery, loadInbox]);

  const handleSignIn = async () => {
    setIsLoggingIn(true);
    setAuthError(null);
    try {
      const res = await connectGmailWithGooglePopup();
      if (res) {
        setUser(res.user);
        setSessionEmail(res.user.email || null);
        setAccessToken(res.accessToken);
        setNeedsAuth(false);
        setIsRestoringSession(false);
      }
    } catch (err: unknown) {
      setAuthError(err instanceof Error ? err.message : 'Google sign-in failed.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleSignOut = async () => {
    await disconnectGmailAccount();
    setUser(null);
    setSessionEmail(null);
    setAccessToken(null);
    setNeedsAuth(true);
    setIsRestoringSession(false);
    setMessages([]);
    setSelectedDetail(null);
  };

  const handleOpenMessage = async (msgId: string) => {
    if (!accessToken) return;
    setLoadingDetail(true);
    setInboxError(null);
    try {
      const detail = await fetchGmailMessageDetail(accessToken, msgId);
      setSelectedDetail(detail);
    } catch (err: unknown) {
      setInboxError(err instanceof Error ? err.message : 'Could not open message.');
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (accessToken) {
      void loadInbox(accessToken, searchQuery);
    }
  };

  if (isRestoringSession && !accessToken) {
    return (
      <div
        data-testid="gmail-session-restoring"
        className="flex-1 flex items-center justify-center p-6 bg-slate-50 dark:bg-[#090d16] text-xs text-slate-500"
      >
        <div className="flex items-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin text-cyan-500" />
          <span>{t.wsGmailLoadingInbox}</span>
        </div>
      </div>
    );
  }

  if (needsAuth || !accessToken) {
    return (
      <div
        data-testid="gmail-oauth-panel"
        className="flex-1 flex items-center justify-center p-6 bg-slate-50 dark:bg-[#090d16] overflow-y-auto"
      >
        <div className="max-w-md w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d1322] p-6 shadow-xl space-y-5 text-center">
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/25 flex items-center justify-center mx-auto">
            <Mail className="w-6 h-6 text-cyan-500" />
          </div>

          <div className="space-y-1.5">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {t.wsGmailConnectTitle}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              {t.wsGmailConnectSubtitle}
            </p>
          </div>

          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-[11px] font-medium text-emerald-600 dark:text-emerald-300">
            <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
            <span>{t.wsGmailReadOnlyBadge}</span>
          </div>

          {authError && (
            <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-500 text-left">
              {authError}
            </div>
          )}

          <div className="flex flex-col items-center gap-2.5 pt-1">
            <button
              type="button"
              data-testid="gmail-google-signin-btn"
              onClick={handleSignIn}
              disabled={isLoggingIn}
              className="gsi-material-button inline-flex items-center justify-center gap-3 px-4 py-2.5 rounded-lg bg-white hover:bg-slate-50 text-[#1f1f1f] border border-[#747775]/40 shadow-xs text-sm font-medium cursor-pointer disabled:opacity-60 transition-colors"
            >
              <div className="gsi-material-button-icon w-5 h-5 shrink-0">
                <svg
                  version="1.1"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 48 48"
                  className="w-5 h-5 block"
                >
                  <path
                    fill="#EA4335"
                    d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                  />
                  <path
                    fill="#4285F4"
                    d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                  />
                  <path
                    fill="#34A853"
                    d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                  />
                  <path fill="none" d="M0 0h48v48H0z" />
                </svg>
              </div>
              <span className="gsi-material-button-contents">
                {isLoggingIn ? t.wsGmailSigningIn : t.wsGmailSignInBtn}
              </span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      data-testid="gmail-inbox-viewer"
      className="flex-1 flex flex-col min-h-0 bg-slate-50 dark:bg-[#090d16] text-slate-900 dark:text-slate-100"
    >
      {/* Header Bar */}
      <div className="px-3.5 py-2.5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d1322] flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <Inbox className="w-4 h-4 text-cyan-500 shrink-0" />
          <span className="text-xs font-semibold truncate">
            {t.wsGmailConnectedAs}:{' '}
            <span className="font-mono text-cyan-600 dark:text-cyan-300">
              {sessionEmail || user?.email || 'Gmail'}
            </span>
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => void loadInbox(accessToken, searchQuery)}
            disabled={loadingInbox}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-cyan-500/50 text-xs cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingInbox ? 'animate-spin' : ''}`} />
            <span>{t.wsGmailRefreshBtn}</span>
          </button>
          <button
            type="button"
            onClick={handleSignOut}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-rose-500/30 text-rose-500 hover:bg-rose-500/10 text-xs cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>{t.wsGmailDisconnectBtn}</span>
          </button>
        </div>
      </div>

      {/* Search Bar */}
      {!selectedDetail && (
        <form
          onSubmit={handleSearchSubmit}
          className="px-3.5 py-2 border-b border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-[#0b101b] flex items-center gap-2"
        >
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.wsGmailSearchPlaceholder}
              className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs outline-none focus:border-cyan-500"
            />
          </div>
          <button
            type="submit"
            className="px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-semibold cursor-pointer"
          >
            {t.wsGmailSearchBtn}
          </button>
        </form>
      )}

      {inboxError && (
        <div className="mx-3.5 mt-2.5 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-500">
          {inboxError}
        </div>
      )}

      {/* Body: Detail Viewer or Inbox List */}
      <div className="flex-1 min-h-0 overflow-y-auto p-3.5">
        {selectedDetail ? (
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d1322] p-4 space-y-3">
            <button
              type="button"
              onClick={() => setSelectedDetail(null)}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-cyan-600 dark:text-cyan-400 hover:underline cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>{t.wsGmailBackToInbox}</span>
            </button>

            <div className="border-b border-slate-200 dark:border-slate-800 pb-3 space-y-1">
              <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {selectedDetail.subject}
              </h4>
              <div className="text-xs text-slate-500 dark:text-slate-400 flex flex-wrap items-center justify-between gap-2">
                <span>{selectedDetail.from}</span>
                <span className="font-mono text-[11px]">{selectedDetail.date}</span>
              </div>
            </div>

            {selectedDetail.htmlBody ? (
              <div
                className="prose prose-sm max-w-none bg-white text-slate-900 rounded-lg p-3 overflow-x-auto text-xs"
                dangerouslySetInnerHTML={{
                  __html: DOMPurify.sanitize(selectedDetail.htmlBody),
                }}
              />
            ) : (
              <pre className="text-xs leading-relaxed whitespace-pre-wrap font-sans text-slate-700 dark:text-slate-200">
                {selectedDetail.textBody || selectedDetail.snippet}
              </pre>
            )}
          </div>
        ) : loadingInbox || loadingDetail ? (
          <div className="h-full flex items-center justify-center text-xs text-slate-500">
            {t.wsGmailLoadingInbox}
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-xs text-slate-500">
            {t.wsGmailEmptyInbox}
          </div>
        ) : (
          <div className="space-y-1.5">
            {messages.map((msg) => (
              <button
                key={msg.id}
                type="button"
                onClick={() => void handleOpenMessage(msg.id)}
                className={`w-full text-left p-3 rounded-xl border transition-colors cursor-pointer ${
                  msg.isUnread
                    ? 'bg-white dark:bg-[#10182b] border-cyan-500/35 hover:border-cyan-400'
                    : 'bg-white/70 dark:bg-[#0d1322] border-slate-200 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-600'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-0.5">
                  <span
                    className={`text-xs truncate ${
                      msg.isUnread
                        ? 'font-semibold text-slate-900 dark:text-white'
                        : 'font-medium text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {msg.from}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400 shrink-0">
                    {msg.date.slice(0, 16)}
                  </span>
                </div>
                <div
                  className={`text-xs truncate ${
                    msg.isUnread
                      ? 'font-semibold text-cyan-700 dark:text-cyan-300'
                      : 'text-slate-800 dark:text-slate-200'
                  }`}
                >
                  {msg.subject}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                  {msg.snippet}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
