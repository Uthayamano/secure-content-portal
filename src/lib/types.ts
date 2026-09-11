// Data Model & Core Types for Secure Content Portal

export type UserRole = 'admin' | 'viewer';

export type ContentType = 'video' | 'pdf' | 'html';

export interface User {
  id: string;
  email: string;
  name: string;
  avatar_url?: string | null;
  role: UserRole;
  created_at: string;
  updated_at?: string;
}

export interface ContentItem {
  id: string;
  title: string;
  description: string;
  category: string;
  content_type: ContentType;
  storage_path: string; // Internal private storage path (never leaked to viewer client)
  file_size: number;
  mime_type: string;
  uploaded_by?: string | null;
  created_at: string;
  updated_at: string;
  view_count?: number;
}

// Redacted version safe to return to Viewer client
export interface ViewerContentItem {
  id: string;
  title: string;
  description: string;
  category: string;
  content_type: ContentType;
  file_size: number;
  created_at: string;
  updated_at: string;
  view_count?: number;
}

export interface ActivityLog {
  id: string;
  admin_id?: string | null;
  admin_email: string;
  action: 'upload' | 'edit' | 'delete';
  content_item_id?: string | null;
  content_title: string;
  details?: Record<string, unknown>;
  timestamp: string;
}

export interface ViewLog {
  id: string;
  content_item_id: string;
  viewer_id?: string | null;
  viewer_email: string;
  viewed_at: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
