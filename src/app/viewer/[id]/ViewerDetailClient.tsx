'use client';

import React from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/navigation/Navbar';
import { VideoViewer } from '@/components/viewers/VideoViewer';
import { PdfViewer } from '@/components/viewers/PdfViewer';
import { HtmlViewer } from '@/components/viewers/HtmlViewer';
import { ViewerContentItem } from '@/lib/types';
import { ArrowLeft, Shield, Lock, Eye, Calendar, Tag } from 'lucide-react';

interface ViewerDetailClientProps {
  item: ViewerContentItem;
}

export default function ViewerDetailClient({ item }: ViewerDetailClientProps) {
  return (
    <div
      onContextMenu={(e) => e.preventDefault()}
      className="min-h-screen bg-slate-950 text-slate-100 flex flex-col select-none"
      style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
    >
      <Navbar />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Navigation & Breadcrumb */}
        <div className="flex items-center justify-between gap-4 mb-6">
          <Link
            href="/viewer"
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-medium text-slate-300 border border-slate-800 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Reference Library</span>
          </Link>

          {/* Security Notice */}
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full">
            <Lock className="w-3 h-3" />
            <span>Zero Raw Binary Exposure Active</span>
          </div>
        </div>

        {/* Media Player / Canvas Viewer Container */}
        <div className="mb-6">
          {item.content_type === 'video' && (
            <VideoViewer contentId={item.id} title={item.title} />
          )}
          {item.content_type === 'pdf' && (
            <PdfViewer contentId={item.id} title={item.title} />
          )}
          {item.content_type === 'html' && (
            <HtmlViewer contentId={item.id} title={item.title} />
          )}
        </div>

        {/* Metadata & Information Box */}
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs uppercase font-semibold tracking-wider px-2.5 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20">
                  {item.content_type}
                </span>
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <Tag className="w-3 h-3" />
                  <span>{item.category}</span>
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-white">{item.title}</h1>
            </div>

            <div className="flex items-center gap-4 text-xs text-slate-400">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                <span>{new Date(item.created_at).toLocaleDateString()}</span>
              </span>
              <span className="flex items-center gap-1">
                <Eye className="w-3.5 h-3.5 text-sky-400" />
                <span>{item.view_count || 0} views</span>
              </span>
            </div>
          </div>

          {/* Description */}
          {item.description && (
            <div className="mt-4">
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Overview
              </h4>
              <p className="text-sm text-slate-300 leading-relaxed">{item.description}</p>
            </div>
          )}

          {/* Security Architecture Footnote */}
          <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-slate-400" />
              <span>
                Content streamed directly via session-bound proxy. No direct storage link exists.
              </span>
            </span>
          </div>
        </div>
      </main>
    </div>
  );
}
