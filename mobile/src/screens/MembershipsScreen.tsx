/**
 * Membership requests — the onboarding queue of the public form.
 *
 * Choirmasters can read the queue; only the parish administration (ADMIN) may
 * approve or reject a request, which mirrors the backend RBAC rules.
 */

import React, { useCallback, useState } from 'react';
import { Modal, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { describeError } from '../api/client';
import { api } from '../api/endpoints';
import type { MembershipRequest, RequestStatus } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import { AppText } from '../components/AppText';
import { StatusBadge } from '../components/Badge';
import { Card } from '../components/Card';
import { Chip } from '../components/Chip';
import { InfoRow } from '../components/InfoRow';
import { PrimaryButton } from '../components/PrimaryButton';
import { Screen } from '../components/Screen';
import { SectionHeader } from '../components/SectionHeader';
import { StateView } from '../components/StateView';
import { TextField } from '../components/TextField';
import { useAsyncData } from '../hooks/useAsyncData';
import { formatDateTime } from '../lib/format';
import { colors, radii, spacing } from '../theme/tokens';
import { useLiturgicalTheme } from '../theme/LiturgicalThemeProvider';

type StatusFilter = RequestStatus | 'ALL';

const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
  { key: 'PENDING', label: 'En attente' },
  { key: 'APPROVED', label: 'Approuvées' },
  { key: 'REJECTED', label: 'Rejetées' },
  { key: 'ALL', label: 'Toutes' },
];

