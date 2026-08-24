import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendNotification } from '@/lib/notifications/send';

// Runs once daily. Two jobs:
// 1. Send a "7 days left" warning (once) for galleries about to expire
// 2. Flip is_expired=true for galleries past their expires_at — the
//    gallery route itself checks this flag and renders the branded
//    "expired" page instead of the photos.
// Photos are NOT deleted here — expiration just gates access. Manual
// reactivation is an admin action (extend expires_at / flip the flag).
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createAdminClient();
  const now = new Date();
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 86_400_000);

  // 1. Warn galleries expiring in the next 7 days, not yet warned
  const { data: expiringSoon } = await supabase
    .from('galleries')
    .select('*, clients(*)')
    .eq('is_expired', false)
    .is('expiring_soon_notified_at', null)
    .lte('expires_at', sevenDaysFromNow.toISOString())
    .gt('expires_at', now.toISOString());

  for (const gallery of expiringSoon ?? []) {
    const client = gallery.clients as any;

    await sendNotification({
      clientId: client.id,
      clientEmail: client.email,
      clientName: client.full_name,
      type: 'gallery_expiring_soon',
      galleryId: gallery.id,
      data: {
        expiresDate: new Date(gallery.expires_at).toLocaleDateString(),
      },
    });

    await supabase
      .from('galleries')
      .update({ expiring_soon_notified_at: now.toISOString() })
      .eq('id', gallery.id);
  }

  // 2. Expire galleries past their date
  const { data: toExpire } = await supabase
    .from('galleries')
    .select('*, clients(*)')
    .eq('is_expired', false)
    .lte('expires_at', now.toISOString());

  for (const gallery of toExpire ?? []) {
    const client = gallery.clients as any;

    await supabase.from('galleries').update({ is_expired: true }).eq('id', gallery.id);

    await sendNotification({
      clientId: client.id,
      clientEmail: client.email,
      clientName: client.full_name,
      type: 'gallery_expired',
      galleryId: gallery.id,
      data: {},
    });
  }

  return NextResponse.json({
    warned: expiringSoon?.length ?? 0,
    expired: toExpire?.length ?? 0,
  });
}
