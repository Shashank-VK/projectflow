import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useWorkspace } from '../context/WorkspaceContext';
import {
  Kanban,
  ListTodo,
  LayoutDashboard,
  Users,
  Activity,
  FolderKanban,
  Plus,
  ChevronDown,
  Archive,
} from 'lucide-react';

export const Sidebar: React.FC<{ onOpenCreateProject: () => void }> = ({ onOpenCreateProject }) => {
  const { projects, currentProject, setCurrentProject, isOwner, isViewer } = useWorkspace();
  const [isProjDropdownOpen, setIsProjDropdownOpen] = useState(false);

  return (
    <aside className="w-64 border-r border-slate-200 bg-white flex flex-col shrink-0 min-h-[calc(100vh-4rem)]">
      {/* Project Switcher */}
      <div className="p-4 border-b border-slate-100">
        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
          Project
        </div>
        <div className="relative">
          <button
            onClick={() => setIsProjDropdownOpen(!isProjDropdownOpen)}
            className="w-full flex items-center justify-between p-2.5 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50/70 transition bg-white shadow-xs"
          >
            <div className="flex items-center gap-2.5 truncate">
              <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-700 shrink-0">
                {currentProject?.key || 'PF'}
              </div>
              <div className="truncate text-left">
                <p className="text-sm font-semibold text-slate-900 truncate">
                  {currentProject?.name || 'No Project'}
                </p>
                <p className="text-xs text-slate-400">Key: {currentProject?.key}</p>
              </div>
            </div>
            <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
          </button>

          {isProjDropdownOpen && (
            <div
              className="absolute left-0 mt-2 w-full bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-40"
              onClick={() => setIsProjDropdownOpen(false)}
            >
              <div className="px-3 py-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Select Project
              </div>
              {projects.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setCurrentProject(p)}
                  className={`w-full flex items-center justify-between px-3 py-2 text-sm text-left hover:bg-slate-50 transition ${
                    p.id === currentProject?.id ? 'bg-indigo-50/70 font-semibold text-indigo-700' : 'text-slate-700'
                  }`}
                >
                  <span className="truncate">{p.name}</span>
                  <span className="text-xs font-mono text-slate-400 shrink-0 ml-2">[{p.key}]</span>
                </button>
              ))}

              {!isViewer && (
                <>
                  <div className="border-t border-slate-100 my-1" />
                  <button
                    onClick={onOpenCreateProject}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left text-indigo-600 font-medium hover:bg-indigo-50/50 transition"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Create Project</span>
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 p-3 space-y-1">
        <NavLink
          to="/board"
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
              isActive
                ? 'bg-indigo-50 text-indigo-700 font-semibold shadow-xs'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`
          }
        >
          <Kanban className="w-4 h-4 text-indigo-600" />
          <span>Kanban Board</span>
        </NavLink>

        <NavLink
          to="/issues"
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
              isActive
                ? 'bg-indigo-50 text-indigo-700 font-semibold shadow-xs'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`
          }
        >
          <ListTodo className="w-4 h-4 text-slate-500" />
          <span>Issues & List</span>
        </NavLink>

        <NavLink
          to="/dashboard"
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
              isActive
                ? 'bg-indigo-50 text-indigo-700 font-semibold shadow-xs'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`
          }
        >
          <LayoutDashboard className="w-4 h-4 text-slate-500" />
          <span>Dashboard</span>
        </NavLink>

        <NavLink
          to="/activity"
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
              isActive
                ? 'bg-indigo-50 text-indigo-700 font-semibold shadow-xs'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`
          }
        >
          <Activity className="w-4 h-4 text-slate-500" />
          <span>Activity Log</span>
        </NavLink>

        <div className="pt-4 pb-1 px-3">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Workspace
          </p>
        </div>

        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
              isActive
                ? 'bg-indigo-50 text-indigo-700 font-semibold shadow-xs'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`
          }
        >
          <Users className="w-4 h-4 text-slate-500" />
          <span>Members & Invites</span>
        </NavLink>
      </nav>

      {/* Footer Info */}
      <div className="p-4 border-t border-slate-100 text-xs text-slate-400">
        <div className="flex items-center justify-between">
          <span>ProjectFlow MVP</span>
          <span className="font-mono">v1.0.0</span>
        </div>
      </div>
    </aside>
  );
};
