import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Slider from '@react-native-community/slider';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { colors, radius, spacing } from '../../../core/theme';
import { PrimaryButton } from '../../components/PrimaryButton';
import { SurfaceCard } from '../../components/SurfaceCard';
import { useStudent } from '../../contexts/StudentContext';
import { StudentStackParamList } from '../../../navigation/StudentTabs';

type Props = NativeStackScreenProps<StudentStackParamList, 'EvaluatePeers'>;

export function EvaluatePeersScreen({ navigation, route }: Props) {
  const { pendingId } = route.params;
  const { pendingEvaluations, submitEvaluation } = useStudent();
  const pending = pendingEvaluations.find((item) => item.cycle.id === pendingId);
  const [scores, setScores] = useState<Record<string, Record<number, number>>>({});
  const [comments, setComments] = useState<Record<string, string>>({});
  const [submittedUids, setSubmittedUids] = useState<string[]>(pending?.alreadyEvaluatedUids ?? []);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const rubrics = pending?.cycle.rubrics ?? [];

  const pendingPeers = useMemo(() => {
    if (!pending) {
      return [];
    }

    return pending.peersToEvaluate.filter((peer) => !submittedUids.includes(peer.uid));
  }, [pending, submittedUids]);

  if (!pending) {
    return (
      <View style={styles.emptyRoot}>
        <Text style={styles.emptyTitle}>No se encontró la evaluación</Text>
      </View>
    );
  }

  const updateScore = (peerUid: string, rubricIndex: number, value: number) => {
    setScores((current) => ({
      ...current,
      [peerUid]: {
        ...(current[peerUid] ?? {}),
        [rubricIndex]: value,
      },
    }));
  };

  const handleSubmitPeer = async (peerUid: string) => {
    setIsSubmitting(true);
    try {
      const peerScores = scores[peerUid] ?? {};
      const finalScores = rubrics.length > 0
        ? rubrics.map((_, index) => Math.round(peerScores[index] ?? 3))
        : [Math.round(peerScores[0] ?? 3)];
      const comment = comments[peerUid]?.trim();

      const success = await submitEvaluation({
        cycleId: pending.cycle.id,
        evaluateeUid: peerUid,
        scores: finalScores,
        comments: comment || null,
      });

      if (success) {
        setSubmittedUids((current) => [...current, peerUid]);
        Alert.alert('Evaluación enviada', 'Tu evaluación se guardó correctamente.');
      } else {
        Alert.alert('Error', 'No se pudo enviar la evaluación. Por favor intenta de nuevo.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (pending && pendingPeers.length === 0) {
      const timeout = setTimeout(() => {
        navigation.goBack();
      }, 1200);
      return () => clearTimeout(timeout);
    }
    return undefined;
  }, [navigation, pending, pendingPeers.length]);

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <View style={styles.headerCard}>
        <Text style={styles.headerTitle}>{pending.cycle.title}</Text>
        <Text style={styles.headerSubtitle}>{pending.category?.name ?? pending.categoryName}</Text>
        <Text style={styles.headerMeta}>{pendingPeers.length} compañeros por evaluar</Text>
      </View>

      {pendingPeers.length === 0 ? (
        <View style={styles.completeBox}>
          <MaterialCommunityIcons name="check-circle" size={72} color={colors.success} />
          <Text style={styles.completeTitle}>Has evaluado a todos tus compañeros</Text>
          <Text style={styles.completeSubtitle}>Gracias por completar la evaluación.</Text>
          <PrimaryButton title="Volver" onPress={() => navigation.goBack()} style={{ marginTop: spacing.lg }} />
        </View>
      ) : (
        pendingPeers.map((peer) => {
          const peerScores = scores[peer.uid] ?? {};
          return (
            <SurfaceCard key={peer.uid}>
              <View style={styles.peerHeader}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{getInitials(peer.name, peer.email)}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.peerName}>{peer.name || peer.email}</Text>
                  {peer.name ? <Text style={styles.peerEmail}>{peer.email}</Text> : null}
                </View>
                <View style={styles.averageBadge}>
                  <Text style={styles.averageBadgeText}>Prom: {getAverageLabel(peerScores)}</Text>
                </View>
              </View>

              <View style={{ height: spacing.lg }} />

              {rubrics.length === 0 ? (
                <View>
                  <Text style={styles.rubricName}>Puntuación general</Text>
                  <Slider
                    minimumValue={1}
                    maximumValue={5}
                    step={1}
                    value={peerScores[0] ?? 3}
                    minimumTrackTintColor={colors.primary}
                    maximumTrackTintColor={colors.border}
                    thumbTintColor={colors.primary}
                    onValueChange={(value) => updateScore(peer.uid, 0, value)}
                    disabled={isSubmitting}
                  />
                </View>
              ) : (
                rubrics.map((rubric, index) => {
                  const currentScore = peerScores[index] ?? 3;
                  return (
                    <View key={rubric} style={styles.rubricBlock}>
                      <View style={styles.rubricLine}>
                        <View style={styles.rubricIndexBox}>
                          <Text style={styles.rubricIndexText}>{index + 1}</Text>
                        </View>
                        <Text style={styles.rubricName}>{rubric}</Text>
                        <View style={styles.scoreChip}>
                          <Text style={styles.scoreChipText}>{currentScore}</Text>
                        </View>
                      </View>
                      <Slider
                        minimumValue={1}
                        maximumValue={5}
                        step={1}
                        value={currentScore}
                        minimumTrackTintColor={colors.primary}
                        maximumTrackTintColor={colors.border}
                        thumbTintColor={colors.primary}
                        onValueChange={(value) => updateScore(peer.uid, index, value)}
                        disabled={isSubmitting}
                      />
                    </View>
                  );
                })
              )}

              <Text style={styles.commentsLabel}>Comentarios (opcional)</Text>
              <TextInput
                style={styles.commentsInput}
                placeholder="Escribe un comentario sobre el desempeño..."
                placeholderTextColor={colors.textMuted}
                multiline
                editable={!isSubmitting}
                value={comments[peer.uid] ?? ''}
                onChangeText={(value) => setComments((current) => ({ ...current, [peer.uid]: value }))}
              />

              <View style={{ height: spacing.md }} />

              <PrimaryButton
                title="Enviar evaluación"
                onPress={() => handleSubmitPeer(peer.uid)}
                loading={isSubmitting}
              />
            </SurfaceCard>
          );
        })
      )}
    </ScrollView>
  );
}

