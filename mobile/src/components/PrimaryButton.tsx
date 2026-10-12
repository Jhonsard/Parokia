/** Action button: solid liturgical accent, outline, ghost or danger. */

import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  type StyleProp,
  View,
  type ViewStyle,
} from 'react-native';

import { colors, radii, spacing } from '../theme/tokens';
import { useLiturgicalTheme } from '../theme/LiturgicalThemeProvider';
import { AppText } from './AppText';

export type ButtonVariant = 'primary' | 'outline' | 'ghost' | 'danger';

export interface PrimaryButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function PrimaryButton({
  label,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  style,
}: PrimaryButtonProps) {
  const { accent } = useLiturgicalTheme();
  const isInactive = disabled || loading;

  const background =
    variant === 'primary' ? accent : variant === 'danger' ? colors.danger : 'transparent';
  const borderColor = variant === 'outline' ? colors.borderStrong : background;
  const textColor =
    variant === 'primary' || variant === 'danger'
      ? colors.onAccent
      : variant === 'outline'
        ? colors.inkSoft
        : accent;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isInactive, busy: loading }}
      disabled={isInactive}
      onPress={onPress}
      style={({ pressed }) => [
        {
          backgroundColor: background,
          borderColor,
          borderWidth: variant === 'outline' ? 1 : 0,
          borderRadius: radii.md,
          paddingVertical: spacing.md,
          paddingHorizontal: spacing.lg,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: isInactive ? 0.55 : pressed ? 0.85 : 1,
        },
        style,
      ]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        {loading && <ActivityIndicator size="small" color={textColor} />}
        <AppText variant="label" color={textColor}>
          {label}
        </AppText>
      </View>
    </Pressable>
  );
}
