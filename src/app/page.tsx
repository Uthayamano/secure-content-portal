import Link from 'next/link';
import { Shield, Eye, Lock, ArrowRight, PlayCircle, FileText, Code2 } from 'lucide-react';
import { getServerAuthSession } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function HomePage() {
  const session = await getServerAuthSession();

  if (session?.user) {
    if (session.user.role === 'admin') {
      redirect('/admin');
    } else {
      redirect('/viewer');
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between relative overflow-hidden">
      {/* Ambient background lighting */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-b from-sky-500/15 via-indigo-500/10 to-transparent blur-3xl pointer-events-none" />

      {/* Header */}
      <header className="w-full border-b border-slate-800/80 bg-slate-950/60 backdrop-blur-md relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center shadow-md shadow-sky-500/20">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg text-white">SecurePortal</span>
          </div>

          <Link
            href="/login"
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium text-sm transition"
          >
            Sign In
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-5xl mx-auto px-4 py-16 sm:py-24 text-center relative z-10 flex-1 flex flex-col justify-center">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400 text-xs font-semibold uppercase tracking-wider mx-auto mb-6">
          <Lock className="w-3.5 h-3.5" />
          <span>Zero Raw-Binary Exposure</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white max-w-3xl mx-auto leading-tight">
          Protected Enterprise <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-indigo-400 to-purple-400">
            Content & Training Portal
          </span>
        </h1>

        <p className="mt-6 text-base sm:text-lg text-slate-400 max-w-2xl mx-auto">
          High-assurance streaming for video, canvas-rendered PDF manuals, and sandboxed HTML modules with server-side role enforcement and HttpOnly session cookies.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/login"
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-semibold text-sm shadow-lg shadow-sky-500/25 flex items-center justify-center gap-2 transition"
          >
            <span>Access Content Portal</span>
            <ArrowRight className="w-4 h-4" />
          </Link>

          <Link
            href="/login"
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-300 border border-slate-800 font-semibold text-sm transition"
          >
            Admin Management Console
          </Link>
        </div>

        {/* Feature Cards Grid */}
        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm">
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 mb-4">
              <PlayCircle className="w-5 h-5" />
            </div>
            <h3 className="text-base font-semibold text-white mb-1">Token-Gated Video Stream</h3>
            <p className="text-sm text-slate-400">
              Proxy endpoint supporting HTTP Range requests (206 Partial Content) with short-lived tokens and viewer session re-verification.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-4">
              <FileText className="w-5 h-5" />
            </div>
            <h3 className="text-base font-semibold text-white mb-1">Canvas PDF.js Renderer</h3>
            <p className="text-sm text-slate-400">
              Renders PDF pages directly to HTML5 canvas using pdfjs-dist. Built-in browser download and print triggers are removed.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-4">
              <Code2 className="w-5 h-5" />
            </div>
            <h3 className="text-base font-semibold text-white mb-1">Sandboxed HTML Iframe</h3>
            <p className="text-sm text-slate-400">
              Isolated iframe execution strictly preventing downloads and top-level navigation, served via authenticated content routes.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 py-6 text-center text-xs text-slate-600 relative z-10">
        Secure Content Portal &bull; Designed for high-compliance enterprise content distribution.
      </footer>
    </div>
  );
}
