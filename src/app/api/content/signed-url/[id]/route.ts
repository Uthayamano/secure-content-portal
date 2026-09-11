import { NextRequest, NextResponse } from 'next/server';
import { requireAuthSession } from '@/lib/auth';
import { getContentItemById, getSignedStorageUrl, recordView } from '@/lib/data-store';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET /api/content/signed-url/[id] - Issue short-lived signed URL for authenticated asset access
export async function GET(req: NextRequest, context: RouteContext) {
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

    // 120-second short-lived URL expiry
    const EXPIRES_IN_SECONDS = 120;
    const signedUrl = await getSignedStorageUrl(item.storage_path, EXPIRES_IN_SECONDS);

    if (!signedUrl) {
      return NextResponse.json(
        { success: false, error: 'Failed to generate secure signed access token' },
        { status: 500 }
      );
    }

    if (session.user.email) {
      recordView(id, session.user.email, session.user.id).catch(console.error);
    }

    return NextResponse.json({
      success: true,
      data: {
        signedUrl,
        expiresInSeconds: EXPIRES_IN_SECONDS,
        contentType: item.content_type,
      },
    });
  } catch (error) {
    console.error('Error generating signed URL:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate signed URL' },
      { status: 500 }
    );
  }
}
