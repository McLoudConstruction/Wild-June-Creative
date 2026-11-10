import { createAdminClient } from '@/lib/supabase/admin';
import { getCurrentAdmin } from '@/lib/admin/auth';
import { inviteAdminAction, sendAdminResetAction } from '@/lib/admin/admin-users-actions';
import { RemoveAdminButton } from '@/components/admin/RemoveAdminButton';
import { legacyAdminAuthEnabled } from '@/lib/admin/legacy-auth';

export const dynamic = 'force-dynamic';

export default async function AdminsPage({
  searchParams,
}: {
  searchParams: { error?: string; success?: string };
}) {
  const supabase = createAdminClient();
  const current = await getCurrentAdmin();

  const { data: admins } = await supabase
    .from('admin_users')
    .select('id, auth_user_id, email, created_at')
    .order('created_at', { ascending: true });

  // Whether each admin has actually logged in yet — tells an accepted
  // invite apart from one still sitting in someone's inbox.
  const rows = await Promise.all(
    (admins ?? []).map(async (admin) => {
      const { data } = await supabase.auth.admin.getUserById(admin.auth_user_id);
      return { ...admin, lastSignInAt: data?.user?.last_sign_in_at ?? null };
    })
  );

  return (
    <div style={{ marginTop: 24, maxWidth: 640 }}>
      <h2 style={{ fontSize: 18, marginTop: 0 }}>Admins</h2>
      <p style={{ fontSize: 13, color: 'var(--warm-gray)', marginTop: -8 }}>
        Everyone listed here can log in to this dashboard at /admin/login with their own email and
        password.
      </p>

      {searchParams.error && <p style={{ color: 'crimson' }}>{decodeURIComponent(searchParams.error)}</p>}
      {searchParams.success && (
        <p style={{ color: 'var(--warm-gray)' }}>{decodeURIComponent(searchParams.success)}</p>
      )}

      {legacyAdminAuthEnabled() && (
        <p style={{ fontSize: 13, padding: 12, border: '1px solid rgba(64,56,46,0.2)', borderRadius: 8 }}>
          The old shared admin password (the <code>ADMIN_*</code> environment variables in Vercel)
          still works as a backup. Once you've confirmed your own login works, delete those
          variables and redeploy to turn it off.
        </p>
      )}

      <div style={{ marginTop: 16 }}>
        {rows.map((admin) => (
          <div
            key={admin.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              padding: '12px 14px',
              border: '1px solid rgba(64,56,46,0.12)',
              borderRadius: 8,
              marginBottom: 10,
            }}
          >
            <div style={{ minWidth: 0 }}>
              <strong style={{ display: 'block', fontSize: 14 }}>
                {admin.email}
                {current?.email === admin.email && (
                  <span style={{ fontWeight: 400, color: 'var(--warm-gray)' }}> (you)</span>
                )}
              </strong>
              <span style={{ fontSize: 12, color: 'var(--warm-gray)' }}>
                {admin.lastSignInAt
                  ? `Last signed in ${new Date(admin.lastSignInAt).toLocaleDateString()}`
                  : 'Invite pending — hasn’t logged in yet'}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
              <form action={sendAdminResetAction} style={{ display: 'inline' }}>
                <input type="hidden" name="email" value={admin.email} />
                <button
                  type="submit"
                  style={{ fontSize: 12, padding: '4px 10px', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
                >
                  Send reset link
                </button>
              </form>
              {current?.email !== admin.email && (
                <RemoveAdminButton adminId={admin.id} email={admin.email} />
              )}
            </div>
          </div>
        ))}

        {rows.length === 0 && (
          <p style={{ color: 'var(--warm-gray)', fontSize: 13 }}>
            No admins yet — you're signed in with the temporary shared password. Add yourself
            below, or run the first-admin SQL from migration 0016.
          </p>
        )}
      </div>

      <div style={{ marginTop: 28, paddingTop: 20, borderTop: '1px solid rgba(64,56,46,0.12)' }}>
        <h3 style={{ fontSize: 14 }}>Add an admin</h3>
        <p style={{ fontSize: 12, color: 'var(--warm-gray)', marginTop: -4 }}>
          They'll get an email with a link to choose their password. If they already have a
          client-portal login, the link lets them set a new password for that same login.
        </p>
        <form action={inviteAdminAction} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <input
            name="email"
            type="email"
            required
            placeholder="name@example.com"
            style={{ flex: 1, padding: 8 }}
          />
          <button type="submit" className="btn-primary" style={{ border: 'none', cursor: 'pointer' }}>
            Send invite
          </button>
        </form>
      </div>
    </div>
  );
}
