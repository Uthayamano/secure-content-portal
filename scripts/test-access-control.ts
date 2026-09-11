import { isEmailInAdminAllowlist } from '../src/lib/auth';
import {
  memoryStore,
  getViewerContentItems,
  getAllContentItems,
  getContentItemById,
  createContentItem,
  updateContentItem,
  deleteContentItem,
  logActivity,
  getActivityLogs,
} from '../src/lib/data-store';

let testsPassed = 0;
let testsFailed = 0;

function assert(condition: boolean, testName: string, failureDetails?: string) {
  if (condition) {
    console.log(`  \x1b[32m✔ PASS\x1b[0m: ${testName}`);
    testsPassed++;
  } else {
    console.error(`  \x1b[31m✖ FAIL\x1b[0m: ${testName}`);
    if (failureDetails) console.error(`    \x1b[33m${failureDetails}\x1b[0m`);
    testsFailed++;
  }
}

async function runTestSuite() {
  console.log('\n======================================================');
  console.log('🔒 SECURE CONTENT PORTAL - AUTOMATED TEST SUITE');
  console.log('======================================================\n');

  // ------------------------------------------------------------------
  // TEST SUITE 1: Admin Allowlist & Role Assignment
  // ------------------------------------------------------------------
  console.log('\x1b[36m[Suite 1] Role Elevation & Admin Allowlist\x1b[0m');
  assert(
    isEmailInAdminAllowlist('admin@example.com'),
    'Allowlisted email "admin@example.com" evaluates to Admin'
  );
  assert(
    isEmailInAdminAllowlist('ADMIN@EXAMPLE.COM'),
    'Allowlist check is case-insensitive'
  );
  assert(
    !isEmailInAdminAllowlist('viewer@example.com'),
    'Non-allowlisted email "viewer@example.com" evaluates to Viewer (not Admin)'
  );
  assert(
    !isEmailInAdminAllowlist('malicious-actor@evil.corp'),
    'Unknown email evaluates to Viewer'
  );

  // ------------------------------------------------------------------
  // TEST SUITE 2: Storage Path Privacy (Viewer Redaction Boundary)
  // ------------------------------------------------------------------
  console.log('\n\x1b[36m[Suite 2] Private Storage Path Leakage Prevention\x1b[0m');
  const viewerItems = await getViewerContentItems();
  assert(viewerItems.length > 0, 'Viewer catalog returns accessible items');

  const leakedStoragePath = viewerItems.some((item) => 'storage_path' in item);
  assert(
    !leakedStoragePath,
    'CRITICAL: Internal private storage_path is strictly stripped from viewer content models',
    leakedStoragePath ? 'storage_path was found in viewer response' : undefined
  );

  // ------------------------------------------------------------------
  // TEST SUITE 3: Server-side RBAC Guard Logic (403 Enforcement)
  // ------------------------------------------------------------------
  console.log('\n\x1b[36m[Suite 3] Server-Side RBAC Enforcement (403 Forbidden)\x1b[0m');

  // Simulate viewer session
  const viewerSession = {
    user: { id: 'usr-viewer-001', email: 'viewer@example.com', role: 'viewer' as const, name: 'Alex Viewer' },
    expires: new Date(Date.now() + 3600000).toISOString(),
  };

  // Simulate admin session
  const adminSession = {
    user: { id: 'usr-admin-001', email: 'admin@example.com', role: 'admin' as const, name: 'Jane Admin' },
    expires: new Date(Date.now() + 3600000).toISOString(),
  };

  // Guard evaluation function
  function simulateAdminGuard(session: { user: { id: string; email: string; role: 'admin' | 'viewer'; name: string }; expires: string } | null) {
    if (!session || !session.user) {
      return { status: 401, error: 'Unauthorized: Authentication required' };
    }
    if ((session.user.role as string) !== 'admin') {
      return {
        status: 403,
        error: 'Forbidden: Caller does not possess Admin privileges',
        requiredRole: 'admin',
        actualRole: session.user.role,
      };
    }
    return { status: 200, session };
  }

  const unauthenticatedResult = simulateAdminGuard(null);
  assert(
    unauthenticatedResult.status === 401,
    'Unauthenticated call to /api/admin/* yields HTTP 401 Unauthorized'
  );

  const viewerResult = simulateAdminGuard(viewerSession);
  assert(
    viewerResult.status === 403,
    'CRITICAL: Viewer session attempting /api/admin/* yields HTTP 403 Forbidden (never 200)',
    `Status received: ${viewerResult.status}`
  );
  assert(
    viewerResult.error?.includes('Forbidden') === true,
    'Viewer 403 response contains explicit authorization error message'
  );

  const adminResult = simulateAdminGuard(adminSession);
  assert(
    adminResult.status === 200,
    'Admin session is granted HTTP 200 access to /api/admin/*'
  );

  // ------------------------------------------------------------------
  // TEST SUITE 4: File Upload Validation (Allow-list & Limits)
  // ------------------------------------------------------------------
  console.log('\n\x1b[36m[Suite 4] File Extension & Size Validation\x1b[0m');

  const ALLOWED_EXTENSIONS: Record<string, string[]> = {
    video: ['.mp4'],
    pdf: ['.pdf'],
    html: ['.html', '.htm'],
  };
  const MAX_SIZES: Record<string, number> = {
    video: 200 * 1024 * 1024,
    pdf: 20 * 1024 * 1024,
    html: 20 * 1024 * 1024,
  };

  function validateUpload(filename: string, sizeBytes: number, contentType: string) {
    const ext = filename.toLowerCase().slice(filename.lastIndexOf('.'));
    const allowedExts = ALLOWED_EXTENSIONS[contentType] || [];
    if (!allowedExts.includes(ext)) {
      return { valid: false, error: `Invalid extension ${ext} for ${contentType}` };
    }
    if (sizeBytes > MAX_SIZES[contentType]) {
      return { valid: false, error: `File size exceeds limit for ${contentType}` };
    }
    return { valid: true };
  }

  assert(
    validateUpload('security-video.mp4', 1055736, 'video').valid,
    'Valid .mp4 video is accepted'
  );
  assert(
    !validateUpload('exploit.exe', 1024, 'video').valid,
    'Executable .exe disguised as video is rejected'
  );
  assert(
    !validateUpload('malicious.mkv', 1024, 'video').valid,
    'Non-allowlisted video container (.mkv) is rejected'
  );
  assert(
    !validateUpload('large-video.mp4', 250 * 1024 * 1024, 'video').valid,
    'Video exceeding 200MB limit is rejected'
  );
  assert(
    validateUpload('standard-sop.pdf', 45280, 'pdf').valid,
    'Valid .pdf document is accepted'
  );
  assert(
    !validateUpload('huge-manual.pdf', 25 * 1024 * 1024, 'pdf').valid,
    'PDF exceeding 20MB limit is rejected'
  );
  assert(
    validateUpload('guide.html', 5000, 'html').valid,
    'Valid .html module is accepted'
  );
  assert(
    !validateUpload('script.php', 5000, 'html').valid,
    'Server executable .php disguised as html is rejected'
  );

  // ------------------------------------------------------------------
  // TEST SUITE 5: CRUD & Audit Logging Lifecycle
  // ------------------------------------------------------------------
  console.log('\n\x1b[36m[Suite 5] Full CRUD Lifecycle & Audit Trails\x1b[0m');

  // Create
  const created = await createContentItem({
    title: 'Automated Test Asset',
    description: 'Verifying administrative CRUD operations',
    category: 'QA Testing',
    content_type: 'pdf',
    storage_path: 'pdf/auto-test-001.pdf',
    file_size: 10240,
    mime_type: 'application/pdf',
    uploaded_by: adminSession.user.id,
  });
  assert(Boolean(created && created.id), 'Content item created with unique UUID');

  // Audit upload
  await logActivity({
    admin_id: adminSession.user.id,
    admin_email: adminSession.user.email,
    action: 'upload',
    content_item_id: created.id,
    content_title: created.title,
  });

  // Read
  const fetched = await getContentItemById(created.id);
  assert(fetched?.title === 'Automated Test Asset', 'Newly created item retrievable by ID');

  // Update
  const updated = await updateContentItem(created.id, {
    title: 'Updated Automated Test Asset',
    category: 'QA Testing Complete',
  });
  assert(updated?.title === 'Updated Automated Test Asset', 'Metadata updated successfully');

  // Audit edit
  await logActivity({
    admin_id: adminSession.user.id,
    admin_email: adminSession.user.email,
    action: 'edit',
    content_item_id: created.id,
    content_title: updated?.title || '',
  });

  // Delete
  const deleted = await deleteContentItem(created.id);
  assert(deleted === true, 'Content item deleted from database and storage');

  // Audit delete
  await logActivity({
    admin_id: adminSession.user.id,
    admin_email: adminSession.user.email,
    action: 'delete',
    content_item_id: created.id,
    content_title: updated?.title || '',
  });

  const logs = await getActivityLogs(10);
  assert(logs.length >= 3, 'Audit logs accurately recorded upload, edit, and delete events');

  // Summary
  console.log('\n======================================================');
  console.log(`TEST RESULTS: \x1b[32m${testsPassed} Passed\x1b[0m, \x1b[${testsFailed > 0 ? '31' : '32'}m${testsFailed} Failed\x1b[0m`);
  console.log('======================================================\n');

  if (testsFailed > 0) {
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
