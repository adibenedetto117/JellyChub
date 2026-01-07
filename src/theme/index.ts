export { colors } from './colors';
export type { ColorTheme } from './colors';

export { typography, textStyles } from './typography';
export type { Typography, TextStyles } from './typography';

export { spacing, borderRadius, screenPadding, cardSizes } from './spacing';
export type { Spacing, BorderRadius } from './spacing';

// Combined theme export
export const theme = {
  colors: require('./colors').colors,
  typography: require('./typography').typography,
  textStyles: require('./typography').textStyles,
  spacing: require('./spacing').spacing,
  borderRadius: require('./spacing').borderRadius,
  screenPadding: require('./spacing').screenPadding,
  cardSizes: require('./spacing').cardSizes,
} as const;

export type Theme = typeof theme;
