import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/Toast';
import { Layers, ArrowRight, ShieldCheck, UserCheck, Eye } from 'lucide-react';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      showToast('success', 'Welcome back!');
      navigate('/board');
    } catch (err: any) {
      showToast('error', 'Login failed', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async (demoEmail: string) => {
    setLoading(true);
    try {
      await login(demoEmail, 'password123');
      showToast('success', 'Logged in as demo user');
      navigate('/board');
    } catch (err: any) {
      showToast('error', 'Demo login failed', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-6">
        {/* Brand */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-200 mb-2">
            <Layers className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Sign in to ProjectFlow</h1>
          <p className="text-sm text-slate-500">Collaborative Sprint & Issue Tracker</p>
        </div>

        {/* Quick Demo Logins Card */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider text-center">
            Reviewer 1-Click Demo Accounts
          </p>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => handleDemoLogin('owner@projectflow.dev')}
              className="flex flex-col items-center justify-center p-2.5 rounded-xl border border-purple-200 bg-purple-50/50 hover:bg-purple-100/70 transition text-center"
            >
              <ShieldCheck className="w-4 h-4 text-purple-600 mb-1" />
              <span className="text-xs font-bold text-purple-900">Owner</span>
              <span className="text-[10px] text-purple-600">Full Access</span>
            </button>

            <button
              onClick={() => handleDemoLogin('member@projectflow.dev')}
              className="flex flex-col items-center justify-center p-2.5 rounded-xl border border-indigo-200 bg-indigo-50/50 hover:bg-indigo-100/70 transition text-center"
            >
              <UserCheck className="w-4 h-4 text-indigo-600 mb-1" />
              <span className="text-xs font-bold text-indigo-900">Member</span>
              <span className="text-[10px] text-indigo-600">Task Mutate</span>
            </button>

            <button
              onClick={() => handleDemoLogin('viewer@projectflow.dev')}
              className="flex flex-col items-center justify-center p-2.5 rounded-xl border border-slate-200 bg-slate-100/60 hover:bg-slate-200/60 transition text-center"
            >
              <Eye className="w-4 h-4 text-slate-600 mb-1" />
              <span className="text-xs font-bold text-slate-800">Viewer</span>
              <span className="text-[10px] text-slate-500">Read-Only</span>
            </button>
          </div>
        </div>

        {/* Form Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm transition shadow-sm flex items-center justify-center gap-2"
            >
              <span>{loading ? 'Signing in...' : 'Sign In'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="mt-6 text-center text-xs text-slate-500">
            Don't have an account?{' '}
            <Link to="/register" className="font-semibold text-indigo-600 hover:text-indigo-800">
              Create one
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
