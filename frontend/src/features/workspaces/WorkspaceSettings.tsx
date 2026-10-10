import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useWorkspace } from '../../context/WorkspaceContext';
import { apiFetch } from '../../lib/api';
import { Membership, Invitation, Role } from '../../types';
import { RoleBadge } from '../../components/Badge';
import { InviteMemberModal } from './InviteMemberModal';
import { useToast } from '../../components/Toast';
import {
  Users,
  Mail,
  UserX,
  RotateCw,
  Ban,
  Plus,
  ShieldAlert,
} from 'lucide-react';

export const WorkspaceSettings: React.FC = () => {
  const { currentWorkspace, isOwner, isViewer } = useWorkspace();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [isInviteOpen, setIsInviteOpen] = useState(false);

  // Fetch members
  const { data: membersData, refetch: refetchMembers } = useQuery<{ results: Membership[] }>({
    queryKey: ['members', currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace) return { results: [] };
      return apiFetch<{ results: Membership[] }>(`/workspaces/${currentWorkspace.id}/members/`);
    },
    enabled: !!currentWorkspace,
  });

  // Fetch invites (only if owner)
  const { data: invitesData, refetch: refetchInvites } = useQuery<{ results: Invitation[] }>({
    queryKey: ['invites', currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace || !isOwner) return { results: [] };
      return apiFetch<{ results: Invitation[] }>(`/workspaces/${currentWorkspace.id}/invites/`);
    },
    enabled: !!currentWorkspace && isOwner,
  });

  const members = membersData?.results || [];
  const invites = invitesData?.results || [];

  // Update role mutation
  const updateRoleMutation = useMutation({
    mutationFn: async ({ memberId, role }: { memberId: string; role: Role }) => {
      return apiFetch(`/workspaces/${currentWorkspace?.id}/members/${memberId}/`, {
        method: 'PATCH',
        body: JSON.stringify({ role }),
      });
    },
    onSuccess: () => {
      showToast('success', 'Role updated');
      refetchMembers();
    },
    onError: (err: any) => {
      showToast('error', 'Failed to update role', err.message);
    },
  });

  // Remove member mutation
  const removeMemberMutation = useMutation({
    mutationFn: async (memberId: string) => {
      return apiFetch(`/workspaces/${currentWorkspace?.id}/members/${memberId}/`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      showToast('success', 'Member removed');
      refetchMembers();
    },
    onError: (err: any) => {
      showToast('error', 'Failed to remove member', err.message);
    },
  });

  // Revoke invite mutation
  const revokeInviteMutation = useMutation({
    mutationFn: async (inviteId: string) => {
      return apiFetch(`/workspaces/${currentWorkspace?.id}/invites/${inviteId}/revoke/`, {
        method: 'POST',
      });
    },
    onSuccess: () => {
      showToast('success', 'Invitation revoked');
      refetchInvites();
    },
    onError: (err: any) => {
      showToast('error', 'Failed to revoke invite', err.message);
    },
  });

  // Resend invite mutation
  const resendInviteMutation = useMutation({
    mutationFn: async (inviteId: string) => {
      return apiFetch(`/workspaces/${currentWorkspace?.id}/invites/${inviteId}/resend/`, {
        method: 'POST',
      });
    },
    onSuccess: () => {
      showToast('success', 'Invitation resent');
      refetchInvites();
    },
    onError: (err: any) => {
      showToast('error', 'Failed to resend invite', err.message);
    },
  });

  return (
    <div className="flex-1 overflow-y-auto p-8 bg-slate-50">
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
            Workspace Members & Settings
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Manage collaborators, roles, and pending invitations for {currentWorkspace?.name}.
          </p>
        </div>

        {/* Members List */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-900">Active Members</h3>
              <p className="text-xs text-slate-400">Total {members.length} team members</p>
            </div>

            {isOwner && (
              <button
                onClick={() => setIsInviteOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Invite Member</span>
              </button>
            )}
          </div>

          <div className="divide-y divide-slate-100">
            {members.map((m) => (
              <div key={m.id} className="py-3.5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-sm text-slate-700">
                    {m.user.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900 leading-tight">{m.user.name}</p>
                    <p className="text-xs text-slate-400">{m.user.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {isOwner ? (
                    <select
                      value={m.role}
                      onChange={(e) => updateRoleMutation.mutate({ memberId: m.id, role: e.target.value as Role })}
                      className="text-xs font-semibold px-2.5 py-1 rounded-lg border border-slate-200 bg-white"
                    >
                      <option value="owner">Owner</option>
                      <option value="member">Member</option>
                      <option value="viewer">Viewer</option>
                    </select>
                  ) : (
                    <RoleBadge role={m.role} />
                  )}

                  {isOwner && (
                    <button
                      onClick={() => {
                        if (confirm(`Remove ${m.user.name} from workspace?`)) {
                          removeMemberMutation.mutate(m.id);
                        }
                      }}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                      title="Remove member"
                    >
                      <UserX className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Invitations List (Owner Only) */}
        {isOwner && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
            <div className="pb-4 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Invitations</h3>
              <p className="text-xs text-slate-400">Sent invitations and statuses</p>
            </div>

            {invites.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">No invitations sent yet.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {invites.map((inv) => (
                  <div key={inv.id} className="py-3 flex items-center justify-between text-sm">
                    <div>
                      <p className="font-semibold text-xs text-slate-900">{inv.email}</p>
                      <p className="text-[11px] text-slate-400">
                        Role: <span className="capitalize font-medium">{inv.role}</span> · Expires:{' '}
                        {new Date(inv.expires_at).toLocaleDateString()}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                          inv.status === 'accepted'
                            ? 'bg-emerald-50 text-emerald-700'
                            : inv.status === 'pending'
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {inv.status}
                      </span>

                      {inv.status === 'pending' && (
                        <>
                          <button
                            onClick={() => resendInviteMutation.mutate(inv.id)}
                            className="p-1 text-slate-400 hover:text-indigo-600 transition"
                            title="Resend invite"
                          >
                            <RotateCw className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => revokeInviteMutation.mutate(inv.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 transition"
                            title="Revoke invite"
                          >
                            <Ban className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <InviteMemberModal
        isOpen={isInviteOpen}
        onClose={() => setIsInviteOpen(false)}
        onSuccess={() => refetchInvites()}
      />
    </div>
  );
};