export function MembershipsScreen() {
  const { user } = useAuth();
  const { accent } = useLiturgicalTheme();
  const [status, setStatus] = useState<StatusFilter>('PENDING');
  const [busyId, setBusyId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<MembershipRequest | null>(null);
  const [reason, setReason] = useState<string>('');

  const isAdmin = user?.role === 'ADMIN';
  const canRead = user?.role === 'ADMIN' || user?.role === 'CHOIR_LEADER';

  const loader = useCallback(async () => {
    const page = await api.membershipRequests({
      status: status === 'ALL' ? undefined : status,
      limit: 100,
    });
    return { items: page.items, total: page.meta.total };
  }, [status]);

  const { data, error, loading, refreshing, refresh, reload } = useAsyncData<{
    items: MembershipRequest[];
    total: number;
  }>(loader, [status]);

  const decide = async (
    request: MembershipRequest,
    approve: boolean,
    rejectionReason?: string,
  ): Promise<void> => {
    setBusyId(request.id);
    setActionError(null);
    try {
      await api.reviewMembership(
        request.id,
        approve ? { action: 'approve' } : { action: 'reject', reason: rejectionReason },
      );
      setFeedback(
        approve
          ? `Demande de ${request.full_name} approuvée : la chorale « ${request.choir_name} » est désormais active.`
          : `Demande de ${request.full_name} rejetée.`,
      );
      setRejecting(null);
      setReason('');
      await reload();
    } catch (caught) {
      setActionError(describeError(caught));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Screen onRefresh={refresh} refreshing={refreshing}>
      <SectionHeader
        eyebrow="Adhésion"
        title="Demandes des chorales"
        caption="Chaque demande est soumise par un responsable depuis le formulaire paroissial."
      />

      {!canRead && (
        <Card>
          <View style={{ gap: spacing.sm }}>
            <Ionicons name="lock-closed-outline" size={20} color={colors.inkFaint} />
            <AppText variant="bodyStrong" color={colors.ink}>
              File réservée aux responsables
            </AppText>
            <AppText variant="caption" color={colors.inkMuted}>
              Votre compte ne dispose pas des droits nécessaires pour consulter les demandes
              d’adhésion. Contactez l’administration paroissiale.
            </AppText>
          </View>
        </Card>
      )}

      {canRead && (
        <>
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

          {!isAdmin && (
            <Card accentColor={accent}>
              <AppText variant="caption" color={colors.inkSoft}>
                Consultation seule : seules les décisions de l’administration paroissiale modifient
                le statut d’une demande.
              </AppText>
            </Card>
          )}

          {feedback !== null && (
            <Card accentColor={colors.success}>
              <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                <Ionicons name="checkmark-circle" size={18} color={colors.success} />
                <AppText variant="caption" color={colors.inkSoft} style={{ flex: 1 }}>
                  {feedback}
                </AppText>
              </View>
            </Card>
          )}

          {actionError !== null && (
            <Card accentColor={colors.danger}>
              <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                <Ionicons name="alert-circle-outline" size={18} color={colors.danger} />
                <AppText variant="caption" color={colors.danger} style={{ flex: 1 }}>
                  {actionError}
                </AppText>
              </View>
            </Card>
          )}

          <StateView
            loading={loading}
            error={error}
            empty={data !== null && data.items.length === 0}
            emptyTitle="Aucune demande dans ce filtre"
            emptyMessage="Les nouvelles demandes apparaissent ici dès leur soumission."
            onRetry={reload}
          >
            <View style={{ gap: spacing.md }}>
              {(data?.items ?? []).map((request) => (
                <Card key={request.id}>
                  <View style={{ gap: spacing.md }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm }}>
                      <View style={{ flex: 1, gap: spacing.xs }}>
                        <AppText variant="subheading" color={colors.ink}>
                          {request.choir_name}
                        </AppText>
                        <AppText variant="caption" color={colors.inkMuted}>
                          {`Demande #${request.id}`}
                        </AppText>
                      </View>
                      <StatusBadge status={request.status} />
                    </View>

                    <InfoRow icon="person-outline" label="Responsable" value={request.full_name} />
                    <InfoRow
                      icon="business-outline"
                      label="Chapelle souhaitée"
                      value={request.chapel_name ?? `#${request.chapel_id}`}
                    />
                    <InfoRow
                      icon="time-outline"
                      label="Soumise le"
                      value={formatDateTime(request.submitted_at)}
                    />
                    {request.reviewed_at !== null && request.reviewed_at !== undefined && (
                      <InfoRow
                        icon="shield-checkmark-outline"
                        label="Traitée le"
                        value={formatDateTime(request.reviewed_at)}
                      />
                    )}

                    {isAdmin && request.status === 'PENDING' && (
                      <View style={{ flexDirection: 'row', gap: spacing.md }}>
                        <PrimaryButton
                          label="Rejeter"
                          variant="outline"
                          style={{ flex: 1 }}
                          disabled={busyId !== null}
                          onPress={() => {
                            setActionError(null);
                            setReason('');
                            setRejecting(request);
                          }}
                        />
                        <PrimaryButton
                          label="Approuver"
                          style={{ flex: 1 }}
                          loading={busyId === request.id}
                          disabled={busyId !== null}
                          onPress={() => {
                            void decide(request, true);
                          }}
                        />
                      </View>
                    )}
                  </View>
                </Card>
              ))}
            </View>
          </StateView>
        </>
      )}

      <Modal
        animationType="fade"
        transparent
        visible={rejecting !== null}
        onRequestClose={() => setRejecting(null)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(15, 23, 42, 0.45)',
            justifyContent: 'center',
            padding: spacing.xl,
          }}
        >
          <Card>
            <View style={{ gap: spacing.lg }}>
              <View style={{ gap: spacing.xs }}>
                <AppText variant="heading" color={colors.ink}>
                  Rejeter la demande
                </AppText>
                <AppText variant="caption" color={colors.inkMuted}>
                  {rejecting === null ? '' : `${rejecting.choir_name} — ${rejecting.full_name}`}
                </AppText>
              </View>

              <TextField
                label="Motif du rejet"
                value={reason}
                onChangeText={setReason}
                placeholder="Chorale déjà enregistrée pour cette chapelle"
                multiline
                hint="Le motif est obligatoire et conservé dans le journal paroissial."
              />

              <View style={{ flexDirection: 'row', gap: spacing.md }}>
                <PrimaryButton
                  label="Annuler"
                  variant="outline"
                  style={{ flex: 1 }}
                  onPress={() => setRejecting(null)}
                />
                <PrimaryButton
                  label="Confirmer"
                  variant="danger"
                  style={{ flex: 1 }}
                  loading={busyId !== null}
                  disabled={busyId !== null || reason.trim().length === 0}
                  onPress={() => {
                    if (rejecting !== null) {
                      void decide(rejecting, false, reason.trim());
                    }
                  }}
                />
              </View>
            </View>
          </Card>
        </View>
      </Modal>
    </Screen>
  );
}
