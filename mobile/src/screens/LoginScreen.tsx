/**
 * Sign-in screen for choir leaders and the parish administration.
 *
 * Accounts are provisioned by the parish administration (``POST /api/choirs/{id}/members``
 * or the admin console); there is no self-service sign-up here.
 */

import React, { useState } from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { describeError } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { AppText } from '../components/AppText';
import { Card } from '../components/Card';
import { PrimaryButton } from '../components/PrimaryButton';
import { Screen } from '../components/Screen';
import { TextField } from '../components/TextField';
import { API_BASE_URL } from '../config';
import { colors, radii, spacing } from '../theme/tokens';
import { useLiturgicalTheme } from '../theme/LiturgicalThemeProvider';

export function LoginScreen() {
  const { signIn } = useAuth();
  const { accent, season } = useLiturgicalTheme();
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (): Promise<void> => {
    if (email.trim().length === 0 || password.length === 0) {
      setError('Renseignez votre adresse e-mail et votre mot de passe.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await signIn(email, password);
    } catch (caught) {
      setError(describeError(caught));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen contentStyle={{ gap: spacing.xl, paddingTop: spacing.xxxl }}>
      <View style={{ alignItems: 'center', gap: spacing.md }}>
        <View
          style={{
            width: 62,
            height: 62,
            borderRadius: radii.lg,
            backgroundColor: accent,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <AppText variant="title" color={colors.onAccent}>
            PA
          </AppText>
        </View>
        <View style={{ alignItems: 'center', gap: spacing.xs }}>
          <AppText variant="display" color={colors.ink}>
            PAROKIA
          </AppText>
          <AppText variant="caption" color={colors.inkMuted}>
            Notre-Dame d’Afrique · Goma
          </AppText>
        </View>
        <AppText variant="eyebrow" color={accent}>
          {`Espace des chorales · ${season}`}
        </AppText>
      </View>

      <Card>
        <View style={{ gap: spacing.lg }}>
          <View style={{ gap: spacing.xs }}>
            <AppText variant="heading" color={colors.ink}>
              Connexion responsable
            </AppText>
            <AppText variant="caption" color={colors.inkMuted}>
              Consultez l’agenda des messes, votre chorale et les demandes d’adhésion de votre
              chapelle.
            </AppText>
          </View>

          <TextField
            label="Adresse e-mail"
            value={email}
            onChangeText={setEmail}
            placeholder="responsable.tgn@parokia.org"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            textContentType="emailAddress"
            returnKeyType="next"
          />

          <TextField
            label="Mot de passe"
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            secureTextEntry
            autoCapitalize="none"
            textContentType="password"
            returnKeyType="go"
            onSubmitEditing={() => {
              void handleSubmit();
            }}
          />

          {error !== null && (
            <View
              style={{
                flexDirection: 'row',
                gap: spacing.sm,
                alignItems: 'flex-start',
                backgroundColor: '#FEF2F2',
                borderRadius: radii.md,
                padding: spacing.md,
              }}
            >
              <Ionicons name="alert-circle-outline" size={16} color={colors.danger} />
              <AppText variant="caption" color={colors.danger} style={{ flex: 1 }}>
                {error}
              </AppText>
            </View>
          )}

          <PrimaryButton
            label="Se connecter"
            loading={submitting}
            disabled={submitting}
            onPress={() => {
              void handleSubmit();
            }}
          />
        </View>
      </Card>

      <View style={{ gap: spacing.xs, alignItems: 'center' }}>
        <AppText variant="caption" color={colors.inkFaint} style={{ textAlign: 'center' }}>
          Les comptes responsables sont créés par l’administration paroissiale.
        </AppText>
        <AppText variant="caption" color={colors.inkFaint} style={{ textAlign: 'center' }}>
          {`API : ${API_BASE_URL}`}
        </AppText>
      </View>
    </Screen>
  );
}
