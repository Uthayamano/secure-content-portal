'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { Shield, ShieldCheck, LogOut, FileText, Grid, Activity, UploadCloud, User as UserIcon } from 'lucide-react';

export function Navbar() {
  const { data: session } = useSession();
  const pathname = usePathname();

  const role = session?.user?.role || 'viewer';
  const isAdmin = role === 'admin';

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-950/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Left: Brand / Logo */}
        <div className="flex items-center gap-6">
          <Link href={isAdmin ? '/admin' : '/viewer'} className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center shadow-md shadow-sky-500/20 group-hover:scale-105 transition-transform">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-base tracking-tight text-white group-hover:text-sky-400 transition-colors">
              SecurePortal
            </span>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            <Link
              href="/viewer"
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                pathname.startsWith('/viewer')
                  ? 'bg-slate-800 text-sky-400'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Grid className="w-4 h-4" />
              <span>Browse Catalog</span>
            </Link>

            {/* Admin only navigation links */}
            {isAdmin && (
              <Link
                href="/admin"
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                  pathname === '/admin'
                    ? 'bg-slate-800 text-sky-400'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <UploadCloud className="w-4 h-4" />
                <span>Admin Console</span>
              </Link>
            )}
          </nav>
        </div>

        {/* Right: User profile, role badge & sign out */}
        <div className="flex items-center gap-3">
          {session ? (
            <div className="flex items-center gap-3">
              {/* Role badge */}
              <div
                className={`px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider flex items-center gap-1 ${
                  isAdmin
                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                    : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/30'
                }`}
              >
                {isAdmin ? <ShieldCheck className="w-3.5 h-3.5" /> : <UserIcon className="w-3.5 h-3.5" />}
                <span>{role}</span>
              </div>

              {/* User info */}
              <div className="hidden sm:flex flex-col text-right">
                <span className="text-sm font-medium text-slate-200 leading-none">
                  {session.user?.name || 'User'}
                </span>
                <span className="text-xs text-slate-500 leading-none mt-1">
                  {session.user?.email}
                </span>
              </div>

              {/* Sign Out Button */}
              <button
                id="btn-signout"
                onClick={() => signOut({ callbackUrl: '/login' })}
                title="Sign out"
                className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800/80 transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-white font-medium text-sm transition"
            >
              Sign In
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
