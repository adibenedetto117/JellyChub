import { useState, useEffect, useMemo } from 'react';
import { Dimensions, ScaledSize, Platform } from 'react-native';

export type DeviceType = 'phone' | 'tablet' | 'tv';
export type Orientation = 'portrait' | 'landscape';

export interface ResponsiveBreakpoints {
  isPhone: boolean;
  isTablet: boolean;
  isTV: boolean;
  isLandscape: boolean;
  isPortrait: boolean;
  deviceType: DeviceType;
  orientation: Orientation;
  width: number;
  height: number;
  // Grid columns for different content types
  gridColumns: number;
  posterColumns: number;
  squareColumns: number;
  // Sizing
  spacing: number;
  fontSize: {
    xs: number;
    sm: number;
    base: number;
    lg: number;
    xl: number;
    '2xl': number;
    '3xl': number;
  };
  // Component dimensions
  posterWidth: number;
  posterHeight: number;
  squareSize: number;
  horizontalItemWidth: number;
  horizontalItemHeight: number;
  // Layout
  contentMaxWidth: number;
  sidebarWidth: number;
  headerHeight: number;
}

const PHONE_MAX_WIDTH = 600;
const TABLET_MAX_WIDTH = 1024;

function getDeviceType(width: number, height: number): DeviceType {
  if (Platform.isTV) return 'tv';
  const minDimension = Math.min(width, height);
  if (minDimension >= PHONE_MAX_WIDTH) return 'tablet';
  return 'phone';
}

function calculateBreakpoints(width: number, height: number): ResponsiveBreakpoints {
  const deviceType = getDeviceType(width, height);
  const isLandscape = width > height;
  const isPortrait = !isLandscape;
  const isPhone = deviceType === 'phone';
  const isTablet = deviceType === 'tablet';
  const isTV = deviceType === 'tv';

  // Calculate grid columns based on width
  const gridPadding = isPhone ? 16 : isTablet ? 24 : 48;
  const gridGap = isPhone ? 8 : isTablet ? 12 : 16;
  const minPosterWidth = isPhone ? 100 : isTablet ? 140 : 180;
  const minSquareWidth = isPhone ? 100 : isTablet ? 140 : 180;

  const availableWidth = width - (gridPadding * 2);

  // Calculate optimal columns
  const posterColumns = Math.max(2, Math.floor((availableWidth + gridGap) / (minPosterWidth + gridGap)));
  const squareColumns = Math.max(2, Math.floor((availableWidth + gridGap) / (minSquareWidth + gridGap)));
  const gridColumns = posterColumns;

  // Calculate actual sizes based on columns
  const posterWidth = (availableWidth - (gridGap * (posterColumns - 1))) / posterColumns;
  const posterHeight = posterWidth * 1.5;
  const squareSize = (availableWidth - (gridGap * (squareColumns - 1))) / squareColumns;

  // Horizontal scroll item sizes
  const horizontalItemWidth = isPhone ? 120 : isTablet ? 150 : 180;
  const horizontalItemHeight = horizontalItemWidth * 1.5;

  // Spacing scale
  const spacingBase = isPhone ? 4 : isTablet ? 6 : 8;

  // Font sizes
  const fontScale = isPhone ? 1 : isTablet ? 1.1 : 1.25;
  const fontSize = {
    xs: Math.round(10 * fontScale),
    sm: Math.round(12 * fontScale),
    base: Math.round(14 * fontScale),
    lg: Math.round(16 * fontScale),
    xl: Math.round(18 * fontScale),
    '2xl': Math.round(22 * fontScale),
    '3xl': Math.round(28 * fontScale),
  };

  // Layout dimensions
  const contentMaxWidth = isTV ? 1600 : isTablet ? 1200 : width;
  const sidebarWidth = isTablet && isLandscape ? 280 : 0;
  const headerHeight = isPhone ? 56 : isTablet ? 64 : 80;

  return {
    isPhone,
    isTablet,
    isTV,
    isLandscape,
    isPortrait,
    deviceType,
    orientation: isLandscape ? 'landscape' : 'portrait',
    width,
    height,
    gridColumns,
    posterColumns,
    squareColumns,
    spacing: spacingBase,
    fontSize,
    posterWidth,
    posterHeight,
    squareSize,
    horizontalItemWidth,
    horizontalItemHeight,
    contentMaxWidth,
    sidebarWidth,
    headerHeight,
  };
}

export function useResponsive(): ResponsiveBreakpoints {
  const [dimensions, setDimensions] = useState(() => Dimensions.get('window'));

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setDimensions(window);
    });

    return () => subscription.remove();
  }, []);

  return useMemo(
    () => calculateBreakpoints(dimensions.width, dimensions.height),
    [dimensions.width, dimensions.height]
  );
}

// Static helper for non-hook contexts
export function getResponsiveBreakpoints(): ResponsiveBreakpoints {
  const { width, height } = Dimensions.get('window');
  return calculateBreakpoints(width, height);
}

// Utility to get number of columns for a given item width
export function getColumnsForWidth(
  containerWidth: number,
  minItemWidth: number,
  gap: number = 8,
  padding: number = 16
): number {
  const availableWidth = containerWidth - (padding * 2);
  return Math.max(1, Math.floor((availableWidth + gap) / (minItemWidth + gap)));
}

// Responsive value selector
export function responsiveValue<T>(
  breakpoints: ResponsiveBreakpoints,
  values: { phone?: T; tablet?: T; tv?: T; default: T }
): T {
  if (breakpoints.isTV && values.tv !== undefined) return values.tv;
  if (breakpoints.isTablet && values.tablet !== undefined) return values.tablet;
  if (breakpoints.isPhone && values.phone !== undefined) return values.phone;
  return values.default;
}
