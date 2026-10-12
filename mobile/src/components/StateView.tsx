/** Loading / error / empty states shared by every data screen. */

import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors, radii, spacing } from '../theme/tokens';
import { useLiturgicalTheme } from '../theme/LiturgicalThemeProvider';
import { AppText } from './AppText';
import { PrimaryButton } from './PrimaryButton';

export interface StateViewProps {
  loading?: boolean;
  error?: string | null;
  empty?: boolean;
  emptyTitle?: string;
  emptyMessage?: string;
  onRetry?: () => void;
  children?: React.ReactNode;
}

export function StateView({
  loading = false,
  error = null,
  empty = false,
  emptyTitle = 'Aucune donnée',
  emptyMessage,
  onRetry,
  children,
}: StateViewProps) {
  const { accent } = useLiturgicalTheme();

  if (loading) {
    return (
      <View style={{ paddingVertical: spacing.xxxl, alignItems: 'center', gap: spacing.md }}>
        <ActivityIndicator color={accent} />
        <AppText variant="caption" color={colors.inkMuted}>
          Chargement des données paroissiales…
        </AppText>
      </View>
    );
  }

  if (error !== null) {
    return (
      <View
        style={{
          backgroundColor: colors.surface,
          borderRadius: radii.lg,
          borderWidth: 1,
          borderColor: colors.border,
          padding: spacing.lg,
          gap: spacing.md,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <Ionicons name="cloud-offline-outline" size={18} color={colors.danger} />
          <AppText variant="subheading" color={colors.ink}>
            Données indisponibles
          </AppText>
        </View>
        <AppText variant="caption" color={colors.inkMuted}>
          {error}
        </AppText>
        {onRetry !== undefined && <PrimaryButton label="Réessayer" variant="outline" onPress={onRetry} />}
      </View>
    );
  }

  if (empty) {
    return (
      <View
        style={{
          backgroundColor: colors.surface,
          borderRadius: radii.lg,
          borderWidth: 1,
          borderColor: colors.border,
          padding: spacing.lg,
          gap: spacing.sm,
        }}
      >
        <Ionicons name="information-circle-outline" size={20} color={colors.inkFaint} />
        <AppText variant="subheading" color={colors.ink}>
          {emptyTitle}
        </AppText>
        {emptyMessage !== undefined && (
          <AppText variant="caption" color={colors.inkMuted}>
            {emptyMessage}
          </AppText>
        )}
      </View>
    );
  }

  return <>{children}</>;
}
