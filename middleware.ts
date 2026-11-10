import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { legacyAdminAuthEnabled, matchLegacyBasicAuth } from '@/lib/admin/legacy-auth';

// Only same-site /admin paths are valid post-login destinations —
// anything else (an absolute URL, "//evil.com", a non-admin path)
// falls back to the dashboard so ?next= can't be used as an open
// redirect.
function safeAdminNext(next: string | null): string {
  return next && next.startsWith('/admin') && !next.startsWith('//') ? next : '/admin';
}

// Runs on every request. Refreshes the Supabase session cookie so a
// client's login doesn't silently expire mid-visit, redirects
// unauthenticated visitors away from /portal, and gates /admin.
export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isAdminRoute = pathname.startsWith('/admin');
  // The pages someone needs *before* they have an admin session.
  const isAdminAuthPage =
    pathname === '/admin/login' ||
    pathname.startsWith('/admin/forgot-password') ||
    pathname.startsWith('/admin/set-password');

  // /admin/legacy is the doorway to the old shared Basic Auth logins
  // (see lib/admin/legacy-auth.ts) — a temporary safety net while the
  // switch to real admin accounts is being verified. It's the only
  // place that ever sends the browser's username/password popup; once
  // the ADMIN_* env vars are deleted it just redirects to the login
  // page.
  if (pathname === '/admin/legacy') {
    const redirectUrl = request.nextUrl.clone();

    if (!legacyAdminAuthEnabled()) {
      redirectUrl.pathname = '/admin/login';
      redirectUrl.search = '';
      return NextResponse.redirect(redirectUrl);
    }

    if (matchLegacyBasicAuth(request.headers.get('authorization'))) {
      const destination = safeAdminNext(request.nextUrl.searchParams.get('next'));
      redirectUrl.pathname = destination.split('?')[0];
      redirectUrl.search = destination.includes('?') ? `?${destination.split('?')[1]}` : '';
      return NextResponse.redirect(redirectUrl);
    }

    return new NextResponse('Authentication required', {
      status: 401,
      headers: { 'WWW-Authenticate': 'Basic realm="Admin"' },
    });
  }

  const requestHeaders = new Headers(request.headers);
  // x-admin-user is set below, by this middleware, and only after an
  // admin check passes. Anything the caller sent under that name is
  // untrusted, so drop it up front.
  requestHeaders.delete('x-admin-user');

  let response = NextResponse.next({ request: { headers: requestHeaders } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request: { headers: requestHeaders } });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (isAdminRoute) {
    // Is this session an admin? RLS lets a signed-in user read only
    // their own admin_users row, so a row coming back at all is the
    // answer — a client's portal login finds nothing here.
    let adminUser: string | undefined;

    if (user) {
      const { data: adminRow } = await supabase
        .from('admin_users')
        .select('email')
        .eq('auth_user_id', user.id)
        .maybeSingle();
      adminUser = adminRow?.email;
    }

    // Safety net while the old shared logins still exist.
    if (!adminUser) {
      adminUser = matchLegacyBasicAuth(request.headers.get('authorization'));
    }

    if (isAdminAuthPage) {
      // Someone who's already in doesn't need the login form again.
      if (adminUser && pathname === '/admin/login') {
        const redirectUrl = request.nextUrl.clone();
        const destination = safeAdminNext(request.nextUrl.searchParams.get('next'));
        redirectUrl.pathname = destination.split('?')[0];
        redirectUrl.search = destination.includes('?') ? `?${destination.split('?')[1]}` : '';
        return NextResponse.redirect(redirectUrl);
      }
      return response;
    }

    if (!adminUser) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = '/admin/login';
      redirectUrl.search = '';
      redirectUrl.searchParams.set('next', pathname + request.nextUrl.search);
      return NextResponse.redirect(redirectUrl);
    }

    // Forwarded so server components (the header's "signed in as")
    // can show who's logged in. Display only — anything that needs to
    // actually authorize someone re-checks via lib/admin/auth.ts.
    requestHeaders.set('x-admin-user', adminUser);
    const refreshed = NextResponse.next({ request: { headers: requestHeaders } });
    // Carry over any session-refresh cookies set during getUser().
    response.cookies.getAll().forEach((cookie) => refreshed.cookies.set(cookie));
    response = refreshed;
  }

  const isPortalRoute = pathname.startsWith('/portal');
  const isSetPasswordRoute = pathname.startsWith('/portal/set-password');

  if (isPortalRoute && !isSetPasswordRoute && !user) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/login';
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}

export const config = {
  matcher: ['/portal/:path*', '/admin/:path*'],
};
