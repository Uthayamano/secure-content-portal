import { NextRequest, NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/auth';
import {
  getAllContentItems,
  createContentItem,
  uploadToStorage,
  logActivity,
  getActivityLogs,
} from '@/lib/data-store';
import { ContentType } from '@/lib/types';
import { randomUUID } from 'crypto';

// Allow-list definitions per specification
const ALLOWED_EXTENSIONS: Record<ContentType, string[]> = {
  video: ['.mp4'],
  pdf: ['.pdf'],
  html: ['.html', '.htm'],
};

const ALLOWED_MIME_TYPES: Record<ContentType, string[]> = {
  video: ['video/mp4'],
  pdf: ['application/pdf'],
  html: ['text/html', 'application/xhtml+xml'],
};

const MAX_FILE_SIZES: Record<ContentType, number> = {
  video: 200 * 1024 * 1024, // 200MB
  pdf: 20 * 1024 * 1024,    // 20MB
  html: 20 * 1024 * 1024,   // 20MB
};

// GET /api/admin/content - List all items with full metadata and view counts
export async function GET() {
  // 1. Enforce strict server-side role check
  const { session, errorResponse } = await requireAdminSession();
  if (errorResponse || !session) return errorResponse;

  try {
    const items = await getAllContentItems();
    const recentLogs = await getActivityLogs(20);

    return NextResponse.json({
      success: true,
      data: {
        items,
        recentLogs,
        stats: {
          totalItems: items.length,
          totalVideos: items.filter((i) => i.content_type === 'video').length,
          totalPdfs: items.filter((i) => i.content_type === 'pdf').length,
          totalHtml: items.filter((i) => i.content_type === 'html').length,
          totalViews: items.reduce((acc, curr) => acc + (curr.view_count || 0), 0),
        },
      },
    });
  } catch (error) {
    console.error('Error fetching admin content:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error fetching content items' },
      { status: 500 }
    );
  }
}

// POST /api/admin/content - Upload new content with strict file validation
export async function POST(req: NextRequest) {
  // 1. Enforce strict server-side role check
  const { session, errorResponse } = await requireAdminSession();
  if (errorResponse || !session) return errorResponse;

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const title = (formData.get('title') as string | null)?.trim();
    const description = (formData.get('description') as string | null)?.trim() || '';
    const category = (formData.get('category') as string | null)?.trim() || 'General';
    const contentType = (formData.get('contentType') as string | null)?.trim() as ContentType | null;

    // Validate metadata
    if (!title) {
      return NextResponse.json(
        { success: false, error: 'Title is required' },
        { status: 400 }
      );
    }

    if (!contentType || !['video', 'pdf', 'html'].includes(contentType)) {
      return NextResponse.json(
        { success: false, error: 'Valid content type (video, pdf, html) is required' },
        { status: 400 }
      );
    }

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file was provided for upload' },
        { status: 400 }
      );
    }

    // 2. Validate File Extension
    const originalFileName = file.name || '';
    const lowerFileName = originalFileName.toLowerCase();
    const allowedExtensions = ALLOWED_EXTENSIONS[contentType];
    const hasValidExtension = allowedExtensions.some((ext) => lowerFileName.endsWith(ext));

    if (!hasValidExtension) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid file extension for ${contentType}. Allowed extensions: ${allowedExtensions.join(', ')}`,
        },
        { status: 400 }
      );
    }

    // 3. Validate File Size
    const maxSize = MAX_FILE_SIZES[contentType];
    if (file.size > maxSize) {
      const maxSizeMB = Math.round(maxSize / (1024 * 1024));
      return NextResponse.json(
        {
          success: false,
          error: `File size exceeds the allowed limit of ${maxSizeMB}MB for ${contentType} files (received ${(file.size / (1024 * 1024)).toFixed(2)}MB).`,
        },
        { status: 400 }
      );
    }

    // 4. Validate MIME type
    const mimeType = file.type || '';
    const allowedMimes = ALLOWED_MIME_TYPES[contentType];
    // Note: Some browsers report empty mime for html or subtle variants, check extension + mime
    if (mimeType && !allowedMimes.includes(mimeType) && !mimeType.startsWith('text/')) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid MIME type (${mimeType}) for ${contentType}. Allowed types: ${allowedMimes.join(', ')}`,
        },
        { status: 400 }
      );
    }

    // 5. Generate Non-guessable storage path: contentType/uuid.ext
    const extension = originalFileName.includes('.')
      ? originalFileName.slice(originalFileName.lastIndexOf('.'))
      : allowedExtensions[0];
    const storagePath = `${contentType}/${randomUUID()}${extension}`;

    // 6. Upload file buffer to Private Storage Bucket
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const resolvedMime = mimeType || allowedMimes[0];

    await uploadToStorage(storagePath, buffer, resolvedMime);

    // 7. Persist Content Item Record in Database
    const newItem = await createContentItem({
      title,
      description,
      category,
      content_type: contentType,
      storage_path: storagePath,
      file_size: file.size,
      mime_type: resolvedMime,
      uploaded_by: session.user.id,
    });

    // 8. Record in Admin Activity Log
    await logActivity({
      admin_id: session.user.id,
      admin_email: session.user.email || 'admin',
      action: 'upload',
      content_item_id: newItem.id,
      content_title: newItem.title,
      details: {
        category: newItem.category,
        content_type: newItem.content_type,
        file_size: newItem.file_size,
        storage_path: storagePath,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Content uploaded and protected successfully',
        data: newItem,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error in content upload handler:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred during upload',
      },
      { status: 500 }
    );
  }
}
