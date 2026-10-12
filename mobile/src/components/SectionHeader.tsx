/** Editorial section title: small accent eyebrow above a display heading. */

import React from 'react';
import { View } from 'react-native';

import { colors, spacing } from '../theme/tokens';
import { useLiturgicalTheme } from '../theme/LiturgicalThemeProvider';
import { AppText } from './AppText';

export interface SectionHeaderProps {
  eyebrow?: string;
  title: string;
  caption?: string;
}

export function SectionHeader({ eyebrow, title, caption }: SectionHeaderProps) {
  const { accent } = useLiturgicalTheme();

  return (
    <View style={{ gap: spacing.xs }}>
      {eyebrow !== undefined && (
        <AppText variant="eyebrow" color={accent}>
          {eyebrow}
        </AppText>
      )}
      <AppText variant="heading" color={colors.ink}>
        {title}
      </AppText>
      {caption !== undefined && (
        <AppText variant="caption" color={colors.inkMuted}>
          {caption}
        </AppText>
      )}
    </View>
  );
}