function getInitials(name: string, email: string) {
  if (name.trim()) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0]?.[0] ?? ''}${parts[1]?.[0] ?? ''}`.toUpperCase();
    }
    return name.trim().slice(0, 2).toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
}

function getAverageLabel(scores: Record<number, number>) {
  const values = Object.values(scores);
  if (values.length === 0) {
    return '3.0';
  }
  const avg = values.reduce((sum, current) => sum + current, 0) / values.length;
  return avg.toFixed(1);
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: 36 },
  headerCard: { backgroundColor: colors.dark, borderRadius: radius.xl, padding: spacing.xl, marginBottom: spacing.lg },
  headerTitle: { color: '#FFFFFF', fontSize: 22, fontWeight: '900' },
  headerSubtitle: { marginTop: spacing.xs, color: 'rgba(255,255,255,0.82)', fontSize: 13 },
  headerMeta: { marginTop: spacing.sm, color: colors.primarySoft, fontSize: 12, fontWeight: '700' },
  completeBox: { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.xl * 2 },
  completeTitle: { marginTop: spacing.md, color: colors.text, fontSize: 18, fontWeight: '800', textAlign: 'center' },
  completeSubtitle: { marginTop: spacing.xs, color: colors.textMuted, fontSize: 13, textAlign: 'center' },
  peerHeader: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 42, height: 42, borderRadius: 14, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', marginRight: spacing.md },
  avatarText: { color: colors.primary, fontWeight: '900' },
  peerName: { color: colors.text, fontSize: 15, fontWeight: '800' },
  peerEmail: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  averageBadge: { backgroundColor: colors.primarySoft, borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: 6 },
  averageBadgeText: { color: colors.primaryDark, fontSize: 12, fontWeight: '800' },
  rubricBlock: { marginBottom: spacing.md },
  rubricLine: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs },
  rubricIndexBox: { width: 24, height: 24, borderRadius: 6, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', marginRight: spacing.sm },
  rubricIndexText: { color: colors.primary, fontSize: 12, fontWeight: '800' },
  rubricName: { flex: 1, color: colors.text, fontSize: 13, fontWeight: '700' },
  scoreChip: { minWidth: 28, height: 24, borderRadius: 8, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xs },
  scoreChipText: { color: colors.primaryDark, fontSize: 12, fontWeight: '800' },
  commentsLabel: { marginTop: spacing.sm, marginBottom: spacing.xs, color: colors.text, fontSize: 13, fontWeight: '700' },
  commentsInput: { minHeight: 72, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.surface, color: colors.text, padding: spacing.md, textAlignVertical: 'top' },
  emptyRoot: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  emptyTitle: { color: colors.text, fontSize: 16, fontWeight: '800' },
});