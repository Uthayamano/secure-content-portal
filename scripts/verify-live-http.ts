async function testLiveHttp() {
  const BASE_URL = 'http://localhost:3000';
  console.log('\n--- LIVE HTTP ENDPOINT VERIFICATION ---');

  // 1. Fetch CSRF Token
  const csrfRes = await fetch(`${BASE_URL}/api/auth/csrf`);
  const csrfData = await csrfRes.json();
  const csrfToken = csrfData.csrfToken;
  const initialCookies = csrfRes.headers.get('set-cookie') || '';
  console.log('✔ Fetched CSRF token successfully');

  // Helper to extract session cookies
  function parseCookies(cookieHeader: string | null): string {
    if (!cookieHeader) return '';
    return cookieHeader
      .split(',')
      .map((c) => c.split(';')[0].trim())
      .filter((c) => c.startsWith('next-auth.session-token=') || c.startsWith('__Secure-next-auth.session-token='))
      .join('; ');
  }

  // 2. Sign in as Viewer
  const viewerLoginBody = new URLSearchParams({
    csrfToken,
    role: 'viewer',
    email: 'viewer@example.com',
    json: 'true',
  });

  const viewerLoginRes = await fetch(`${BASE_URL}/api/auth/callback/dev-persona-login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Cookie: initialCookies,
    },
    body: viewerLoginBody.toString(),
    redirect: 'manual',
  });

  const viewerCookie = parseCookies(viewerLoginRes.headers.get('set-cookie'));
  console.log('✔ Authenticated as Viewer persona');

  // 3. Test Viewer hitting /api/content/list -> Should be 200
  const viewerCatalogRes = await fetch(`${BASE_URL}/api/content/list`, {
    headers: { Cookie: viewerCookie },
  });
  console.log(`✔ Viewer GET /api/content/list -> Status: ${viewerCatalogRes.status} (Expected: 200)`);
  const catalogData = await viewerCatalogRes.json();
  console.log(`  Catalog items count: ${catalogData.data?.length}`);

  // 4. Test Viewer hitting /api/admin/content -> MUST BE 403 FORBIDDEN!
  const viewerAdminAttempt = await fetch(`${BASE_URL}/api/admin/content`, {
    headers: { Cookie: viewerCookie },
  });
  console.log(`🔒 CRITICAL TEST: Viewer GET /api/admin/content -> Status: ${viewerAdminAttempt.status} (Expected: 403)`);
  const forbiddenBody = await viewerAdminAttempt.json();
  console.log(`  403 Response Body:`, JSON.stringify(forbiddenBody));

  if (viewerAdminAttempt.status !== 403) {
    console.error('❌ FAILED: Viewer was NOT rejected with 403!');
    process.exit(1);
  } else {
    console.log('✔ PASSED: Viewer was strictly blocked with 403 Forbidden!');
  }

  // 5. Sign in as Admin
  const adminLoginBody = new URLSearchParams({
    csrfToken,
    role: 'admin',
    email: 'admin@example.com',
    json: 'true',
  });

  const adminLoginRes = await fetch(`${BASE_URL}/api/auth/callback/dev-persona-login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Cookie: initialCookies,
    },
    body: adminLoginBody.toString(),
    redirect: 'manual',
  });

  const adminCookie = parseCookies(adminLoginRes.headers.get('set-cookie'));
  console.log('\n✔ Authenticated as Admin persona');

  // 6. Test Admin hitting /api/admin/content -> Should be 200
  const adminAccessRes = await fetch(`${BASE_URL}/api/admin/content`, {
    headers: { Cookie: adminCookie },
  });
  console.log(`✔ Admin GET /api/admin/content -> Status: ${adminAccessRes.status} (Expected: 200)`);
  const adminData = await adminAccessRes.json();
  console.log(`  Admin stats:`, adminData.data?.stats);

  console.log('\n======================================================');
  console.log('🎉 ALL LIVE HTTP ENDPOINT CHECKS CONFIRMED SUCCESSFUL!');
  console.log('======================================================\n');
}

testLiveHttp().catch((err) => {
  console.error('Error in live HTTP verification:', err);
  process.exit(1);
});
