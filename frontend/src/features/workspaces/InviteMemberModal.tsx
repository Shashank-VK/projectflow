import React, { useState } from 'react';
import { Modal } from '../../components/Modal';
import { apiFetch } from '../../lib/api';
import { useToast } from '../../components/Toast';
import { useWorkspace } from '../../context/WorkspaceContext';
import { Role } from '../../types';

export const InviteMemberModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}> = ({ isOpen, onClose, onSuccess }) => {
  const { currentWorkspace } = useWorkspace();
  const { showToast } = useToast();

  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('member');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !currentWorkspace) return;

    setLoading(true);
    try {
      await apiFetch(`/workspaces/${currentWorkspace.id}/invites/`, {
        method: 'POST',
        body: JSON.stringify({ email: email.trim().toLowerCase(), role }),
      });
      showToast('success', 'Invitation sent', `Invite queued for ${email}`);
      setEmail('');
      onSuccess();
      onClose();
    } catch (err: any) {
      showToast('error', 'Failed to send invite', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Invite New Member">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">Email Address</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="colleague@example.com"
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">Role</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as Role)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
          >
            <option value="member">Member (Can create, edit, move cards & comment)</option>
            <option value="viewer">Viewer (Read-only access)</option>
            <option value="owner">Owner (Full administrative permissions)</option>
          </select>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition shadow-sm"
          >
            {loading ? 'Sending...' : 'Send Invitation'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
