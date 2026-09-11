/**
 * Shop catalogue.
 *
 * The six skin images were extracted from `assets/shops skin.png` (a 2x3 sprite
 * sheet) by alpha-bounds detection and tight-trimmed, one PNG per skin. Names
 * and prices are transcribed from the Shop screen in Figma; the two skins below
 * the fold there (winter-scarf, galaxy) keep the grid's established price tiers.
 */
import type { ShopCategory, ShopItem } from '@/types';

export const SKIN_IMAGES = {
  'forest-leaf': require('../../assets/skins/forest-leaf.png'),
  'pastel-green': require('../../assets/skins/pastel-green.png'),
  streetwear: require('../../assets/skins/streetwear.png'),
  sunhat: require('../../assets/skins/sunhat.png'),
  'winter-scarf': require('../../assets/skins/winter-scarf.png'),
  galaxy: require('../../assets/skins/galaxy.png'),
} as const;

export type SkinId = keyof typeof SKIN_IMAGES;

/** Pip's default, unskinned body — the hero on the Pip tab. */
export const PIP_BASE = require('../../assets/pip.png');

export const SHOP_CATEGORIES: { value: ShopCategory; label: string }[] = [
  { value: 'skins', label: 'Skins' },
  { value: 'hats', label: 'Hats' },
  { value: 'habitat', label: 'Habitat' },
  { value: 'auras', label: 'Auras' },
];

export const SHOP_ITEMS: ShopItem[] = [
  { id: 'forest-leaf', name: 'Forest Leaf Skin', price: 100, category: 'skins', image: SKIN_IMAGES['forest-leaf'] },
  { id: 'pastel-green', name: 'Pastel Green Skin', price: 150, category: 'skins', image: SKIN_IMAGES['pastel-green'] },
  { id: 'streetwear', name: 'Streetwear Skin', price: 200, category: 'skins', image: SKIN_IMAGES.streetwear },
  { id: 'sunhat', name: 'Sunhat Skin', price: 200, category: 'skins', image: SKIN_IMAGES.sunhat },
  { id: 'winter-scarf', name: 'Winter Scarf Skin', price: 250, category: 'skins', image: SKIN_IMAGES['winter-scarf'] },
  { id: 'galaxy', name: 'Galaxy Skin', price: 300, category: 'skins', image: SKIN_IMAGES.galaxy },
];
