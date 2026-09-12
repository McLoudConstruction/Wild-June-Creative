import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// Runs on every request. Refreshes the Supabase session cookie so a
// client's login doesn't silently expire mid-visit, and gives us one
// place to redirect unauthenticated visitors away from /portal.
export async function middleware(request: NextRequest) {
  // /admin routes use simple Basic Auth rather than Supabase auth —
  // no signup flow, no password reset, just a fixed list of
  // username/password pairs set in Vercel's env vars. Each pair is
  // one person's login: ADMIN_USERNAME/ADMIN_PASSWORD for the first,
  // ADMIN_USERNAME_2/ADMIN_PASSWORD_2 for a second person, and so on
  // if a third is ever needed (add the pair here and the matching env
  // vars in Vercel). There's still no audit trail — every admin
  // shares the same access — but whichever pair matched is forwarded
  // as the x-admin-user request header below, so a future audit log
  // has something to key off of without redoing this.
  let matchedAdminUser: string | undefined;

  if (request.nextUrl.pathname.startsWith('/admin')) {
    const authHeader = request.headers.get('authorization');

    const credentialPairs: { user?: string; pass?: string }[] = [
      { user: process.env.ADMIN_USERNAME, pass: process.env.ADMIN_PASSWORD },
      { user: process.env.ADMIN_USERNAME_2, pass: process.env.ADMIN_PASSWORD_2 },
    ];

    matchedAdminUser = authHeader
      ? credentialPairs.find(
          ({ user, pass }) =>
            user &&
            pass &&
            authHeader === `Basic ${Buffer.from(`${user}:${pass}`).toString('base64')}`
        )?.user
      : undefined;

    if (!matchedAdminUser) {
      return new NextResponse('Authentication required', {
        status: 401,
        headers: { 'WWW-Authenticate': 'Basic realm="Admin"' },
      });
    }
  }

  const requestHeaders = new Headers(request.headers);
  if (matchedAdminUser) {
    requestHeaders.set('x-admin-user', matchedAdminUser);
  }

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
