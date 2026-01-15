export const baseSizes = {
  poster: {
    small: { width: 100, height: 150 },
    medium: { width: 130, height: 195 },
    large: { width: 160, height: 240 },
  },
  square: {
    small: { width: 100, height: 100 },
    medium: { width: 130, height: 130 },
    large: { width: 160, height: 160 },
  },
  backdrop: {
    small: { width: 180, height: 101 },
    medium: { width: 240, height: 135 },
    large: { width: 320, height: 180 },
  },
};

export type CardVariant = 'poster' | 'square' | 'backdrop';
export type CardSize = 'small' | 'medium' | 'large';

export function getScaledSizes(isTablet: boolean, isTV: boolean) {
  const scale = isTV ? 1.4 : isTablet ? 1.2 : 1;
  const result: typeof baseSizes = { poster: {}, square: {}, backdrop: {} } as any;

  for (const variant of Object.keys(baseSizes) as Array<keyof typeof baseSizes>) {
    for (const size of Object.keys(baseSizes[variant]) as Array<CardSize>) {
      result[variant][size] = {
        width: Math.round(baseSizes[variant][size].width * scale),
        height: Math.round(baseSizes[variant][size].height * scale),
      };
    }
  }
  return result;
}

export const CARD_MARGIN = 12;

export const BASE_CARD_WIDTHS = {
  poster: 130,
  square: 130,
  backdrop: 240,
};
