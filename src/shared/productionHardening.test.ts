import test from 'node:test';
import assert from 'node:assert/strict';
import {
  hashPassword,
  verifyPassword,
  signSessionToken,
  verifySessionToken,
  isProtectedWorkspaceFile,
  isPrivateIpAddress,
  isRestrictedProxyTarget,
  isAllowedCorsOrigin,
  validateGitLabHost,
  isSafeGitHubRepoSlug,
} from './serverSecurity';

test('isProtectedWorkspaceFile blocks TOTP vault, studio-data, .env, keys, and admin SDK credentials', () => {
  assert.equal(isProtectedWorkspaceFile('.supremeai-totp-vault.json'), true);
  assert.equal(isProtectedWorkspaceFile('.studio-data/conversations.json'), true);
  assert.equal(isProtectedWorkspaceFile('.studio-data/browser-schedules.json'), true);
  assert.equal(isProtectedWorkspaceFile('.env'), true);
  assert.equal(isProtectedWorkspaceFile('.env.production'), true);
  assert.equal(isProtectedWorkspaceFile('certs/tls.key'), true);
  assert.equal(isProtectedWorkspaceFile('firebase-adminsdk-abc123.json'), true);
  assert.equal(isProtectedWorkspaceFile('.git/config'), true);
  assert.equal(isProtectedWorkspaceFile('src/App.tsx'), false);
  assert.equal(isProtectedWorkspaceFile('package.json'), false);
});

test('isPrivateIpAddress blocks IPv4/IPv6 loopback, RFC1918, metadata, CGNAT, and mapped IPv6', () => {
  assert.equal(isPrivateIpAddress('127.0.0.1'), true);
  assert.equal(isPrivateIpAddress('10.0.0.1'), true);
  assert.equal(isPrivateIpAddress('172.16.5.10'), true);
  assert.equal(isPrivateIpAddress('192.168.1.1'), true);
  assert.equal(isPrivateIpAddress('169.254.169.254'), true);
  assert.equal(isPrivateIpAddress('100.64.0.1'), true);
  assert.equal(isPrivateIpAddress('::1'), true);
  assert.equal(isPrivateIpAddress('fc00::1'), true);
  assert.equal(isPrivateIpAddress('fe80::1'), true);
  assert.equal(isPrivateIpAddress('::ffff:127.0.0.1'), true);
  assert.equal(isPrivateIpAddress('::ffff:169.254.169.254'), true);
  assert.equal(isPrivateIpAddress('93.184.216.34'), false);
  assert.equal(isPrivateIpAddress('2606:2800:220:1:248:1893:25c8:1946'), false);
});

test('isRestrictedProxyTarget blocks metadata.google.internal and privileged local routes', () => {
  assert.equal(
    isRestrictedProxyTarget(new URL('http://metadata.google.internal/computeMetadata/v1/'), false)
      .restricted,
    true
  );
  assert.equal(
    isRestrictedProxyTarget(new URL('http://127.0.0.1:3000/api/workspace/file?path=x'), true)
      .restricted,
    true
  );
  assert.equal(
    isRestrictedProxyTarget(new URL('http://127.0.0.1:3000/metrics/usage'), true).restricted,
    true
  );
  assert.equal(
    isRestrictedProxyTarget(new URL('https://example.com/docs'), false).restricted,
    false
  );
});

test('isAllowedCorsOrigin rejects arbitrary third-party origins while allowing trusted origins', () => {
  assert.equal(
    isAllowedCorsOrigin('https://evil.example', 'https://supremeai-studio.pages.dev'),
    false
  );
  assert.equal(
    isAllowedCorsOrigin('https://supremeai-studio.pages.dev', 'https://supremeai-studio.pages.dev'),
    true
  );
  assert.equal(
    isAllowedCorsOrigin('https://tauri.localhost', 'https://supremeai-studio.pages.dev'),
    true
  );
  assert.equal(
    isAllowedCorsOrigin(
      'https://custom.company.com',
      'https://supremeai-studio.pages.dev',
      'https://custom.company.com'
    ),
    true
  );
});

test('validateGitLabHost blocks untrusted attacker hosts to prevent client_secret exfiltration', () => {
  assert.equal(validateGitLabHost('https://evil.com').ok, false);
  assert.equal(validateGitLabHost('http://gitlab.com').ok, false);
  assert.equal(validateGitLabHost('https://169.254.169.254').ok, false);
  const defaultRes = validateGitLabHost(undefined);
  assert.equal(defaultRes.ok, true);
  if (defaultRes.ok) assert.equal(defaultRes.host, 'https://gitlab.com');

  const selfHosted = validateGitLabHost('https://git.internal.corp', 'https://git.internal.corp');
  assert.equal(selfHosted.ok, true);
});

test('isSafeGitHubRepoSlug rejects path traversal payloads', () => {
  assert.equal(isSafeGitHubRepoSlug('Supremeai-bd/supremeai'), true);
  assert.equal(isSafeGitHubRepoSlug('../../user'), false);
  assert.equal(isSafeGitHubRepoSlug('org/repo/extra'), false);
  assert.equal(isSafeGitHubRepoSlug('org/..'), false);
});

test('password hashing and session token signing roundtrip securely', () => {
  const hash = hashPassword('ProdReady!2026');
  assert.equal(verifyPassword('ProdReady!2026', hash), true);
  assert.equal(verifyPassword('wrong', hash), false);

  const secret = 'super-strong-signing-secret-32-chars';
  const now = 1_750_000_000_000;
  const tok = signSessionToken({ sub: 'u1', email: 'User@Example.com', iat: now }, secret, 60_000);
  const parsed = verifySessionToken(tok, secret, now + 1000);
  assert.equal(parsed?.email, 'user@example.com');
  assert.equal(verifySessionToken(tok, secret, now + 70_000), null);
});
