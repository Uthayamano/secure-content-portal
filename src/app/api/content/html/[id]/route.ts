import { NextRequest, NextResponse } from 'next/server';
import { requireAuthSession } from '@/lib/auth';
import { getContentItemById, getFileBuffer, recordView } from '@/lib/data-store';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET /api/content/html/[id] - Authenticated isolated HTML content delivery
export async function GET(req: NextRequest, context: RouteContext) {
  const { session, errorResponse } = await requireAuthSession();
  if (errorResponse || !session) return errorResponse;

  try {
    const { id } = await context.params;
    const item = await getContentItemById(id);

    if (!item || item.content_type !== 'html') {
      return NextResponse.json(
        { success: false, error: 'HTML content asset not found' },
        { status: 404 }
      );
    }

    const fileData = await getFileBuffer(item.storage_path);
    if (!fileData) {
      return NextResponse.json(
        { success: false, error: 'HTML asset binary unavailable in storage' },
        { status: 404 }
      );
    }

    if (session.user.email) {
      recordView(id, session.user.email, session.user.id).catch(console.error);
    }

    return new NextResponse(fileData.buffer.toString('utf-8'), {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'SAMEORIGIN',
        'Content-Security-Policy': "default-src 'self' 'unsafe-inline'; frame-ancestors 'self'",
        'Cache-Control': 'private, no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    console.error('Error serving HTML content:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve HTML content' },
      { status: 500 }
    );
  }
}
