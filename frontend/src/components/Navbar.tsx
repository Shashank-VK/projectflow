import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useWorkspace } from '../context/WorkspaceContext';
import { RoleBadge } from './Badge';
import { Modal } from './Modal';
import { useToast } from './Toast';
import { apiFetch } from '../lib/api';
import { useQueryClient } from '@tanstack/react-query';
import {
  RotateCcw,
  LogOut,
  ChevronDown,
  Building2,
  Plus,
  UserCheck,
  Layers,
} from 'lucide-react';

export const Navbar: React.FC<{ onOpenCreateWorkspace: () => void }> = ({ onOpenCreateWorkspace }) => {
  const { user, logout, switchDemoUser } = useAuth();
  const { workspaces, currentWorkspace, setCurrentWorkspace, role } = useWorkspace();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [isWsDropdownOpen, setIsWsDropdownOpen] = useState(false);

  const handleResetDemo = async () => {
    setResetting(true);
    try {
      await apiFetch('/demo/reset/', { method: 'POST' });
      showToast('success', 'Demo data reset successfully', 'Environment reseeded with default fixtures.');
      queryClient.invalidateQueries();
      setIsResetModalOpen(false);
      window.location.reload();
    } catch (err: any) {
      showToast('error', 'Reset failed', err.message);
    } finally {
      setResetting(false);
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200">
      <div className="flex items-center justify-between px-6 h-16">
        {/* Left: Brand & Workspace Selector */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-100">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <span className="text-lg font-bold text-slate-900 tracking-tight">ProjectFlow</span>
              <span className="text-[10px] uppercase font-semibold text-indigo-600 tracking-wider block -mt-1">Sprint Tracker</span>
            </div>
          </div>

          <div className="h-6 w-px bg-slate-200" />

          {/* Workspace Switcher */}
          <div className="relative">
            <button
              onClick={() => setIsWsDropdownOpen(!isWsDropdownOpen)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition text-sm font-medium text-slate-800"
            >
              <Building2 className="w-4 h-4 text-slate-500" />
              <span>{currentWorkspace?.name || 'Select Workspace'}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {isWsDropdownOpen && (
              <div
                className="absolute left-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-40"
                onClick={() => setIsWsDropdownOpen(false)}
              >
                <div className="px-3 py-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Workspaces
                </div>
                {workspaces.map((ws) => (
                  <button
                    key={ws.id}
                    onClick={() => setCurrentWorkspace(ws)}
                    className={`w-full flex items-center justify-between px-3 py-2 text-sm text-left hover:bg-slate-50 transition ${
                      ws.id === currentWorkspace?.id ? 'bg-indigo-50/70 font-semibold text-indigo-700' : 'text-slate-700'
                    }`}
                  >
                    <span>{ws.name}</span>
                    {ws.role && <span className="text-xs text-slate-400 capitalize">{ws.role}</span>}
                  </button>
                ))}
                <div className="border-t border-slate-100 my-1" />
                <button
                  onClick={onOpenCreateWorkspace}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left text-indigo-600 font-medium hover:bg-indigo-50/50 transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Workspace</span>
                </button>
              </div>
            )}
          </div>

          <RoleBadge role={role} />
        </div>

        {/* Right: Demo Role Switcher, Reset Button, User Info */}
        <div className="flex items-center gap-4">
          {/* Quick Demo Switcher Bar */}
          <div className="hidden lg:flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200/80 text-xs">
            <span className="px-2 text-slate-400 font-medium">Demo persona:</span>
            <button
              onClick={() => switchDemoUser('owner')}
              className={`px-2.5 py-1 rounded-lg font-medium transition ${
                role === 'owner' ? 'bg-white shadow-sm text-purple-700 font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Owner (Sarah)
            </button>
            <button
              onClick={() => switchDemoUser('member')}
              className={`px-2.5 py-1 rounded-lg font-medium transition ${
                role === 'member' ? 'bg-white shadow-sm text-indigo-700 font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Member (Alex)
            </button>
            <button
              onClick={() => switchDemoUser('viewer')}
              className={`px-2.5 py-1 rounded-lg font-medium transition ${
                role === 'viewer' ? 'bg-white shadow-sm text-slate-700 font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Viewer (Taylor)
            </button>
          </div>

          {/* Reset Demo Button */}
          <button
            onClick={() => setIsResetModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-300 bg-amber-50/80 text-amber-800 hover:bg-amber-100 transition text-xs font-semibold shadow-xs"
            title="Reseed demo fixtures"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Demo</span>
          </button>

          {/* User Profile */}
          <div className="flex items-center gap-3 pl-2 border-l border-slate-200">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold text-slate-900 leading-tight">{user?.name || 'User'}</p>
              <p className="text-xs text-slate-400 leading-tight">{user?.email}</p>
            </div>
            <button
              onClick={logout}
              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Demo Reset Confirmation Modal */}
      <Modal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        title="Reset Demo Environment"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            This will wipe the current workspace state and re-seed the standard demo fixtures
            (Acme Engineering, Core Platform project with 6 issues across board columns, comments,
            activity events, and demo accounts).
          </p>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
            <strong>Notice:</strong> This action is safe and idempotent. Useful for reviewers to restart from a clean state.
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => setIsResetModalOpen(false)}
              className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleResetDemo}
              disabled={resetting}
              className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium transition shadow-sm"
            >
              {resetting ? 'Resetting...' : 'Yes, Reseed Demo'}
            </button>
          </div>
        </div>
      </Modal>
    </header>
  );
};
