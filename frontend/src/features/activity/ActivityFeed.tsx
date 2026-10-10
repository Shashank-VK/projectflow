import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useWorkspace } from '../../context/WorkspaceContext';
import { apiFetch } from '../../lib/api';
import { ActivityEvent } from '../../types';
import { Activity, Clock, ShieldCheck, User } from 'lucide-react';

export const ActivityFeed: React.FC = () => {
  const { currentWorkspace } = useWorkspace();

  const { data: activityData, isLoading, refetch } = useQuery<{ results: ActivityEvent[] }>({
    queryKey: ['workspace-activity', currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace) return { results: [] };
      return apiFetch<{ results: ActivityEvent[] }>(`/workspaces/${currentWorkspace.id}/activity/`);
    },
    enabled: !!currentWorkspace,
  });

  const events = activityData?.results || [];

  return (
    <div className="flex-1 overflow-y-auto p-8 bg-slate-50">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Audit & Activity Log</h2>
          <p className="text-sm text-slate-500 mt-1">
            Immutable timeline of actions and state mutations within {currentWorkspace?.name}.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs divide-y divide-slate-100 overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center text-slate-400 text-sm">Loading activity stream...</div>
          ) : events.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">No activity events recorded.</div>
          ) : (
            events.map((evt) => (
              <div key={evt.id} className="p-4 flex items-start gap-4 hover:bg-slate-50/70 transition">
                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 mt-0.5 shrink-0 border border-slate-200">
                  <User className="w-4 h-4" />
                </div>

                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-slate-900">
                      <span className="font-semibold">{evt.actor?.name || 'System'}</span>{' '}
                      <span className="text-indigo-600 font-medium">{evt.verb}</span>{' '}
                      <span className="font-medium">{evt.entity_type}</span>{' '}
                      {evt.metadata?.key && (
                        <span className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">
                          {evt.metadata.key}
                        </span>
                      )}
                    </p>
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(evt.created_at).toLocaleString()}
                    </span>
                  </div>

                  {evt.metadata && Object.keys(evt.metadata).length > 0 && (
                    <div className="mt-2 text-xs font-mono bg-slate-50 p-2.5 rounded-lg border border-slate-200/60 text-slate-600 overflow-x-auto">
                      {JSON.stringify(evt.metadata, null, 2)}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
