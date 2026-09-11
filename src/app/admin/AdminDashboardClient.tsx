'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  UploadCloud,
  FileVideo,
  FileText,
  Code2,
  Trash2,
  Edit3,
  Search,
  Eye,
  Activity,
  AlertTriangle,
  CheckCircle2,
  X,
  RefreshCw,
  Plus,
  ShieldAlert,
} from 'lucide-react';
import { ContentItem, ContentType, ActivityLog } from '@/lib/types';
import Link from 'next/link';
import { Navbar } from '@/components/navigation/Navbar';

export default function AdminDashboardClient() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Content state
  const [items, setItems] = useState<ContentItem[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'content' | 'audit'>('content');

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Modal states
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ContentItem | null>(null);
  const [deletingItem, setDeletingItem] = useState<ContentItem | null>(null);

  // Upload Form State
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadDescription, setUploadDescription] = useState('');
  const [uploadCategory, setUploadCategory] = useState('');
  const [uploadContentType, setUploadContentType] = useState<ContentType>('video');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Edit Form State
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Delete Form State
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // Notification Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated' && session?.user?.role !== 'admin') {
      // Immediate client-side guard for viewers attempting to reach admin UI
      router.push('/viewer');
    }
  }, [status, session, router]);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4500);
  };

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/content');
      if (res.status === 403) {
        showToast('Access denied: Caller is not an Administrator', 'error');
        router.push('/viewer');
        return;
      }
      const json = await res.json();
      if (json.success) {
        setItems(json.data.items || []);
        setLogs(json.data.recentLogs || []);
      } else {
        showToast(json.error || 'Failed to fetch content', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error connecting to admin API', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (session?.user?.role === 'admin') {
      fetchDashboardData();
    }
  }, [session]);

  // Handle File Selection with Client Validation
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    const file = e.target.files?.[0];
    if (!file) {
      setUploadFile(null);
      return;
    }

    const ext = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));
    const sizeMB = file.size / (1024 * 1024);

    if (uploadContentType === 'video') {
      if (ext !== '.mp4') {
        setUploadError('Video files must be in .mp4 format.');
        setUploadFile(null);
        return;
      }
      if (sizeMB > 200) {
        setUploadError(`Video size (${sizeMB.toFixed(1)}MB) exceeds the 200MB limit.`);
        setUploadFile(null);
        return;
      }
    } else if (uploadContentType === 'pdf') {
      if (ext !== '.pdf') {
        setUploadError('PDF manuals must be in .pdf format.');
        setUploadFile(null);
        return;
      }
      if (sizeMB > 20MB) {
        setUploadError(`PDF size (${sizeMB.toFixed(1)}MB) exceeds the 20MB limit.`);
        setUploadFile(null);
        return;
      }
    } else if (uploadContentType === 'html') {
      if (!['.html', '.htm'].includes(ext)) {
        setUploadError('HTML modules must be .html or .htm format.');
        setUploadFile(null);
        return;
      }
      if (sizeMB > 20) {
        setUploadError(`HTML file size (${sizeMB.toFixed(1)}MB) exceeds the 20MB limit.`);
        setUploadFile(null);
        return;
      }
    }

    setUploadFile(file);
    if (!uploadTitle) {
      // Pre-fill title from clean filename
      const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
      setUploadTitle(cleanName.charAt(0).toUpperCase() + cleanName.slice(1));
    }
  };

  // Upload Form Submit
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) {
      setUploadError('Please select a valid file to upload.');
      return;
    }
    if (!uploadTitle.trim()) {
      setUploadError('Title is required.');
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('title', uploadTitle.trim());
      formData.append('description', uploadDescription.trim());
      formData.append('category', uploadCategory.trim() || 'General');
      formData.append('contentType', uploadContentType);

      const res = await fetch('/api/admin/content', {
        method: 'POST',
        body: formData,
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        setUploadError(json.error || 'Upload failed');
        return;
      }

      showToast(`Successfully uploaded "${uploadTitle}"`);
      setIsUploadModalOpen(false);
      // Reset form
      setUploadFile(null);
      setUploadTitle('');
      setUploadDescription('');
      setUploadCategory('');
      fetchDashboardData();
    } catch (err) {
      console.error(err);
      setUploadError('Network error uploading content file.');
    } finally {
      setIsUploading(false);
    }
  };

  // Open Edit Modal
  const openEditModal = (item: ContentItem) => {
    setEditingItem(item);
    setEditTitle(item.title);
    setEditDescription(item.description);
    setEditCategory(item.category);
  };

  // Edit Form Submit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    setIsSavingEdit(true);
    try {
      const res = await fetch(`/api/admin/content/${editingItem.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editTitle.trim(),
          description: editDescription.trim(),
          category: editCategory.trim(),
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        showToast(json.error || 'Failed to update metadata', 'error');
        return;
      }

      showToast('Metadata updated successfully');
      setEditingItem(null);
      fetchDashboardData();
    } catch (err) {
      console.error(err);
      showToast('Network error updating metadata', 'error');
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Delete Form Submit (Requires typing "DELETE" or confirming)
  const handleDeleteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deletingItem) return;

    if (deleteConfirmationText.trim().toUpperCase() !== 'DELETE') {
      showToast('Please type DELETE to confirm removal', 'error');
      return;
    }

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/admin/content/${deletingItem.id}`, {
        method: 'DELETE',
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        showToast(json.error || 'Failed to delete content item', 'error');
        return;
      }

      showToast(`Deleted "${deletingItem.title}" and its storage binary`);
      setDeletingItem(null);
      setDeleteConfirmationText('');
      fetchDashboardData();
    } catch (err) {
      console.error(err);
      showToast('Network error deleting content', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // Filter items
  const categories = Array.from(new Set(items.map((i) => i.category))).filter(Boolean);
  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = selectedType === 'all' || item.content_type === selectedType;
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    return matchesSearch && matchesType && matchesCategory;
  });

  const formatFileSize = (bytes: number) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  if (status === 'loading' || (status === 'authenticated' && session?.user?.role !== 'admin')) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-400">Verifying administrator authorization...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Navbar />

      {/* Main Admin Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Toast Notification */}
        {toast && (
          <div
            className={`fixed top-20 right-6 z-50 px-4 py-3 rounded-xl border shadow-xl flex items-center gap-3 text-sm backdrop-blur-md transition-all ${
              toast.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0" />
            )}
            <span>{toast.message}</span>
            <button onClick={() => setToast(null)} className="ml-2 text-slate-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Header Title & Actions */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-2.5">
              <span>Admin Management Console</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 font-medium">
                Admin Role
              </span>
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Upload, configure, and audit protected reference assets with zero-trust storage isolation.
            </p>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={() => fetchDashboardData()}
              className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 transition"
              title="Refresh Data"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-sky-400' : ''}`} />
            </button>

            <button
              id="btn-open-upload-modal"
              onClick={() => setIsUploadModalOpen(true)}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-medium text-sm transition shadow-lg shadow-sky-500/20 flex items-center justify-center gap-2 cursor-pointer"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Upload Protected Asset</span>
            </button>
          </div>
        </div>

        {/* Dashboard Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80">
            <span className="text-xs text-slate-400 font-medium">Total Assets</span>
            <p className="text-2xl font-bold text-white mt-1">{items.length}</p>
          </div>
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80">
            <span className="text-xs text-sky-400 font-medium">Video Modules</span>
            <p className="text-2xl font-bold text-white mt-1">
              {items.filter((i) => i.content_type === 'video').length}
            </p>
          </div>
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80">
            <span className="text-xs text-indigo-400 font-medium">PDF Documents</span>
            <p className="text-2xl font-bold text-white mt-1">
              {items.filter((i) => i.content_type === 'pdf').length}
            </p>
          </div>
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80">
            <span className="text-xs text-purple-400 font-medium">HTML Modules</span>
            <p className="text-2xl font-bold text-white mt-1">
              {items.filter((i) => i.content_type === 'html').length}
            </p>
          </div>
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 col-span-2 lg:col-span-1">
            <span className="text-xs text-emerald-400 font-medium">Total Document Views</span>
            <p className="text-2xl font-bold text-white mt-1">
              {items.reduce((acc, curr) => acc + (curr.view_count || 0), 0)}
            </p>
          </div>
        </div>

        {/* Navigation Tabs (Content Items vs. Audit Log) */}
        <div className="flex items-center gap-2 border-b border-slate-800 mb-6">
          <button
            onClick={() => setActiveTab('content')}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'content'
                ? 'border-sky-500 text-sky-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Managed Content</span>
            <span className="px-2 py-0.5 rounded-full bg-slate-800 text-xs text-slate-300">
              {items.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'audit'
                ? 'border-sky-500 text-sky-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Audit & Activity Log</span>
            <span className="px-2 py-0.5 rounded-full bg-slate-800 text-xs text-slate-300">
              {logs.length}
            </span>
          </button>
        </div>

        {activeTab === 'content' ? (
          <>
            {/* Search & Filter Bar */}
            <div className="flex flex-col sm:flex-row items-center gap-3 mb-6">
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search by title, description, or category..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500 transition"
                />
              </div>

              {/* Filter by Type */}
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full sm:w-auto px-3.5 py-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-sm text-slate-300 focus:outline-none focus:border-sky-500"
              >
                <option value="all">All Types</option>
                <option value="video">Video (.mp4)</option>
                <option value="pdf">PDF Manual (.pdf)</option>
                <option value="html">HTML Module (.html)</option>
              </select>

              {/* Filter by Category */}
              {categories.length > 0 && (
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full sm:w-auto px-3.5 py-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-sm text-slate-300 focus:outline-none focus:border-sky-500"
                >
                  <option value="all">All Categories</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Content Items Table */}
            <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/40">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-900/80 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="px-6 py-4">Title & Details</th>
                    <th className="px-6 py-4">Format</th>
                    <th className="px-6 py-4">Category</th>
                    <th className="px-6 py-4">File Size</th>
                    <th className="px-6 py-4">Views</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                        {searchQuery ? 'No content items match the search query.' : 'No protected content items found.'}
                      </td>
                    </tr>
                  ) : (
                    filteredItems.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-850/50 transition">
                        <td className="px-6 py-4">
                          <div className="font-semibold text-white">{item.title}</div>
                          <div className="text-xs text-slate-400 line-clamp-1 mt-0.5">
                            {item.description || 'No description provided'}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${
                              item.content_type === 'video'
                                ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                                : item.content_type === 'pdf'
                                ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                                : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                            }`}
                          >
                            {item.content_type === 'video' && <FileVideo className="w-3.5 h-3.5" />}
                            {item.content_type === 'pdf' && <FileText className="w-3.5 h-3.5" />}
                            {item.content_type === 'html' && <Code2 className="w-3.5 h-3.5" />}
                            <span className="uppercase">{item.content_type}</span>
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-xs px-2.5 py-1 rounded-md bg-slate-800 text-slate-300">
                            {item.category}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-xs font-mono text-slate-400">
                          {formatFileSize(item.file_size)}
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-300">
                            <Eye className="w-3.5 h-3.5 text-slate-500" />
                            {item.view_count || 0}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Link
                              href={`/viewer/${item.id}`}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-sky-400 hover:bg-slate-800 transition"
                              title="Preview in Viewer"
                            >
                              <Eye className="w-4 h-4" />
                            </Link>
                            <button
                              onClick={() => openEditModal(item)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition cursor-pointer"
                              title="Edit Metadata"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setDeletingItem(item);
                                setDeleteConfirmationText('');
                              }}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition cursor-pointer"
                              title="Delete Item"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          /* Audit & Activity Log Tab */
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-white flex items-center gap-2">
                <Activity className="w-4 h-4 text-sky-400" />
                <span>Administrative Audit Trail</span>
              </h2>
              <span className="text-xs text-slate-500">Immutable server-side action history</span>
            </div>

            <div className="space-y-3">
              {logs.length === 0 ? (
                <p className="text-sm text-slate-500 py-6 text-center">No logged activity records yet.</p>
              ) : (
                logs.map((log) => (
                  <div
                    key={log.id}
                    className="p-4 rounded-xl bg-slate-900/80 border border-slate-850 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider ${
                          log.action === 'upload'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                            : log.action === 'edit'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                        }`}
                      >
                        {log.action}
                      </span>
                      <div>
                        <span className="text-sm font-medium text-white">{log.content_title}</span>
                        <span className="text-xs text-slate-400 ml-2">by {log.admin_email}</span>
                      </div>
                    </div>

                    <span className="text-xs font-mono text-slate-500">
                      {new Date(log.timestamp).toLocaleString()}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </main>

      {/* ==================================================================== */}
      {/* 1. UPLOAD MODAL */}
      {/* ==================================================================== */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <UploadCloud className="w-5 h-5 text-sky-400" />
                <span>Upload Protected Content Asset</span>
              </h3>
              <button
                onClick={() => setIsUploadModalOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {uploadError && (
              <div className="mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}

            <form onSubmit={handleUploadSubmit} className="mt-4 space-y-4">
              {/* Content Type Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-2">
                  Asset Format & Protection Pipeline
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setUploadContentType('video');
                      setUploadFile(null);
                    }}
                    className={`py-2 px-3 rounded-xl border text-xs font-medium flex flex-col items-center gap-1 transition ${
                      uploadContentType === 'video'
                        ? 'border-sky-500 bg-sky-500/10 text-sky-300'
                        : 'border-slate-800 bg-slate-800/40 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    <FileVideo className="w-4 h-4" />
                    <span>Video (.mp4)</span>
                    <span className="text-[10px] text-slate-500">Max 200MB</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setUploadContentType('pdf');
                      setUploadFile(null);
                    }}
                    className={`py-2 px-3 rounded-xl border text-xs font-medium flex flex-col items-center gap-1 transition ${
                      uploadContentType === 'pdf'
                        ? 'border-indigo-500 bg-indigo-500/10 text-indigo-300'
                        : 'border-slate-800 bg-slate-800/40 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    <FileText className="w-4 h-4" />
                    <span>PDF (.pdf)</span>
                    <span className="text-[10px] text-slate-500">Max 20MB</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setUploadContentType('html');
                      setUploadFile(null);
                    }}
                    className={`py-2 px-3 rounded-xl border text-xs font-medium flex flex-col items-center gap-1 transition ${
                      uploadContentType === 'html'
                        ? 'border-purple-500 bg-purple-500/10 text-purple-300'
                        : 'border-slate-800 bg-slate-800/40 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    <Code2 className="w-4 h-4" />
                    <span>HTML (.html)</span>
                    <span className="text-[10px] text-slate-500">Max 20MB</span>
                  </button>
                </div>
              </div>

              {/* File Input */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                  File Binary
                </label>
                <input
                  id="file-upload-input"
                  type="file"
                  accept={
                    uploadContentType === 'video'
                      ? '.mp4,video/mp4'
                      : uploadContentType === 'pdf'
                      ? '.pdf,application/pdf'
                      : '.html,.htm,text/html'
                  }
                  onChange={handleFileChange}
                  className="w-full text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-sky-400 hover:file:bg-slate-700 cursor-pointer"
                />
                {uploadFile && (
                  <p className="text-xs text-emerald-400 mt-1">
                    Selected: {uploadFile.name} ({(uploadFile.size / (1024 * 1024)).toFixed(2)} MB)
                  </p>
                )}
              </div>

              {/* Title */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                  Title *
                </label>
                <input
                  id="upload-title-input"
                  type="text"
                  required
                  placeholder="e.g. Q3 SOC2 Security Briefing"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-800/70 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                  Category / Tag
                </label>
                <input
                  type="text"
                  placeholder="e.g. Compliance, Architecture, HR"
                  value={uploadCategory}
                  onChange={(e) => setUploadCategory(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-800/70 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  placeholder="Brief synopsis of this protected reference asset..."
                  value={uploadDescription}
                  onChange={(e) => setUploadDescription(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-800/70 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 resize-none"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-sm text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  id="btn-submit-upload"
                  type="submit"
                  disabled={isUploading || !uploadFile}
                  className="px-5 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-white font-medium text-sm transition flex items-center gap-2 cursor-pointer"
                >
                  {isUploading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Encrypting & Uploading...</span>
                    </>
                  ) : (
                    <span>Upload & Protect</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 2. EDIT METADATA MODAL */}
      {/* ==================================================================== */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-amber-400" />
                <span>Edit Metadata</span>
              </h3>
              <button onClick={() => setEditingItem(null)} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Title</label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-800/70 border border-slate-700 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Category</label>
                <input
                  type="text"
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-800/70 border border-slate-700 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Description</label>
                <textarea
                  rows={3}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-800/70 border border-slate-700 text-sm text-white focus:outline-none focus:border-amber-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2 rounded-xl text-sm text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-sm transition"
                >
                  {isSavingEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 3. DELETE CONFIRMATION MODAL (Strict Two-Step Confirmation) */}
      {/* ==================================================================== */}
      {deletingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-rose-500/30 rounded-2xl p-6 shadow-2xl">
            <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mb-4">
              <ShieldAlert className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-bold text-white mb-2">Delete Content Asset</h3>
            <p className="text-sm text-slate-300">
              Are you sure you want to permanently delete{' '}
              <span className="font-semibold text-white">&quot;{deletingItem.title}&quot;</span>?
            </p>
            <p className="text-xs text-rose-400 mt-2">
              This will permanently purge the database record and the underlying private storage file. This action cannot be undone.
            </p>

            <form onSubmit={handleDeleteSubmit} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                  Type <span className="text-rose-400 font-mono">DELETE</span> to confirm:
                </label>
                <input
                  id="input-confirm-delete"
                  type="text"
                  placeholder="DELETE"
                  value={deleteConfirmationText}
                  onChange={(e) => setDeleteConfirmationText(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-800/70 border border-slate-700 text-sm text-white focus:outline-none focus:border-rose-500 font-mono tracking-widest"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setDeletingItem(null)}
                  className="px-4 py-2 rounded-xl text-sm text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  id="btn-confirm-delete"
                  type="submit"
                  disabled={isDeleting || deleteConfirmationText.trim().toUpperCase() !== 'DELETE'}
                  className="px-5 py-2 rounded-xl bg-rose-500 hover:bg-rose-400 disabled:opacity-40 text-white font-medium text-sm transition"
                >
                  {isDeleting ? 'Purging Asset...' : 'Yes, Delete Permanently'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
