import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { CreateWorkspaceModal } from './features/workspaces/CreateWorkspaceModal';
import { CreateProjectModal } from './features/projects/CreateProjectModal';
import { Login } from './features/auth/Login';
import { Register } from './features/auth/Register';
import { KanbanBoard } from './features/board/KanbanBoard';
import { IssueList } from './features/issues/IssueList';
import { DashboardView } from './features/dashboard/DashboardView';
import { ActivityFeed } from './features/activity/ActivityFeed';
import { WorkspaceSettings } from './features/workspaces/WorkspaceSettings';
import { AcceptInvitation } from './features/invitations/AcceptInvitation';

const AppLayout: React.FC = () => {
  const { user, loading } = useAuth();
  const [isCreateWsOpen, setIsCreateWsOpen] = useState(false);
  const [isCreateProjOpen, setIsCreateProjOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-sm text-slate-400">
        Loading session...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar onOpenCreateWorkspace={() => setIsCreateWsOpen(true)} />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar onOpenCreateProject={() => setIsCreateProjOpen(true)} />
        <main className="flex-1 flex flex-col overflow-hidden">
          <Outlet />
        </main>
      </div>

      <CreateWorkspaceModal
        isOpen={isCreateWsOpen}
        onClose={() => setIsCreateWsOpen(false)}
      />

      <CreateProjectModal
        isOpen={isCreateProjOpen}
        onClose={() => setIsCreateProjOpen(false)}
      />
    </div>
  );
};

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/invitations/:token/accept" element={<AcceptInvitation />} />

        {/* Protected App Routes */}
        <Route element={<AppLayout />}>
          <Route path="/board" element={<KanbanBoard />} />
          <Route path="/issues" element={<IssueList />} />
          <Route path="/dashboard" element={<DashboardView />} />
          <Route path="/activity" element={<ActivityFeed />} />
          <Route path="/settings" element={<WorkspaceSettings />} />
          <Route path="/" element={<Navigate to="/board" replace />} />
          <Route path="*" element={<Navigate to="/board" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
