'use client';

import { useFormStatus } from 'react-dom';

// Wraps useFormStatus so any <form action={serverAction}> gets an
// immediate "Saving…" state instead of looking inert while a request
// (especially a multi-MB image upload) is in flight.
export function SubmitButton({ children = 'Save settings' }: { children?: React.ReactNode }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      style={{
        padding: '10px 20px',
        cursor: pending ? 'default' : 'pointer',
        opacity: pending ? 0.6 : 1,
      }}
    >
      {pending ? 'Saving…' : children}
    </button>
  );
}
