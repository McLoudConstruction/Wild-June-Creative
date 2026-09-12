import { redirect } from 'next/navigation';

export default function ClientIndexPage({ params }: { params: { id: string } }) {
  redirect(`/admin/clients/${params.id}/gallery`);
}
