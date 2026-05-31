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
import type { StudentOverview } from '../../../domain/entities/academic';

type Props = NativeStackScreenProps<StudentStackParamList, 'EvaluatePeers'>;

export function EvaluatePeersScreen({ navigation, route }: Props) {
  const { pendingId } = route.params;
  const { pendingEvaluations, submitEvaluation } = useStudent();
  const pending = pendingEvaluations.find((item) => item.cycle.id === pendingId);

  const [scores, setScores] = useState<Record<string, Record<number, number>>>({});
  const [comments, setComments] = useState<Record<string, string>>({});
  const [submittedUids, setSubmittedUids] = useState<string[]>(pending?.alreadyEvaluatedUids ?? []);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentGroupIndex, setCurrentGroupIndex] = useState(0);

  const rubrics = pending?.cycle.rubrics ?? [];

  // Groups with their remaining (unevaluated) peers
  const groupsWithPending = useMemo(() => {
    if (!pending) return [];
    return pending.peersGroupedByGroup
      .map((g) => ({
        group: g.group,
        peers: g.peers.filter((p) => !submittedUids.includes(p.uid)),
      }))
      .filter((g) => g.peers.length > 0);
  }, [pending, submittedUids]);

  const totalRemaining = groupsWithPending.reduce((sum, g) => sum + g.peers.length, 0);
  const currentGroup = groupsWithPending[currentGroupIndex] ?? null;

  // Auto-advance when a group is fully evaluated
  useEffect(() => {
    if (groupsWithPending.length > 0 && currentGroupIndex >= groupsWithPending.length) {
      setCurrentGroupIndex(Math.max(0, groupsWithPending.length - 1));
    }
  }, [groupsWithPending.length, currentGroupIndex]);

  // Navigate back when everything is done
  useEffect(() => {
    if (pending && totalRemaining === 0) {
      const t = setTimeout(() => navigation.goBack(), 1200);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [navigation, pending, totalRemaining]);

  if (!pending) {
    return (
      <View style={styles.emptyRoot}>
        <Text style={styles.emptyTitle}>No se encontró la evaluación</Text>
      </View>
    );
  }

  const updateScore = (peerUid: string, rubricIndex: number, value: number) => {
    setScores((prev) => ({
      ...prev,
      [peerUid]: { ...(prev[peerUid] ?? {}), [rubricIndex]: value },
    }));
  };

  const buildScoresForPeer = (peerUid: string) => {
    const peerScores = scores[peerUid] ?? {};
    return rubrics.length > 0
      ? rubrics.map((_, i) => Math.round(peerScores[i] ?? 3))
      : [Math.round(peerScores[0] ?? 3)];
  };

  const handleSubmitGroup = async () => {
    if (!currentGroup) return;
    setIsSubmitting(true);
    try {
      const newlySubmitted: string[] = [];
      for (const peer of currentGroup.peers) {
        const success = await submitEvaluation({
          cycleId: pending.cycle.id,
          evaluateeUid: peer.uid,
          scores: buildScoresForPeer(peer.uid),
          comments: comments[peer.uid]?.trim() || null,
        });
        if (success) {
          newlySubmitted.push(peer.uid);
        } else {
          Alert.alert('Error', `No se pudo enviar la evaluación de ${peer.name || peer.email}.`);
          setSubmittedUids((prev) => [...prev, ...newlySubmitted]);
          return;
        }
      }
      setSubmittedUids((prev) => [...prev, ...newlySubmitted]);
      const nextIndex = currentGroupIndex + 1;
      if (nextIndex < groupsWithPending.length - 1) {
        setCurrentGroupIndex(nextIndex);
        Alert.alert('Grupo evaluado', `Avanzando al siguiente grupo.`);
      } else {
        Alert.alert('Evaluaciones enviadas', 'Has completado este grupo.');
      }
    } catch (error) {
      Alert.alert('Error', `Error inesperado: ${error}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalGroups = pending.peersGroupedByGroup.length;
  const evaluatedGroups = totalGroups - groupsWithPending.length;

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.headerCard}>
        <Text style={styles.headerTitle}>{pending.cycle.title}</Text>
        <Text style={styles.headerSubtitle}>{pending.category?.name ?? pending.categoryName}</Text>
        <View style={styles.headerStats}>
          <View style={styles.statChip}>
            <MaterialCommunityIcons name="account-group" size={13} color={colors.primaryDark} />
            <Text style={styles.statChipText}>
              {evaluatedGroups}/{totalGroups} grupos evaluados
            </Text>
          </View>
          <View style={styles.statChip}>
            <MaterialCommunityIcons name="clipboard-check-outline" size={13} color={colors.primaryDark} />
            <Text style={styles.statChipText}>{totalRemaining} pendientes</Text>
          </View>
        </View>
      </View>

      {totalRemaining === 0 ? (
        <View style={styles.completeBox}>
          <MaterialCommunityIcons name="check-circle" size={72} color={colors.success} />
          <Text style={styles.completeTitle}>Has evaluado a todos tus compañeros</Text>
          <Text style={styles.completeSubtitle}>Gracias por completar la evaluación.</Text>
          <PrimaryButton title="Volver" onPress={() => navigation.goBack()} style={{ marginTop: spacing.lg }} />
        </View>
      ) : (
        <>
          {/* Group navigation tabs */}
          {totalGroups > 1 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabScroll} contentContainerStyle={styles.tabRow}>
              {pending.peersGroupedByGroup.map((g, idx) => {
                const remaining = g.peers.filter((p) => !submittedUids.includes(p.uid)).length;
                const done = remaining === 0;
                const active = groupsWithPending[currentGroupIndex]?.group.id === g.group.id;
                return (
                  <Pressable
                    key={g.group.id}
                    style={[styles.tab, active && styles.tabActive, done && styles.tabDone]}
                    onPress={() => {
                      const liveIdx = groupsWithPending.findIndex((gp) => gp.group.id === g.group.id);
                      if (liveIdx >= 0) setCurrentGroupIndex(liveIdx);
                    }}
                    disabled={done}
                  >
                    {done
                      ? <MaterialCommunityIcons name="check-circle" size={14} color={colors.success} style={{ marginRight: 4 }} />
                      : null}
                    <Text style={[styles.tabText, active && styles.tabTextActive, done && styles.tabTextDone]}>
                      {g.group.name || `Grupo ${idx + 1}`}
                    </Text>
                    {!done && (
                      <View style={styles.tabBadge}>
                        <Text style={styles.tabBadgeText}>{remaining}</Text>
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>
          )}

          {/* Current group peers */}
          {currentGroup && (
            <>
              <View style={styles.groupHeader}>
                <MaterialCommunityIcons name="account-group" size={18} color={colors.primary} />
                <Text style={styles.groupTitle}>{currentGroup.group.name || 'Grupo'}</Text>
                <Text style={styles.groupCount}>{currentGroup.peers.length} compañero{currentGroup.peers.length !== 1 ? 's' : ''}</Text>
              </View>

              {currentGroup.peers.map((peer) => (
                <PeerCard
                  key={peer.uid}
                  peer={peer}
                  rubrics={rubrics}
                  peerScores={scores[peer.uid] ?? {}}
                  comment={comments[peer.uid] ?? ''}
                  disabled={isSubmitting}
                  onScoreChange={(idx, val) => updateScore(peer.uid, idx, val)}
                  onCommentChange={(val) => setComments((prev) => ({ ...prev, [peer.uid]: val }))}
                />
              ))}

              <PrimaryButton
                title={`Enviar evaluaciones del grupo (${currentGroup.peers.length})`}
                onPress={handleSubmitGroup}
                loading={isSubmitting}
                style={{ marginTop: spacing.md }}
              />

              {groupsWithPending.length > 1 && currentGroupIndex < groupsWithPending.length - 1 && (
                <Pressable
                  style={styles.skipBtn}
                  onPress={() => setCurrentGroupIndex((i) => i + 1)}
                  disabled={isSubmitting}
                >
                  <Text style={styles.skipBtnText}>Evaluar después</Text>
                  <MaterialCommunityIcons name="arrow-right" size={16} color={colors.textMuted} />
                </Pressable>
              )}
            </>
          )}
        </>
      )}
    </ScrollView>
  );
}

// ─── PeerCard ─────────────────────────────────────────────────────────────────

function PeerCard({
  peer,
  rubrics,
  peerScores,
  comment,
  disabled,
  onScoreChange,
  onCommentChange,
}: {
  peer: StudentOverview;
  rubrics: string[];
  peerScores: Record<number, number>;
  comment: string;
  disabled: boolean;
  onScoreChange: (index: number, value: number) => void;
  onCommentChange: (value: string) => void;
}) {
  const avg = (() => {
    const vals = Object.values(peerScores);
    if (vals.length === 0) return '3.0';
    return (vals.reduce((s, v) => s + v, 0) / vals.length).toFixed(1);
  })();

  return (
    <SurfaceCard>
      <View style={styles.peerHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{getInitials(peer.name, peer.email)}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.peerName}>{peer.name || peer.email}</Text>
          {peer.name ? <Text style={styles.peerEmail}>{peer.email}</Text> : null}
        </View>
        <View style={styles.averageBadge}>
          <Text style={styles.averageBadgeText}>Prom: {avg}</Text>
        </View>
      </View>

      <View style={{ height: spacing.lg }} />

      {rubrics.length === 0 ? (
        <View>
          <Text style={styles.rubricName}>Puntuación general</Text>
          <Slider
            minimumValue={1} maximumValue={5} step={1}
            value={peerScores[0] ?? 3}
            minimumTrackTintColor={colors.primary}
            maximumTrackTintColor={colors.border}
            thumbTintColor={colors.primary}
            onValueChange={(v) => onScoreChange(0, v)}
            disabled={disabled}
          />
        </View>
      ) : (
        rubrics.map((rubric, index) => {
          const score = peerScores[index] ?? 3;
          return (
            <View key={rubric} style={styles.rubricBlock}>
              <View style={styles.rubricLine}>
                <View style={styles.rubricIndexBox}>
                  <Text style={styles.rubricIndexText}>{index + 1}</Text>
                </View>
                <Text style={styles.rubricName}>{rubric}</Text>
                <View style={styles.scoreChip}>
                  <Text style={styles.scoreChipText}>{score}</Text>
                </View>
              </View>
              <Slider
                minimumValue={1} maximumValue={5} step={1}
                value={score}
                minimumTrackTintColor={colors.primary}
                maximumTrackTintColor={colors.border}
                thumbTintColor={colors.primary}
                onValueChange={(v) => onScoreChange(index, v)}
                disabled={disabled}
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
        editable={!disabled}
        value={comment}
        onChangeText={onCommentChange}
      />
    </SurfaceCard>
  );
}

function getInitials(name: string, email: string) {
  if (name.trim()) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return `${parts[0]?.[0] ?? ''}${parts[1]?.[0] ?? ''}`.toUpperCase();
    return name.trim().slice(0, 2).toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: 36 },

  headerCard: { backgroundColor: colors.dark, borderRadius: radius.xl, padding: spacing.xl, marginBottom: spacing.lg },
  headerTitle: { color: '#FFFFFF', fontSize: 22, fontWeight: '900' },
  headerSubtitle: { marginTop: spacing.xs, color: 'rgba(255,255,255,0.82)', fontSize: 13 },
  headerStats: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md, flexWrap: 'wrap' },
  statChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.primarySoft, borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: 5 },
  statChipText: { color: colors.primaryDark, fontSize: 12, fontWeight: '700' },

  tabScroll: { marginBottom: spacing.md },
  tabRow: { gap: spacing.sm, paddingRight: spacing.md },
  tab: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  tabActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  tabDone: { borderColor: colors.success, backgroundColor: `${colors.success}18` },
  tabText: { fontSize: 13, fontWeight: '700', color: colors.textMuted },
  tabTextActive: { color: colors.primary },
  tabTextDone: { color: colors.success },
  tabBadge: { marginLeft: 6, minWidth: 20, height: 20, borderRadius: 10, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  tabBadgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '800' },

  groupHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  groupTitle: { flex: 1, color: colors.text, fontSize: 16, fontWeight: '900' },
  groupCount: { color: colors.textMuted, fontSize: 13 },

  skipBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, marginTop: spacing.sm, paddingVertical: spacing.sm },
  skipBtnText: { color: colors.textMuted, fontSize: 13 },

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
