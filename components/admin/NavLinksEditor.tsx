'use client';

import { useState, useTransition } from 'react';
import { Trash2, Plus, ArrowUp, ArrowDown } from 'lucide-react';
import { updateNavLinks } from '@/lib/admin/settings-actions';
import type { NavLink } from '@/lib/site/nav';

// Editable label + destination for every header/footer nav link.
// Deliberately freeform on the href — a link can point at a page's
// address ("/portfolio"), an anchor on the homepage ("/#packages"),
// or an outside URL, so this doesn't try to constrain it to "pick one
// of the existing pages". The full page list rendered alongside this
// (see the Pages page) is there so it's easy to see what addresses
// already exist while typing one in here.
export function NavLinksEditor({ initialLinks }: { initialLinks: NavLink[] }) {
  const [links, setLinks] = useState<NavLink[]>(
    initialLinks.length ? initialLinks : [{ label: '', href: '' }]
  );
  const [isSaving, startSaving] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function updateLink(index: number, key: 'label' | 'href', value: string) {
    setMessage(null);
    setLinks((current) => current.map((link, i) => (i === index ? { ...link, [key]: value } : link)));
  }

  function moveLink(index: number, direction: -1 | 1) {
    setMessage(null);
    setLinks((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function removeLink(index: number) {
    setMessage(null);
    setLinks((current) => current.filter((_, i) => i !== index));
  }

  function addLink() {
    setMessage(null);
    setLinks((current) => [...current, { label: '', href: '' }]);
  }

  function handleSave() {
    setMessage(null);
    startSaving(async () => {
      const result = await updateNavLinks(links);
      if (result.error) {
        setMessage(`Couldn't save: ${result.error}`);
      } else {
        setLinks(result.navLinks.length ? result.navLinks : [{ label: '', href: '' }]);
        setMessage('Saved');
      }
    });
  }

  return (
    <div>
      {links.map((link, i) => (
        <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <button
              type="button"
              onClick={() => moveLink(i, -1)}
              disabled={i === 0}
              aria-label="Move up"
              style={{ padding: 2, lineHeight: 0, opacity: i === 0 ? 0.35 : 1 }}
            >
              <ArrowUp size={13} />
            </button>
            <button
              type="button"
              onClick={() => moveLink(i, 1)}
              disabled={i === links.length - 1}
              aria-label="Move down"
              style={{ padding: 2, lineHeight: 0, opacity: i === links.length - 1 ? 0.35 : 1 }}
            >
              <ArrowDown size={13} />
            </button>
          </div>
          <input
            type="text"
            value={link.label}
            onChange={(e) => updateLink(i, 'label', e.target.value)}
            placeholder="Text (e.g. Portfolio)"
            style={{ flex: 1, padding: 8 }}
          />
          <input
            type="text"
            value={link.href}
            onChange={(e) => updateLink(i, 'href', e.target.value)}
            placeholder="/portfolio, /#packages, or https://…"
            style={{ flex: 2, padding: 8 }}
          />
          <button
            type="button"
            onClick={() => removeLink(i)}
            aria-label="Remove link"
            style={{ padding: 8, background: 'none', border: 'none', cursor: 'pointer', color: 'crimson' }}
          >
            <Trash2 size={15} />
          </button>
        </div>
      ))}

      <button type="button" onClick={addLink} className="admin-add-block-button">
        <Plus size={15} /> Add link
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 20 }}>
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="btn-primary"
          style={{ border: 'none', cursor: 'pointer' }}
        >
          {isSaving ? 'Saving…' : 'Save navigation'}
        </button>
        {message && <span style={{ fontSize: 13, color: 'var(--warm-gray)' }}>{message}</span>}
      </div>
    </div>
  );
}
