import { Resend } from 'resend';
import { createAdminClient } from '@/lib/supabase/admin';

// Created lazily, inside the function that uses it, rather than at
// module load time. Instantiating Resend with a missing/empty API key
// throws immediately — if that happened at module scope, importing
// this file at all (including during Vercel's build-time page data
// collection, before any env vars are relevant) would crash the
// build. This keeps the failure contained to actual send attempts.
function getResendClient() {
  return new Resend(process.env.RESEND_API_KEY);
}

export type NotificationType =
  | 'booking_confirmation'
  | 'payment_due_reminder'
  | 'payment_grace_warning'
  | 'booking_auto_cancelled'
  | 'gallery_expiring_soon'
  | 'gallery_expired'
  | 'password_reset';

type SendNotificationInput = {
  clientId: string;
  clientEmail: string;
  clientName: string;
  type: NotificationType;
  bookingId?: string;
  galleryId?: string;
  data: Record<string, string | number>;
};

// Single entry point for every notification in the app. Today this
// only sends email via Resend. When SMS gets added, add a `channel`
// param and a case in the switch below for a Twilio handler — nothing
// upstream (the cron jobs, webhook handlers, etc.) needs to change,
// they just call sendNotification() the same way.
export async function sendNotification(input: SendNotificationInput) {
  const supabase = createAdminClient();

  const { data: logRow, error: logError } = await supabase
    .from('notifications')
    .insert({
      client_id: input.clientId,
      booking_id: input.bookingId ?? null,
      gallery_id: input.galleryId ?? null,
      type: input.type,
      channel: 'email',
      status: 'pending',
    })
    .select()
    .single();

  if (logError) {
    console.error('Failed to log notification:', logError);
  }

  try {
    const { subject, html } = renderEmail(input);
    const resend = getResendClient();

    const { error: sendError } = await resend.emails.send({
      from: process.env.NOTIFICATIONS_FROM_EMAIL!,
      to: input.clientEmail,
      subject,
      html,
    });

    if (sendError) {
      throw new Error(sendError.message);
    }

    if (logRow) {
      await supabase
        .from('notifications')
        .update({ status: 'sent', sent_at: new Date().toISOString() })
        .eq('id', logRow.id);
    }
  } catch (err) {
    console.error('Notification send failed:', err);
    if (logRow) {
      await supabase.from('notifications').update({ status: 'failed' }).eq('id', logRow.id);
    }
  }
}

function renderEmail(input: SendNotificationInput): { subject: string; html: string } {
  const { type, clientName, data } = input;

  switch (type) {
    case 'booking_confirmation':
      return {
        subject: 'Your Wild June Creative session is booked!',
        html: `<p>Hi ${clientName},</p><p>Your session is confirmed for ${data.sessionDate}. We can't wait to work with you.</p>`,
      };
    case 'payment_due_reminder':
      return {
        subject: 'Payment reminder — Wild June Creative',
        html: `<p>Hi ${clientName},</p><p>A payment of $${data.amount} is due on ${data.dueDate} for your session.</p>`,
      };
    case 'payment_grace_warning':
      return {
        subject: 'Action needed: payment past due',
        html: `<p>Hi ${clientName},</p><p>Your payment of $${data.amount} was due on ${data.dueDate}. Please submit payment within ${data.daysRemaining} day(s) to avoid automatic cancellation.</p>`,
      };
    case 'booking_auto_cancelled':
      return {
        subject: 'Your booking has been cancelled',
        html: `<p>Hi ${clientName},</p><p>Your booking was cancelled due to a missed payment. $${data.refundAmount} has been refunded to your original payment method (a $${data.feeAmount} processing fee was retained). Reach out if you'd like to rebook.</p>`,
      };
    case 'gallery_expiring_soon':
      return {
        subject: 'Your gallery expires in 7 days',
        html: `<p>Hi ${clientName},</p><p>Your gallery will expire on ${data.expiresDate}. Be sure to download your favorites before then.</p>`,
      };
    case 'gallery_expired':
      return {
        subject: 'Your gallery has expired',
        html: `<p>Hi ${clientName},</p><p>Your gallery is no longer available online. Contact us if you'd like it reactivated.</p>`,
      };
    case 'password_reset':
      return {
        subject: 'Reset your Wild June Creative password',
        html: `<p>Hi ${clientName},</p><p>Click below to choose a new password:</p><p><a href="${data.resetLink}">Reset my password</a></p><p>This link expires soon and can only be used once. If you didn't request this, you can safely ignore this email — your password won't change.</p>`,
      };
  }
}
