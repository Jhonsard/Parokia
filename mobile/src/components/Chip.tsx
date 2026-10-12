/** Filter chip used by the agenda and the request queue. */

import React from 'react';
import { Pressable } from 'react-native';

import { colors, radii, spacing } from '../theme/tokens';
import { useLiturgicalTheme } from '../theme/LiturgicalThemeProvider';
import { AppText } from './AppText';

export interface ChipProps {
  label: string;
  active?: boolean;
  onPress: () => void;
}

export function Chip({ label, active = false, onPress }: ChipProps) {
  const { accent } = useLiturgicalTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => ({
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        borderRadius: radii.pill,
        borderWidth: 1,
        borderColor: active ? accent : colors.border,
        backgroundColor: active ? accent : colors.surface,
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <AppText variant="label" color={active ? colors.onAccent : colors.inkMuted}>
        {label}
      </AppText>
    </Pressable>
  );
}
