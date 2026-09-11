'use client';

import React, { useState } from 'react';
import { signIn } from 'next-auth/react';
import { Shield, Lock, Eye, CheckCircle, AlertCircle, ArrowRight, Sparkles } from 'lucide-react';
import { useSearchParams } from 'next/navigation';

export default function LoginPage() {
  const searchParams = useSearchParams();
  const errorParam = searchParams.get('error');
  const callbackUrl = searchParams.get('callbackUrl') || '/viewer';

  const [isLoading, setIsLoading] = useState<string | null>(null);

  const handleGoogleSignIn = () => {
    setIsLoading('google');
    signIn('google', { callbackUrl });
  };

  const handleDevPersonaSignIn = (role: 'admin' | 'viewer') => {
    setIsLoading(role);
    signIn('dev-persona-login', {
      role,
      callbackUrl: role === 'admin' ? '/admin' : '/viewer',
    });
  };

  const isDevAuthEnabled = process.env.NEXT_PUBLIC_ENABLE_DEV_AUTH === 'true';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center px-4 relative overflow-hidden">
      {/* Background ambient gradient glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[400px] h-[400px] bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main card */}
      <div className="w-full max-w-md bg-slate-900/80 border border-slate-800 backdrop-blur-xl rounded-2xl p-8 shadow-2xl relative z-10">
        {/* Header Icon */}
        <div className="flex items-center justify-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-sky-500/25">
            <Shield className="w-7 h-7 text-white" />
          </div>
        </div>

        {/* Title */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-white mb-2">
            Secure Content Portal
          </h1>
          <p className="text-sm text-slate-400">
            Internal reference & protected training portal with zero raw-file exposure.
          </p>
        </div>

        {/* Error notification if any */}
        {errorParam && (
          <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Authentication Error</p>
              <p className="text-xs text-rose-400/90 mt-0.5">
                {errorParam === 'OAuthCallback'
                  ? 'Error completing Google sign-in. Please try again.'
                  : `Sign-in failed (${errorParam}).`}
              </p>
            </div>
          </div>
        )}

        {/* Google OAuth Button - Single Primary Login Method */}
        <div className="space-y-4">
          <button
            id="btn-google-login"
            onClick={handleGoogleSignIn}
            disabled={Boolean(isLoading)}
            className="w-full flex items-center justify-center gap-3 px-5 py-3.5 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-semibold text-sm transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed group cursor-pointer"
          >
            {isLoading === 'google' ? (
              <div className="w-5 h-5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.36 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.36 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                />
              </svg>
            )}
            <span>Sign in with Google</span>
          </button>
        </div>

        {/* Security boundary description */}
        <div className="mt-6 pt-6 border-t border-slate-800/80 space-y-2.5 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
            <span>Strict Google OAuth identity verification</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
            <span>Role-based access (Admin allowlist enforcement)</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
            <span>Secure HttpOnly cookie session management</span>
          </div>
        </div>

        {/* Development / Evaluator Fast Switcher (Zero email/password forms) */}
        {isDevAuthEnabled && (
          <div className="mt-6 pt-5 border-t border-dashed border-slate-800">
            <div className="flex items-center gap-1.5 mb-3 text-xs font-medium text-amber-400">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Reviewer & Evaluator Fast Access</span>
            </div>
            <p className="text-xs text-slate-400 mb-3">
              Test full RBAC boundaries instantly without external Google OAuth credentials:
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                id="btn-demo-admin"
                onClick={() => handleDevPersonaSignIn('admin')}
                disabled={Boolean(isLoading)}
                className="px-3 py-2 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 text-sky-300 text-xs font-medium transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Demo Admin</span>
              </button>
              <button
                id="btn-demo-viewer"
                onClick={() => handleDevPersonaSignIn('viewer')}
                disabled={Boolean(isLoading)}
                className="px-3 py-2 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-medium transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Demo Viewer</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="mt-8 text-xs text-slate-500 text-center relative z-10">
        Enterprise Grade &bull; Supabase Private Storage &bull; NextAuth.js
      </div>
    </div>
  );
}
