import { NextRequest, NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/auth';
import {
  getContentItemById,
  updateContentItem,
  deleteContentItem,
  logActivity,
} from '@/lib/data-store';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// PATCH /api/admin/content/[id] - Update title, description, category
export async function PATCH(req: NextRequest, context: RouteContext) {
  // 1. Enforce strict server-side role check (403 for viewers)
  const { session, errorResponse } = await requireAdminSession();
  if (errorResponse || !session) return errorResponse;

  try {
    const { id } = await context.params;
    const body = await req.json();
    const { title, description, category } = body;

    const existing = await getContentItemById(id);
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Content item not found' },
        { status: 404 }
      );
    }

    const updates: Record<string, string> = {};
    if (typeof title === 'string' && title.trim()) updates.title = title.trim();
    if (typeof description === 'string') updates.description = description.trim();
    if (typeof category === 'string' && category.trim()) updates.category = category.trim();

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { success: false, error: 'No valid update fields provided' },
        { status: 400 }
      );
    }

    const updated = await updateContentItem(id, updates);

    // Record in activity log
    await logActivity({
      admin_id: session.user.id,
      admin_email: session.user.email || 'admin',
      action: 'edit',
      content_item_id: id,
      content_title: updated?.title || existing.title,
      details: {
        previous: { title: existing.title, category: existing.category },
        updated: updates,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Content metadata updated successfully',
      data: updated,
    });
  } catch (error) {
    console.error('Error updating content item:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update content item' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/content/[id] - Remove DB record and private storage binary
export async function DELETE(req: NextRequest, context: RouteContext) {
  // 1. Enforce strict server-side role check (403 for viewers)
  const { session, errorResponse } = await requireAdminSession();
  if (errorResponse || !session) return errorResponse;

  try {
    const { id } = await context.params;
    const existing = await getContentItemById(id);

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Content item not found' },
        { status: 404 }
      );
    }

    // Delete from both private storage and database
    const success = await deleteContentItem(id);
    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Failed to remove content item or storage binary' },
        { status: 500 }
      );
    }

    // Record in activity log
    await logActivity({
      admin_id: session.user.id,
      admin_email: session.user.email || 'admin',
      action: 'delete',
      content_item_id: id,
      content_title: existing.title,
      details: {
        category: existing.category,
        content_type: existing.content_type,
        storage_path: existing.storage_path,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Content item and underlying storage binary deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting content item:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete content item' },
      { status: 500 }
    );
  }
}
