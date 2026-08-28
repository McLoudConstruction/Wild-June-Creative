'use server';

import { redirect } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';

export async function createPackageAction(formData: FormData) {
  const name = (formData.get('name') as string)?.trim();
  const description = (formData.get('description') as string)?.trim() || null;
  const priceDollars = parseFloat((formData.get('price') as string) || '0');
  const galleryAvailabilityDays = parseInt(
    (formData.get('galleryAvailabilityDays') as string) || '30',
    10
  );

  if (!name || !Number.isFinite(priceDollars) || priceDollars <= 0) {
    redirect(
      `/admin/sales/packages?error=${encodeURIComponent('Name and a valid price are required.')}`
    );
  }

  const supabase = createAdminClient();
  const { error } = await supabase.from('session_packages').insert({
    name,
    description,
    price_cents: Math.round(priceDollars * 100),
    gallery_availability_days: Number.isFinite(galleryAvailabilityDays)
      ? galleryAvailabilityDays
      : 30,
  });

  if (error) {
    redirect(`/admin/sales/packages?error=${encodeURIComponent(error.message)}`);
  }

  redirect('/admin/sales/packages?success=1');
}

export async function togglePackageActiveAction(formData: FormData) {
  const packageId = formData.get('packageId') as string;
  const nextActive = formData.get('nextActive') === 'true';

  const supabase = createAdminClient();
  const { error } = await supabase
    .from('session_packages')
    .update({ is_active: nextActive })
    .eq('id', packageId);

  if (error) {
    redirect(`/admin/sales/packages?error=${encodeURIComponent(error.message)}`);
  }

  redirect('/admin/sales/packages?success=1');
}
