/**
 * Agenda — the parish mass schedule for the leader's chapel, with the ability
 * for an ADMIN or CHOIR_LEADER to schedule a new mass (`POST /api/masses`).
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { describeError } from '../api/client';
import { api } from '../api/endpoints';
import type { Chapel, Choir, MassSchedule } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import { AppText } from '../components/AppText';
import { Card } from '../components/Card';
import { Chip } from '../components/Chip';
import { PrimaryButton } from '../components/PrimaryButton';
import { Screen } from '../components/Screen';
import { SectionHeader } from '../components/SectionHeader';
import { StateView } from '../components/StateView';
import { TextField } from '../components/TextField';
import { useAsyncData } from '../hooks/useAsyncData';
import {
  formatLongDate,
  formatTime,
  isValidClockTime,
  isValidIsoDate,
  isoDatePlusDays,
  toApiTime,
  todayIso,
} from '../lib/format';
import { colors, radii, spacing } from '../theme/tokens';
import { useLiturgicalTheme } from '../theme/LiturgicalThemeProvider';

type PeriodKey = 'next7' | 'next30' | 'all';

const PERIODS: { key: PeriodKey; label: string }[] = [
  { key: 'next7', label: '7 jours' },
  { key: 'next30', label: '30 jours' },
  { key: 'all', label: 'Tout l’agenda' },
];

interface AgendaData {
  chapels: Chapel[];
  masses: MassSchedule[];
}

export function MassesScreen() {
  const { user, choir } = useAuth();
  const { accent, palette } = useLiturgicalTheme();
  const [scope, setScope] = useState<'mine' | 'all'>(choir === null ? 'all' : 'mine');
  const [period, setPeriod] = useState<PeriodKey>('next30');
  const [formOpen, setFormOpen] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const [title, setTitle] = useState<string>('Messe dominicale');
  const [date, setDate] = useState<string>(todayIso());
  const [time, setTime] = useState<string>('09:00');
  const [adminChapelId, setAdminChapelId] = useState<number | null>(null);
  const [formChoirId, setFormChoirId] = useState<number | null>(null);
  const [formColor, setFormColor] = useState<string>(accent);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  const isAdmin = user?.role === 'ADMIN';
  const window = useMemo(() => {
    if (period === 'all') {
      return { start: undefined as string | undefined, end: undefined as string | undefined };
    }
    return { start: todayIso(), end: isoDatePlusDays(period === 'next7' ? 7 : 30) };
  }, [period]);

  const loader = useCallback(async (): Promise<AgendaData> => {
    const chapelId = scope === 'mine' ? choir?.chapel_id : undefined;
    const [chapels, page] = await Promise.all([
      api.chapels(),
      api.masses({ chapelId, startDate: window.start, endDate: window.end, limit: 100 }),
    ]);
    return { chapels, masses: page.items };
  }, [scope, choir?.chapel_id, window.start, window.end]);

  const { data, error, loading, refreshing, refresh, reload } = useAsyncData<AgendaData>(loader, [
    scope,
    choir?.chapel_id,
    window.start,
    window.end,
  ]);

  const chapels = data?.chapels ?? [];

  // Default the administrative form to the first chapel once the list arrives.
  useEffect(() => {
    if (adminChapelId === null && chapels.length > 0) {
      setAdminChapelId(chapels[0].id);
    }
  }, [chapels, adminChapelId]);

  const targetChapelId = isAdmin ? adminChapelId : (choir?.chapel_id ?? null);

  const choirsLoader = useCallback(async (): Promise<Choir[]> => {
    if (targetChapelId === null) {
      return [];
    }
    const page = await api.choirs({ chapelId: targetChapelId, status: 'APPROVED', limit: 50 });
    return page.items;
  }, [targetChapelId]);

  const { data: formChoirs } = useAsyncData<Choir[]>(choirsLoader, [targetChapelId]);

  const canSchedule = user !== null && (user.role === 'ADMIN' || user.role === 'CHOIR_LEADER');

  const submit = async (): Promise<void> => {
    if (targetChapelId === null) {
      setFormError('Sélectionnez la chapelle concernée.');
      return;
    }
    if (title.trim().length < 2) {
      setFormError('Le titre de la messe doit contenir au moins 2 caractères.');
      return;
    }
    if (!isValidIsoDate(date)) {
      setFormError('La date doit être au format AAAA-MM-JJ.');
      return;
    }
    if (!isValidClockTime(time)) {
      setFormError('L’heure doit être au format HH:MM.');
      return;
    }

    setSubmitting(true);
    setFormError(null);
    try {
      const created = await api.createMass({
        chapel_id: targetChapelId,
        choir_id: formChoirId,
        mass_date: date.trim(),
        mass_time: toApiTime(time),
        title: title.trim(),
        liturgical_color: formColor,
      });
      setFeedback(
        `« ${created.title} » programmée le ${formatLongDate(created.mass_date)} à ${formatTime(created.mass_time)}.`,
      );
      setFormOpen(false);
      await reload();
    } catch (caught) {
      setFormError(describeError(caught));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen onRefresh={refresh} refreshing={refreshing}>
      <View style={{ gap: spacing.md }}>
        <SectionHeader
          eyebrow="Agenda paroissial"
          title="Horaires des messes"
          caption="Filtrer par chapelle et par période, puis programmer une célébration."
        />

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          {choir !== null && (
            <Chip label="Ma chapelle" active={scope === 'mine'} onPress={() => setScope('mine')} />
          )}
          <Chip label="Toutes les chapelles" active={scope === 'all'} onPress={() => setScope('all')} />
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          {PERIODS.map((entry) => (
            <Chip
              key={entry.key}
              label={entry.label}
              active={period === entry.key}
              onPress={() => setPeriod(entry.key)}
            />
          ))}
        </View>
      </View>

      {feedback !== null && (
        <Card accentColor={colors.success}>
          <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' }}>
            <Ionicons name="checkmark-circle" size={18} color={colors.success} />
            <AppText variant="caption" color={colors.inkSoft} style={{ flex: 1 }}>
              {feedback}
            </AppText>
          </View>
        </Card>
      )}

      <StateView
        loading={loading}
        error={error}
        empty={data !== null && data.masses.length === 0}
        emptyTitle="Aucune messe sur cette période"
        emptyMessage="Élargissez la période ou choisissez « Toutes les chapelles »."
        onRetry={reload}
      >
        <View style={{ gap: spacing.md }}>
          {(data?.masses ?? []).map((mass) => (
            <Card key={mass.id} accentColor={mass.liturgical_color}>
              <View style={{ gap: spacing.sm }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm }}>
                  <AppText variant="eyebrow" color={mass.liturgical_color} style={{ flex: 1 }}>
                    {`${mass.chapel_code ?? ''} · ${formatTime(mass.mass_time)}`.trim()}
                  </AppText>
                  <AppText variant="caption" color={colors.inkFaint}>
                    {formatLongDate(mass.mass_date)}
                  </AppText>
                </View>
                <AppText variant="subheading" color={colors.ink}>
                  {mass.title}
                </AppText>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg }}>
                  <View style={{ flexDirection: 'row', gap: spacing.xs, alignItems: 'center' }}>
                    <Ionicons name="business-outline" size={14} color={colors.inkMuted} />
                    <AppText variant="caption" color={colors.inkMuted}>
                      {`Chapelle ${mass.chapel}`}
                    </AppText>
                  </View>
                  <View style={{ flexDirection: 'row', gap: spacing.xs, alignItems: 'center' }}>
                    <Ionicons name="mic-outline" size={14} color={colors.inkMuted} />
                    <AppText variant="caption" color={colors.inkMuted}>
                      {mass.choir ?? 'Chorale à désigner'}
                    </AppText>
                  </View>
                </View>
              </View>
            </Card>
          ))}
        </View>
      </StateView>

      {canSchedule && (
        <View style={{ gap: spacing.md }}>
          <SectionHeader
            eyebrow="Service liturgique"
            title="Programmer une messe"
            caption={
              isAdmin
                ? 'Vous pouvez choisir librement la chapelle et la chorale.'
                : 'Votre chorale est rattachée à une seule chapelle.'
            }
          />

          {formOpen ? (
            <Card>
              <View style={{ gap: spacing.lg }}>
                <TextField
                  label="Titre de la célébration"
                  value={title}
                  onChangeText={setTitle}
                  placeholder="Messe dominicale"
                />
                <View style={{ flexDirection: 'row', gap: spacing.md }}>
                  <TextField
                    label="Date"
                    value={date}
                    onChangeText={setDate}
                    placeholder="2026-10-18"
                    keyboardType="numbers-and-punctuation"
                    containerStyle={{ flex: 1 }}
                  />
                  <TextField
                    label="Heure"
                    value={time}
                    onChangeText={setTime}
                    placeholder="09:00"
                    keyboardType="numbers-and-punctuation"
                    containerStyle={{ flex: 1 }}
                  />
                </View>

                {isAdmin && (
                  <View style={{ gap: spacing.sm }}>
                    <AppText variant="label" color={colors.inkSoft}>
                      Chapelle
                    </AppText>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
                      {chapels.map((chapel) => (
                        <Chip
                          key={chapel.id}
                          label={chapel.code}
                          active={adminChapelId === chapel.id}
                          onPress={() => {
                            setAdminChapelId(chapel.id);
                            setFormChoirId(null);
                          }}
                        />
                      ))}
                    </View>
                  </View>
                )}

                <View style={{ gap: spacing.sm }}>
                  <AppText variant="label" color={colors.inkSoft}>
                    Chorale affectée
                  </AppText>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
                    <Chip
                      label="Aucune"
                      active={formChoirId === null}
                      onPress={() => setFormChoirId(null)}
                    />
                    {(formChoirs ?? []).map((entry) => (
                      <Chip
                        key={entry.id}
                        label={entry.name}
                        active={formChoirId === entry.id}
                        onPress={() => setFormChoirId(entry.id)}
                      />
                    ))}
                  </View>
                </View>

                <View style={{ gap: spacing.sm }}>
                  <AppText variant="label" color={colors.inkSoft}>
                    Couleur liturgique
                  </AppText>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
                    {palette.map((entry) => (
                      <Chip
                        key={entry.id}
                        label={entry.label}
                        active={formColor.toUpperCase() === entry.color.toUpperCase()}
                        onPress={() => setFormColor(entry.color)}
                      />
                    ))}
                  </View>
                </View>

                {formError !== null && (
                  <View
                    style={{
                      flexDirection: 'row',
                      gap: spacing.sm,
                      backgroundColor: '#FEF2F2',
                      borderRadius: radii.md,
                      padding: spacing.md,
                    }}
                  >
                    <Ionicons name="alert-circle-outline" size={16} color={colors.danger} />
                    <AppText variant="caption" color={colors.danger} style={{ flex: 1 }}>
                      {formError}
                    </AppText>
                  </View>
                )}

                <View style={{ flexDirection: 'row', gap: spacing.md }}>
                  <PrimaryButton
                    label="Annuler"
                    variant="outline"
                    onPress={() => {
                      setFormOpen(false);
                      setFormError(null);
                    }}
                    style={{ flex: 1 }}
                  />
                  <PrimaryButton
                    label="Enregistrer"
                    loading={submitting}
                    disabled={submitting}
                    onPress={() => {
                      void submit();
                    }}
                    style={{ flex: 1 }}
                  />
                </View>
              </View>
            </Card>
          ) : (
            <PrimaryButton
              label="Programmer une messe"
              onPress={() => {
                setFeedback(null);
                setFormColor(accent);
                setFormOpen(true);
              }}
            />
          )}
        </View>
      )}
    </Screen>
  );
}
