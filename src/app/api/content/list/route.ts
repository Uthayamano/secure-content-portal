import { NextResponse } from 'next/server';
import { requireAuthSession } from '@/lib/auth';
import { getViewerContentItems } from '@/lib/data-store';

// GET /api/content/list - Return all content items for viewers with private storage_path redacted
export async function GET() {
  const { session, errorResponse } = await requireAuthSession();
  if (errorResponse || !session) return errorResponse;

  try {
    const viewerItems = await getViewerContentItems();
    return NextResponse.json({
      success: true,
      data: viewerItems,
    });
  } catch (error) {
    console.error('Error fetching viewer content items:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch content catalog' },
      { status: 500 }
    );
  }
}
