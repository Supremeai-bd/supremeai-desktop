import { describe, expect, it } from 'vitest';
import { normalizeAuthUser } from './authService';

describe('normalizeAuthUser RBAC & DB admin email matching', () => {
  it('marks user admin-eligible when RBAC role is admin or super_admin even if top-level role is user', () => {
    const userA = normalizeAuthUser({
      id: 'usr_1',
      email: 'ops@company.com',
      name: 'Ops Lead',
      role: 'user',
      rbacRole: 'admin',
      isAdminEligible: true,
    });
    expect(userA?.isAdminEligible).toBe(true);
    expect(userA?.rbacRole).toBe('admin');

    const userB = normalizeAuthUser({
      user: {
        id: 'usr_2',
        email: 'founder@company.com',
        role: 'user',
        rbac_role: 'super_admin',
      },
    });
    expect(userB?.isAdminEligible).toBe(true);
    expect(userB?.rbacRole).toBe('super_admin');
  });

  it('marks user admin-eligible when logged-in email matches admin email from database list', () => {
    const matched = normalizeAuthUser({
      user_id: 'usr_3',
      email: 'PaykariBazarOnline@gmail.com',
      role: 'user',
      adminEmails: ['admin@supremeai.bd', 'paykaribazaronline@gmail.com'],
    });
    expect(matched?.isAdminEligible).toBe(true);
    expect(matched?.email).toBe('paykaribazaronline@gmail.com');
  });

  it('keeps standard users ineligible when email and RBAC role do not grant admin access', () => {
    const regular = normalizeAuthUser({
      user: {
        id: 'usr_4',
        email: 'member@company.com',
        role: 'user',
        rbacRole: 'user',
        isAdminEligible: false,
      },
      adminEmails: ['admin@supremeai.bd'],
    });
    expect(regular?.isAdminEligible).toBe(false);
    expect(regular?.role).toBe('user');
  });

  it('rejects non-object HTML fallback responses cleanly', () => {
    expect(normalizeAuthUser('<!doctype html><html></html>')).toBeNull();
    expect(normalizeAuthUser(null)).toBeNull();
  });
});
