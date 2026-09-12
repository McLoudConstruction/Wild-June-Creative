'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2, Plus } from 'lucide-react';
import { updatePageBlocks } from '@/lib/admin/pages-actions';
import {
  BLOCK_LABELS,
  BLOCK_ORDER,
  defaultPropsFor,
  newBlockId,
  type Block,
  type BlockType,
  type SectionAppearance,
} from '@/lib/site/blocks';
import { renderBlock } from '@/components/site/blocks/BlockRenderer';
import type { SessionPackage } from '@/components/site/blocks/Sessions';

type FieldDescriptor = {
  key: string;
  label: string;
  kind: 'text' | 'textarea';
  helper?: string;
};

// Simple scalar-field blocks are rendered from this schema. The one
// block with a nested list (portfolio_grid) gets its own hand-written
// section instead of trying to force it into this shape.
const FIELD_SCHEMAS: Record<string, FieldDescriptor[]> = {
  hero: [
    { key: 'heading', label: 'Heading', kind: 'text' },
    { key: 'script', label: 'Script line', kind: 'text' },
    { key: 'body', label: 'Body text', kind: 'textarea' },
    { key: 'primaryLabel', label: 'Primary button text', kind: 'text' },
    { key: 'primaryHref', label: 'Primary button link', kind: 'text' },
    { key: 'secondaryLabel', label: 'Secondary button text', kind: 'text' },
    { key: 'secondaryHref', label: 'Secondary button link', kind: 'text' },
  ],
  featured_photo: [
    {
      key: 'imageSrc',
      label: 'Photo URL',
      kind: 'text',
      helper: 'Paste an image URL. Leave blank to show a placeholder.',
    },
    { key: 'href', label: 'Link when clicked', kind: 'text' },
    { key: 'label', label: 'Placeholder caption', kind: 'text' },
  ],
  sessions: [
    { key: 'heading', label: 'Heading', kind: 'text' },
    { key: 'body', label: 'Body text', kind: 'textarea' },
  ],
  about: [
    { key: 'heading', label: 'Heading', kind: 'text' },
    { key: 'body', label: 'Body text', kind: 'textarea' },
    {
      key: 'imageSrc',
      label: 'Photo URL',
      kind: 'text',
      helper: 'Paste an image URL. Leave blank to show a placeholder.',
    },
    { key: 'buttonLabel', label: 'Button text', kind: 'text' },
    { key: 'buttonHref', label: 'Button link', kind: 'text' },
  ],
};

function SortableBlockRow({
  block,
  isSelected,
  onSelect,
  onDelete,
}: {
  block: Block;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: block.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className={`admin-block-row${isSelected ? ' selected' : ''}`}>
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="admin-block-drag-handle"
        aria-label="Drag to reorder"
      >
        <GripVertical size={16} />
      </button>
      <button type="button" onClick={onSelect} className="admin-block-row-label">
        {BLOCK_LABELS[block.type]}
      </button>
      <button
        type="button"
        onClick={onDelete}
        className="admin-block-delete"
        aria-label={`Delete ${BLOCK_LABELS[block.type]} block`}
      >
        <Trash2 size={15} />
      </button>
    </div>
  );
}

