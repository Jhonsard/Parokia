/** Key/value line used inside detail cards. */

import React from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors, spacing } from '../theme/tokens';
import { AppText } from './AppText';

export interface InfoRowProps {
  icon?: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}

export function InfoRow({ icon, label, value }: InfoRowProps) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md }}>
      {icon !== undefined && (
        <Ionicons name={icon} size={16} color={colors.inkFaint} style={{ marginTop: 3 }} />
      )}
      <View style={{ flex: 1 }}>
        <AppText variant="caption" color={colors.inkFaint}>
          {label}
        </AppText>
        <AppText variant="bodyStrong" color={colors.inkSoft}>
          {value}
        </AppText>
      </View>
    </View>
  );
}
