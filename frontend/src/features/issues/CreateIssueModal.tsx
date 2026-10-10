import React, { useState } from 'react';
import { Modal } from '../../components/Modal';
import { apiFetch } from '../../lib/api';
import { useToast } from '../../components/Toast';
import { useWorkspace } from '../../context/WorkspaceContext';
import { IssueStatus, IssuePriority, Membership } from '../../types';
import { useQuery } from '@tanstack/react-query';

export const CreateIssueModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  defaultStatus?: IssueStatus;
}> = ({ isOpen, onClose, onSuccess, defaultStatus = 'todo' }) => {
  const { currentProject, currentWorkspace } = useWorkspace();
  const { showToast } = useToast();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<IssueStatus>(defaultStatus);
  const [priority, setPriority] = useState<IssuePriority>('medium');
  const [assigneeId, setAssigneeId] = useState<string>('');
  const [dueAt, setDueAt] = useState<string>('');
  const [loading, setLoading] = useState(false);

  // Fetch workspace members for assignee selection
  const { data: members } = useQuery<Membership[]>({
    queryKey: ['workspace-members', currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace) return [];
      const res = await apiFetch<{ results: Membership[] }>(`/workspaces/${currentWorkspace.id}/members/`);
      return res.results || [];
    },
    enabled: isOpen && !!currentWorkspace,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !currentProject) return;

    setLoading(true);
    try {
      const payload: any = {
        project: currentProject.id,
        title: title.trim(),
        description: description.trim(),
        status,
        priority,
      };

      if (assigneeId) {
        payload.assignee_id = assigneeId;
      }
      if (dueAt) {
        payload.due_at = new Date(dueAt).toISOString();
      }

      const res = await apiFetch('/issues/', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      showToast('success', 'Issue created', `Created ${res.key}: ${res.title}`);
      setTitle('');
      setDescription('');
      setAssigneeId('');
      setDueAt('');
      onSuccess();
      onClose();
    } catch (err: any) {
      showToast('error', 'Failed to create issue', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Issue" maxWidth="max-w-xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">Title</label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What needs to be done?"
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">Description</label>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add relevant context, acceptance criteria..."
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as IssueStatus)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
            >
              <option value="todo">To Do</option>
              <option value="in_progress">In Progress</option>
              <option value="in_review">In Review</option>
              <option value="done">Done</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Priority</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as IssuePriority)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Assignee</label>
            <select
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
            >
              <option value="">Unassigned</option>
              {members?.map((m) => (
                <option key={m.id} value={m.user.id}>
                  {m.user.name} ({m.user.email})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Due Date</label>
            <input
              type="date"
              value={dueAt}
              onChange={(e) => setDueAt(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
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
            {loading ? 'Creating...' : 'Create Issue'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
