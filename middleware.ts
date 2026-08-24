import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// Runs on every request. Refreshes the Supabase session cookie so a
// client's login doesn't silently expire mid-visit, and gives us one
// place to redirect unauthenticated visitors away from /portal.
export async function middleware(request: NextRequest) {
  // /admin routes use simple Basic Auth rather than Supabase auth,
  // since this is a single-operator internal tool for now (creating
  // clients, sending invites) — not something that needs a full user
  // system yet. Set ADMIN_USERNAME and ADMIN_PASSWORD in Vercel's env
  // vars. Swap this for real admin accounts once more than one person
  // needs access or an audit trail matters.
  if (request.nextUrl.pathname.startsWith('/admin')) {
    const authHeader = request.headers.get('authorization');
    const expectedUser = process.env.ADMIN_USERNAME;
    const expectedPass = process.env.ADMIN_PASSWORD;

    const isAuthorized =
      authHeader &&
      expectedUser &&
      expectedPass &&
      authHeader === `Basic ${Buffer.from(`${expectedUser}:${expectedPass}`).toString('base64')}`;

    if (!isAuthorized) {
      return new NextResponse('Authentication required', {
        status: 401,
        headers: { 'WWW-Authenticate': 'Basic realm="Admin"' },
      });
    }
  }

  let response = NextResponse.next({ request });

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
          response = NextResponse.next({ request });
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

  const isPortalRoute = request.nextUrl.pathname.startsWith('/portal');
  const isSetPasswordRoute = request.nextUrl.pathname.startsWith('/portal/set-password');

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
