'use client';

import { useState, useTransition } from 'react';
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
} from '@/lib/site/blocks';
import { BlockRenderer } from '@/components/site/blocks/BlockRenderer';
import type { SessionPackage } from '@/components/site/blocks/Sessions';

type FieldDescriptor = {
  key: string;
  label: string;
  kind: 'text' | 'textarea';
  helper?: string;
};

// Simple scalar-field blocks are rendered from this schema. The one
// block with a nested list (portfolio_grid) gets its own hand-written
// section below rather than trying to force it into this shape.
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
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: 16,
          marginBottom: 24,
        }}
      >
        <div>
          <h1 style={{ marginBottom: 4 }}>{title}</h1>
          <p style={{ color: 'var(--warm-gray)', fontSize: 14 }}>/{slug === 'home' ? '' : slug}</p>
        </div>
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

      <div className="admin-page-editor-grid">
        <div className="admin-block-list">
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
              <Plus size={15} /> Add block
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

        <div className="admin-block-fields">
          {!selectedBlock && <p style={{ color: 'var(--warm-gray)' }}>Select a block on the left to edit it.</p>}

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
        </div>

        <div className="admin-block-preview">
          <p className="admin-sidebar-heading" style={{ marginBottom: 12 }}>
            Preview
          </p>
          <div className="admin-preview-frame">
            <BlockRenderer blocks={blocks} packages={packages} />
          </div>
        </div>
      </div>
    </div>
  );
}
