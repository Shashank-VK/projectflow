import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useWorkspace } from '../../context/WorkspaceContext';
import { apiFetch } from '../../lib/api';
import { DashboardStats } from '../../types';
import { StatusBadge, PriorityBadge } from '../../components/Badge';
import {
  CheckCircle2,
  Clock,
  AlertOctagon,
  Users,
  Activity,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const DashboardView: React.FC = () => {
  const { currentWorkspace } = useWorkspace();

  const { data: stats, isLoading, refetch } = useQuery<DashboardStats>({
    queryKey: ['dashboard', currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace) return null as any;
      return apiFetch<DashboardStats>(`/workspaces/${currentWorkspace.id}/dashboard/`);
    },
    enabled: !!currentWorkspace,
  });

  if (isLoading) {
    return (
      <div className="flex-1 p-8 text-center text-slate-400 text-sm">
        Loading workspace dashboard...
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="flex-1 overflow-y-auto p-8 bg-slate-50">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
            Workspace Overview
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Real-time delivery progress across active projects in {currentWorkspace?.name}.
          </p>
        </div>

        {/* 4 Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Issues</p>
              <p className="text-2xl font-bold text-slate-900 mt-0.5">{stats.total_issues}</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600">
              <AlertOctagon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Overdue</p>
              <p className="text-2xl font-bold text-rose-600 mt-0.5">{stats.overdue_count}</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">In Progress</p>
              <p className="text-2xl font-bold text-blue-600 mt-0.5">{stats.status_counts.in_progress}</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Completed</p>
              <p className="text-2xl font-bold text-emerald-600 mt-0.5">{stats.status_counts.done}</p>
            </div>
          </div>
        </div>

        {/* Breakdown Section: Status & Priority */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Status Breakdown */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Work by Status</h3>
            <div className="space-y-3">
              {[
                { status: 'todo', count: stats.status_counts.todo },
                { status: 'in_progress', count: stats.status_counts.in_progress },
                { status: 'in_review', count: stats.status_counts.in_review },
                { status: 'done', count: stats.status_counts.done },
              ].map((item) => (
                <div key={item.status} className="flex items-center justify-between">
                  <StatusBadge status={item.status as any} />
                  <div className="flex items-center gap-3 flex-1 max-w-[200px] mx-4">
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-indigo-600 h-2 rounded-full transition-all"
                        style={{
                          width: `${stats.total_issues > 0 ? (item.count / stats.total_issues) * 100 : 0}%`,
                        }}
                      />
                    </div>
                  </div>
                  <span className="text-xs font-bold text-slate-700 min-w-[24px] text-right">
                    {item.count}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Priority Breakdown */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Work by Priority</h3>
            <div className="space-y-3">
              {[
                { priority: 'urgent', count: stats.priority_counts.urgent },
                { priority: 'high', count: stats.priority_counts.high },
                { priority: 'medium', count: stats.priority_counts.medium },
                { priority: 'low', count: stats.priority_counts.low },
              ].map((item) => (
                <div key={item.priority} className="flex items-center justify-between">
                  <PriorityBadge priority={item.priority as any} />
                  <div className="flex items-center gap-3 flex-1 max-w-[200px] mx-4">
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-indigo-600 h-2 rounded-full transition-all"
                        style={{
                          width: `${stats.total_issues > 0 ? (item.count / stats.total_issues) * 100 : 0}%`,
                        }}
                      />
                    </div>
                  </div>
                  <span className="text-xs font-bold text-slate-700 min-w-[24px] text-right">
                    {item.count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Assignee Distribution & Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Workload by Assignee */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Team Workload</h3>
              <Users className="w-4 h-4 text-slate-400" />
            </div>

            <div className="space-y-3">
              {stats.assignees && stats.assignees.length > 0 ? (
                stats.assignees.map((a, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 transition">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-xs font-bold text-slate-700">
                        {a.assignee__name ? a.assignee__name.charAt(0).toUpperCase() : '?'}
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-900">
                          {a.assignee__name || 'Unassigned'}
                        </p>
                        <p className="text-[11px] text-slate-400">{a.assignee__email || ''}</p>
                      </div>
                    </div>
                    <span className="text-xs font-bold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full">
                      {a.count} issues
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400">No issues assigned yet.</p>
              )}
            </div>
          </div>

          {/* Recent Activity Feed */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Recent Workspace Activity</h3>
              <Link
                to="/activity"
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
              >
                View all <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="space-y-3">
              {stats.recent_activity && stats.recent_activity.length > 0 ? (
                stats.recent_activity.slice(0, 5).map((act) => (
                  <div key={act.id} className="text-xs flex items-start gap-2.5 p-2 rounded-xl hover:bg-slate-50 transition">
                    <div className="w-2 h-2 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                    <div className="flex-1">
                      <p className="text-slate-800">
                        <span className="font-semibold">{act.actor?.name || 'System'}</span>{' '}
                        <span className="text-slate-500">{act.verb}</span>{' '}
                        <span className="font-semibold text-slate-900">{act.entity_type}</span>{' '}
                        {act.metadata?.key && <span className="font-mono text-indigo-600">[{act.metadata.key}]</span>}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {new Date(act.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400">No activity logged yet.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
