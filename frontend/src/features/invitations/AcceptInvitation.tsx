import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../../lib/api';
import { Invitation } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useToast } from '../../components/Toast';
import { Layers, CheckCircle, AlertTriangle } from 'lucide-react';

export const AcceptInvitation: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const { user } = useAuth();
  const { refreshWorkspaces } = useWorkspace();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [accepting, setAccepting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { data: invite, isLoading } = useQuery<Invitation>({
    queryKey: ['invitation', token],
    queryFn: async () => {
      if (!token) return null as any;
      return apiFetch<Invitation>(`/invitations/${token}/`);
    },
    enabled: !!token,
  });

  const handleAccept = async () => {
    if (!token) return;
    setAccepting(true);
    setErrorMsg(null);
    try {
      await apiFetch(`/invitations/${token}/accept/`, { method: 'POST' });
      showToast('success', 'Joined workspace!', `You are now a member of ${invite?.workspace_name}`);
      await refreshWorkspaces();
      navigate('/board');
    } catch (err: any) {
      setErrorMsg(err.message);
      showToast('error', 'Could not accept invite', err.message);
    } finally {
      setAccepting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-sm text-slate-400">
        Loading invitation details...
      </div>
    );
  }

  if (!invite) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 text-center max-w-md">
          <p className="text-sm font-semibold text-slate-800">Invitation not found or expired.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white p-8 rounded-2xl border border-slate-200/80 shadow-xs space-y-6 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-200">
          <Layers className="w-6 h-6" />
        </div>

        <div>
          <h2 className="text-xl font-bold text-slate-900">Workspace Invitation</h2>
          <p className="text-sm text-slate-500 mt-1">
            You've been invited to join <strong className="text-slate-800">{invite.workspace_name}</strong> as a{' '}
            <strong className="capitalize text-indigo-600">{invite.role}</strong>.
          </p>
        </div>

        <div className="bg-slate-50 p-4 rounded-xl text-xs text-slate-600 border border-slate-100 text-left space-y-1.5">
          <p>
            <span className="font-semibold text-slate-400">Sent to:</span> {invite.email}
          </p>
          <p>
            <span className="font-semibold text-slate-400">Expires:</span>{' '}
            {new Date(invite.expires_at).toLocaleDateString()}
          </p>
        </div>

        {errorMsg && (
          <div className="bg-rose-50 border border-rose-200 text-rose-900 text-xs p-3 rounded-xl text-left flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {user ? (
          <button
            onClick={handleAccept}
            disabled={accepting}
            className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm transition shadow-sm"
          >
            {accepting ? 'Joining workspace...' : 'Accept & Join Workspace'}
          </button>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-slate-500">Please sign in or register to accept this invitation.</p>
            <div className="flex gap-2">
              <button
                onClick={() => navigate('/login')}
                className="flex-1 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Sign In
              </button>
              <button
                onClick={() => navigate('/register')}
                className="flex-1 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700"
              >
                Register
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
