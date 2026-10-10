import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch, ApiError } from '../../lib/api';
import { Issue, Comment, Membership, IssueStatus, IssuePriority } from '../../types';
import { StatusBadge, PriorityBadge } from '../../components/Badge';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useToast } from '../../components/Toast';
import {
  X,
  Send,
  Trash2,
  Calendar,
  User,
  Clock,
  Layers,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';

export const IssueDrawer: React.FC<{
  issueId: string | null;
  onClose: () => void;
}> = ({ issueId, onClose }) => {
  const { currentWorkspace, isViewer } = useWorkspace();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<IssueStatus>('todo');
  const [priority, setPriority] = useState<IssuePriority>('medium');
  const [assigneeId, setAssigneeId] = useState<string>('');
  const [dueAt, setDueAt] = useState<string>('');
  const [commentText, setCommentText] = useState('');
  const [conflictError, setConflictError] = useState<string | null>(null);

  // Fetch issue details
  const { data: issue, refetch: refetchIssue, isLoading } = useQuery<Issue>({
    queryKey: ['issue', issueId],
    queryFn: async () => {
      if (!issueId) return null as any;
      return apiFetch<Issue>(`/issues/${issueId}/`);
    },
    enabled: !!issueId,
  });

  // Fetch comments
  const { data: comments, refetch: refetchComments } = useQuery<Comment[]>({
    queryKey: ['comments', issueId],
    queryFn: async () => {
      if (!issueId) return [];
      const res = await apiFetch<{ results: Comment[] }>(`/issues/${issueId}/comments/`);
      return res.results || [];
    },
    enabled: !!issueId,
  });

  // Fetch workspace members for assignee
  const { data: members } = useQuery<Membership[]>({
    queryKey: ['workspace-members', currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace) return [];
      const res = await apiFetch<{ results: Membership[] }>(`/workspaces/${currentWorkspace.id}/members/`);
      return res.results || [];
    },
    enabled: !!currentWorkspace,
  });

  useEffect(() => {
    if (issue) {
      setTitle(issue.title);
      setDescription(issue.description);
      setStatus(issue.status);
      setPriority(issue.priority);
      setAssigneeId(issue.assignee?.id || '');
      setDueAt(issue.due_at ? issue.due_at.substring(0, 10) : '');
      setConflictError(null);
    }
  }, [issue]);

  // Update issue mutation
  const updateMutation = useMutation({
    mutationFn: async (payload: any) => {
      return apiFetch<Issue>(`/issues/${issueId}/`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
    },
    onSuccess: (updated) => {
      showToast('success', 'Issue updated', `${updated.key} saved.`);
      setConflictError(null);
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ['issues'] });
      queryClient.invalidateQueries({ queryKey: ['issue', issueId] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (err: any) => {
      if (err instanceof ApiError && err.status === 409) {
        setConflictError('Conflict detected: This issue was modified in another session. We refetched the latest version.');
        refetchIssue();
        showToast('warning', 'Version conflict (409)', 'Changes could not be saved because the issue was updated by another request.');
      } else {
        showToast('error', 'Update failed', err.message);
      }
    },
  });

  // Add comment mutation
  const commentMutation = useMutation({
    mutationFn: async (body: string) => {
      return apiFetch(`/issues/${issueId}/comments/`, {
        method: 'POST',
        body: JSON.stringify({ body }),
      });
    },
    onSuccess: () => {
      setCommentText('');
      refetchComments();
      showToast('success', 'Comment posted');
    },
    onError: (err: any) => {
      showToast('error', 'Failed to post comment', err.message);
    },
  });

  // Delete comment mutation
  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId: string) => {
      return apiFetch(`/comments/${commentId}/`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      refetchComments();
      showToast('success', 'Comment deleted');
    },
  });

  if (!issueId) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!issue) return;

    updateMutation.mutate({
      title: title.trim(),
      description: description.trim(),
      status,
      priority,
      assignee_id: assigneeId || null,
      due_at: dueAt ? new Date(dueAt).toISOString() : null,
      version: issue.version, // optimistic concurrency check
    });
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-2xl bg-white shadow-2xl border-l border-slate-200 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
        <div className="flex items-center gap-3">
          <span className="font-mono text-sm font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
            {issue?.key || '...'}
          </span>
          <span className="text-xs text-slate-400">Version {issue?.version}</span>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center p-8 text-slate-400">
          Loading issue details...
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Conflict Alert Banner */}
          {conflictError && (
            <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 flex items-start gap-3 text-amber-900">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="flex-1 text-sm">
                <p className="font-semibold">Version Conflict (HTTP 409)</p>
                <p className="mt-0.5">{conflictError}</p>
                <button
                  onClick={() => {
                    refetchIssue();
                    setConflictError(null);
                  }}
                  className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-amber-800 underline hover:text-amber-950"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reload Server Representation
                </button>
              </div>
            </div>
          )}

          {/* Issue Title & Description */}
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                Title
              </label>
              <input
                type="text"
                disabled={isViewer}
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  setIsEditing(true);
                }}
                className="w-full text-lg font-bold text-slate-900 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-600 focus:outline-none transition pb-1"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                Description
              </label>
              <textarea
                rows={4}
                disabled={isViewer}
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  setIsEditing(true);
                }}
                placeholder="Add description..."
                className="w-full text-sm text-slate-700 p-3 rounded-xl border border-slate-200 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 focus:outline-none transition resize-y"
              />
            </div>

            {/* Properties Grid */}
            <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Status</label>
                <select
                  disabled={isViewer}
                  value={status}
                  onChange={(e) => {
                    setStatus(e.target.value as IssueStatus);
                    setIsEditing(true);
                  }}
                  className="w-full text-sm font-medium p-2 rounded-lg border border-slate-200 bg-white"
                >
                  <option value="todo">To Do</option>
                  <option value="in_progress">In Progress</option>
                  <option value="in_review">In Review</option>
                  <option value="done">Done</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Priority</label>
                <select
                  disabled={isViewer}
                  value={priority}
                  onChange={(e) => {
                    setPriority(e.target.value as IssuePriority);
                    setIsEditing(true);
                  }}
                  className="w-full text-sm font-medium p-2 rounded-lg border border-slate-200 bg-white"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Assignee</label>
                <select
                  disabled={isViewer}
                  value={assigneeId}
                  onChange={(e) => {
                    setAssigneeId(e.target.value);
                    setIsEditing(true);
                  }}
                  className="w-full text-sm font-medium p-2 rounded-lg border border-slate-200 bg-white"
                >
                  <option value="">Unassigned</option>
                  {members?.map((m) => (
                    <option key={m.id} value={m.user.id}>
                      {m.user.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Due Date</label>
                <input
                  type="date"
                  disabled={isViewer}
                  value={dueAt}
                  onChange={(e) => {
                    setDueAt(e.target.value);
                    setIsEditing(true);
                  }}
                  className="w-full text-sm font-medium p-2 rounded-lg border border-slate-200 bg-white"
                />
              </div>
            </div>

            {!isViewer && isEditing && (
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    if (issue) {
                      setTitle(issue.title);
                      setDescription(issue.description);
                      setStatus(issue.status);
                      setPriority(issue.priority);
                      setAssigneeId(issue.assignee?.id || '');
                      setDueAt(issue.due_at ? issue.due_at.substring(0, 10) : '');
                    }
                    setIsEditing(false);
                  }}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 transition"
                >
                  Discard
                </button>
                <button
                  type="submit"
                  disabled={updateMutation.isPending}
                  className="px-4 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition shadow-xs"
                >
                  {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            )}
          </form>

          {/* Meta Info */}
          <div className="text-xs text-slate-400 flex items-center justify-between border-t border-slate-100 pt-3">
            <span>Reported by {issue?.reporter?.name || 'User'}</span>
            <span>Created {issue?.created_at ? new Date(issue.created_at).toLocaleDateString() : ''}</span>
          </div>

          {/* Comments Section */}
          <div className="border-t border-slate-100 pt-6 space-y-4">
            <h4 className="text-sm font-bold text-slate-900">Activity & Comments</h4>

            {/* Comment Input */}
            {!isViewer ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Write a comment..."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && commentText.trim()) {
                      commentMutation.mutate(commentText.trim());
                    }
                  }}
                  className="flex-1 px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  onClick={() => {
                    if (commentText.trim()) {
                      commentMutation.mutate(commentText.trim());
                    }
                  }}
                  disabled={commentMutation.isPending || !commentText.trim()}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send</span>
                </button>
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">Viewers cannot comment.</p>
            )}

            {/* Comments List */}
            <div className="space-y-3 pt-2">
              {comments && comments.length > 0 ? (
                comments.map((c) => (
                  <div key={c.id} className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 text-sm">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-semibold text-xs text-slate-900">{c.author.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-slate-400">
                          {new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {!isViewer && !c.is_deleted && (
                          <button
                            onClick={() => deleteCommentMutation.mutate(c.id)}
                            className="text-slate-300 hover:text-rose-600 transition"
                            title="Delete comment"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                    <p className={`text-xs ${c.is_deleted ? 'text-slate-400 italic' : 'text-slate-700'}`}>
                      {c.body}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400">No comments yet.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
