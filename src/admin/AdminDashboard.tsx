import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Activity, Building2, LayoutGrid, LogOut, RefreshCw, Search, Shield, X } from 'lucide-react';
import {
  adminFetchDashboard,
  adminLogin,
  adminLogout,
  adminVerifyTotp,
  type AdminDashboardData,
  type AdminRole,
  type AdminTenant,
  type AdminUsage,
} from '../bridge/desktopBridge';
import { BrandMark } from '../components/BrandMark';

type AdminView = 'overview' | 'services' | 'tenants';

function displayCount(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return '—';
  return new Intl.NumberFormat().format(value);
}

function displayCost(value: number | undefined) {
  if (value == null || !Number.isFinite(value)) return '—';
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 4,
  }).format(value);
}

function statusMeta(status?: string) {
  const n = status?.trim().toLowerCase() ?? '';
  if (['healthy', 'ready', 'ok', 'up', 'operational'].includes(n)) {
    return { label: 'Healthy', cls: 'text-emerald-600 dark:text-emerald-400' };
  }
  if (['degraded', 'warning', 'limited'].includes(n)) {
    return { label: 'Degraded', cls: 'text-amber-600 dark:text-amber-400' };
  }
  if (['down', 'offline', 'unhealthy', 'failed', 'error', 'critical'].includes(n)) {
    return { label: 'Down', cls: 'text-rose-600 dark:text-rose-400' };
  }
  return { label: 'Unknown', cls: 'text-slate-500 dark:text-slate-400' };
}

