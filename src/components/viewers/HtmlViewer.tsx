'use client';

import React, { useState } from 'react';
import { WatermarkOverlay } from './WatermarkOverlay';
import { ShieldCheck, Code2, AlertTriangle } from 'lucide-react';

interface HtmlViewerProps {
  contentId: string;
  title: string;
}

export function HtmlViewer({ contentId, title }: HtmlViewerProps) {
  const [isLoading, setIsLoading] = useState(true);

  // Authenticated HTML delivery endpoint with CSP
  const htmlEndpoint = `/api/content/html/${contentId}`;

  return (
    <div
      onContextMenu={(e) => e.preventDefault()}
      className="relative w-full bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-2xl flex flex-col select-none"
      style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
    >
      {/* Top Security Banner */}
      <div className="px-4 py-2.5 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between text-xs text-slate-300">
        <div className="flex items-center gap-2">
          <div className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 font-medium flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>SANDBOXED IFRAME</span>
          </div>
          <span className="text-slate-400 hidden sm:inline">{title}</span>
        </div>

        <div className="text-[10px] text-slate-500 font-mono">
          sandbox=&quot;allow-scripts&quot; &bull; downloads-disabled
        </div>
      </div>

      {/* Frame Container */}
      <div className="relative w-full h-[600px] bg-slate-950">
        {/* Dynamic Watermark Overlay */}
        <WatermarkOverlay />

        {/* Loading Spinner */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-950/80 z-10">
            <div className="flex flex-col items-center gap-2">
              <div className="w-7 h-7 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs text-slate-400">Loading sandboxed environment...</span>
            </div>
          </div>
        )}

        {/* Sandboxed iframe */}
        <iframe
          src={htmlEndpoint}
          title={title}
          sandbox="allow-scripts"
          onLoad={() => setIsLoading(false)}
          className="w-full h-full border-0 relative z-10"
        />
      </div>
    </div>
  );
}