export function PageEditor({
  pageId,
  slug,
  title,
  initialBlocks,
  packages,
}: {
  pageId: string;
  slug: string;
  title: string;
  initialBlocks: Block[];
  packages: SessionPackage[];
}) {
  const [blocks, setBlocks] = useState<Block[]>(initialBlocks);
  const [selectedId, setSelectedId] = useState<string | null>(initialBlocks[0]?.id ?? null);
  const [isPickerOpen, setPickerOpen] = useState(false);
  const [isSaving, startSaving] = useTransition();
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const selectedBlock = blocks.find((b) => b.id === selectedId) ?? null;
  const selectedAppearance: SectionAppearance | null =
    selectedBlock && selectedBlock.type !== 'featured_photo' ? selectedBlock.props : null;

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setBlocks((current) => {
      const oldIndex = current.findIndex((b) => b.id === active.id);
      const newIndex = current.findIndex((b) => b.id === over.id);
      return arrayMove(current, oldIndex, newIndex);
    });
  }

  function handleAddBlock(type: BlockType) {
    const block = { id: newBlockId(), type, props: defaultPropsFor(type) } as Block;
    setBlocks((current) => [...current, block]);
    setSelectedId(block.id);
    setPickerOpen(false);
  }

  function handleDeleteBlock(id: string) {
    setBlocks((current) => current.filter((b) => b.id !== id));
    setSelectedId((current) => (current === id ? null : current));
  }

  function updateSelectedProp(key: string, value: string) {
    if (!selectedBlock) return;
    const id = selectedBlock.id;
    setBlocks((current) =>
      current.map((b) => (b.id === id ? ({ ...b, props: { ...b.props, [key]: value } } as Block) : b))
    );
  }

  function updatePortfolioItem(index: number, key: 'imageSrc' | 'aspectRatio', value: string) {
    if (!selectedBlock || selectedBlock.type !== 'portfolio_grid') return;
    const id = selectedBlock.id;
    const items = selectedBlock.props.items.map((item, i) =>
      i === index ? { ...item, [key]: value } : item
    );
    setBlocks((current) =>
      current.map((b) => {
        if (b.id !== id || b.type !== 'portfolio_grid') return b;
        return { ...b, props: { ...b.props, items } };
      })
    );
  }

  function addPortfolioItem() {
    if (!selectedBlock || selectedBlock.type !== 'portfolio_grid') return;
    const id = selectedBlock.id;
    const items = [...selectedBlock.props.items, { imageSrc: '', aspectRatio: '4 / 5' }];
    setBlocks((current) =>
      current.map((b) => {
        if (b.id !== id || b.type !== 'portfolio_grid') return b;
        return { ...b, props: { ...b.props, items } };
      })
    );
  }

  function removePortfolioItem(index: number) {
    if (!selectedBlock || selectedBlock.type !== 'portfolio_grid') return;
    const id = selectedBlock.id;
    const items = selectedBlock.props.items.filter((_, i) => i !== index);
    setBlocks((current) =>
      current.map((b) => {
        if (b.id !== id || b.type !== 'portfolio_grid') return b;
        return { ...b, props: { ...b.props, items } };
      })
    );
  }

  function handleSave() {
    setSaveMessage(null);
    startSaving(async () => {
      const result = await updatePageBlocks(pageId, slug, blocks);
      setSaveMessage(result.error ? `Couldn't save: ${result.error}` : 'Saved');
    });
  }

  return (
    <div className="editor-shell">
      {/* Left: layers (reorder/select/delete) + add-element picker */}
      <aside className="editor-sidebar-left">
        <div className="editor-sidebar-left-header">
          <Link href="/admin/pages" className="editor-exit-link">
            ← Exit editor
          </Link>
          <h2 style={{ fontSize: 16, margin: 0 }}>{title}</h2>
          <p style={{ fontSize: 12, color: 'var(--warm-gray)', margin: '2px 0 0' }}>
            /{slug === 'home' ? '' : slug}
          </p>
        </div>

        <div className="editor-sidebar-section" style={{ flex: 1 }}>
          <p className="editor-sidebar-heading">Sections</p>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
              {blocks.map((block) => (
                <SortableBlockRow
                  key={block.id}
                  block={block}
                  isSelected={block.id === selectedId}
                  onSelect={() => setSelectedId(block.id)}
                  onDelete={() => handleDeleteBlock(block.id)}
                />
              ))}
            </SortableContext>
          </DndContext>

          <div style={{ position: 'relative', marginTop: 12 }}>
            <button type="button" onClick={() => setPickerOpen((v) => !v)} className="admin-add-block-button">
              <Plus size={15} /> Add element
            </button>
            {isPickerOpen && (
              <div className="admin-block-picker">
                {BLOCK_ORDER.map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => handleAddBlock(type)}
                    className="admin-block-picker-item"
                  >
                    {BLOCK_LABELS[type]}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Center: live, full-scale canvas. Clicks select a block instead
          of following its links/buttons (captured before they fire). */}
      <main className="editor-canvas">
        <div className="editor-canvas-topbar">
          <a
            href={`/${slug === 'home' ? '' : slug}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontSize: 13, color: 'var(--warm-gray)' }}
          >
            View live page ↗
          </a>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            {saveMessage && <span style={{ fontSize: 13, color: 'var(--warm-gray)' }}>{saveMessage}</span>}
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="btn-primary"
              style={{ border: 'none', cursor: 'pointer' }}
            >
              {isSaving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </div>

        <div className="editor-canvas-scroll">
          {blocks.length === 0 && (
            <p style={{ padding: 80, textAlign: 'center', color: 'var(--warm-gray)' }}>
              This page is empty — add a section from the sidebar to get started.
            </p>
          )}
          {blocks.map((block) => (
            <div
              key={block.id}
              className={`editor-canvas-block${block.id === selectedId ? ' editor-canvas-block-selected' : ''}`}
              onClickCapture={(e) => {
                e.preventDefault();
                setSelectedId(block.id);
              }}
            >
              <span className="editor-canvas-block-label">{BLOCK_LABELS[block.type]}</span>
              {renderBlock(block, packages)}
            </div>
          ))}
        </div>
      </main>

      {/* Right: fields for whatever's selected — content fields per
          block type, plus shared background/text-theme controls for
          every block except featured_photo (which has no text). */}
      <aside className="editor-sidebar-right">
        {!selectedBlock && <p style={{ color: 'var(--warm-gray)' }}>Select a section to edit it.</p>}

        {selectedBlock && selectedBlock.type !== 'portfolio_grid' && (
          <div>
            <h3 style={{ marginBottom: 16 }}>{BLOCK_LABELS[selectedBlock.type]}</h3>
            {FIELD_SCHEMAS[selectedBlock.type].map((field) => {
              const value = (selectedBlock.props as Record<string, string>)[field.key] ?? '';
              return (
                <div key={field.key} style={{ marginBottom: 16 }}>
                  <label htmlFor={field.key} style={{ display: 'block', fontSize: 13, marginBottom: 6 }}>
                    {field.label}
                  </label>
                  {field.kind === 'textarea' ? (
                    <textarea
                      id={field.key}
                      value={value}
                      onChange={(e) => updateSelectedProp(field.key, e.target.value)}
                      rows={4}
                      style={{ width: '100%', padding: 8, fontFamily: 'inherit' }}
                    />
                  ) : (
                    <input
                      id={field.key}
                      type="text"
                      value={value}
                      onChange={(e) => updateSelectedProp(field.key, e.target.value)}
                      style={{ width: '100%', padding: 8 }}
                    />
                  )}
                  {field.helper && (
                    <p style={{ fontSize: 12, color: 'var(--warm-gray)', marginTop: 4 }}>{field.helper}</p>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {selectedBlock && selectedBlock.type === 'portfolio_grid' && (
          <div>
            <h3 style={{ marginBottom: 16 }}>{BLOCK_LABELS.portfolio_grid}</h3>
            <div style={{ marginBottom: 16 }}>
              <label htmlFor="pg-heading" style={{ display: 'block', fontSize: 13, marginBottom: 6 }}>
                Heading
              </label>
              <input
                id="pg-heading"
                type="text"
                value={selectedBlock.props.heading}
                onChange={(e) => updateSelectedProp('heading', e.target.value)}
                style={{ width: '100%', padding: 8 }}
              />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label htmlFor="pg-body" style={{ display: 'block', fontSize: 13, marginBottom: 6 }}>
                Body text
              </label>
              <textarea
                id="pg-body"
                value={selectedBlock.props.body}
                onChange={(e) => updateSelectedProp('body', e.target.value)}
                rows={3}
                style={{ width: '100%', padding: 8, fontFamily: 'inherit' }}
              />
            </div>
            <p style={{ fontSize: 13, marginBottom: 10 }}>Photos</p>
            {selectedBlock.props.items.map((item, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 10 }}>
                <input
                  type="text"
                  placeholder="Image URL"
                  value={item.imageSrc}
                  onChange={(e) => updatePortfolioItem(i, 'imageSrc', e.target.value)}
                  style={{ flex: 1, padding: 8 }}
                />
                <select
                  value={item.aspectRatio}
                  onChange={(e) => updatePortfolioItem(i, 'aspectRatio', e.target.value)}
                  style={{ padding: 8 }}
                >
                  <option value="3 / 4">Portrait</option>
                  <option value="1 / 1">Square</option>
                  <option value="4 / 5">Tall</option>
                </select>
                <button
                  type="button"
                  onClick={() => removePortfolioItem(i)}
                  aria-label="Remove photo"
                  style={{ padding: 8 }}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
            <button type="button" onClick={addPortfolioItem} className="admin-add-block-button">
              <Plus size={15} /> Add photo
            </button>
          </div>
        )}

        {selectedAppearance && (
          <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid rgba(64,56,46,0.12)' }}>
            <p style={{ fontSize: 13, fontWeight: 500, marginBottom: 12 }}>Background &amp; text</p>

            <div style={{ marginBottom: 14 }}>
              <label htmlFor="appearance-bg" style={{ display: 'block', fontSize: 13, marginBottom: 6 }}>
                Background
              </label>
              <select
                id="appearance-bg"
                value={selectedAppearance.background}
                onChange={(e) => updateSelectedProp('background', e.target.value)}
                style={{ width: '100%', padding: 8 }}
              >
                <option value="none">None (page background)</option>
                <option value="color">Color</option>
                <option value="image">Image</option>
              </select>
            </div>

            {selectedAppearance.background === 'color' && (
              <div style={{ marginBottom: 14 }}>
                <label htmlFor="appearance-bg-color" style={{ display: 'block', fontSize: 13, marginBottom: 6 }}>
                  Background color
                </label>
                <input
                  id="appearance-bg-color"
                  type="color"
                  value={selectedAppearance.backgroundColor}
                  onChange={(e) => updateSelectedProp('backgroundColor', e.target.value)}
                  style={{ width: 60, height: 36, padding: 0, border: 'none', background: 'none' }}
                />
              </div>
            )}

            {selectedAppearance.background === 'image' && (
              <div style={{ marginBottom: 14 }}>
                <label htmlFor="appearance-bg-image" style={{ display: 'block', fontSize: 13, marginBottom: 6 }}>
                  Background image URL
                </label>
                <input
                  id="appearance-bg-image"
                  type="text"
                  value={selectedAppearance.backgroundImage}
                  onChange={(e) => updateSelectedProp('backgroundImage', e.target.value)}
                  style={{ width: '100%', padding: 8 }}
                />
              </div>
            )}

            <div>
              <label style={{ display: 'block', fontSize: 13, marginBottom: 6 }}>Text color</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  onClick={() => updateSelectedProp('textTheme', 'dark')}
                  className={`admin-theme-toggle${selectedAppearance.textTheme === 'dark' ? ' active' : ''}`}
                >
                  Dark text
                </button>
                <button
                  type="button"
                  onClick={() => updateSelectedProp('textTheme', 'light')}
                  className={`admin-theme-toggle${selectedAppearance.textTheme === 'light' ? ' active' : ''}`}
                >
                  Light text
                </button>
              </div>
              <p style={{ fontSize: 12, color: 'var(--warm-gray)', marginTop: 6 }}>
                Switch to light text if this section has a dark background or photo.
              </p>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
