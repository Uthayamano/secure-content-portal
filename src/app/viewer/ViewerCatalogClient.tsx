'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  Search,
  FileVideo,
  FileText,
  Code2,
  Eye,
  Filter,
  Shield,
  Clock,
  Sparkles,
  ArrowUpRight,
} from 'lucide-react';
import Link from 'next/link';
import { ViewerContentItem } from '@/lib/types';
import { Navbar } from '@/components/navigation/Navbar';

export default function ViewerCatalogClient() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [items, setItems] = useState<ViewerContentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    async function loadCatalog() {
      setIsLoading(true);
      try {
        const res = await fetch('/api/content/list');
        const json = await res.json();
        if (json.success) {
          setItems(json.data || []);
        }
      } catch (err) {
        console.error('Error fetching viewer catalog:', err);
      } finally {
        setIsLoading(false);
      }
    }

    if (status === 'authenticated') {
      loadCatalog();
    }
  }, [status]);

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

  return (
    <div
      onContextMenu={(e) => e.preventDefault()}
      className="min-h-screen bg-slate-950 text-slate-100 flex flex-col select-none"
      style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
    >
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Banner Section */}
        <div className="mb-8 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800/80 p-6 sm:p-8 relative overflow-hidden">
          <div className="relative z-10 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400 text-xs font-semibold uppercase tracking-wider mb-3">
              <Shield className="w-3.5 h-3.5" />
              <span>Protected Enterprise Reference Catalog</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mb-2">
              Browse Reference Library
            </h1>
            <p className="text-sm text-slate-400">
              Access internal compliance manuals, architecture blueprints, and orientation videos. Content is protected with server-tokenized range streaming and in-memory canvas rendering.
            </p>
          </div>

          <div className="absolute right-6 top-1/2 -translate-y-1/2 hidden lg:flex items-center gap-3 text-slate-700 pointer-events-none">
            <FileVideo className="w-24 h-24 opacity-20 text-sky-400" />
            <FileText className="w-24 h-24 opacity-20 text-indigo-400" />
            <Code2 className="w-24 h-24 opacity-20 text-purple-400" />
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-8">
          {/* Search Box */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              id="search-input"
              type="text"
              placeholder="Search reference library by title, tag, or topic..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500 transition"
            />
          </div>

          {/* Type Pills */}
          <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
            <button
              onClick={() => setSelectedType('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition cursor-pointer ${
                selectedType === 'all'
                  ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20'
                  : 'bg-slate-900/80 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              All Assets ({items.length})
            </button>
            <button
              onClick={() => setSelectedType('video')}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition flex items-center gap-1.5 cursor-pointer ${
                selectedType === 'video'
                  ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20'
                  : 'bg-slate-900/80 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <FileVideo className="w-3.5 h-3.5" />
              <span>Videos</span>
            </button>
            <button
              onClick={() => setSelectedType('pdf')}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition flex items-center gap-1.5 cursor-pointer ${
                selectedType === 'pdf'
                  ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/20'
                  : 'bg-slate-900/80 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>PDFs</span>
            </button>
            <button
              onClick={() => setSelectedType('html')}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition flex items-center gap-1.5 cursor-pointer ${
                selectedType === 'html'
                  ? 'bg-purple-500 text-white shadow-md shadow-purple-500/20'
                  : 'bg-slate-900/80 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>HTML Modules</span>
            </button>
          </div>

          {/* Category Dropdown */}
          {categories.length > 0 && (
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full md:w-auto px-3.5 py-2 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-sky-500"
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

        {/* Content Cards Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((idx) => (
              <div
                key={idx}
                className="h-64 rounded-2xl bg-slate-900/40 border border-slate-800 animate-pulse p-6 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="w-20 h-5 bg-slate-800 rounded-lg" />
                  <div className="w-3/4 h-6 bg-slate-800 rounded-lg" />
                  <div className="w-full h-12 bg-slate-800/60 rounded-lg" />
                </div>
                <div className="w-1/3 h-4 bg-slate-800 rounded" />
              </div>
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="py-20 text-center rounded-2xl border border-dashed border-slate-800 bg-slate-900/20">
            <Shield className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-300">No Content Items Found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              {searchQuery ? 'Try adjusting your search terms or filters.' : 'No protected assets currently uploaded.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredItems.map((item) => (
              <Link
                key={item.id}
                href={`/viewer/${item.id}`}
                className="group relative flex flex-col justify-between rounded-2xl bg-slate-900/70 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 p-6 transition-all duration-200 hover:-translate-y-1 hover:shadow-xl hover:shadow-sky-500/5 cursor-pointer"
              >
                <div>
                  {/* Card Header: Type Badge & Category */}
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold tracking-wide ${
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

                    <span className="text-xs text-slate-400 px-2 py-0.5 rounded bg-slate-800/80">
                      {item.category}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="text-base font-bold text-white group-hover:text-sky-400 transition-colors line-clamp-1 mb-2">
                    {item.title}
                  </h3>

                  {/* Description */}
                  <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed">
                    {item.description || 'No description provided for this protected resource.'}
                  </p>
                </div>

                {/* Card Footer: Metadata & Action CTA */}
                <div className="mt-6 pt-4 border-t border-slate-800/70 flex items-center justify-between text-xs text-slate-500">
                  <div className="flex items-center gap-3">
                    <span className="font-mono">{formatFileSize(item.file_size)}</span>
                    <span className="flex items-center gap-1">
                      <Eye className="w-3.5 h-3.5" />
                      <span>{item.view_count || 0}</span>
                    </span>
                  </div>

                  <span className="inline-flex items-center gap-1 text-sky-400 group-hover:translate-x-0.5 transition-transform font-medium">
                    <span>View</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
