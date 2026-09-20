'use server';

import { redirect } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import type { NavLink } from '@/lib/site/nav';

type AssetType = 'logo' | 'favicon' | 'header';

// logo/favicon keep PNG for transparency; header is a full photo with
// no transparency need, so JPEG — meaningfully smaller for the same
// visual quality, which matters since it's usually the largest of the
// three by far.
const ASSET_EXTENSION: Record<AssetType, 'png' | 'jpg'> = {
  logo: 'png',
  favicon: 'png',
  header: 'jpg',
};

// Resizing used to happen here, server-side, via sharp — download the
// raw upload, resize, re-upload, delete the staging copy. That meant
// two full-size transfers plus a server round trip for every upload,
// which is a big part of why this used to feel slow. The browser now
// compresses the image itself before it ever leaves (see
// lib/site/image-compress.ts and BrandingAssetUpload.tsx), so this
// just hands back a signed URL straight to the image's final
// location — one small upload, nothing to process afterward.
export async function getSignedBrandingUploadUrl(assetType: AssetType, fileName: string) {
  const supabase = createAdminClient();
  const ext = ASSET_EXTENSION[assetType];
  const path = `_branding/${assetType}-${Date.now()}.${ext}`;

  const { data, error } = await supabase.storage.from('site-assets').createSignedUploadUrl(path);

  if (error || !data) {
    throw new Error(`Couldn't prepare upload: ${error?.message ?? 'unknown error'}`);
  }

  const { data: publicUrlData } = supabase.storage.from('site-assets').getPublicUrl(path);
  return { path: data.path, token: data.token, url: publicUrlData.publicUrl };
}

// The main form submit. Image fields arrive as plain URL strings now
// (already uploaded and processed by the two actions above before
// this ever runs) — so this action's whole request body is just text,
// nowhere close to any size limit.
// Called directly from the fullscreen page editor's sidebar dropdown
// — a single-field save so picking a new position applies (and
// persists) without leaving the editor or touching anything else in
// site_settings.
export async function updateLogoPosition(
  position: 'left' | 'center' | 'right'
): Promise<{ error: string | null }> {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from('site_settings')
    .upsert({ id: true, logo_position: position, updated_at: new Date().toISOString() });

  return { error: error?.message ?? null };
}

// The nav editor on /admin/pages calls this directly (not a <form
// action>, since it's sending a JSON array rather than FormData).
// Blank rows (no label or no href — e.g. one added and left empty)
// are dropped rather than saved, so a stray "Add link" click can't
// leave a dead entry in the live header.
export async function updateNavLinks(
  navLinks: NavLink[]
): Promise<{ error: string | null; navLinks: NavLink[] }> {
  const supabase = createAdminClient();

  const cleaned = navLinks
    .map((link) => ({ label: link.label.trim(), href: link.href.trim() }))
    .filter((link) => link.label && link.href);

  const { error } = await supabase
    .from('site_settings')
    .upsert({ id: true, nav_links: cleaned, updated_at: new Date().toISOString() });

  return { error: error?.message ?? null, navLinks: cleaned };
}

export async function updateBrandingAction(formData: FormData) {
  const supabase = createAdminClient();

  const headerStyle = formData.get('headerStyle') as string;
  const headerImageUrl = (formData.get('headerImageUrl') as string) || null;

  if (headerStyle === 'image' && !headerImageUrl) {
    redirect(
      `/admin/settings/branding?error=${encodeURIComponent(
        'Choose a header background image before saving the full-width image style.'
      )}`
    );
  }

  const updatePayload: Record<string, unknown> = {
    id: true,
    logo_url: (formData.get('logoUrl') as string) || null,
    favicon_url: (formData.get('faviconUrl') as string) || null,
    header_style: headerStyle,
    header_image_url: headerImageUrl,
    header_overlay_theme: formData.get('headerOverlayTheme') as string,
    accent_color: formData.get('accentColor') as string,
    ink_color: formData.get('inkColor') as string,
    heading_font: formData.get('headingFont') as string,
    body_font: formData.get('bodyFont') as string,
    instagram_url: (formData.get('instagramUrl') as string) || null,
    facebook_url: (formData.get('facebookUrl') as string) || null,
    pinterest_url: (formData.get('pinterestUrl') as string) || null,
    tiktok_url: (formData.get('tiktokUrl') as string) || null,
    contact_phone: (formData.get('contactPhone') as string) || null,
    contact_email: (formData.get('contactEmail') as string) || null,
    contact_address: (formData.get('contactAddress') as string) || null,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from('site_settings').upsert(updatePayload);

  if (error) {
    redirect(`/admin/settings/branding?error=${encodeURIComponent(error.message)}`);
  }

  redirect('/admin/settings/branding?success=1');
}
