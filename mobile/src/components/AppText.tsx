/**
 * Typography primitive.
 *
 * Every screen renders text through this component so the Manrope/Fraunces
 * pairing stays consistent and degrades to the platform font when the bundled
 * faces are unavailable.
 */

import React from 'react';
import { Text, type TextProps, type TextStyle } from 'react-native';

import { useFontFamilies, type FontFamilies } from '../theme/FontsProvider';
import { colors } from '../theme/tokens';

export type TextVariant =
  | 'display'
  | 'title'
  | 'heading'
  | 'subheading'
  | 'body'
  | 'bodyStrong'
  | 'label'
  | 'caption'
  | 'eyebrow';

const VARIANT_STYLES: Record<TextVariant, TextStyle> = {
  display: { fontSize: 30, lineHeight: 36, fontWeight: '700', letterSpacing: -0.4 },
  title: { fontSize: 23, lineHeight: 30, fontWeight: '700', letterSpacing: -0.2 },
  heading: { fontSize: 18, lineHeight: 24, fontWeight: '700' },
  subheading: { fontSize: 15.5, lineHeight: 22, fontWeight: '600' },
  body: { fontSize: 15, lineHeight: 22, fontWeight: '400' },
  bodyStrong: { fontSize: 15, lineHeight: 22, fontWeight: '600' },
  label: { fontSize: 13.5, lineHeight: 18, fontWeight: '600' },
  caption: { fontSize: 12.5, lineHeight: 17, fontWeight: '400' },
  eyebrow: { fontSize: 11, lineHeight: 15, fontWeight: '700', letterSpacing: 1.1, textTransform: 'uppercase' },
};

const VARIANT_FAMILY: Record<TextVariant, keyof FontFamilies> = {
  display: 'display',
  title: 'displayStrong',
  heading: 'bodyBold',
  subheading: 'bodySemibold',
  body: 'body',
  bodyStrong: 'bodySemibold',
  label: 'bodySemibold',
  caption: 'body',
  eyebrow: 'bodyBold',
};

export interface AppTextProps extends TextProps {
  variant?: TextVariant;
  color?: string;
}

export function AppText({
  variant = 'body',
  color = colors.inkSoft,
  style,
  children,
  ...rest
}: AppTextProps) {
  const families = useFontFamilies();
  const fontStyle: TextStyle =
    families === null ? {} : { fontFamily: families[VARIANT_FAMILY[variant]] };

  return (
    <Text {...rest} style={[VARIANT_STYLES[variant], fontStyle, { color }, style]}>
      {children}
    </Text>
  );
}
