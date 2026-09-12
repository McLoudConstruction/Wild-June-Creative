import type { Block } from '@/lib/site/blocks';
import { Hero } from './Hero';
import { FeaturedPhoto } from './FeaturedPhoto';
import { Sessions, type SessionPackage } from './Sessions';
import { PortfolioGrid } from './PortfolioGrid';
import { About } from './About';
import { PhotoText } from './PhotoText';

// Split out from BlockRenderer so the admin editor's canvas can wrap
// each block in its own selectable container instead of getting back
// one flat fragment.
export function renderBlock(block: Block, packages: SessionPackage[]) {
  switch (block.type) {
    case 'hero':
      return <Hero key={block.id} {...block.props} />;
    case 'featured_photo':
      return <FeaturedPhoto key={block.id} {...block.props} />;
    case 'sessions':
      return <Sessions key={block.id} {...block.props} packages={packages} />;
    case 'portfolio_grid':
      return <PortfolioGrid key={block.id} {...block.props} />;
    case 'about':
      return <About key={block.id} {...block.props} />;
    case 'photo_text':
      return <PhotoText key={block.id} {...block.props} />;
    default:
      return null;
  }
}

// Renders an ordered list of blocks in place — used by the public
// page (app/page.tsx).
export function BlockRenderer({
  blocks,
  packages,
}: {
  blocks: Block[];
  packages: SessionPackage[];
}) {
  return (
    <>
      {blocks.map((block) => renderBlock(block, packages))}
    </>
  );
}
