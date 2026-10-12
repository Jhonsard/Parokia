/** White editorial surface with an optional liturgical accent rail. */

import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radii, shadows, spacing } from '../theme/tokens';

export interface CardProps {
  children: React.ReactNode;
  /** Colour of the 3px rail drawn on the left edge. */
  accentColor?: string;
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
}

export function Card({ children, accentColor, style, padded = true }: CardProps) {
  return (
    <View
      style={[
        {
          backgroundColor: colors.surface,
          borderRadius: radii.lg,
          borderWidth: 1,
          borderColor: colors.border,
          overflow: 'hidden',
          flexDirection: 'row',
        },
        shadows.card,
        style,
      ]}
    >
      {accentColor !== undefined && (
        <View style={{ width: 4, backgroundColor: accentColor }} />
      )}
      <View style={padded ? { flex: 1, padding: spacing.lg } : { flex: 1 }}>{children}</View>
    </View>
  );
}
