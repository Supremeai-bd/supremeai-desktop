import { apiClient } from './apiClient';
import { env } from '../config/env';
import { TeamMember } from '../types';
import { INITIAL_TEAM_MEMBERS } from '../data/customerWorkspaceData';
import { PLAN_CATALOG } from '../config/plans';

export interface TeamRosterResponse {
  members: TeamMember[];
  maxSeats: number;
  tier?: string;
}

export const teamService = {
  async fetchTeam(): Promise<TeamRosterResponse> {
    if (env.isMockEnabled) {
      return {
        members: INITIAL_TEAM_MEMBERS,
        maxSeats: PLAN_CATALOG.Pro.maxSeats,
        tier: 'Pro',
      };
    }
    const res = await apiClient.get<{
      members?: TeamMember[];
      maxSeats?: number;
      tier?: string;
    }>('/api/user/team');
    return {
      members: Array.isArray(res?.members) ? res.members : [],
      maxSeats: typeof res?.maxSeats === 'number' ? res.maxSeats : PLAN_CATALOG.Free.maxSeats,
      tier: res?.tier,
    };
  },

  async inviteMember(
    email: string,
    role: TeamMember['role']
  ): Promise<{ member: TeamMember; members: TeamMember[]; maxSeats?: number }> {
    if (env.isMockEnabled) {
      const namePart = email.split('@')[0] || 'Member';
      const displayName = namePart.charAt(0).toUpperCase() + namePart.slice(1);
      const created: TeamMember = {
        id: `mem_${Date.now()}`,
        name: displayName,
        email,
        avatar: displayName.charAt(0).toUpperCase(),
        role,
        joinedDate: 'Just invited',
        twoFactorEnabled: false,
        status: 'invited',
      };
      return { member: created, members: [created] };
    }
    return apiClient.post('/api/user/team', { email, role });
  },

  async updateMemberRole(id: string, role: TeamMember['role']): Promise<{ members: TeamMember[] }> {
    if (env.isMockEnabled) {
      return { members: [] };
    }
    return apiClient.patch(`/api/user/team/${encodeURIComponent(id)}`, { role });
  },

  async removeMember(id: string): Promise<{ members: TeamMember[] }> {
    if (env.isMockEnabled) {
      return { members: [] };
    }
    return apiClient.delete(`/api/user/team/${encodeURIComponent(id)}`);
  },
};
