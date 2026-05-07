import type { Rarity } from '../types';

export const RARITY_COLORS: Partial<Record<Rarity, string>> = {
  gray: 'rgb(154,154,154)',
  green: 'rgb(176,197,83)',
  blue: 'rgb(98,199,247)',
  purple: 'rgb(142,93,243)',
  gold: 'rgb(252,182,49)',
  orange: 'rgb(190,14,34)',
};

export const getRarityColor = (rarity?: Rarity) => rarity ? RARITY_COLORS[rarity] : undefined;
