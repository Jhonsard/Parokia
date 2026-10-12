/**
 * Liturgical theme screen (read-only).
 *
 * The accent colour is administered from the web console; here the leader sees
 * the season in force and can preview any of the five liturgical colours without
 * changing the parish setting.
 */

import React, { useCallback } from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { api } from '../api/endpoints';
import type { LiturgicalPaletteEntry, LiturgicalTheme } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import { AppText } from '../components/AppText';
import { Card } from '../components/Card';
import { Chip } from '../components/Chip';
import { PrimaryButton } from '../components/PrimaryButton';
import { Screen } from '../components/Screen';
import { SectionHeader } from '../components/SectionHeader';
import { StateView } from '../components/StateView';
import { useAsyncData } from '../hooks/useAsyncData';
import { formatDateTime } from '../lib/format';
import { colors, radii, spacing, tint } from '../theme/tokens';
import { useLiturgicalTheme } from '../theme/LiturgicalThemeProvider';

interface ThemeData {
  theme: LiturgicalTheme;
  palette: LiturgicalPaletteEntry[];
}

export function ThemeScreen() {
  const { user } = useAuth();
  const { accent, season, previewColor, setPreviewColor, usingFallback, reload } =
    useLiturgicalTheme();

  const loader = useCallback(async (): Promise<ThemeData> => {
    const [theme, palette] = await Promise.all([api.liturgicalTheme(), api.liturgicalPalette()]);
    return { theme, palette };
  }, []);

  const { data, error, loading, refreshing, refresh, reload: retry } = useAsyncData<ThemeData>(
    loader,
    [],
  );

  return (
    <Screen onRefresh={refresh} refreshing={refreshing}>
      <SectionHeader
        eyebrow="Calendrier liturgique"
        title="Thème en vigueur"
        caption="La couleur d’accent accompagne les temps forts de l’Église catholique."
      />

      <Card accentColor={accent}>
        <View style={{ gap: spacing.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.lg }}>
            <View
              style={{
                width: 56,
                height: 56,
                borderRadius: radii.pill,
                backgroundColor: accent,
                borderWidth: 4,
                borderColor: tint(accent, 0.85),
              }}
            />
            <View style={{ flex: 1, gap: spacing.xs }}>
              <AppText variant="eyebrow" color={accent}>
                {previewColor === null ? 'Appliqué dans l’application' : 'Aperçu local'}
              </AppText>
              <AppText variant="title" color={colors.ink}>
                {season}
              </AppText>
              <AppText variant="caption" color={colors.inkMuted}>
                {`Valeur d’accent : ${accent}`}
              </AppText>
            </View>
          </View>

          {data !== null && (
            <AppText variant="caption" color={colors.inkFaint}>
              {`Dernière mise à jour par l’administration : ${formatDateTime(data.theme.updated_at)}`}
            </AppText>
          )}

          {previewColor !== null && (
            <PrimaryButton
              label="Rétablir le thème officiel"
              variant="outline"
              onPress={() => setPreviewColor(null)}
            />
          )}
        </View>
      </Card>

      {usingFallback && (
        <Card accentColor={colors.warning}>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <Ionicons name="cloud-offline-outline" size={18} color={colors.warning} />
            <AppText variant="caption" color={colors.inkSoft} style={{ flex: 1 }}>
              L’API ne répond pas : la palette embarquée (bleu marial) est utilisée. Vérifiez la
              connexion puis tirez la page vers le bas.
            </AppText>
          </View>
        </Card>
      )}

      <View style={{ gap: spacing.md }}>
        <SectionHeader eyebrow="Nuancier" title="Cinq couleurs liturgiques" />
        <StateView loading={loading} error={error} onRetry={retry}>
          <View style={{ gap: spacing.md }}>
            {(data?.palette ?? []).map((entry) => {
              const isActive = entry.color.toUpperCase() === accent.toUpperCase();
              return (
                <Card key={entry.id}>
                  <View style={{ gap: spacing.sm }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                      <View
                        style={{
                          width: 30,
                          height: 30,
                          borderRadius: radii.sm,
                          backgroundColor: entry.color,
                        }}
                      />
                      <View style={{ flex: 1 }}>
                        <AppText variant="subheading" color={colors.ink}>
                          {entry.label}
                        </AppText>
                        <AppText variant="caption" color={colors.inkMuted}>
                          {entry.season}
                        </AppText>
                      </View>
                      {isActive && <Chip label="En vigueur" active onPress={() => undefined} />}
                    </View>
                    <AppText variant="caption" color={colors.inkMuted}>
                      {entry.occasion}
                    </AppText>
                    {!isActive && (
                      <PrimaryButton
                        label="Prévisualiser"
                        variant="ghost"
                        onPress={() => setPreviewColor(entry.color)}
                      />
                    )}
                  </View>
                </Card>
              );
            })}
          </View>
        </StateView>
      </View>

      <Card>
        <View style={{ gap: spacing.sm }}>
          <Ionicons name="shield-checkmark-outline" size={20} color={colors.inkFaint} />
          <AppText variant="bodyStrong" color={colors.ink}>
            {user?.role === 'ADMIN' ? 'Changement réservé à la console web' : 'Modification réservée à l’administration'}
          </AppText>
          <AppText variant="caption" color={colors.inkMuted}>
            {user?.role === 'ADMIN'
              ? 'L’application mobile diffuse ou prévisualise la couleur; l’enregistrement officiel se fait depuis la console web paroissiale (PATCH /api/liturgical-theme).'
              : 'Les responsables de chorales disposent d’un aperçu local ; seule l’administration paroissiale modifie la couleur officielle.'}
          </AppText>
          <PrimaryButton label="Recharger le thème" variant="ghost" onPress={() => void reload()} />
        </View>
      </Card>
    </Screen>
  );
}
