'use client';

/**
 * PocketVeto — kind glyphs.
 *
 * One precise line icon per kind instead of emoji: emoji render differently
 * on every OS, break the visual rhythm, and read as decoration. These are
 * instruments, not stickers.
 */

import {
  Gift,
  Globe,
  Hourglass,
  IdCard,
  Pin,
  Repeat,
  ShieldCheck,
  Ticket,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import type { ItemKind } from '@/lib/pocketveto/types';

export const KIND_ICON: Record<ItemKind, LucideIcon> = {
  trial: Hourglass,
  subscription: Repeat,
  membership: Ticket,
  warranty: ShieldCheck,
  giftcard: Gift,
  promo: Zap,
  document: IdCard,
  domain: Globe,
  custom: Pin,
};

export function KindGlyph({
  kind,
  className = 'h-4 w-4',
}: {
  kind: ItemKind;
  className?: string;
}) {
  const Icon = KIND_ICON[kind];
  return <Icon className={className} strokeWidth={1.75} aria-hidden />;
}
