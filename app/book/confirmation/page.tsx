export const dynamic = 'force-dynamic';

export default function BookingConfirmationPage() {
  return (
    <div style={{ maxWidth: 500, margin: '120px auto', padding: '0 16px', textAlign: 'center' }}>
      <h1>You're booked!</h1>
      <p style={{ color: '#666' }}>
        Thanks for booking with Wild June Creative. A confirmation email is on its way, along with
        a link to set up your client portal if this is your first time booking with us.
      </p>
    </div>
  );
}
