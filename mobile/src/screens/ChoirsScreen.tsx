/**
 * Choir directory — the leader's own choir plus every choir filed under a
 * chapel, each rendered with its chapel visual through ``DynamicIconOrImage``.
 */

import React, { useCallback, useState } from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { api } from '../api/endpoints';
import type { Chapel, Choir, RequestStatus } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import { AppText } from '../components/AppText';
import { StatusBadge } from '../components/Badge';
import { Card } from '../components/Card';
import { Chip } from '../components/Chip';
import { DynamicIconOrImage } from '../components/DynamicIconOrImage';
import { InfoRow } from '../components/InfoRow';
import { Screen } from '../components/Screen';
import { SectionHeader } from '../components/SectionHeader';
import { StateView } from '../components/StateView';
import { useAsyncData } from '../hooks/useAsyncData';
import { formatDateTime } from '../lib/format';
import { colors, spacing } from '../theme/tokens';
import { useLiturgicalTheme } from '../theme/LiturgicalThemeProvider';

type StatusFilter = RequestStatus | 'ALL';

const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
  { key: 'ALL', label: 'Toutes' },
  { key: 'APPROVED', label: 'Approuvées' },
  { key: 'PENDING', label: 'En attente' },
  { key: 'REJECTED', label: 'Rejetées' },
];

interface DirectoryData {
  chapels: Chapel[];
  choirs: Choir[];
  total: number;
}

export function ChoirsScreen() {
  const { choir } = useAuth();
  const { accent } = useLiturgicalTheme();
  const [chapelId, setChapelId] = useState<number | null>(null);
  const [status, setStatus] = useState<StatusFilter>('ALL');

  const loader = useCallback(async (): Promise<DirectoryData> => {
    const [chapels, page] = await Promise.all([
      api.chapels(),
      api.choirs({
        chapelId: chapelId ?? undefined,
        status: status === 'ALL' ? undefined : status,
        limit: 100,
      }),
    ]);
    return { chapels, choirs: page.items, total: page.meta.total };
  }, [chapelId, status]);

  const { data, error, loading, refreshing, refresh, reload } = useAsyncData<DirectoryData>(loader, [
    chapelId,
    status,
  ]);

  const chapels = data?.chapels ?? [];
  const chapelById = (id: number): Chapel | undefined => chapels.find((item) => item.id === id);

  return (
    <Screen onRefresh={refresh} refreshing={refreshing}>
      <SectionHeader
        eyebrow="Communautés"
        title="Chorales de la paroisse"
        caption="Huit chapelles, huit services de chant au cœur de la liturgie."
      />

      {choir !== null && (
        <Card accentColor={accent}>
          <View style={{ gap: spacing.md }}>
            <View style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'center' }}>
              <DynamicIconOrImage
                icon="musical-notes"
                imageUrl={chapelById(choir.chapel_id)?.image_url ?? null}
                alt={choir.name}
                size={52}
              />
              <View style={{ flex: 1, gap: spacing.xs }}>
                <AppText variant="eyebrow" color={accent}>
                  Ma chorale
                </AppText>
                <AppText variant="subheading" color={colors.ink}>
                  {choir.name}
                </AppText>
              </View>
              <StatusBadge status={choir.status} />
            </View>
            <InfoRow icon="person-outline" label="Responsable" value={choir.leader_name} />
            <InfoRow icon="mail-outline" label="Contact" value={choir.leader_email} />
            <InfoRow
              icon="calendar-outline"
              label="Enregistrée le"
              value={formatDateTime(choir.created_at)}
            />
          </View>
        </Card>
      )}

      <View style={{ gap: spacing.sm }}>
        <AppText variant="label" color={colors.inkSoft}>
          Chapelle
        </AppText>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          <Chip label="Toutes" active={chapelId === null} onPress={() => setChapelId(null)} />
          {chapels.map((chapel) => (
            <Chip
              key={chapel.id}
              label={chapel.code}
              active={chapelId === chapel.id}
              onPress={() => setChapelId(chapel.id)}
            />
          ))}
        </View>
      </View>

      <View style={{ gap: spacing.sm }}>
        <AppText variant="label" color={colors.inkSoft}>
          Statut
        </AppText>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          {STATUS_FILTERS.map((entry) => (
            <Chip
              key={entry.key}
              label={entry.label}
              active={status === entry.key}
              onPress={() => setStatus(entry.key)}
            />
          ))}
        </View>
      </View>

      <StateView
        loading={loading}
        error={error}
        empty={data !== null && data.choirs.length === 0}
        emptyTitle="Aucune chorale pour ce filtre"
        emptyMessage="Essayez une autre chapelle ou un autre statut."
        onRetry={reload}
      >
        <View style={{ gap: spacing.md }}>
          <AppText variant="caption" color={colors.inkFaint}>
            {`${data?.total ?? 0} chorale${(data?.total ?? 0) > 1 ? 's' : ''} dans le répertoire.`}
          </AppText>
          {(data?.choirs ?? []).map((entry) => {
            const chapel = chapelById(entry.chapel_id);
            return (
              <Card key={entry.id}>
                <View style={{ gap: spacing.md }}>
                  <View style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'center' }}>
                    <DynamicIconOrImage
                      icon="musical-notes"
                      imageUrl={chapel?.image_url ?? null}
                      alt={entry.name}
                      size={46}
                    />
                    <View style={{ flex: 1, gap: spacing.xs }}>
                      <AppText variant="subheading" color={colors.ink}>
                        {entry.name}
                      </AppText>
                      <AppText variant="caption" color={colors.inkMuted}>
                        {chapel !== undefined
                          ? `${chapel.name} (${chapel.code}) — ${chapel.description ?? ''}`.trim()
                          : `Chapelle #${entry.chapel_id}`}
                      </AppText>
                    </View>
                    <StatusBadge status={entry.status} />
                  </View>
                  <View style={{ flexDirection: 'row', gap: spacing.lg, flexWrap: 'wrap' }}>
                    <View style={{ flexDirection: 'row', gap: spacing.xs, alignItems: 'center' }}>
                      <Ionicons name="person-outline" size={14} color={colors.inkMuted} />
                      <AppText variant="caption" color={colors.inkMuted}>
                        {entry.leader_name}
                      </AppText>
                    </View>
                    <View style={{ flexDirection: 'row', gap: spacing.xs, alignItems: 'center' }}>
                      <Ionicons name="mail-outline" size={14} color={colors.inkMuted} />
                      <AppText variant="caption" color={colors.inkMuted}>
                        {entry.leader_email}
                      </AppText>
                    </View>
                  </View>
                </View>
              </Card>
            );
          })}
        </View>
      </StateView>
    </Screen>
  );
}
