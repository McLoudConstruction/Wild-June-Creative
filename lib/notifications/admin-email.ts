import { Resend } from 'resend';

// Plain transactional email for admin accounts (invites and password
// resets). Separate from sendNotification() on purpose: that one is
// built around clients — it logs every send against a client_id in the
// notifications table — and admins aren't clients.
//
// Resend is instantiated here, inside the function, not at module
// scope: a missing API key throws on construction and would crash the
// build if this file were imported at load time.
export async function sendAdminEmail(input: {
  to: string;
  subject: string;
  html: string;
}): Promise<{ error: string | null }> {
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { error } = await resend.emails.send({
      from: process.env.NOTIFICATIONS_FROM_EMAIL ?? 'bookings@wildjunecreative.com',
      to: input.to,
      subject: input.subject,
      html: input.html,
    });

    // Resend returns failures as data rather than throwing, so a bad
    // key or unverified sender would otherwise look like success.
    return { error: error?.message ?? null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Email failed to send.' };
  }
}
