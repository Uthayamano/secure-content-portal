'use client';

import React, { useState, useEffect, useRef } from 'react';
import { WatermarkOverlay } from './WatermarkOverlay';
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  ShieldCheck,
  AlertCircle,
  FileText,
} from 'lucide-react';

interface PdfViewerProps {
  contentId: string;
  title: string;
}

export function PdfViewer({ contentId, title }: PdfViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(1.2);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRendering, setIsRendering] = useState(false);

  // Load PDF document from authenticated API into memory
  useEffect(() => {
    let isCancelled = false;

    async function loadPdf() {
      setIsLoading(true);
      setError(null);

      try {
        // Fetch raw binary buffer via authenticated endpoint
        const response = await fetch(`/api/content/pdf-data/${contentId}`);
        if (!response.ok) {
          throw new Error(`Failed to load document (${response.status})`);
        }

        const arrayBuffer = await response.arrayBuffer();

        // Dynamically load pdfjs-dist in the browser
        const pdfjs = await import('pdfjs-dist');
        // Set worker source
        if (!pdfjs.GlobalWorkerOptions.workerSrc) {
          pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;
        }

        const loadingTask = pdfjs.getDocument({
          data: new Uint8Array(arrayBuffer),
          cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/cmaps/`,
          cMapPacked: true,
        });

        const doc = await loadingTask.promise;
        if (!isCancelled) {
          setPdfDoc(doc);
          setTotalPages(doc.numPages);
          setCurrentPage(1);
        }
      } catch (err) {
        console.error('PDF.js loading error:', err);
        if (!isCancelled) {
          setError('Failed to render protected PDF document. Session may have expired.');
        }
      } finally {
        if (!isCancelled) setIsLoading(false);
      }
    }

    loadPdf();

    return () => {
      isCancelled = true;
    };
  }, [contentId]);

  // Render current page onto canvas
  useEffect(() => {
    if (!pdfDoc || !canvasRef.current) return;

    let renderTask: any = null;
    let isCancelled = false;

    async function renderPage() {
      setIsRendering(true);
      try {
        const page = await pdfDoc.getPage(currentPage);
        if (isCancelled) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const context = canvas.getContext('2d');
        if (!context) return;

        const viewport = page.getViewport({ scale });
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        };

        renderTask = page.render(renderContext);
        await renderTask.promise;
      } catch (err: any) {
        if (err?.name !== 'RenderingCancelledException') {
          console.error('Error rendering page to canvas:', err);
        }
      } finally {
        if (!isCancelled) setIsRendering(false);
      }
    }

    renderPage();

    return () => {
      isCancelled = true;
      if (renderTask) {
        renderTask.cancel();
      }
    };
  }, [pdfDoc, currentPage, scale]);

  const nextPage = () => {
    if (currentPage < totalPages) setCurrentPage((prev) => prev + 1);
  };

  const prevPage = () => {
    if (currentPage > 1) setCurrentPage((prev) => prev - 1);
  };

  const zoomIn = () => setScale((s) => Math.min(s + 0.2, 2.5));
  const zoomOut = () => setScale((s) => Math.max(s - 0.2, 0.6));
  const resetZoom = () => setScale(1.2);

  return (
    <div
      ref={containerRef}
      onContextMenu={(e) => e.preventDefault()}
      className="flex flex-col w-full bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-2xl select-none"
      style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
    >
      {/* PDF Secure Toolbar - NO DOWNLOAD / PRINT BUTTONS */}
      <div className="px-4 py-3 bg-slate-950/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-300">
        <div className="flex items-center gap-2">
          <div className="px-2 py-1 rounded bg-indigo-500/10 text-indigo-400 font-medium flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>CANVAS RENDERER</span>
          </div>
          <span className="text-slate-400 font-medium hidden sm:inline">{title}</span>
        </div>

        {/* Page & Zoom Navigation Controls */}
        <div className="flex items-center gap-4">
          {/* Page nav */}
          <div className="flex items-center gap-1.5 bg-slate-900 px-2 py-1 rounded-xl border border-slate-800">
            <button
              onClick={prevPage}
              disabled={currentPage <= 1 || isLoading}
              className="p-1 rounded hover:bg-slate-800 disabled:opacity-40 transition"
              title="Previous Page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-mono text-xs px-1">
              {currentPage} / {totalPages || 1}
            </span>
            <button
              onClick={nextPage}
              disabled={currentPage >= totalPages || isLoading}
              className="p-1 rounded hover:bg-slate-800 disabled:opacity-40 transition"
              title="Next Page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Zoom nav */}
          <div className="flex items-center gap-1 bg-slate-900 px-2 py-1 rounded-xl border border-slate-800">
            <button
              onClick={zoomOut}
              disabled={scale <= 0.6 || isLoading}
              className="p-1 rounded hover:bg-slate-800 disabled:opacity-40 transition"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="font-mono text-xs px-1">{Math.round(scale * 100)}%</span>
            <button
              onClick={zoomIn}
              disabled={scale >= 2.5 || isLoading}
              className="p-1 rounded hover:bg-slate-800 disabled:opacity-40 transition"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={resetZoom}
              className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition ml-1"
              title="Reset Zoom"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Canvas Viewport */}
      <div className="relative flex-1 min-h-[500px] max-h-[750px] overflow-auto p-6 flex items-center justify-center bg-slate-950/60">
        {/* Dynamic Watermark Overlay */}
        <WatermarkOverlay />

        {/* Loading Spinner */}
        {isLoading && (
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-slate-400">Loading document pages to canvas...</span>
          </div>
        )}

        {/* Error Notification */}
        {error && !isLoading && (
          <div className="flex flex-col items-center gap-2 text-rose-400 p-6 text-center max-w-sm">
            <AlertCircle className="w-8 h-8" />
            <p className="text-sm font-semibold">{error}</p>
          </div>
        )}

        {/* The Canvas (Pages rendered via pdfjs-dist) */}
        <div className={`relative shadow-2xl transition-opacity ${isLoading || error ? 'hidden' : 'block'}`}>
          <canvas
            ref={canvasRef}
            className="rounded-lg border border-slate-800 bg-white max-w-full"
            onContextMenu={(e) => e.preventDefault()}
          />
        </div>
      </div>
    </div>
  );
}
