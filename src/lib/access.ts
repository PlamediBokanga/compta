import { useEffect, useState } from 'react';
import { useAuth } from './auth';
import { supabase } from './supabase';
import type { TeamMember, TeamRole } from './types';

export interface AccessControl {
  role: TeamRole;
  loading: boolean;
  isRestrictedMember: boolean;
  canAccessAdmin: boolean;
  canAccessApi: boolean;
  canManageTeam: boolean;
}

function normalizeRole(members: TeamMember[]): TeamRole {
  if (members.some((member) => member.role === 'accountant')) {
    return 'accountant';
  }
  return 'viewer';
}

export function useAccessControl(): AccessControl {
  const { user } = useAuth();
  const [role, setRole] = useState<TeamRole>('owner');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    if (!user) {
      setRole('viewer');
      setLoading(false);
      return () => {
        active = false;
      };
    }

    setLoading(true);
    (async () => {
      const { data, error } = await supabase
        .from('team_members')
        .select('*')
        .eq('member_id', user.id)
        .eq('status', 'active');

      if (!active) return;

      if (error) {
        console.warn('team access load', error.message);
        setRole('owner');
        setLoading(false);
        return;
      }

      const memberships = (data as TeamMember[] | null) ?? [];
      setRole(memberships.length > 0 ? normalizeRole(memberships) : 'owner');
      setLoading(false);
    })();

    return () => {
      active = false;
    };
  }, [user]);

  const isRestrictedMember = role !== 'owner';

  return {
    role,
    loading,
    isRestrictedMember,
    canAccessAdmin: role === 'owner' || role === 'accountant',
    canAccessApi: role === 'owner',
    canManageTeam: role === 'owner',
  };
}
