import React, { useState } from 'react';
import { Modal } from '../../components/Modal';
import { apiFetch } from '../../lib/api';
import { useToast } from '../../components/Toast';
import { useWorkspace } from '../../context/WorkspaceContext';

export const CreateProjectModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({
  isOpen,
  onClose,
}) => {
  const [name, setName] = useState('');
  const [key, setKey] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const { currentWorkspace, refreshProjects, setCurrentProject } = useWorkspace();
  const { showToast } = useToast();

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setName(val);
    if (!key || key.length <= 3) {
      // Auto-suggest key from name
      const suggested = val.replace(/[^a-zA-Z0-9]/g, '').substring(0, 4).toUpperCase();
      if (suggested) setKey(suggested);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !key.trim() || !currentWorkspace) return;

    setLoading(true);
    try {
      const newProj = await apiFetch('/projects/', {
        method: 'POST',
        body: JSON.stringify({
          workspace: currentWorkspace.id,
          name: name.trim(),
          key: key.trim().toUpperCase(),
          description: description.trim(),
        }),
      });
      showToast('success', 'Project created', `Project [${newProj.key}] created successfully.`);
      await refreshProjects();
      setCurrentProject(newProj);
      setName('');
      setKey('');
      setDescription('');
      onClose();
    } catch (err: any) {
      showToast('error', 'Failed to create project', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create New Project">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">
            Project Name
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={handleNameChange}
            placeholder="e.g. Core Platform"
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">
            Project Key (2–10 uppercase letters)
          </label>
          <input
            type="text"
            required
            maxLength={10}
            value={key}
            onChange={(e) => setKey(e.target.value.toUpperCase())}
            placeholder="e.g. PF, CORE, APP"
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono uppercase text-sm"
          />
          <p className="text-xs text-slate-400 mt-1">Used as prefix for issue sequences (e.g. {key || 'PF'}-101).</p>
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">
            Description (Optional)
          </label>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief purpose of this project..."
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
            {loading ? 'Creating...' : 'Create Project'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
