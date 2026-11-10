// The old shared Basic Auth admin logins (ADMIN_USERNAME /
// ADMIN_PASSWORD and the _2 pair), kept only as a safety net while
// the switch to real admin accounts is being verified. Delete the
// ADMIN_* env vars in Vercel and this goes inert on its own: with no
// credentials configured, nothing can match and the "use the old
// login" link disappears from /admin/login.
//
// Imported by middleware.ts, so it has to stay edge-safe — no Node
// -only imports.

export function legacyAdminAuthEnabled(): boolean {
  return Boolean(
    (process.env.ADMIN_USERNAME && process.env.ADMIN_PASSWORD) ||
      (process.env.ADMIN_USERNAME_2 && process.env.ADMIN_PASSWORD_2)
  );
}

// Returns the matching username if the Authorization header carries
// one of the configured pairs, otherwise undefined.
export function matchLegacyBasicAuth(authHeader: string | null): string | undefined {
  if (!authHeader) return undefined;

  const credentialPairs: { user?: string; pass?: string }[] = [
    { user: process.env.ADMIN_USERNAME, pass: process.env.ADMIN_PASSWORD },
    { user: process.env.ADMIN_USERNAME_2, pass: process.env.ADMIN_PASSWORD_2 },
  ];

  return credentialPairs.find(
    ({ user, pass }) =>
      user && pass && authHeader === `Basic ${Buffer.from(`${user}:${pass}`).toString('base64')}`
  )?.user;
}
