/**
 * Dashboard — first screen a choir leader sees after signing in.
 *
 * Shows the attached choir, the next masses of that chapel, and the number of
 * membership requests still awaiting an administrative decision.
 */

import React, { useCallback } from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { api } from '../api/endpoints';
import type { Chapel, MassSchedule } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import { AppText } from '../components/AppText';
import { RoleBadge, StatusBadge } from '../components/Badge';
import { Card } from '../components/Card';
import { DynamicIconOrImage } from '../components/DynamicIconOrImage';
import { InfoRow } from '../components/InfoRow';
import { PrimaryButton } from '../components/PrimaryButton';
import { Screen } from '../components/Screen';
import { SectionHeader } from '../components/SectionHeader';
import { StateView } from '../components/StateView';
import { useAsyncData } from '../hooks/useAsyncData';
import { formatLongDate, formatTime, todayIso } from '../lib/format';
import { colors, radii, spacing } from '../theme/tokens';
import { useLiturgicalTheme } from '../theme/LiturgicalThemeProvider';

interface DashboardData {
  chapels: Chapel[];
  upcoming: MassSchedule[];
  pendingRequests: number | null;
}

export function DashboardScreen() {
  const { user, choir, reloadProfile } = useAuth();
  const { accent } = useLiturgicalTheme();

  const loader = useCallback(async (): Promise<DashboardData> => {
    const [chapels, massPage, requestPage] = await Promise.all([
      api.chapels(),
      api.masses({ chapelId: choir?.chapel_id, startDate: todayIso(), limit: 4 }),
      api.membershipRequests({ status: 'PENDING', limit: 1 }).catch(() => null),
    ]);
    return {
      chapels,
      upcoming: massPage.items,
      pendingRequests: requestPage === null ? null : requestPage.meta.total,
    };
  }, [choir?.chapel_id]);

  const { data, error, loading, refreshing, refresh, reload } = useAsyncData<DashboardData>(loader, [
    choir?.chapel_id,
  ]);

  const myChapel = data?.chapels.find((chapel) => chapel.id === choir?.chapel_id) ?? null;
  const firstName = (user?.full_name ?? '').split(' ')[0] ?? '';

  return (
    <Screen onRefresh={refresh} refreshing={refreshing}>
      <View style={{ gap: spacing.sm }}>
        <AppText variant="eyebrow" color={accent}>
          {user?.role === 'ADMIN' ? 'Administration paroissiale' : 'Responsable de chorale'}
        </AppText>
        <AppText variant="display" color={colors.ink}>
          {firstName.length > 0 ? `Que la paix soit avec vous, ${firstName}` : 'Tableau de bord'}
        </AppText>
        <AppText variant="caption" color={colors.inkMuted}>
          {`${new Date().getHours() < 12 ? 'Bonjour' : 'Bonsoir'} · ${formatLongDate(todayIso())}`}
        </AppText>
      </View>

      {user !== null && (
        <Card accentColor={accent}>
          <View style={{ gap: spacing.md }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm }}>
              <AppText variant="subheading" color={colors.ink} style={{ flex: 1 }}>
                {user.full_name}
              </AppText>
              <RoleBadge role={user.role} />
            </View>
            <InfoRow icon="mail-outline" label="Adresse de connexion" value={user.email} />
            {myChapel !== null && (
              <InfoRow
                icon="location-outline"
                label="Chapelle"
                value={`${myChapel.name} (${myChapel.code}) — ${myChapel.description ?? ''}`.trim()}
              />
            )}
          </View>
        </Card>
      )}

      <View style={{ gap: spacing.md }}>
        <SectionHeader eyebrow="Ma chorale" title="Service liturgique" />
        <StateView loading={loading} error={error} onRetry={reload}>
          {choir === null ? (
            <Card>
              <View style={{ gap: spacing.sm }}>
                <Ionicons name="musical-notes-outline" size={20} color={colors.inkFaint} />
                <AppText variant="bodyStrong" color={colors.ink}>
                  Aucune chorale rattachée
                </AppText>
                <AppText variant="caption" color={colors.inkMuted}>
                  Contactez l’administration paroissiale pour rattacher votre compte à une chorale.
                </AppText>
              </View>
            </Card>
          ) : (
            <Card accentColor={accent}>
              <View style={{ gap: spacing.md }}>
                <View style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'center' }}>
                  <DynamicIconOrImage icon="musical-notes" alt="Chorale" size={46} />
                  <View style={{ flex: 1, gap: spacing.xs }}>
                    <AppText variant="subheading" color={colors.ink}>
                      {choir.name}
                    </AppText>
                    <AppText variant="caption" color={colors.inkMuted}>
                      {`Chapelle ${choir.chapel_code ?? ''}`.trim()}
                    </AppText>
                  </View>
                  <StatusBadge status={choir.status} />
                </View>
                <InfoRow icon="person-outline" label="Responsable déclaré" value={choir.leader_name} />
                <InfoRow icon="mail-outline" label="Contact" value={choir.leader_email} />
                <AppText variant="caption" color={colors.inkFaint}>
                  {myChapel !== null
                    ? `${myChapel.name} — « ${myChapel.description ?? ''} »`
                    : 'Données lues depuis l’API paroissiale.'}
                </AppText>
              </View>
            </Card>
          )}
        </StateView>
      </View>

      <View style={{ gap: spacing.md }}>
        <SectionHeader
          eyebrow="Agenda"
          title="Prochaines messes"
          caption={
            choir === null
              ? 'Toutes les chapelles de la paroisse.'
              : `Chapelle ${myChapel?.name ?? choir.chapel_code ?? ''}`
          }
        />
        <StateView
          loading={loading}
          error={error}
          empty={data !== null && data.upcoming.length === 0}
          emptyTitle="Aucune messe programmée"
          emptyMessage="L’administration paroissiale publiera le prochain calendrier depuis la console."
          onRetry={reload}
        >
          <View style={{ gap: spacing.md }}>
            {(data?.upcoming ?? []).map((mass) => (
              <Card key={mass.id} accentColor={mass.liturgical_color}>
                <View style={{ gap: spacing.xs }}>
                  <AppText variant="eyebrow" color={mass.liturgical_color}>
                    {`${mass.chapel_code ?? ''} · ${formatLongDate(mass.mass_date)}`.trim()}
                  </AppText>
                  <AppText variant="subheading" color={colors.ink}>
                    {mass.title}
                  </AppText>
                  <View style={{ flexDirection: 'row', gap: spacing.lg, alignItems: 'center' }}>
                    <View style={{ flexDirection: 'row', gap: spacing.xs, alignItems: 'center' }}>
                      <Ionicons name="time-outline" size={14} color={colors.inkMuted} />
                      <AppText variant="caption" color={colors.inkMuted}>
                        {formatTime(mass.mass_time)}
                      </AppText>
                    </View>
                    {mass.choir !== null && mass.choir !== undefined && (
                      <View style={{ flexDirection: 'row', gap: spacing.xs, alignItems: 'center' }}>
                        <Ionicons name="mic-outline" size={14} color={colors.inkMuted} />
                        <AppText variant="caption" color={colors.inkMuted}>
                          {mass.choir}
                        </AppText>
                      </View>
                    )}
                  </View>
                </View>
              </Card>
            ))}
          </View>
        </StateView>
      </View>

      {data?.pendingRequests !== null && data?.pendingRequests !== undefined && (
        <Card style={{ backgroundColor: colors.surface }}>
          <View
            style={{
              flexDirection: 'row',
              gap: spacing.md,
              alignItems: 'center',
            }}
          >
            <View
              style={{
                width: 42,
                height: 42,
                borderRadius: radii.md,
                backgroundColor: `${accent}1A`,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="mail-unread-outline" size={20} color={accent} />
            </View>
            <View style={{ flex: 1 }}>
              <AppText variant="subheading" color={colors.ink}>
                {`${data.pendingRequests} demande${data.pendingRequests > 1 ? 's' : ''} en attente`}
              </AppText>
              <AppText variant="caption" color={colors.inkMuted}>
                Onglet « Demandes » pour consulter la file de validation.
              </AppText>
            </View>
          </View>
        </Card>
      )}

      <PrimaryButton
        label="Actualiser mon profil"
        variant="outline"
        onPress={() => {
          void reloadProfile();
        }}
      />
    </Screen>
  );
}
