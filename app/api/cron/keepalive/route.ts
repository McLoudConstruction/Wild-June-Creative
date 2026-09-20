import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

// Runs once daily. Does nothing but issue a real read against the
// database, so Supabase's free-tier "paused after 7 days of inactivity"
// timer never trips on a quiet week. No side effects, no notifications.
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createAdminClient();

  const { error } = await supabase.from('clients').select('id').limit(1);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, pinged_at: new Date().toISOString() });
}
