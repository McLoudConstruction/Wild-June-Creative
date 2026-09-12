'use client';

import { useState } from 'react';
import { MediaPickerModal } from './MediaPickerModal';

// Drop-in replacement for a raw "paste a URL" text input, used for
// every image field in the page editor (block photos, background
// images). Decoupled from PageEditor's state shape on purpose —
// it just takes the current URL and an onChange, so it works the same
// whether the caller is updating a simple block prop or one item in
// the portfolio grid's list.
export function ImageField({
  label,
  value,
  onChange,
  helper,
}: {
  label: string;
  value: string;
  onChange: (url: string) => void;
  helper?: string;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);

  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: 'block', fontSize: 13, marginBottom: 6 }}>{label}</label>

      {value && (
        <div style={{ marginBottom: 8 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt=""
            style={{ maxWidth: 160, maxHeight: 120, borderRadius: 4, display: 'block' }}
          />
        </div>
      )}

      <div style={{ display: 'flex', gap: 8 }}>
        <button type="button" onClick={() => setPickerOpen(true)} className="admin-add-block-button">
          {value ? 'Change photo' : 'Choose photo'}
        </button>
        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            style={{ padding: '8px 12px', fontSize: 13, background: 'none', border: '1px solid rgba(64,56,46,0.2)', borderRadius: 6, cursor: 'pointer' }}
          >
            Remove
          </button>
        )}
      </div>

      {helper && <p style={{ fontSize: 12, color: 'var(--warm-gray)', marginTop: 4 }}>{helper}</p>}

      {pickerOpen && (
        <MediaPickerModal
          onSelect={(url) => {
            onChange(url);
            setPickerOpen(false);
          }}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </div>
  );
}
