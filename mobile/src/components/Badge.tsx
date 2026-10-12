/** Compact status pill used for choir, request and role states. */

import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import type { RequestStatus, Role } from '../api/types';
import { STATUS_LABELS, ROLE_LABELS } from '../api/types';
import { colors, radii, spacing } from '../theme/tokens';
import { AppText } from './AppText';

export type BadgeTone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger';

export interface BadgeProps {
  label: string;
  tone?: BadgeTone;
  style?: StyleProp<ViewStyle>;
}

const TONE_COLORS: Record<BadgeTone, { background: string; text: string }> = {
  neutral: { background: colors.surfaceMuted, text: colors.inkMuted },
  accent: { background: colors.accentWash, text: colors.inkSoft },
  success: { background: '#DCFCE7', text: '#166534' },
  warning: { background: '#FEF3C7', text: '#92400E' },
  danger: { background: '#FEE2E2', text: '#991B1B' },
};

export function Badge({ label, tone = 'neutral', style }: BadgeProps) {
  const palette = TONE_COLORS[tone];
  return (
    <View
      style={[
        {
          backgroundColor: palette.background,
          borderRadius: radii.pill,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.xs,
          alignSelf: 'flex-start',
        },
        style,
      ]}
    >
      <AppText variant="eyebrow" color={palette.text}>
        {label}
      </AppText>
    </View>
  );
}

/** Map a request status to a badge tone. */
export function statusTone(status: RequestStatus): BadgeTone {
  if (status === 'APPROVED') {
    return 'success';
  }
  if (status === 'REJECTED') {
    return 'danger';
  }
  return 'warning';
}

/** Localised badge for a choir or membership status. */
export function StatusBadge({ status }: { status: RequestStatus }) {
  return <Badge label={STATUS_LABELS[status]} tone={statusTone(status)} />;
}

/** Localised badge for an account role. */
export function RoleBadge({ role }: { role: Role }) {
  return <Badge label={ROLE_LABELS[role]} tone={role === 'ADMIN' ? 'accent' : 'neutral'} />;
}
