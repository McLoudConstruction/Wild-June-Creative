import { AdminForgotPasswordForm } from '@/components/admin/AdminForgotPasswordForm';

export const dynamic = 'force-dynamic';

export default function AdminForgotPasswordPage() {
  return (
    <div style={{ maxWidth: 400, margin: '48px auto', padding: '0 16px' }}>
      <h1>Reset your password</h1>
      <p>Enter your admin email and we'll send you a link to choose a new one.</p>
      <AdminForgotPasswordForm />
    </div>
  );
}
