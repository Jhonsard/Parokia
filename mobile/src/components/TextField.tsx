/** Labelled input used by the login and mass-scheduling forms. */

import React from 'react';
import {
  StyleSheet,
  TextInput,
  type TextInputProps,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { colors, radii, spacing } from '../theme/tokens';
import { useFontFamilies } from '../theme/FontsProvider';
import { useLiturgicalTheme } from '../theme/LiturgicalThemeProvider';
import { AppText } from './AppText';

export interface TextFieldProps extends TextInputProps {
  label: string;
  hint?: string;
  error?: string | null;
  containerStyle?: StyleProp<ViewStyle>;
}

export function TextField({
  label,
  hint,
  error,
  containerStyle,
  style,
  ...inputProps
}: TextFieldProps) {
  const { accent } = useLiturgicalTheme();
  const families = useFontFamilies();
  const borderColor = error !== undefined && error !== null ? colors.danger : colors.borderStrong;

  return (
    <View style={[{ gap: spacing.xs }, containerStyle]}>
      <AppText variant="label" color={colors.inkSoft}>
        {label}
      </AppText>
      <TextInput
        {...inputProps}
        placeholderTextColor={colors.inkFaint}
        style={[
          styles.input,
          { borderColor, fontFamily: families?.body ?? undefined },
          inputProps.multiline ? styles.multiline : null,
          style,
        ]}
        selectionColor={accent}
      />
      {error !== undefined && error !== null && error.length > 0 ? (
        <AppText variant="caption" color={colors.danger}>
          {error}
        </AppText>
      ) : hint !== undefined && hint.length > 0 ? (
        <AppText variant="caption" color={colors.inkFaint}>
          {hint}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: 15.5,
    color: colors.ink,
  },
  multiline: {
    minHeight: 88,
    textAlignVertical: 'top',
  },
});