function prettify(value: string) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function TenantTable({
  tenants,
  usageByTenant,
  emptyMessage,
}: {
  tenants: AdminTenant[];
  usageByTenant: Map<string, AdminUsage>;
  emptyMessage: string;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200/80 dark:border-slate-800">
      <table className="w-full text-left border-collapse text-xs">
        <thead>
          <tr className="border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70 text-slate-500 dark:text-slate-400">
            <th className="py-2.5 px-4 font-semibold">Organization</th>
            <th className="py-2.5 px-4 font-semibold">Plan</th>
            <th className="py-2.5 px-4 font-semibold text-right">Requests today</th>
            <th className="py-2.5 px-4 font-semibold text-right">Tokens today</th>
            <th className="py-2.5 px-4 font-semibold text-right">Cost today</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800/80">
          {tenants.map((tenant) => {
            const usage = usageByTenant.get(tenant.tenant_id);
            return (
              <tr key={tenant.tenant_id} className="hover:bg-slate-100/50 dark:hover:bg-slate-800/40">
                <td className="py-3 px-4">
                  <div className="font-semibold text-slate-900 dark:text-slate-100">
                    {tenant.org_name || 'Unnamed tenant'}
                  </div>
                  <div className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                    {tenant.tenant_id}
                  </div>
                </td>
                <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
                  {tenant.billing_tier || '—'}
                </td>
                <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-800 dark:text-slate-200">
                  {displayCount(usage?.requests_today)}
                </td>
                <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-800 dark:text-slate-200">
                  {displayCount(usage?.tokens_today)}
                </td>
                <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-800 dark:text-slate-200">
                  {displayCost(usage?.cost_today)}
                </td>
              </tr>
            );
          })}
          {tenants.length === 0 && (
            <tr>
              <td colSpan={5} className="py-8 px-4 text-center text-slate-500 dark:text-slate-400">
                {emptyMessage}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default function AdminDashboard({ onClose }: { onClose: () => void }) {
  const dialogRef = useRef<HTMLElement | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [needsOtp, setNeedsOtp] = useState(false);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [role, setRole] = useState<AdminRole | null>(null);
  const [sessionEmail, setSessionEmail] = useState('');
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [busy, setBusy] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [notice, setNotice] = useState('');
  const [activeView, setActiveView] = useState<AdminView>('overview');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [tenantSearch, setTenantSearch] = useState('');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function refreshDashboard() {
    setLoadingData(true);
    setNotice('');
    try {
      const result = await adminFetchDashboard();
      setData(result);
      setLastUpdated(new Date());
      if (result.email) setSessionEmail(result.email);
    } catch (error) {
      setNotice(
        typeof error === 'string' ? error : 'The admin dashboard could not be refreshed.'
      );
    } finally {
      setLoadingData(false);
    }
  }

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setNotice('');
    try {
      const result = await adminLogin(email, password);
      if (result.status === 'otp_required') {
        setNeedsOtp(true);
        setNeedsSetup(false);
        return;
      }
      if (result.status === 'totp_setup_required') {
        setNeedsSetup(true);
        setNeedsOtp(false);
        return;
      }
      if (result.status !== 'authenticated' || result.role !== 'admin') {
        throw new Error('The authentication service returned an invalid session.');
      }
      setRole('admin');
      setSessionEmail(result.email || email);
      await refreshDashboard();
    } catch (error) {
      setNotice(
        typeof error === 'string' ? error : error instanceof Error ? error.message : 'Sign-in failed.'
      );
    } finally {
      setPassword('');
      setBusy(false);
    }
  }

  async function verifyTotp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setNotice('');
    try {
      const result = await adminVerifyTotp(otp);
      setOtp('');
      if (result.status !== 'authenticated' || result.role !== 'admin') {
        throw new Error('The verification service returned an invalid session.');
      }
      setRole('admin');
      setSessionEmail(result.email || email);
      setNeedsOtp(false);
      await refreshDashboard();
    } catch (error) {
      setNotice(
        typeof error === 'string'
          ? error
          : error instanceof Error
            ? error.message
            : 'Verification failed.'
      );
    } finally {
      setOtp('');
      setBusy(false);
    }
  }

  async function signOut() {
    setBusy(true);
    await adminLogout();
    setData(null);
    setLastUpdated(null);
    setActiveView('overview');
    setTenantSearch('');
    setRole(null);
    setSessionEmail('');
    setEmail('');
    setPassword('');
    setOtp('');
    setNeedsOtp(false);
    setNeedsSetup(false);
    setNotice('');
    setBusy(false);
  }

  const overview = data?.tenantOverview;
  const usageByTenant = new Map<string, AdminUsage>(
    (overview?.usages ?? []).map((u) => [u.tenant_id, u])
  );
  const totalRequests = (overview?.usages ?? []).reduce((sum, u) => sum + (u.requests_today || 0), 0);
  const registeredTenants = (overview?.tenants ?? []).length;
  const healthEntries = Object.entries(data?.health ?? {});
  const attentionEntries = healthEntries.filter(([, item]) => statusMeta(item.status).label !== 'Healthy');
  const filteredTenants = (overview?.tenants ?? []).filter((tenant) => {
    const q = tenantSearch.trim().toLowerCase();
    return (
      !q ||
      [tenant.org_name, tenant.tenant_id, tenant.billing_tier].some((val) =>
        val?.toLowerCase().includes(q)
      )
    );
  });

  const fetchedAtLabel = lastUpdated
    ? new Intl.DateTimeFormat(undefined, {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }).format(lastUpdated)
    : 'Not fetched';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-sm">
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="SupremeAI Control Center"
        className="w-full max-w-5xl h-[86vh] rounded-2xl border theme-surface-strong flex flex-col overflow-hidden shadow-2xl"
      >
        <header className="flex items-center justify-between gap-4 px-5 py-3.5 border-b border-slate-200/80 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <BrandMark size={30} />
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white leading-tight">
                SupremeAI Control Center
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Evidence-first · read-only operations console
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {role && (
              <>
                <span className="hidden sm:inline text-xs font-mono text-slate-500 dark:text-slate-400 tabular-nums">
                  Fetched {fetchedAtLabel}
                </span>
                <button
                  type="button"
                  onClick={() => void refreshDashboard()}
                  disabled={loadingData || busy}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingData ? 'animate-spin' : ''}`} />
                  <span>{loadingData ? 'Refreshing…' : 'Refresh'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => void signOut()}
                  disabled={busy}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign out</span>
                </button>
              </>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close Control Center"
              className="p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </header>

        {!role ? (
          <div className="flex-1 overflow-y-auto studio-scroll grid grid-cols-1 md:grid-cols-2 gap-8 items-center p-8">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 text-xs font-medium theme-accent-text">
                <Shield className="w-4 h-4" />
                <span>SupremeAI Administration</span>
              </div>
              <h1 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-white text-balance">
                Operations, <span className="theme-accent-gradient-text">in one place.</span>
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Sign in with your platform owner credentials to inspect live service health, gateway
                latency, and tenant usage records. Read-only mode protects cluster configuration.
              </p>
            </div>

            <form
              onSubmit={needsOtp ? verifyTotp : signIn}
              className="p-6 rounded-2xl border theme-surface-glass space-y-4"
            >
              {needsSetup ? (
                <>
                  <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                    Two-factor setup required
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Complete owner TOTP enrollment through the admin setup flow, then return here to
                    sign in.
                  </p>
                  <button
                    type="button"
                    onClick={() => setNeedsSetup(false)}
                    className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold theme-btn-primary cursor-pointer"
                  >
                    Back to sign in
                  </button>
                </>
              ) : needsOtp ? (
                <>
                  <div>
                    <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                      Verify authentication code
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Enter the 6-digit code from your authenticator app.
                    </p>
                  </div>
                  <input
                    autoFocus
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    className="w-full px-3.5 py-2.5 rounded-xl font-mono text-center tracking-widest text-base border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                  <button
                    type="submit"
                    disabled={busy || otp.length !== 6}
                    className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold theme-btn-primary disabled:opacity-50 cursor-pointer"
                  >
                    {busy ? 'Verifying…' : 'Verify and continue'}
                  </button>
                </>
              ) : (
                <>
                  <div>
                    <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                      Platform owner sign in
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Verify with your SupremeAI administrator credentials.
                    </p>
                  </div>
                  <div className="space-y-3">
                    <label className="block space-y-1">
                      <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                        Email
                      </span>
                      <input
                        type="email"
                        required
                        autoComplete="username"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="owner@supremeai.dev"
                        className="w-full px-3 py-2 rounded-xl text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                      />
                    </label>
                    <label className="block space-y-1">
                      <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                        Password
                      </span>
                      <input
                        type="password"
                        required
                        autoComplete="current-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                      />
                    </label>
                  </div>
                  <button
                    type="submit"
                    disabled={busy}
                    className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold theme-btn-primary disabled:opacity-50 cursor-pointer"
                  >
                    {busy ? 'Signing in…' : 'Continue securely'}
                  </button>
                </>
              )}
              {notice && (
                <p role="alert" className="text-xs text-rose-600 dark:text-rose-400">
                  {notice}
                </p>
              )}
            </form>
          </div>
        ) : (
          <div className="flex-1 min-h-0 flex overflow-hidden">
            <nav className="w-52 shrink-0 border-r border-slate-200/80 dark:border-slate-800 p-3 space-y-1">
              {(
                [
                  ['overview', 'Overview', LayoutGrid, undefined],
                  ['services', 'Services', Activity, healthEntries.length],
                  ['tenants', 'Tenants', Building2, overview?.total ?? registeredTenants],
                ] as const
              ).map(([id, label, Icon, count]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setActiveView(id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                    activeView === id
                      ? 'theme-accent-active border'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <span className="inline-flex items-center gap-2">
                    <Icon className="w-4 h-4" />
                    <span>{label}</span>
                  </span>
                  {count !== undefined && (
                    <span className="font-mono tabular-nums text-[11px]">{count}</span>
                  )}
                </button>
              ))}
            </nav>

            <main className="flex-1 overflow-y-auto studio-scroll p-6 space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h1 className="text-xl font-semibold text-slate-900 dark:text-white">
                    {activeView === 'services'
                      ? 'Services & Health'
                      : activeView === 'tenants'
                        ? 'Tenants & Usage'
                        : 'Platform Overview'}
                  </h1>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {sessionEmail} · Read-only scope
                  </p>
                </div>
              </div>

              {notice && (
                <div className="p-3 rounded-xl border border-amber-500/30 bg-amber-500/10 text-xs text-amber-800 dark:text-amber-200">
                  {notice}
                </div>
              )}

              {activeView === 'overview' && (
                <>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
                    <div className="p-4 rounded-xl border theme-surface-glass">
                      <div className="text-xs text-slate-500 dark:text-slate-400">Reported services</div>
                      <div className="mt-1 text-2xl font-semibold font-mono tabular-nums text-slate-900 dark:text-white">
                        {healthEntries.length}
                      </div>
                    </div>
                    <div className="p-4 rounded-xl border theme-surface-glass">
                      <div className="text-xs text-slate-500 dark:text-slate-400">Needs attention</div>
                      <div className="mt-1 text-2xl font-semibold font-mono tabular-nums text-slate-900 dark:text-white">
                        {attentionEntries.length}
                      </div>
                    </div>
                    <div className="p-4 rounded-xl border theme-surface-glass">
                      <div className="text-xs text-slate-500 dark:text-slate-400">Configured tenants</div>
                      <div className="mt-1 text-2xl font-semibold font-mono tabular-nums text-slate-900 dark:text-white">
                        {displayCount(overview?.total ?? registeredTenants)}
                      </div>
                    </div>
                    <div className="p-4 rounded-xl border theme-surface-glass">
                      <div className="text-xs text-slate-500 dark:text-slate-400">Requests today</div>
                      <div className="mt-1 text-2xl font-semibold font-mono tabular-nums text-slate-900 dark:text-white">
                        {displayCount(totalRequests)}
                      </div>
                    </div>
                  </div>

                  <TenantTable
                    tenants={overview?.tenants ?? []}
                    usageByTenant={usageByTenant}
                    emptyMessage="No tenant records were returned."
                  />
                </>
              )}

              {activeView === 'services' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {healthEntries.map(([name, item]) => {
                    const meta = statusMeta(item.status);
                    return (
                      <article
                        key={name}
                        className="p-4 rounded-xl border theme-surface-glass space-y-1.5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-semibold text-slate-900 dark:text-white">
                            {prettify(name)}
                          </span>
                          <span className={`text-xs font-semibold ${meta.cls}`}>{meta.label}</span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                          {[
                            item.provider,
                            item.region,
                            item.latency_ms != null ? `${item.latency_ms} ms` : null,
                          ]
                            .filter(Boolean)
                            .join(' · ') || 'No additional telemetry reported'}
                        </p>
                      </article>
                    );
                  })}
                </div>
              )}

              {activeView === 'tenants' && (
                <div className="space-y-3">
                  <label className="flex items-center gap-2 px-3 py-2 rounded-xl border theme-input-surface text-slate-500 max-w-sm">
                    <Search className="w-4 h-4" />
                    <input
                      type="search"
                      value={tenantSearch}
                      onChange={(e) => setTenantSearch(e.target.value)}
                      placeholder="Search organization, tenant ID, or plan"
                      className="w-full bg-transparent border-0 outline-none text-xs text-slate-900 dark:text-slate-100"
                    />
                  </label>
                  <TenantTable
                    tenants={filteredTenants}
                    usageByTenant={usageByTenant}
                    emptyMessage={
                      tenantSearch ? 'No tenants match this search.' : 'No tenant records returned.'
                    }
                  />
                </div>
              )}
            </main>
          </div>
        )}
      </section>
    </div>
  );
}
