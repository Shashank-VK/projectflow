import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useWorkspace } from '../../context/WorkspaceContext';
import { apiFetch } from '../../lib/api';
import { Issue } from '../../types';
import { StatusBadge, PriorityBadge } from '../../components/Badge';
import { IssueDrawer } from './IssueDrawer';
import { CreateIssueModal } from './CreateIssueModal';
import { useToast } from '../../components/Toast';
import {
  Search,
  Filter,
  Plus,
  Trash2,
  Calendar,
  User,
  ArrowUpDown,
  RotateCcw,
} from 'lucide-react';

export const IssueList: React.FC = () => {
  const { currentProject, isOwner, isViewer } = useWorkspace();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [sortField, setSortField] = useState('position_key');

  const { data: issuesData, isLoading, refetch } = useQuery<{ results: Issue[] }>({
    queryKey: ['issues-list', currentProject?.id, search, statusFilter, priorityFilter, sortField],
    queryFn: async () => {
      if (!currentProject) return { results: [] };
      let url = `/issues/?project=${currentProject.id}&sort=${sortField}`;
      if (search) url += `&search=${encodeURIComponent(search)}`;
      if (statusFilter) url += `&status=${statusFilter}`;
      if (priorityFilter) url += `&priority=${priorityFilter}`;
      return apiFetch<{ results: Issue[] }>(url);
    },
    enabled: !!currentProject,
  });

  const issues = issuesData?.results || [];

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiFetch(`/issues/${id}/`, { method: 'DELETE' });
    },
    onSuccess: () => {
      showToast('success', 'Issue deleted');
      queryClient.invalidateQueries({ queryKey: ['issues'] });
      queryClient.invalidateQueries({ queryKey: ['issues-list'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (err: any) => {
      showToast('error', 'Failed to delete issue', err.message);
    },
  });

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-4rem)] overflow-hidden bg-slate-50">
      {/* Filters & Actions Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex flex-wrap items-center justify-between gap-4 shrink-0">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search title, key, desc..."
              className="pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 w-56"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-700 bg-white"
          >
            <option value="">All Statuses</option>
            <option value="todo">To Do</option>
            <option value="in_progress">In Progress</option>
            <option value="in_review">In Review</option>
            <option value="done">Done</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-700 bg-white"
          >
            <option value="">All Priorities</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>

          <select
            value={sortField}
            onChange={(e) => setSortField(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-700 bg-white"
          >
            <option value="position_key">Sort: Order (Board)</option>
            <option value="-created_at">Sort: Newest First</option>
            <option value="created_at">Sort: Oldest First</option>
            <option value="due_at">Sort: Due Date</option>
            <option value="-priority">Sort: Priority</option>
          </select>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => refetch()}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
            title="Refresh list"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {!isViewer && (
            <button
              onClick={() => setIsCreateOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>New Issue</span>
            </button>
          )}
        </div>
      </div>

      {/* Table Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/75 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Key</th>
                <th className="py-3 px-4">Title</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Priority</th>
                <th className="py-3 px-4">Assignee</th>
                <th className="py-3 px-4">Due Date</th>
                <th className="py-3 px-4 text-center">Version</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400 text-xs">
                    Loading issues...
                  </td>
                </tr>
              ) : issues.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400 text-xs">
                    No issues found matching filters.
                  </td>
                </tr>
              ) : (
                issues.map((issue) => (
                  <tr
                    key={issue.id}
                    onClick={() => setSelectedIssueId(issue.id)}
                    className="hover:bg-slate-50/80 cursor-pointer transition"
                  >
                    <td className="py-3.5 px-4 font-mono text-xs font-bold text-indigo-700">
                      {issue.key}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-900 max-w-xs truncate">
                      {issue.title}
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={issue.status} />
                    </td>
                    <td className="py-3.5 px-4">
                      <PriorityBadge priority={issue.priority} />
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-600">
                      {issue.assignee ? issue.assignee.name : <span className="text-slate-400">Unassigned</span>}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-500">
                      {issue.due_at ? (
                        new Date(issue.due_at).toLocaleDateString()
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-xs font-mono text-center text-slate-400">
                      v{issue.version}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {!isViewer && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`Are you sure you want to delete ${issue.key}?`)) {
                              deleteMutation.mutate(issue.id);
                            }
                          }}
                          className="p-1 rounded text-slate-300 hover:text-rose-600 transition"
                          title="Delete issue"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isCreateOpen && (
        <CreateIssueModal
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
          onSuccess={() => refetch()}
        />
      )}

      {selectedIssueId && (
        <IssueDrawer
          issueId={selectedIssueId}
          onClose={() => setSelectedIssueId(null)}
        />
      )}
    </div>
  );
};
