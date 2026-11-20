import { Express, Request, Response } from 'express';
import crypto from 'crypto';
import {
  hashPassword,
  parseCookieHeader,
  signSessionToken,
  verifyPassword,
} from '../shared/serverSecurity';

// --- Shared State (exported for server.ts to import) ---
export const activeAuthSessions = new Map<string, string>();
export const activeAdminSessions = new Map<string, number>();
export const activeRefreshTokens = new Map<string, { userId: string; expiresAt: number }>();

// --- Handlers (extracted from server.ts lines 2968-3607) ---
  const handleLoginRequest = async (req: Request, res: Response) => {
    if (isIpBlocked(req)) {
      res.status(403).json({ error: 'Access blocked by platform WAF firewall.' });
      return;
    }

    const { email, username, password } = req.body || {};
    const rawEmail = email || username;
    if (!rawEmail || !password) {
      res.status(400).json({ error: 'Email and password are required.' });
      return;
    }

    const cleanEmail = String(rawEmail).trim().toLowerCase();
    const user = usersDb.find((u) => u.email.toLowerCase() === cleanEmail);
    const customerRec = customerDirectory.find((c) => c.email.toLowerCase() === cleanEmail);

    if (customerRec?.status === 'suspended') {
      res
        .status(403)
        .json({ error: 'This account has been suspended by a platform administrator.' });
      return;
    }

    if (user && verifyPassword(String(password), user.passwordHash)) {
      const safeUser = buildSafeAuthUser(user, customerRec);
      const token = signLocalSessionToken({
        sub: user.id,
        email: user.email,
        iat: Date.now(),
        role: safeUser.isAdminEligible ? 'admin' : 'user',
      });
      activeAuthSessions.set(token, user.id);
      if (safeUser.isAdminEligible) {
        setAdminSessionCookie(req, res, token);
      }
      const refreshToken = issueLocalRefreshToken(user.id);
      setRefreshTokenCookie(req, res, refreshToken);
      res.json({
        success: true,
        user: safeUser,
        role: safeUser.role,
        rbacRole: safeUser.rbacRole,
        isAdminEligible: safeUser.isAdminEligible,
        adminEmailMatched: safeUser.adminEmailMatched,
        adminEmails: safeUser.adminEmails,
        token,
        access_token: token,
        refresh_token: refreshToken,
        expires_in: 3600,
      });
      return;
    }

    // Fallback to upstream database-backed gateway if configured and user is not in local usersDb
    if (!user) {
      const remoteGatewayUrl =
        process.env.SUPREMEAI_BACKEND_URL?.trim() || DEFAULT_BACKEND_ORIGIN;
      try {
        const upstreamRes = await fetch(`${remoteGatewayUrl}/api/v1/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          signal: AbortSignal.timeout(12000),
          body: JSON.stringify({ username: cleanEmail, email: cleanEmail, password }),
        });

        const upstreamData: any = await upstreamRes.json().catch(() => null);
        if (upstreamRes.ok && upstreamData && (upstreamData.access_token || upstreamData.token)) {
          const remoteUser =
            upstreamData.user && typeof upstreamData.user === 'object'
              ? upstreamData.user
              : upstreamData;
          const upstreamAdminEmails: string[] = [
            ...(Array.isArray(upstreamData.adminEmails) ? upstreamData.adminEmails : []),
            ...(Array.isArray(upstreamData.admin_emails) ? upstreamData.admin_emails : []),
          ];
          const upstreamRbac =
            remoteUser.rbacRole || remoteUser.rbac_role || remoteUser.role || upstreamData.role;
          const upstreamIsAdmin = Boolean(
            remoteUser.isAdminEligible ??
            remoteUser.is_admin_eligible ??
            remoteUser.is_admin ??
            upstreamData.isAdminEligible ??
            upstreamData.is_admin_eligible
          );

          const rbac = resolveRbacUserProfile(
            cleanEmail,
            {
              rbacRole: upstreamRbac,
              isAdminEligible: upstreamIsAdmin,
              isDeveloperEligible: Boolean(
                remoteUser.isDeveloperEligible ?? remoteUser.is_developer_eligible
              ),
              adminUserId: remoteUser.adminUserId || remoteUser.admin_user_id,
            },
            customerRec,
            upstreamAdminEmails,
            upstreamRbac
          );

          const token = String(upstreamData.access_token || upstreamData.token);
          const safeUser = {
            id: String(
              remoteUser.id || remoteUser.user_id || upstreamData.user_id || `usr_${Date.now()}`
            ),
            user_id: String(
              remoteUser.id || remoteUser.user_id || upstreamData.user_id || `usr_${Date.now()}`
            ),
            name: String(remoteUser.name || cleanEmail.split('@')[0] || 'User'),
            email: cleanEmail,
            avatar: String(remoteUser.name || cleanEmail)
              .charAt(0)
              .toUpperCase(),
            role: rbac.role,
            rbacRole: rbac.rbacRole,
            isAdminEligible: rbac.isAdminEligible,
            adminEmailMatched: rbac.adminEmailMatched,
            isDeveloperEligible: rbac.isDeveloperEligible,
            adminUserId: rbac.adminUserId,
            plan:
              customerRec?.tier || remoteUser.plan || (rbac.isAdminEligible ? 'Enterprise' : 'Pro'),
            createdAt: String(remoteUser.createdAt || new Date().toISOString().slice(0, 10)),
            adminEmails: rbac.adminEmails,
          };

          const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
          upstreamTokenAdminCache.set(tokenHash, {
            email: cleanEmail,
            isAdmin: rbac.isAdminEligible,
            tier: safeUser.plan as PlanTier,
            expiresAt: Date.now() + 60_000,
          });
          if (rbac.isAdminEligible) {
            setAdminSessionCookie(req, res, token);
          }
          const upstreamSetCookie = upstreamRes.headers.get('set-cookie');
          if (upstreamSetCookie) {
            res.append('Set-Cookie', upstreamSetCookie);
          }
          const upstreamRefreshToken =
            upstreamData.refresh_token || upstreamData.refreshToken || undefined;
          if (upstreamRefreshToken) {
            setRefreshTokenCookie(req, res, String(upstreamRefreshToken));
          }

          res.json({
            success: true,
            user: safeUser,
            role: safeUser.role,
            rbacRole: safeUser.rbacRole,
            isAdminEligible: safeUser.isAdminEligible,
            adminEmailMatched: safeUser.adminEmailMatched,
            adminEmails: safeUser.adminEmails,
            token,
            access_token: token,
            ...(upstreamRefreshToken ? { refresh_token: upstreamRefreshToken } : {}),
            expires_in: upstreamData.expires_in || 3600,
          });
          return;
        }

        if (upstreamRes.status >= 500) {
          res.status(502).json({
            error:
              upstreamData?.detail ||
              upstreamData?.error ||
              upstreamData?.message ||
              `Authentication gateway returned HTTP ${upstreamRes.status}. Please retry in a few seconds.`,
          });
          return;
        }

        const upstreamErrMsg =
          upstreamData?.detail ||
          upstreamData?.error ||
          upstreamData?.message ||
          (upstreamRes.status === 403
            ? 'Access forbidden or account requires verification.'
            : upstreamRes.status === 429
              ? 'Too many sign-in attempts. Please wait a moment and try again.'
              : 'Invalid email address or credentials.');
        res.status(upstreamRes.status || 401).json({ error: String(upstreamErrMsg) });
        return;
      } catch (err: unknown) {
        const isAbort = err instanceof Error && (err.name === 'AbortError' || err.name === 'TimeoutError');
        res.status(isAbort ? 504 : 502).json({
          error: isAbort
            ? 'Authentication gateway timed out while waking up. Please try signing in again.'
            : 'Unable to reach authentication gateway. Check network or register a local workspace account.',
        });
        return;
      }
    }

    res.status(401).json({ error: 'Invalid email address or password.' });
  };

  const handleSignupRequest = async (req: Request, res: Response) => {
    if (isIpBlocked(req)) {
      res.status(403).json({ error: 'Access blocked by platform WAF firewall.' });
      return;
    }
    if (!platformConfig.allowNewSignups) {
      res.status(403).json({
        error: 'New account registrations are currently paused by the platform administrator.',
      });
      return;
    }

    const {
      name,
      email,
      username,
      password,
    } = req.body || {};
    const rawEmail = email || username;
    const cleanName = String(name || (rawEmail ? String(rawEmail).split('@')[0] : '')).trim();
    if (!cleanName || !rawEmail || !password) {
      res.status(400).json({ error: 'Name, email, and password are required.' });
      return;
    }

    const cleanEmail = String(rawEmail).trim().toLowerCase();
    const existing = usersDb.find((u) => u.email.toLowerCase() === cleanEmail);
    if (existing) {
      res.status(409).json({ error: 'An account with this email already exists.' });
      return;
    }

    const remoteGatewayUrl =
      process.env.SUPREMEAI_BACKEND_URL?.trim() || DEFAULT_BACKEND_ORIGIN;
    if (remoteGatewayUrl) {
      try {
        const upstreamRes = await fetch(`${remoteGatewayUrl}/api/v1/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          signal: AbortSignal.timeout(12000),
          body: JSON.stringify({
            name: cleanName,
            email: cleanEmail,
            username: cleanEmail,
            password,
          }),
        });
        const upstreamData: any = await upstreamRes.json().catch(() => null);
        if (upstreamRes.ok && upstreamData && (upstreamData.access_token || upstreamData.token)) {
          const remoteUser =
            upstreamData.user && typeof upstreamData.user === 'object'
              ? upstreamData.user
              : upstreamData;
          const rbac = resolveRbacUserProfile(cleanEmail, {
            rbacRole: remoteUser.rbacRole || remoteUser.role,
            isAdminEligible: Boolean(remoteUser.isAdminEligible ?? remoteUser.is_admin_eligible),
          });
          const token = String(upstreamData.access_token || upstreamData.token);
          const safeUser = {
            id: String(remoteUser.id || remoteUser.user_id || `usr_${Date.now()}`),
            user_id: String(remoteUser.id || remoteUser.user_id || `usr_${Date.now()}`),
            name: String(remoteUser.name || cleanName),
            email: cleanEmail,
            avatar: cleanName.charAt(0).toUpperCase(),
            role: rbac.role,
            rbacRole: rbac.rbacRole,
            isAdminEligible: rbac.isAdminEligible,
            adminEmailMatched: rbac.adminEmailMatched,
            isDeveloperEligible: rbac.isDeveloperEligible,
            adminUserId: rbac.adminUserId,
            plan: remoteUser.plan || 'Free',
            createdAt: String(remoteUser.createdAt || new Date().toISOString().slice(0, 10)),
            adminEmails: rbac.adminEmails,
          };
          if (rbac.isAdminEligible) setAdminSessionCookie(req, res, token);
          const upstreamRefreshToken =
            upstreamData.refresh_token || upstreamData.refreshToken || undefined;
          if (upstreamRefreshToken) setRefreshTokenCookie(req, res, String(upstreamRefreshToken));
          res.json({
            success: true,
            user: safeUser,
            role: safeUser.role,
            rbacRole: safeUser.rbacRole,
            isAdminEligible: safeUser.isAdminEligible,
            adminEmailMatched: safeUser.adminEmailMatched,
            adminEmails: safeUser.adminEmails,
            token,
            access_token: token,
            ...(upstreamRefreshToken ? { refresh_token: upstreamRefreshToken } : {}),
            expires_in: upstreamData.expires_in || 3600,
          });
          return;
        }
        if (upstreamRes.status === 409 || upstreamRes.status === 400 || upstreamRes.status === 422) {
          res.status(upstreamRes.status).json({
            error:
              upstreamData?.detail ||
              upstreamData?.error ||
              upstreamData?.message ||
              (upstreamRes.status === 409
                ? 'An account with this email already exists.'
                : 'Invalid signup details provided.'),
          });
          return;
        }
      } catch {
        // Fall through to persisted local registration when upstream registration route is unavailable
      }
    }

    const existingCust = customerDirectory.find((c) => c.email.toLowerCase() === cleanEmail);
    const rbac = resolveRbacUserProfile(cleanEmail, undefined, existingCust);
    const isAdmin = rbac.isAdminEligible;
    const devEligible = isAdmin || Boolean(existingCust?.isDeveloperEligible);
    const assignedPlan: PlanTier = isAdmin
      ? 'Enterprise'
      : existingCust?.tier || 'Free';
    const newUser: ServerUser = {
      id: `usr_${Date.now()}`,
      name: cleanName,
      email: cleanEmail,
      passwordHash: hashPassword(String(password)),
      role: rbac.role,
      rbacRole: rbac.rbacRole,
      isAdminEligible: isAdmin,
      isDeveloperEligible: devEligible,
      adminUserId: rbac.adminUserId,
      plan: assignedPlan,
      createdAt: new Date().toISOString().slice(0, 10),
      avatar: cleanName.charAt(0).toUpperCase(),
    };

    usersDb.push(newUser);
    persistDevUsersDb(usersDb);

    if (!existingCust) {
      const planSpec = getPlanSpec(assignedPlan);
      customerDirectory.unshift({
        id: `cust_${String(Date.now()).slice(-4)}`,
        name: cleanName,
        email: cleanEmail,
        tier: assignedPlan,
        status: 'active',
        mrr: planSpec.monthlyPriceUsd,
        tokensUsed: 0,
        tokenLimit: planSpec.monthlyTokensLimit,
        connectedRepos: 0,
        joinedDate: newUser.createdAt,
        lastActive: 'Just now',
        region: 'Global',
        isDeveloperEligible: devEligible,
        isAdminEligible: isAdmin,
        rbacRole: rbac.rbacRole,
      });
    }

    recordAudit(
      cleanEmail,
      'USER_SIGNUP',
      `Customer: ${cleanEmail}`,
      `Registered under ${assignedPlan} tier (${devEligible ? 'Developer' : 'Standard'})`,
      req
    );

    const safeUser = buildSafeAuthUser(newUser, existingCust);
    const token = signLocalSessionToken({
      sub: newUser.id,
      email: newUser.email,
      iat: Date.now(),
      role: safeUser.isAdminEligible ? 'admin' : 'user',
    });
    activeAuthSessions.set(token, newUser.id);
    if (safeUser.isAdminEligible) {
      setAdminSessionCookie(req, res, token);
    }
    const refreshToken = issueLocalRefreshToken(newUser.id);
    setRefreshTokenCookie(req, res, refreshToken);
    res.json({
      success: true,
      user: safeUser,
      role: safeUser.role,
      rbacRole: safeUser.rbacRole,
      isAdminEligible: safeUser.isAdminEligible,
      adminEmailMatched: safeUser.adminEmailMatched,
      adminEmails: safeUser.adminEmails,
      token,
      access_token: token,
      refresh_token: refreshToken,
      expires_in: 3600,
    });
  };

  const handleGetMeRequest = async (req: Request, res: Response) => {
    const authHeader = String(req.headers.authorization || '').trim();
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';

    if (!token || token.startsWith('tok_guest_') || token.startsWith('sk-supreme-guest')) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }

    const sessionUserId = activeAuthSessions.get(token);
    const verifiedPayload = verifyLocalSessionToken(token);

    if (sessionUserId || verifiedPayload) {
      const lookupEmail = verifiedPayload?.email?.toLowerCase();
      const matchedUser =
        (sessionUserId ? usersDb.find((u) => u.id === sessionUserId) : undefined) ||
        (lookupEmail ? usersDb.find((u) => u.email.toLowerCase() === lookupEmail) : undefined);

      const emailToResolve = (matchedUser?.email || lookupEmail || '').toLowerCase();
      if (!emailToResolve) {
        res.status(401).json({ error: 'Invalid or expired session.' });
        return;
      }

      const customerRec = customerDirectory.find((c) => c.email.toLowerCase() === emailToResolve);
      const tokenClaimsAdmin = verifiedPayload?.role === 'admin';
      const effectiveUser: ServerUser = matchedUser || {
        id: verifiedPayload?.sub || `usr_${Date.now()}`,
        name: customerRec?.name || emailToResolve.split('@')[0],
        email: emailToResolve,
        passwordHash: '',
        role: tokenClaimsAdmin ? 'admin' : 'user',
        isAdminEligible: tokenClaimsAdmin,
        isDeveloperEligible: tokenClaimsAdmin || Boolean(customerRec?.isDeveloperEligible),
        plan: customerRec?.tier || (tokenClaimsAdmin ? 'Enterprise' : 'Pro'),
        createdAt: customerRec?.joinedDate || new Date().toISOString().slice(0, 10),
      };

      const safeUser = buildSafeAuthUser(effectiveUser, customerRec);
      res.json({
        success: true,
        ...safeUser,
        user: safeUser,
      });
      return;
    }

    // Try upstream gateway if bearer token is an upstream JWT
    if (!token.startsWith('tok_') && !token.startsWith('mock_tok_')) {
      const remoteGatewayUrl =
        process.env.SUPREMEAI_BACKEND_URL?.trim() || DEFAULT_BACKEND_ORIGIN;
      try {
        const upstreamRes = await fetch(`${remoteGatewayUrl}/api/v1/auth/me`, {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
          signal: AbortSignal.timeout(9000),
        });
        if (upstreamRes.ok) {
          const data: any = await upstreamRes.json().catch(() => null);
          if (data && typeof data === 'object') {
            const raw =
              data.user && typeof data.user === 'object' ? { ...data, ...data.user } : data;
            const cleanEmail = String(raw.email || '')
              .trim()
              .toLowerCase();
            if (cleanEmail) {
              const matchedUser = usersDb.find((u) => u.email.toLowerCase() === cleanEmail);
              const customerRec = customerDirectory.find(
                (c) => c.email.toLowerCase() === cleanEmail
              );
              const upstreamAdminEmails: string[] = [
                ...(Array.isArray(data.adminEmails) ? data.adminEmails : []),
                ...(Array.isArray(data.admin_emails) ? data.admin_emails : []),
              ];
              const upstreamRbac = raw.rbacRole || raw.rbac_role || raw.role;
              const rbac = resolveRbacUserProfile(
                cleanEmail,
                matchedUser || {
                  rbacRole: upstreamRbac,
                  isAdminEligible: Boolean(
                    raw.isAdminEligible ?? raw.is_admin_eligible ?? raw.is_admin
                  ),
                  isDeveloperEligible: Boolean(
                    raw.isDeveloperEligible ?? raw.is_developer_eligible
                  ),
                  adminUserId: raw.adminUserId || raw.admin_user_id,
                },
                customerRec,
                upstreamAdminEmails,
                upstreamRbac
              );
              const mergedUser = {
                id: String(raw.id || raw.user_id || matchedUser?.id || `usr_${Date.now()}`),
                user_id: String(raw.id || raw.user_id || matchedUser?.id || `usr_${Date.now()}`),
                name: String(raw.name || matchedUser?.name || cleanEmail.split('@')[0]),
                email: cleanEmail,
                avatar: String(raw.name || cleanEmail)
                  .charAt(0)
                  .toUpperCase(),
                role: rbac.role,
                rbacRole: rbac.rbacRole,
                isAdminEligible: rbac.isAdminEligible,
                adminEmailMatched: rbac.adminEmailMatched,
                isDeveloperEligible: rbac.isDeveloperEligible,
                adminUserId: rbac.adminUserId,
                plan:
                  customerRec?.tier ||
                  raw.plan ||
                  matchedUser?.plan ||
                  (rbac.isAdminEligible ? 'Enterprise' : 'Pro'),
                createdAt: String(
                  raw.createdAt || matchedUser?.createdAt || new Date().toISOString().slice(0, 10)
                ),
                adminEmails: rbac.adminEmails,
              };
              res.json({
                success: true,
                ...mergedUser,
                user: mergedUser,
              });
              return;
            }
          }
        }
      } catch {
        // Upstream unavailable
      }
    }

    res.status(401).json({ error: 'Invalid or expired session token.' });
  };

  const handleGuestTokenRequest = async (_req: Request, res: Response) => {
    const remoteGatewayUrl =
      process.env.SUPREMEAI_BACKEND_URL?.trim() || DEFAULT_BACKEND_ORIGIN;
    try {
      const upstreamRes = await fetch(`${remoteGatewayUrl}/api/v1/auth/guest`, {
        method: 'POST',
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(4500),
      });
      if (upstreamRes.ok) {
        const setCookie = upstreamRes.headers.get('set-cookie');
        if (setCookie) res.setHeader('Set-Cookie', setCookie);
        const data = await upstreamRes.json().catch(() => null);
        if (data && typeof data === 'object' && (data.access_token || data.token)) {
          res.json(data);
          return;
        }
      }
    } catch {
      // Upstream unavailable in preview/offline environment; issue local studio guest token below
    }

    const previewGuestToken = `tok_guest_${crypto.randomUUID()}`;
    res.json({
      status: 'ok',
      access_token: previewGuestToken,
      token_type: 'bearer',
      expires_in: 3600,
      class: 'guest',
      source: 'studio-preview',
      message: 'Preview guest trial access granted.',
    });
  };

  const handleRefreshRequest = async (req: Request, res: Response) => {
    const cookies = parseCookieHeader(req.headers.cookie);
    const presented = String(
      req.body?.refresh_token || cookies.supremeai_refresh_token || ''
    ).trim();
    const entry = presented ? activeRefreshTokens.get(presented) : undefined;

    if (!entry && presented && !presented.startsWith('rt_')) {
      const remoteGatewayUrl =
        process.env.SUPREMEAI_BACKEND_URL?.trim() || DEFAULT_BACKEND_ORIGIN;
      try {
        const upstreamRes = await fetch(`${remoteGatewayUrl}/api/v1/auth/refresh`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            ...(req.headers.cookie ? { Cookie: String(req.headers.cookie) } : {}),
          },
          body: JSON.stringify({ refresh_token: presented }),
          signal: AbortSignal.timeout(9000),
        });
        const upstreamData: any = await upstreamRes.json().catch(() => null);
        if (upstreamRes.ok && upstreamData && (upstreamData.access_token || upstreamData.token)) {
          const upstreamSetCookie = upstreamRes.headers.get('set-cookie');
          if (upstreamSetCookie) res.append('Set-Cookie', upstreamSetCookie);
          const nextRefresh = upstreamData.refresh_token || upstreamData.refreshToken;
          if (nextRefresh) setRefreshTokenCookie(req, res, String(nextRefresh));
          res.json(upstreamData);
          return;
        }
      } catch {
        // Fall through to 401
      }
    }

    if (!entry || entry.expiresAt <= Date.now()) {
      if (presented) activeRefreshTokens.delete(presented);
      res.status(401).json({ error: 'Invalid or expired refresh token.' });
      return;
    }

    const user = usersDb.find((u) => u.id === entry.userId);
    if (!user) {
      activeRefreshTokens.delete(presented);
      res.status(401).json({ error: 'Session user no longer exists.' });
      return;
    }

    const customerRec = customerDirectory.find(
      (c) => c.email.toLowerCase() === user.email.toLowerCase()
    );
    if (customerRec?.status === 'suspended') {
      activeRefreshTokens.delete(presented);
      res
        .status(403)
        .json({ error: 'This account has been suspended by a platform administrator.' });
      return;
    }

    const safeUser = buildSafeAuthUser(user, customerRec);
    const token = signLocalSessionToken({
      sub: user.id,
      email: user.email,
      iat: Date.now(),
      role: safeUser.isAdminEligible ? 'admin' : 'user',
    });
    activeAuthSessions.set(token, user.id);

    // Single-use rotation: the presented refresh token is invalidated.
    activeRefreshTokens.delete(presented);
    const rotatedRefreshToken = issueLocalRefreshToken(user.id);
    setRefreshTokenCookie(req, res, rotatedRefreshToken);

    res.json({
      success: true,
      user: safeUser,
      token,
      access_token: token,
      refresh_token: rotatedRefreshToken,
      token_type: 'bearer',
      expires_in: 3600,
    });
  };


// --- Router Registration ---
export interface AuthRouterDeps {
  recordAudit: (actor: string, action: string, resource: string, details: string, req?: Request) => void;
  isIpBlocked: (req: Request) => boolean;
}

export function registerAuthRoutes(app: Express, deps: AuthRouterDeps) {
  app.post('/api/auth/refresh', handleRefreshRequest);
  app.post('/api/v1/auth/refresh', handleRefreshRequest);
  app.post('/api/auth/login', handleLoginRequest);
  app.post('/api/v1/auth/login', handleLoginRequest);
  app.post('/api/auth/signup', handleSignupRequest);
  app.post('/api/v1/auth/register', handleSignupRequest);
  app.post('/api/v1/auth/guest', handleGuestTokenRequest);
  app.post('/api/v1/guest/token', handleGuestTokenRequest);
  app.get('/api/auth/me', handleGetMeRequest);
  app.get('/api/v1/auth/me', handleGetMeRequest);
  app.post('/api/v1/auth/logout', handleLogoutRequest);
}
