import { redirect, notFound } from 'next/navigation';
import { getServerAuthSession } from '@/lib/auth';
import { getContentItemById } from '@/lib/data-store';
import ViewerDetailClient from './ViewerDetailClient';
import { ViewerContentItem } from '@/lib/types';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ViewerDetailPage({ params }: PageProps) {
  const session = await getServerAuthSession();

  if (!session || !session.user) {
    redirect('/login?callbackUrl=/viewer');
  }

  const { id } = await params;
  const item = await getContentItemById(id);

  if (!item) {
    notFound();
  }

  // Redact private storage path before passing to client
  const viewerItem: ViewerContentItem = {
    id: item.id,
    title: item.title,
    description: item.description,
    category: item.category,
    content_type: item.content_type,
    file_size: item.file_size,
    created_at: item.created_at,
    updated_at: item.updated_at,
    view_count: item.view_count || 0,
  };

  return <ViewerDetailClient item={viewerItem} />;
}
