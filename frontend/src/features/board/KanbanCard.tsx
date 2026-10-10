import React from 'react';
import { Issue, IssueStatus } from '../../types';
import { PriorityBadge } from '../../components/Badge';
import { MessageSquare, Calendar, ChevronRight, User } from 'lucide-react';

interface KanbanCardProps {
  issue: Issue;
  onSelect: (issue: Issue) => void;
  onMoveStatus: (issue: Issue, newStatus: IssueStatus) => void;
  isViewer: boolean;
  onDragStart: (e: React.DragEvent, issue: Issue) => void;
}

export const KanbanCard: React.FC<KanbanCardProps> = ({
  issue,
  onSelect,
  onMoveStatus,
  isViewer,
  onDragStart,
}) => {
  const isOverdue = issue.due_at && new Date(issue.due_at) < new Date() && issue.status !== 'done';

  const statuses: IssueStatus[] = ['todo', 'in_progress', 'in_review', 'done'];
  const nextStatuses = statuses.filter((s) => s !== issue.status);

  return (
    <div
      draggable={!isViewer}
      onDragStart={(e) => onDragStart(e, issue)}
      onClick={() => onSelect(issue)}
      className={`group relative bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs hover:shadow-md hover:border-indigo-300 transition-all cursor-pointer ${
        isViewer ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="font-mono text-xs font-semibold text-slate-500 group-hover:text-indigo-600 transition">
          {issue.key}
        </span>
        <PriorityBadge priority={issue.priority} />
      </div>

      <h4 className="text-sm font-semibold text-slate-900 leading-snug line-clamp-2 mb-3">
        {issue.title}
      </h4>

      <div className="flex items-center justify-between text-xs text-slate-400 border-t border-slate-100 pt-3">
        {/* Assignee */}
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-700">
            {issue.assignee ? issue.assignee.name.charAt(0).toUpperCase() : <User className="w-3 h-3 text-slate-400" />}
          </div>
          <span className="truncate max-w-[80px]">
            {issue.assignee ? issue.assignee.name.split(' ')[0] : 'Unassigned'}
          </span>
        </div>

        {/* Badges / Meta */}
        <div className="flex items-center gap-2.5">
          {issue.comment_count > 0 && (
            <span className="flex items-center gap-1 text-[11px] text-slate-400">
              <MessageSquare className="w-3 h-3" />
              {issue.comment_count}
            </span>
          )}

          {issue.due_at && (
            <span
              className={`flex items-center gap-1 text-[11px] font-medium ${
                isOverdue ? 'text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded' : 'text-slate-400'
              }`}
            >
              <Calendar className="w-3 h-3" />
              {new Date(issue.due_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
            </span>
          )}
        </div>
      </div>

      {/* Accessible Quick-Move Menu */}
      {!isViewer && (
        <div
          className="mt-2.5 pt-2 border-t border-slate-50 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => e.stopPropagation()}
        >
          <span className="text-[11px] text-slate-400">Move to:</span>
          <div className="flex items-center gap-1">
            {nextStatuses.map((target) => (
              <button
                key={target}
                onClick={() => onMoveStatus(issue, target)}
                className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-600 transition uppercase"
              >
                {target.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
