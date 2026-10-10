import React, { createContext, useContext, useState, useEffect } from 'react';
import { Workspace, Project, Role } from '../types';
import { apiFetch } from '../lib/api';
import { useAuth } from './AuthContext';

interface WorkspaceContextType {
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
  projects: Project[];
  currentProject: Project | null;
  role: Role;
  isOwner: boolean;
  isMember: boolean;
  isViewer: boolean;
  loading: boolean;
  setCurrentWorkspace: (workspace: Workspace) => void;
  setCurrentProject: (project: Project) => void;
  refreshWorkspaces: () => Promise<void>;
  refreshProjects: () => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export const WorkspaceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [currentWorkspace, setCurrentWorkspaceState] = useState<Workspace | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProjectState] = useState<Project | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchWorkspaces = async () => {
    if (!user) {
      setWorkspaces([]);
      setCurrentWorkspaceState(null);
      setLoading(false);
      return;
    }

    try {
      const res = await apiFetch<{ results: Workspace[] }>('/workspaces/');
      const list = res.results || [];
      setWorkspaces(list);

      const savedSlug = localStorage.getItem('projectflow_active_workspace');
      let targetWs = list.find((w) => w.slug === savedSlug) || list[0] || null;
      setCurrentWorkspaceState(targetWs);
    } catch {
      setWorkspaces([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchProjects = async (workspaceId: string) => {
    try {
      const res = await apiFetch<{ results: Project[] }>(`/projects/?workspace=${workspaceId}&include_archived=false`);
      const list = res.results || [];
      setProjects(list);
      setCurrentProjectState((prev) => {
        if (prev && list.find((p) => p.id === prev.id)) {
          return list.find((p) => p.id === prev.id) || null;
        }
        return list[0] || null;
      });
    } catch {
      setProjects([]);
      setCurrentProjectState(null);
    }
  };

  useEffect(() => {
    fetchWorkspaces();
  }, [user]);

  useEffect(() => {
    if (currentWorkspace) {
      localStorage.setItem('projectflow_active_workspace', currentWorkspace.slug);
      fetchProjects(currentWorkspace.id);
    } else {
      setProjects([]);
      setCurrentProjectState(null);
    }
  }, [currentWorkspace]);

  const setCurrentWorkspace = (workspace: Workspace) => {
    setCurrentWorkspaceState(workspace);
  };

  const setCurrentProject = (project: Project) => {
    setCurrentProjectState(project);
  };

  const role: Role = (currentWorkspace?.role as Role) || 'viewer';
  const isOwner = role === 'owner';
  const isMember = role === 'member';
  const isViewer = role === 'viewer';

  return (
    <WorkspaceContext.Provider
      value={{
        workspaces,
        currentWorkspace,
        projects,
        currentProject,
        role,
        isOwner,
        isMember,
        isViewer,
        loading,
        setCurrentWorkspace,
        setCurrentProject,
        refreshWorkspaces: fetchWorkspaces,
        refreshProjects: () => (currentWorkspace ? fetchProjects(currentWorkspace.id) : Promise.resolve()),
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
};

export const useWorkspace = () => {
  const context = useContext(WorkspaceContext);
  if (!context) throw new Error('useWorkspace must be used within a WorkspaceProvider');
  return context;
};
