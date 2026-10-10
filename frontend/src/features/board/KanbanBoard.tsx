import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useWorkspace } from '../../context/WorkspaceContext';
import { apiFetch, ApiError } from '../../lib/api';
import { Issue, IssueStatus, IssuePriority } from '../../types';
import { KanbanCard } from './KanbanCard';
import { CreateIssueModal } from '../issues/CreateIssueModal';
import { IssueDrawer } from '../issues/IssueDrawer';
import { useToast } from '../../components/Toast';
import { Plus, Filter, Search, RotateCcw } from 'lucide-react';

const COLUMNS: { id: IssueStatus; title: string; color: string }[] = [
  { id: 'todo', title: 'To Do', color: 'border-slate-300' },
  { id: 'in_progress', title: 'In Progress', color: 'border-blue-400' },
  { id: 'in_review', title: 'In Review', color: 'border-amber-400' },
  { id: 'done', title: 'Done', color: 'border-emerald-400' },
];

export const KanbanBoard: React.FC = () => {
  const { currentProject, isViewer } = useWorkspace();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);
  const [createModalStatus, setCreateModalStatus] = useState<IssueStatus | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [draggedIssue, setDraggedIssue] = useState<Issue | null>(null);

  // Fetch issues
  const { data: issuesData, isLoading, refetch } = useQuery<{ results: Issue[] }>({
    queryKey: ['issues', currentProject?.id],
    queryFn: async () => {
      if (!currentProject) return { results: [] };
      return apiFetch<{ results: Issue[] }>(`/issues/?project=${currentProject.id}`);
    },
    enabled: !!currentProject,
  });

  const issues = issuesData?.results || [];

  // Move status mutation with optimistic update & 409 conflict rollback
  const moveMutation = useMutation({
    mutationFn: async ({ issue, newStatus, newPosKey }: { issue: Issue; newStatus: IssueStatus; newPosKey?: string }) => {
      const payload: any = {
        status: newStatus,
        version: issue.version, // concurrency check
      };
      if (newPosKey) payload.position_key = newPosKey;

      return apiFetch<Issue>(`/issues/${issue.id}/`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
    },
    onMutate: async ({ issue, newStatus, newPosKey }) => {
      // Cancel outgoing queries
      await queryClient.cancelQueries({ queryKey: ['issues', currentProject?.id] });

      // Snapshot previous issues state
      const previousIssues = queryClient.getQueryData<{ results: Issue[] }>(['issues', currentProject?.id]);

      // Optimistically update cache
      if (previousIssues) {
        queryClient.setQueryData<{ results: Issue[] }>(['issues', currentProject?.id], {
          ...previousIssues,
          results: previousIssues.results.map((i) =>
            i.id === issue.id
              ? { ...i, status: newStatus, position_key: newPosKey || i.position_key }
              : i
          ),
        });
      }

      return { previousIssues };
    },
    onError: (err: any, _, context: any) => {
      // Rollback to previous state!
      if (context?.previousIssues) {
        queryClient.setQueryData(['issues', currentProject?.id], context.previousIssues);
      }

      if (err instanceof ApiError && err.status === 409) {
        showToast(
          'warning',
          'Conflict detected (409)',
          'This card was updated elsewhere. Column has been rolled back and refreshed.'
        );
      } else {
        showToast('error', 'Failed to move card', err.message);
      }
      refetch();
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['issues', currentProject?.id] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  const handleMoveStatus = (issue: Issue, newStatus: IssueStatus) => {
    // Calculate new position_key: place at the bottom of target column
    const columnIssues = issues.filter((i) => i.status === newStatus);
    const maxPos = columnIssues.length > 0 ? Math.max(...columnIssues.map((i) => parseFloat(i.position_key) || 10000.0)) : 10000.0;
    const newPosKey = (maxPos + 10000.0).toFixed(6);

    moveMutation.mutate({ issue, newStatus, newPosKey });
  };

  const handleDragStart = (e: React.DragEvent, issue: Issue) => {
    setDraggedIssue(issue);
    e.dataTransfer.setData('text/plain', issue.id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetStatus: IssueStatus) => {
    e.preventDefault();
    if (!draggedIssue || draggedIssue.status === targetStatus) {
      setDraggedIssue(null);
      return;
    }

    handleMoveStatus(draggedIssue, targetStatus);
    setDraggedIssue(null);
  };

  // Filter issues
  const filteredIssues = issues.filter((issue) => {
    const matchesSearch =
      issue.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      issue.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
      issue.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPriority = priorityFilter === 'all' || issue.priority === priorityFilter;
    return matchesSearch && matchesPriority;
  });

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-4rem)] overflow-hidden bg-slate-50">
      {/* Top Filter & Action Bar */}
      <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search issues (key, title)..."
              className="pl-9 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 w-64"
            />
          </div>

          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span>Priority:</span>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="bg-transparent border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-700 font-medium"
            >
              <option value="all">All Priorities</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => refetch()}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
            title="Refresh board"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {!isViewer && (
            <button
              onClick={() => setCreateModalStatus('todo')}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>New Issue</span>
            </button>
          )}
        </div>
      </div>

      {/* Kanban Columns Canvas */}
      <div className="flex-1 overflow-x-auto p-6">
        <div className="flex gap-6 h-full items-start min-w-[1000px]">
          {COLUMNS.map((column) => {
            const columnCards = filteredIssues.filter((i) => i.status === column.id);

            return (
              <div
                key={column.id}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, column.id)}
                className="w-80 shrink-0 bg-slate-100/70 rounded-2xl p-4 flex flex-col max-h-full border border-slate-200/60"
              >
                {/* Column Header */}
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-slate-800">{column.title}</span>
                    <span className="text-xs font-bold text-slate-400 bg-slate-200/80 px-2 py-0.5 rounded-full">
                      {columnCards.length}
                    </span>
                  </div>

                  {!isViewer && (
                    <button
                      onClick={() => setCreateModalStatus(column.id)}
                      className="p-1 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition"
                      title={`Add issue to ${column.title}`}
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Cards Container */}
                <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                  {columnCards.map((issue) => (
                    <KanbanCard
                      key={issue.id}
                      issue={issue}
                      onSelect={(i) => setSelectedIssueId(i.id)}
                      onMoveStatus={handleMoveStatus}
                      isViewer={isViewer}
                      onDragStart={handleDragStart}
                    />
                  ))}

                  {columnCards.length === 0 && (
                    <div className="h-28 border-2 border-dashed border-slate-200 rounded-xl flex items-center justify-center text-xs text-slate-400">
                      No issues
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Create Issue Modal */}
      {createModalStatus && (
        <CreateIssueModal
          isOpen={!!createModalStatus}
          onClose={() => setCreateModalStatus(null)}
          onSuccess={() => refetch()}
          defaultStatus={createModalStatus}
        />
      )}

      {/* Routable / Panel Issue Drawer */}
      {selectedIssueId && (
        <IssueDrawer
          issueId={selectedIssueId}
          onClose={() => setSelectedIssueId(null)}
        />
      )}
    </div>
  );
};
