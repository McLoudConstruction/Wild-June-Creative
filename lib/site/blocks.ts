// Shared type definitions for the page-builder block system. A page
// is just an ordered array of these blocks, stored as jsonb on
// public.pages. To add a new block type: add its props type here,
// register it in BlockPropsMap / BLOCK_LABELS / BLOCK_ORDER /
// defaultPropsFor below, add a renderer component in
// components/site/blocks/, and wire it into BlockRenderer.tsx.

// Shared by every block that renders its own heading/body text
// (everything except featured_photo). Lets Isabelle put a color or
// image behind a section and, since that can turn a dark-ink-on-cream
// section into something dark-on-dark, flip the text itself to a
// light palette to match — the "light/dark toggle" is textTheme.
export type SectionAppearance = {
  background: 'none' | 'color' | 'image';
  backgroundColor: string;
  backgroundImage: string;
  textTheme: 'dark' | 'light';
};

const DEFAULT_APPEARANCE: SectionAppearance = {
  background: 'none',
  backgroundColor: '#f2f2f2',
  backgroundImage: '',
  textTheme: 'dark',
};

export type HeroBlockProps = SectionAppearance & {
  heading: string;
  script: string;
  body: string;
  primaryLabel: string;
  primaryHref: string;
  secondaryLabel: string;
  secondaryHref: string;
};

export type FeaturedPhotoBlockProps = {
  imageSrc: string;
  href: string;
  aspectRatio: string;
  label: string;
};

export type SessionsBlockProps = SectionAppearance & {
  heading: string;
  body: string;
};

export type PortfolioItem = {
  imageSrc: string;
  aspectRatio: string;
};

export type PortfolioGridBlockProps = SectionAppearance & {
  heading: string;
  body: string;
  items: PortfolioItem[];
};

export type AboutBlockProps = SectionAppearance & {
  heading: string;
  body: string;
  imageSrc: string;
  buttonLabel: string;
  buttonHref: string;
};

// A generic photo-plus-text section — unlike About (which is fixed to
// "about Isabelle" with a CTA button), this is meant for one-off
// content: a team member, a pet, a single testimonial, etc. imagePosition
// is the "flip it" toggle rather than two separate block types.
export type PhotoTextBlockProps = SectionAppearance & {
  eyebrow: string;
  heading: string;
  body: string;
  imageSrc: string;
  imagePosition: 'left' | 'right';
  buttonLabel: string;
  buttonHref: string;
};

export type BlockPropsMap = {
  hero: HeroBlockProps;
  featured_photo: FeaturedPhotoBlockProps;
  sessions: SessionsBlockProps;
  portfolio_grid: PortfolioGridBlockProps;
  about: AboutBlockProps;
  photo_text: PhotoTextBlockProps;
};

export type BlockType = keyof BlockPropsMap;

export type Block = {
  [K in BlockType]: { id: string; type: K; props: BlockPropsMap[K] };
}[BlockType];

export const BLOCK_LABELS: Record<BlockType, string> = {
  hero: 'Hero',
  featured_photo: 'Featured photo',
  sessions: 'Sessions',
  portfolio_grid: 'Portfolio grid',
  about: 'About',
  photo_text: 'Photo + text',
};

// Order blocks are offered in the "Add block" picker.
export const BLOCK_ORDER: BlockType[] = [
  'hero',
  'featured_photo',
  'sessions',
  'portfolio_grid',
  'about',
  'photo_text',
];

const BLOCK_DEFAULTS: { [K in BlockType]: BlockPropsMap[K] } = {
  hero: {
    ...DEFAULT_APPEARANCE,
    heading: 'A new heading',
    script: 'a little script line',
    body: 'Add a sentence or two describing this section.',
    primaryLabel: 'Book a session',
    primaryHref: '/book',
    secondaryLabel: 'Learn more',
    secondaryHref: '#',
  },
  featured_photo: {
    imageSrc: '',
    href: '/book',
    aspectRatio: '21 / 9',
    label: 'Add a photo here',
  },
  sessions: {
    ...DEFAULT_APPEARANCE,
    background: 'color',
    backgroundColor: '#f2f2f2',
    heading: 'Sessions',
    body: 'A few starting points.',
  },
  portfolio_grid: {
    ...DEFAULT_APPEARANCE,
    heading: 'A few favorites',
    body: 'A small preview.',
    items: [
      { imageSrc: '', aspectRatio: '3 / 4' },
      { imageSrc: '', aspectRatio: '1 / 1' },
      { imageSrc: '', aspectRatio: '4 / 5' },
    ],
  },
  about: {
    ...DEFAULT_APPEARANCE,
    heading: "Hi, I'm Isabelle",
    body: 'Add a bit about yourself here.',
    imageSrc: '',
    buttonLabel: "Let's work together",
    buttonHref: '/book',
  },
  photo_text: {
    ...DEFAULT_APPEARANCE,
    eyebrow: 'Label',
    heading: 'A new heading',
    body: 'Add a sentence or two here.',
    imageSrc: '',
    imagePosition: 'left',
    buttonLabel: '',
    buttonHref: '',
  },
};

// Sensible starting content for a newly-added block, before Isabelle
// customizes it. Returns a fresh copy so callers can mutate it freely.
export function defaultPropsFor<T extends BlockType>(type: T): BlockPropsMap[T] {
  return JSON.parse(JSON.stringify(BLOCK_DEFAULTS[type]));
}

export function newBlockId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `block_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}
