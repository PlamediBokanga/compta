import { useEffect, useState } from 'react';
import {
  UserPlus,
  Trash2,
  Mail,
  CheckCircle2,
  Clock,
  X,
  Shield,
  Eye,
  Users,
} from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { useAccessControl } from '../../lib/access';
import { supabase } from '../../lib/supabase';
import { logAction } from '../../lib/audit';
import { fmtDate } from '../../lib/format';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { useToast } from '../../components/ui/Toast';
import { AccessDenied } from '../../components/ui/AccessDenied';
import type { TeamMember, TeamRole } from '../../lib/types';


const statusMeta: Record<string, { label: string; tone: 'warning' | 'success' | 'neutral'; icon: typeof Clock }> = {
  pending: { label: 'Invitation envoyee', tone: 'warning', icon: Clock },
  active: { label: 'Actif', tone: 'success', icon: CheckCircle2 },
  revoked: { label: 'Revoque', tone: 'neutral', icon: X },
};

export function TeamPage() {
  const { user } = useAuth();
  const toast = useToast();
  const access = useAccessControl();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('team_members')
      .select('*')
      .eq('owner_id', user?.id)
      .order('created_at', { ascending: false });
    if (error) toast({ kind: 'error', message: error.message });
    setMembers((data as TeamMember[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    if (user && access.canManageTeam) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, access.canManageTeam]);

  if (access.loading) {
    return <div className="card p-6 text-sm text-ink-500">Verification des autorisations...</div>;
  }

  if (!access.canManageTeam) {
    return (
      <AccessDenied
        title="Acces restreint"
        message="La gestion d'equipe est reservee au proprietaire du compte."
      />
    );
  }

  const revoke = async (member: TeamMember) => {
    if (!confirm(`Revoquer l'acces de ${member.invited_email} ?`)) return;
    try {
      const { error } = await supabase.from('team_members').delete().eq('id', member.id);
      if (error) throw new Error(error.message);
      await logAction('team.revoke', 'team_member', member.id, { email: member.invited_email });
      load();
      toast({ kind: 'success', message: 'Acces revoque.' });
    } catch (e) {
      toast({ kind: 'error', message: e instanceof Error ? e.message : 'Erreur' });
    }
  };

  const changeRole = async (member: TeamMember, newRole: TeamRole) => {
    try {
      const { error } = await supabase.from('team_members').update({ role: newRole }).eq('id', member.id);
      if (error) throw new Error(error.message);
      await logAction('team.role_change', 'team_member', member.id, { from: member.role, to: newRole });
      load();
      toast({ kind: 'success', message: 'Role mis a jour.' });
    } catch (e) {
      toast({ kind: 'error', message: e instanceof Error ? e.message : 'Erreur' });
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink-950">Equipe</h1>
          <p className="mt-1 text-sm text-ink-500">
            Invitez votre expert-comptable ou des collaborateurs a acceder a vos donnees.
          </p>
        </div>
        <button onClick={() => setInviteOpen(true)} className="btn-primary">
          <UserPlus size={16} /> Inviter un membre
        </button>
      </div>

      {/* Info card */}
      <div className="card p-5">
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700">
            <Users size={20} />
          </div>
          <div>
            <h2 className="font-display text-base font-bold text-ink-900">Acces partage securise</h2>
            <p className="mt-1 text-sm text-ink-600">
              Les membres peuvent consulter vos transactions, factures et declarations selon leur role.
              L'expert-comptable a acces en lecture + export. Les lecteurs ne peuvent que consulter.
            </p>
          </div>
        </div>
      </div>

      {/* Members table */}
      <div className="card overflow-hidden">
        <div className="border-b border-ink-100 px-5 py-4">
          <h2 className="font-display text-base font-bold text-ink-900">Membres ({members.length})</h2>
        </div>
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ink-100 bg-ink-50 text-left text-xs uppercase tracking-wider text-ink-500">
                <th className="px-4 py-3 font-semibold">Membre</th>
                <th className="px-4 py-3 font-semibold">Role</th>
                <th className="px-4 py-3 font-semibold">Statut</th>
                <th className="px-4 py-3 font-semibold">Invite le</th>
                <th className="px-4 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {loading && Array.from({ length: 3 }).map((_, i) => (
                <tr key={i}><td colSpan={5} className="px-4 py-3"><div className="skeleton h-10" /></td></tr>
              ))}
              {!loading && members.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-ink-500">
                    Aucun membre. Invitez votre expert-comptable pour lui donner acces a vos donnees.
                  </td>
                </tr>
              )}
              {!loading && members.map((m) => {
                const sm = statusMeta[m.status];
                return (
                  <tr key={m.id} className="hover:bg-ink-50/60 transition">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="grid h-8 w-8 place-items-center rounded-lg bg-ink-100 text-xs font-semibold text-ink-600">
                          {m.invited_email[0]?.toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-ink-900">{m.invited_email}</p>
                          {m.member_id && <p className="text-xs text-success-600">Compte lie</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={m.role}
                        onChange={(e) => changeRole(m, e.target.value as TeamRole)}
                        disabled={m.role === 'owner'}
                        className="input w-auto py-1 text-sm"
                      >
                        <option value="accountant">Expert-comptable</option>
                        <option value="viewer">Lecture seule</option>
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={sm.tone}>
                        <sm.icon size={12} /> {sm.label}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-ink-600">{fmtDate(m.created_at)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {m.role !== 'owner' && (
                          <button
                            onClick={() => revoke(m)}
                            className="rounded-lg p-1.5 text-ink-400 hover:bg-danger-50 hover:text-danger-600"
                            title="Revoquer"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <InviteModal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        onSaved={() => { load(); setInviteOpen(false); }}
      />
    </div>
  );
}

function InviteModal({
  open,
  onClose,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { user } = useAuth();
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<TeamRole>('accountant');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!user) return;
    if (!email.trim()) {
      toast({ kind: 'error', message: 'E-mail requis.' });
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from('team_members').insert({
        owner_id: user.id,
        invited_email: email.trim().toLowerCase(),
        role,
        status: 'pending',
      });
      if (error) throw new Error(error.message);
      await logAction('team.invite', 'team_member', undefined, { email: email.trim(), role });
      toast({ kind: 'success', message: `Invitation envoyee a ${email.trim()}.` });
      setEmail('');
      onSaved();
    } catch (e) {
      toast({ kind: 'error', message: e instanceof Error ? e.message : 'Erreur' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Inviter un membre"
      footer={
        <>
          <button onClick={onClose} className="btn-ghost">Annuler</button>
          <button onClick={save} disabled={saving} className="btn-primary">
            {saving ? 'Envoi...' : <><Mail size={16} /> Envoyer l'invitation</>}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="label">Adresse e-mail</label>
          <div className="relative">
            <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input pl-9"
              placeholder="expert@cabec.fr"
              autoFocus
            />
          </div>
        </div>
        <div>
          <label className="label">Role</label>
          <div className="grid gap-2 sm:grid-cols-2">
            <button
              onClick={() => setRole('accountant')}
              className={`flex items-start gap-3 rounded-xl border p-3 text-left transition ${
                role === 'accountant' ? 'border-brand-500 bg-brand-50' : 'border-ink-200 hover:bg-ink-50'
              }`}
            >
              <Shield size={18} className="mt-0.5 text-brand-700" />
              <div>
                <p className="text-sm font-semibold text-ink-900">Expert-comptable</p>
                <p className="text-xs text-ink-500">Lecture + export FEC/SIE</p>
              </div>
            </button>
            <button
              onClick={() => setRole('viewer')}
              className={`flex items-start gap-3 rounded-xl border p-3 text-left transition ${
                role === 'viewer' ? 'border-brand-500 bg-brand-50' : 'border-ink-200 hover:bg-ink-50'
              }`}
            >
              <Eye size={18} className="mt-0.5 text-ink-600" />
              <div>
                <p className="text-sm font-semibold text-ink-900">Lecture seule</p>
                <p className="text-xs text-ink-500">Consultation uniquement</p>
              </div>
            </button>
          </div>
        </div>
        <p className="text-xs text-ink-500">
          Le membre recevra un e-mail d'invitation. S'il n'a pas encore de compte Tenzo, il devra en creer un avec cette adresse e-mail pour acceder a vos donnees.
        </p>
      </div>
    </Modal>
  );
}




