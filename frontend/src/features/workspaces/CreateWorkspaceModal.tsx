import React, { useState } from 'react';
import { Modal } from '../../components/Modal';
import { apiFetch } from '../../lib/api';
import { useToast } from '../../components/Toast';
import { useWorkspace } from '../../context/WorkspaceContext';

export const CreateWorkspaceModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({
  isOpen,
  onClose,
}) => {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const { refreshWorkspaces, setCurrentWorkspace } = useWorkspace();
  const { showToast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    try {
      const newWs = await apiFetch('/workspaces/', {
        method: 'POST',
        body: JSON.stringify({ name: name.trim() }),
      });
      showToast('success', 'Workspace created', `Created ${newWs.name}`);
      await refreshWorkspaces();
      setCurrentWorkspace(newWs);
      setName('');
      onClose();
    } catch (err: any) {
      showToast('error', 'Failed to create workspace', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create New Workspace">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">
            Workspace Name
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Acme Engineering"
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
          />
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
            {loading ? 'Creating...' : 'Create Workspace'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
