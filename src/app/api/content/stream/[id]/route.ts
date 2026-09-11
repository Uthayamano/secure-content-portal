import { NextRequest, NextResponse } from 'next/server';
import { requireAuthSession } from '@/lib/auth';
import { getContentItemById, getFileBuffer, recordView } from '@/lib/data-store';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET /api/content/stream/[id] - Token-gated HTTP Range Video Streaming Proxy
export async function GET(req: NextRequest, context: RouteContext) {
  // 1. Re-verify caller's session on EVERY request (not just on initial page load)
  const { session, errorResponse } = await requireAuthSession();
  if (errorResponse || !session) return errorResponse;

  try {
    const { id } = await context.params;
    const item = await getContentItemById(id);

    if (!item) {
      return NextResponse.json(
        { success: false, error: 'Content asset not found' },
        { status: 404 }
      );
    }

    // Retrieve file binary from private store
    const fileData = await getFileBuffer(item.storage_path);
    if (!fileData) {
      // If sample seeded video is requested and not yet in buffer, provide a clean fallback or 404
      return NextResponse.json(
        { success: false, error: 'Content binary unavailable in storage' },
        { status: 404 }
      );
    }

    const { buffer, mimeType } = fileData;
    const totalSize = buffer.length;

    // Check for HTTP Range Header
    const rangeHeader = req.headers.get('range');

    if (rangeHeader) {
      // Range format: "bytes=start-end"
      const match = rangeHeader.match(/bytes=(\d+)-(\d*)/);
      if (!match) {
        return new NextResponse(null, {
          status: 416, // Range Not Satisfiable
          headers: {
            'Content-Range': `bytes */${totalSize}`,
          },
        });
      }

      const start = parseInt(match[1], 10);
      let end = match[2] ? parseInt(match[2], 10) : totalSize - 1;

      // Handle out-of-range bounds
      if (start >= totalSize || end >= totalSize) {
        return new NextResponse(null, {
          status: 416,
          headers: {
            'Content-Range': `bytes */${totalSize}`,
          },
        });
      }

      // Cap chunk size to ~1MB per response to ensure continuous streaming seeking
      const CHUNK_SIZE = 1024 * 1024; // 1MB
      if (end - start >= CHUNK_SIZE) {
        end = start + CHUNK_SIZE - 1;
      }

      const chunkSize = end - start + 1;
      const chunkBuffer = buffer.subarray(start, end + 1);

      // Record view on initial stream segment
      if (start === 0 && session.user.email) {
        recordView(id, session.user.email, session.user.id).catch(console.error);
      }

      return new NextResponse(new Uint8Array(chunkBuffer), {
        status: 206, // Partial Content
        headers: {
          'Content-Range': `bytes ${start}-${end}/${totalSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunkSize.toString(),
          'Content-Type': mimeType || 'video/mp4',
          'Cache-Control': 'private, no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
        },
      });
    }

    // No range header: return full content
    if (session.user.email) {
      recordView(id, session.user.email, session.user.id).catch(console.error);
    }

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Accept-Ranges': 'bytes',
        'Content-Length': totalSize.toString(),
        'Content-Type': mimeType || 'video/mp4',
        'Cache-Control': 'private, no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    console.error('Error in streaming endpoint:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to stream content asset' },
      { status: 500 }
    );
  }
}
