import React from 'react';
import { IssueStatus, IssuePriority, Role } from '../types';

export const StatusBadge: React.FC<{ status: IssueStatus }> = ({ status }) => {
  const configs: Record<IssueStatus, { label: string; bg: string; text: string; dot: string }> = {
    todo: { label: 'To Do', bg: 'bg-slate-100', text: 'text-slate-700', dot: 'bg-slate-400' },
    in_progress: { label: 'In Progress', bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
    in_review: { label: 'In Review', bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
    done: { label: 'Done', bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  };

  const config = configs[status] || configs.todo;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
};

export const PriorityBadge: React.FC<{ priority: IssuePriority }> = ({ priority }) => {
  const configs: Record<IssuePriority, { label: string; bg: string; text: string }> = {
    low: { label: 'Low', bg: 'bg-slate-100', text: 'text-slate-600' },
    medium: { label: 'Medium', bg: 'bg-blue-50', text: 'text-blue-700' },
    high: { label: 'High', bg: 'bg-orange-50', text: 'text-orange-700' },
    urgent: { label: 'Urgent', bg: 'bg-rose-50', text: 'text-rose-700' },
  };

  const config = configs[priority] || configs.medium;

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium uppercase tracking-wider ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  );
};

export const RoleBadge: React.FC<{ role: Role }> = ({ role }) => {
  const configs: Record<Role, { label: string; bg: string; text: string; border: string }> = {
    owner: { label: 'Owner', bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
    member: { label: 'Member', bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' },
    viewer: { label: 'Viewer (Read-Only)', bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-200' },
  };

  const config = configs[role] || configs.viewer;

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded border text-xs font-semibold ${config.bg} ${config.text} ${config.border}`}>
      {config.label}
    </span>
  );
};
