# Progress Log - Secure Content Portal

## Overview
This document tracks project milestones, architecture decisions, assumptions, and deliverables for the Secure Content Portal.

---

## Phases & Status

### Phase 0: System Prerequisites & Scaffolding
- [x] Set up Node.js v24 LTS and Git tooling on Windows environment.
- [x] Scaffold Next.js 14+ with TypeScript, Tailwind CSS, App Router, and ESLint.
- [x] Configure Git repository and baseline commit.

### Phase 1: Database Schema, Storage & Environment Setup
- [x] Implement Supabase SQL migrations (`supabase/schema.sql`) for `users`, `content_items`, `activity_logs`, and `view_logs`.
- [x] Configure private Supabase Storage bucket (`secure-content`) policies.
- [x] Establish `.env.example` and environment configuration schema.
- [x] Create unified data repository and storage abstraction (`src/lib/data-store.ts`, `src/lib/supabase.ts`, `src/lib/types.ts`).
- [x] Commit Phase 1.

### Phase 2: Authentication & Role-Based Access Control (RBAC)
- [ ] Implement NextAuth.js configuration with Google Provider.
- [ ] Implement Admin email allow-list check (`ADMIN_EMAILS`) for auto-elevating roles on first login.
- [ ] Implement session role enrichment in JWT and session callbacks.
- [ ] Implement server-side role assertion helpers (`requireAdminSession`, `requireViewerSession`).
- [ ] Add seamless local development/mock authentication bypass for evaluation and automated testing.
- [ ] Commit Phase 2.

### Phase 3: Admin Capabilities (CRUD & Upload Validation)
- [ ] Build upload API handler with MIME type validation, file size limits (200MB video, 20MB PDF/HTML), and non-guessable storage paths.
- [ ] Build edit metadata API handler (title, description, category).
- [ ] Build delete API handler with confirmation check and storage cleanup.
- [ ] Build Admin Dashboard UI with statistics, upload modal (drag-and-drop), metadata editor, and typed delete confirmation modal.
- [ ] Build Admin Activity / Audit Log viewer.
- [ ] Commit Phase 3.

### Phase 4: Viewer Capabilities & Secure Content Protection
- [ ] Build authenticated content list API (redacting internal storage paths).
- [ ] Build streaming proxy API route supporting HTTP Range requests (`206 Partial Content`) for video playback.
- [ ] Build short-lived signed URL generation endpoint.
- [ ] Build secure HTML sandboxed content endpoint.
- [ ] Build `VideoViewer` with custom controls and watermark.
- [ ] Build `PdfViewer` with `pdfjs-dist` canvas rendering (no raw binary exposure).
- [ ] Build `HtmlViewer` inside `sandbox="allow-scripts"` iframe.
- [ ] Build cosmetic deterrents: right-click disable, user-select prevention, and viewer email watermark overlay.
- [ ] Commit Phase 4.

### Phase 5: Automated Testing & Verification
- [ ] Implement automated RBAC test suite verifying:
  - Viewer receives 403 on admin routes.
  - Unauthenticated caller receives 401.
  - Admin receives 200 and can execute CRUD.
  - File validation rejects invalid formats.
- [ ] Run full build check (`npm run build`).
- [ ] Commit Phase 5.

### Phase 6: Documentation & Deployment Guide
- [ ] Write comprehensive `README.md` with:
  - Architecture diagram (Mermaid).
  - Setup instructions & environment variables.
  - Dedicated "Security Trade-offs" section.
  - Vercel & Supabase deployment walkthrough.
- [ ] Final commit & verification.

---

## Architectural Decisions & Assumptions
1. **Private Storage Path**: All uploaded files are stored in a private Supabase Storage bucket at `${contentType}/${crypto.randomUUID()}.${ext}` to prevent URL enumeration and guessing attacks.
2. **HTTP Range Video Streaming**: Rather than providing a static URL to the video, client requests are routed through `/api/content/stream/[id]` with range header parsing, supporting seeking while maintaining server-side token validation on every segment.
3. **Canvas-Only PDF Rendering**: Raw PDF binaries are never exposed directly to `<embed>` or `<iframe src="...">`. The client fetches the bytes inside an authenticated worker and renders each page to an HTML5 `<canvas>` via `pdfjs-dist`.
4. **Sandboxed HTML**: HTML content is served with strict `Content-Security-Policy` and rendered inside `<iframe sandbox="allow-scripts">` without `allow-downloads` or `allow-same-origin`.
5. **Cosmetic Deterrents vs. Security Boundaries**: Right-click prevention and watermark overlays are documented explicitly as cosmetic deterrents, whereas server-side role validation, short-lived signed URLs, and range proxies form the strict security boundaries.
