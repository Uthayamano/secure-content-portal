import { ContentItem, User, ActivityLog, ViewLog, ViewerContentItem, UserRole } from './types';
import { supabaseAdmin, isLiveSupabaseConfigured, STORAGE_BUCKET } from './supabase';
import { randomUUID } from 'crypto';

// In-memory fallback repository for local dev / demonstration when external Supabase is not connected
class MemoryDataStore {
  public users: Map<string, User> = new Map();
  public contentItems: Map<string, ContentItem> = new Map();
  public activityLogs: ActivityLog[] = [];
  public viewLogs: ViewLog[] = [];
  public fileStorage: Map<string, { buffer: Buffer; mimeType: string }> = new Map();

  constructor() {
    this.seedDefaults();
  }

  private seedDefaults() {
    // Seed default admin and viewer
    const adminUser: User = {
      id: 'usr-admin-001',
      email: 'admin@example.com',
      name: 'Jane Admin',
      avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80',
      role: 'admin',
      created_at: new Date(Date.now() - 86400000 * 7).toISOString(),
    };
    const viewerUser: User = {
      id: 'usr-viewer-001',
      email: 'viewer@example.com',
      name: 'Alex Viewer',
      avatar_url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=256&q=80',
      role: 'viewer',
      created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
    };
    this.users.set(adminUser.email, adminUser);
    this.users.set(viewerUser.email, viewerUser);

    // Seed sample video (royalty-free short clip)
    const videoId = 'item-video-001';
    const videoPath = `video/${videoId}.mp4`;
    this.contentItems.set(videoId, {
      id: videoId,
      title: 'Company Security Orientation 2026',
      description: 'Comprehensive guidelines on operational security, physical badges, and credential hygiene.',
      category: 'Security & Compliance',
      content_type: 'video',
      storage_path: videoPath,
      file_size: 1055736,
      mime_type: 'video/mp4',
      uploaded_by: adminUser.id,
      created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
      updated_at: new Date(Date.now() - 86400000 * 3).toISOString(),
    });

    // Seed sample PDF
    const pdfId = 'item-pdf-001';
    const pdfPath = `pdf/${pdfId}.pdf`;
    this.contentItems.set(pdfId, {
      id: pdfId,
      title: 'Incident Response SOP (Confidential)',
      description: 'Standard Operating Procedures for tier-1 security incidents, escalation paths, and breach protocols.',
      category: 'Operations',
      content_type: 'pdf',
      storage_path: pdfPath,
      file_size: 45280,
      mime_type: 'application/pdf',
      uploaded_by: adminUser.id,
      created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
      updated_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    });

    // Seed sample HTML
    const htmlId = 'item-html-001';
    const htmlPath = `html/${htmlId}.html`;
    const sampleHtmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Architecture Overview</title>
  <style>
    body { font-family: system-ui, sans-serif; padding: 2rem; background: #0f172a; color: #f8fafc; }
    h1 { color: #38bdf8; }
    .card { background: #1e293b; padding: 1.5rem; border-radius: 0.75rem; margin-top: 1rem; border: 1px solid #334155; }
    .badge { display: inline-block; padding: 0.25rem 0.5rem; background: #0284c7; color: white; border-radius: 9999px; font-size: 0.75rem; }
  </style>
</head>
<body>
  <span class="badge">Internal Reference</span>
  <h1>Secure Microservices Architecture</h1>
  <p>This interactive reference module outlines our zero-trust network boundaries and identity isolation rules.</p>
  <div class="card">
    <h3>Core Pillars</h3>
    <ul>
      <li>Mutual TLS for intra-service communication</li>
      <li>Stateless JWT verification at API gateway</li>
      <li>Short-lived credentials for database connection pooling</li>
    </ul>
  </div>
</body>
</html>`;
    this.fileStorage.set(htmlPath, {
      buffer: Buffer.from(sampleHtmlContent, 'utf-8'),
      mimeType: 'text/html',
    });

    this.contentItems.set(htmlId, {
      id: htmlId,
      title: 'System Architecture Reference Guide',
      description: 'Interactive HTML module covering microservice topology, mTLS, and zero-trust perimeter configuration.',
      category: 'Engineering',
      content_type: 'html',
      storage_path: htmlPath,
      file_size: Buffer.byteLength(sampleHtmlContent),
      mime_type: 'text/html',
      uploaded_by: adminUser.id,
      created_at: new Date(Date.now() - 86400000 * 1).toISOString(),
      updated_at: new Date(Date.now() - 86400000 * 1).toISOString(),
    });

    // Seed initial activity logs
    this.activityLogs.push({
      id: randomUUID(),
      admin_id: adminUser.id,
      admin_email: adminUser.email,
      action: 'upload',
      content_item_id: videoId,
      content_title: 'Company Security Orientation 2026',
      details: { file_size: 1055736, category: 'Security & Compliance' },
      timestamp: new Date(Date.now() - 86400000 * 3).toISOString(),
    });
    this.activityLogs.push({
      id: randomUUID(),
      admin_id: adminUser.id,
      admin_email: adminUser.email,
      action: 'upload',
      content_item_id: pdfId,
      content_title: 'Incident Response SOP (Confidential)',
      details: { file_size: 45280, category: 'Operations' },
      timestamp: new Date(Date.now() - 86400000 * 2).toISOString(),
    });
  }
}

// Global memory singleton across dev module reloads
const globalForMemory = globalThis as unknown as {
  memoryDataStore: MemoryDataStore | undefined;
};

export const memoryStore = globalForMemory.memoryDataStore ?? new MemoryDataStore();
if (process.env.NODE_ENV !== 'production') globalForMemory.memoryDataStore = memoryStore;

// ====================================================================
// UNIFIED DATA REPOSITORY (Supabase + In-Memory Fallback)
// ====================================================================

export async function getUserByEmail(email: string): Promise<User | null> {
  if (isLiveSupabaseConfigured() && supabaseAdmin) {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase())
      .single();
    if (error || !data) return null;
    return data as User;
  }
  return memoryStore.users.get(email.toLowerCase()) || null;
}

export async function upsertUser(user: {
  email: string;
  name?: string;
  avatar_url?: string;
  role: UserRole;
}): Promise<User> {
  const normalizedEmail = user.email.toLowerCase();
  if (isLiveSupabaseConfigured() && supabaseAdmin) {
    const { data, error } = await supabaseAdmin
      .from('users')
      .upsert(
        {
          email: normalizedEmail,
          name: user.name || '',
          avatar_url: user.avatar_url || '',
          role: user.role,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'email' }
      )
      .select()
      .single();
    if (error) throw new Error(`Supabase upsertUser failed: ${error.message}`);
    return data as User;
  }

  let existing = memoryStore.users.get(normalizedEmail);
  if (existing) {
    existing = {
      ...existing,
      name: user.name || existing.name,
      avatar_url: user.avatar_url || existing.avatar_url,
      role: user.role,
      updated_at: new Date().toISOString(),
    };
  } else {
    existing = {
      id: randomUUID(),
      email: normalizedEmail,
      name: user.name || normalizedEmail.split('@')[0],
      avatar_url: user.avatar_url,
      role: user.role,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }
  memoryStore.users.set(normalizedEmail, existing);
  return existing;
}

export async function getAllContentItems(): Promise<ContentItem[]> {
  if (isLiveSupabaseConfigured() && supabaseAdmin) {
    const { data, error } = await supabaseAdmin
      .from('content_items')
      .select('*, view_logs(count)')
      .order('created_at', { ascending: false });
    if (error) throw new Error(`Supabase getAllContentItems error: ${error.message}`);
    return (data || []).map((item) => ({
      ...item,
      view_count: item.view_logs?.[0]?.count ?? 0,
    }));
  }

  const items = Array.from(memoryStore.contentItems.values());
  return items.map((item) => {
    const views = memoryStore.viewLogs.filter((v) => v.content_item_id === item.id).length;
    return { ...item, view_count: views };
  }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export async function getViewerContentItems(): Promise<ViewerContentItem[]> {
  const all = await getAllContentItems();
  // Strip out private storage_path and internal metadata
  return all.map((item) => ({
    id: item.id,
    title: item.title,
    description: item.description,
    category: item.category,
    content_type: item.content_type,
    file_size: item.file_size,
    created_at: item.created_at,
    updated_at: item.updated_at,
    view_count: item.view_count || 0,
  }));
}

export async function getContentItemById(id: string): Promise<ContentItem | null> {
  if (isLiveSupabaseConfigured() && supabaseAdmin) {
    const { data, error } = await supabaseAdmin
      .from('content_items')
      .select('*')
      .eq('id', id)
      .single();
    if (error || !data) return null;
    return data as ContentItem;
  }
  return memoryStore.contentItems.get(id) || null;
}

export async function createContentItem(item: Omit<ContentItem, 'id' | 'created_at' | 'updated_at'>): Promise<ContentItem> {
  const now = new Date().toISOString();
  const id = randomUUID();
  const newItem: ContentItem = {
    ...item,
    id,
    created_at: now,
    updated_at: now,
  };

  if (isLiveSupabaseConfigured() && supabaseAdmin) {
    const { data, error } = await supabaseAdmin
      .from('content_items')
      .insert(newItem)
      .select()
      .single();
    if (error) throw new Error(`Supabase createContentItem error: ${error.message}`);
    return data as ContentItem;
  }

  memoryStore.contentItems.set(id, newItem);
  return newItem;
}

export async function updateContentItem(
  id: string,
  updates: Partial<Pick<ContentItem, 'title' | 'description' | 'category'>>
): Promise<ContentItem | null> {
  const now = new Date().toISOString();
  if (isLiveSupabaseConfigured() && supabaseAdmin) {
    const { data, error } = await supabaseAdmin
      .from('content_items')
      .update({ ...updates, updated_at: now })
      .eq('id', id)
      .select()
      .single();
    if (error || !data) return null;
    return data as ContentItem;
  }

  const existing = memoryStore.contentItems.get(id);
  if (!existing) return null;
  const updated = { ...existing, ...updates, updated_at: now };
  memoryStore.contentItems.set(id, updated);
  return updated;
}

export async function deleteContentItem(id: string): Promise<boolean> {
  const item = await getContentItemById(id);
  if (!item) return false;

  if (isLiveSupabaseConfigured() && supabaseAdmin) {
    // Delete file from private storage
    await supabaseAdmin.storage.from(STORAGE_BUCKET).remove([item.storage_path]);
    // Delete record from database
    const { error } = await supabaseAdmin.from('content_items').delete().eq('id', id);
    return !error;
  }

  memoryStore.fileStorage.delete(item.storage_path);
  return memoryStore.contentItems.delete(id);
}

// Activity Logs
export async function logActivity(log: Omit<ActivityLog, 'id' | 'timestamp'>): Promise<void> {
  const fullLog: ActivityLog = {
    ...log,
    id: randomUUID(),
    timestamp: new Date().toISOString(),
  };

  if (isLiveSupabaseConfigured() && supabaseAdmin) {
    await supabaseAdmin.from('activity_logs').insert(fullLog);
    return;
  }
  memoryStore.activityLogs.unshift(fullLog);
}

export async function getActivityLogs(limit = 50): Promise<ActivityLog[]> {
  if (isLiveSupabaseConfigured() && supabaseAdmin) {
    const { data, error } = await supabaseAdmin
      .from('activity_logs')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(limit);
    if (error) return [];
    return data as ActivityLog[];
  }
  return memoryStore.activityLogs.slice(0, limit);
}

// View Logs
export async function recordView(contentItemId: string, viewerEmail: string, viewerId?: string): Promise<void> {
  const viewRecord: ViewLog = {
    id: randomUUID(),
    content_item_id: contentItemId,
    viewer_email: viewerEmail,
    viewer_id: viewerId || null,
    viewed_at: new Date().toISOString(),
  };

  if (isLiveSupabaseConfigured() && supabaseAdmin) {
    await supabaseAdmin.from('view_logs').insert(viewRecord);
    return;
  }
  memoryStore.viewLogs.push(viewRecord);
}

// ====================================================================
// STORAGE SERVICE (Private Bucket Operations)
// ====================================================================

export async function uploadToStorage(
  path: string,
  buffer: Buffer,
  mimeType: string
): Promise<string> {
  if (isLiveSupabaseConfigured() && supabaseAdmin) {
    const { error } = await supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .upload(path, buffer, {
        contentType: mimeType,
        upsert: true,
      });
    if (error) throw new Error(`Supabase upload failed: ${error.message}`);
    return path;
  }

  memoryStore.fileStorage.set(path, { buffer, mimeType });
  return path;
}

export async function getSignedStorageUrl(path: string, expiresInSeconds = 120): Promise<string | null> {
  if (isLiveSupabaseConfigured() && supabaseAdmin) {
    const { data, error } = await supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(path, expiresInSeconds);
    if (error || !data) return null;
    return data.signedUrl;
  }

  // In memory fallback signed simulation URL
  return `/api/content/stream-fallback?path=${encodeURIComponent(path)}&expires=${Date.now() + expiresInSeconds * 1000}`;
}

export async function getFileBuffer(path: string): Promise<{ buffer: Buffer; mimeType: string } | null> {
  if (isLiveSupabaseConfigured() && supabaseAdmin) {
    const { data, error } = await supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .download(path);
    if (error || !data) return null;
    const arrayBuffer = await data.arrayBuffer();
    return {
      buffer: Buffer.from(arrayBuffer),
      mimeType: data.type || 'application/octet-stream',
    };
  }

  const item = memoryStore.fileStorage.get(path);
  if (!item) return null;
  return item;
}
