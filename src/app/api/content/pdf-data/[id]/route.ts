import { NextRequest, NextResponse } from 'next/server';
import { requireAuthSession } from '@/lib/auth';
import { getContentItemById, getFileBuffer, recordView } from '@/lib/data-store';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET /api/content/pdf-data/[id] - Authenticated in-memory byte transfer for PDF.js canvas renderer
export async function GET(req: NextRequest, context: RouteContext) {
  const { session, errorResponse } = await requireAuthSession();
  if (errorResponse || !session) return errorResponse;

  try {
    const { id } = await context.params;
    const item = await getContentItemById(id);

    if (!item || item.content_type !== 'pdf') {
      return NextResponse.json(
        { success: false, error: 'PDF content item not found' },
        { status: 404 }
      );
    }

    const fileData = await getFileBuffer(item.storage_path);
    if (!fileData) {
      return NextResponse.json(
        { success: false, error: 'Document binary unavailable in storage' },
        { status: 404 }
      );
    }

    if (session.user.email) {
      recordView(id, session.user.email, session.user.id).catch(console.error);
    }

    return new NextResponse(fileData.buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'inline; filename="protected-document.pdf"',
        'Cache-Control': 'private, no-cache, no-store, must-revalidate',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    console.error('Error serving PDF data:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve PDF binary' },
      { status: 500 }
    );
  }
}
