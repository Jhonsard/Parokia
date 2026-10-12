/** Scrollable screen frame with pull-to-refresh and safe-area padding. */

import React from 'react';
import {
  RefreshControl,
  ScrollView,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, spacing } from '../theme/tokens';
import { useLiturgicalTheme } from '../theme/LiturgicalThemeProvider';

export interface ScreenProps {
  children: React.ReactNode;
  onRefresh?: () => void;
  refreshing?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
}

export function Screen({ children, onRefresh, refreshing = false, contentStyle }: ScreenProps) {
  const { accent } = useLiturgicalTheme();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['left', 'right']}>
      <ScrollView
        contentContainerStyle={[
          {
            padding: spacing.lg,
            paddingBottom: spacing.xxxl,
            gap: spacing.lg,
          },
          contentStyle,
        ]}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          onRefresh === undefined ? undefined : (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[accent]}
              tintColor={accent}
            />
          )
        }
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}
