import React, { useState, useEffect } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { colors, radius, spacing } from '../../../core/theme';
import { DashboardConsolidated, EvaluationResult } from '../../../domain/entities/academic';
import { dashboardUseCases } from '../../../di/container';

const scoreColor = (score: number) => {
  if (score >= 4.0) return colors.success;
  if (score >= 3.0) return colors.warning;
  return colors.danger;
};

const initials = (name: string, fallback: string) => {
  if (name?.trim()) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2 && parts[0] && parts[1]) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.trim().slice(0, 2).toUpperCase();
  }
  return (fallback || '?').slice(0, 2).toUpperCase();
};

export const EvaluationResponsesScreen = ({ route }: any) => {
  const { cycleId } = route?.params ?? {};

  const [data, setData] = useState<DashboardConsolidated | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (cycleId) load();
    else setIsLoading(false);
  }, [cycleId]);

  const load = async () => {
    setIsLoading(true);
    try {
      const result = await dashboardUseCases.getEvaluationResults.executeForTeacher(cycleId);
      setData(result);
    } catch {
      Alert.alert('Error', 'No se pudieron cargar los resultados');
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!data || !cycleId) {
    return (
      <View style={styles.center}>
        <View style={styles.emptyIconBox}>
          <MaterialCommunityIcons name="chart-box-outline" size={44} color={colors.primary} />
        </View>
        <Text style={styles.emptyTitle}>Sin datos</Text>
        <Text style={styles.emptySubtitle}>No se encontraron resultados para este ciclo.</Text>
      </View>
    );
  }

  const completionRate = data.totalStudents > 0
    ? (data.evaluatedStudents / data.totalStudents) * 100
    : 0;
  const completionColor = completionRate >= 70 ? colors.success : colors.warning;
  const avgColor = scoreColor(data.groupAverage);

  return (
    <ScrollView
      style={styles.root}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      {/* Cycle header */}
      <View style={styles.cycleHeader}>
        <View style={styles.cycleIconBox}>
          <MaterialCommunityIcons name="chart-box" size={22} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.cycleLabel}>EVALUACIÓN</Text>
          <Text style={styles.cycleTitle} numberOfLines={2}>{data.cycleTitle}</Text>
        </View>
      </View>

      {/* KPI grid */}
      <View style={styles.kpiGrid}>
        <KpiCard label="Promedio general" value={data.groupAverage.toFixed(2)} icon="star-outline" color={avgColor} />
        <KpiCard label="Evaluados" value={`${data.evaluatedStudents}/${data.totalStudents}`} icon="account-group" color={colors.info} />
        <KpiCard label="Pendientes" value={String(data.pendingStudents)} icon="clock-outline" color={data.pendingStudents > 0 ? colors.warning : colors.success} />
        <KpiCard label="Evaluaciones" value={String(data.totalEvaluationsSubmitted)} icon="check-circle-outline" color={colors.textMuted} />
      </View>

      {/* Completion rate */}
      <View style={styles.card}>
        <View style={styles.coverageRow}>
          <Text style={styles.cardLabel}>Cobertura de la actividad</Text>
          <Text style={[styles.coveragePercent, { color: completionColor }]}>{completionRate.toFixed(1)}%</Text>
        </View>
        <View style={styles.barTrack}>
          <View style={[styles.barFill, { width: `${Math.min(completionRate, 100)}%` as any, backgroundColor: completionColor }]} />
        </View>
      </View>

      {/* Rubric averages */}
      {Object.keys(data.rubricAverages).length > 0 && (
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>Promedio por criterio</Text>
          {Object.entries(data.rubricAverages).map(([rubric, value]) => (
            <RubricBar key={rubric} rubric={rubric} value={value} />
          ))}
        </View>
      )}

      {/* Group stats */}
      {data.groupStats.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>Estadísticas por grupo</Text>
          {data.groupStats.map((stat) => {
            const c = scoreColor(stat.averageScore);
            return (
              <View key={stat.groupId} style={styles.groupStatRow}>
                <View style={[styles.groupStatIcon, { backgroundColor: `${c}20` }]}>
                  <MaterialCommunityIcons name="account-group" size={18} color={c} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.groupStatName}>{stat.groupName || 'Grupo'}</Text>
                  <Text style={styles.groupStatSub}>
                    Evaluados {stat.evaluatedStudents}/{stat.totalStudents} · Pendientes {stat.pendingStudents}
                  </Text>
                </View>
                <View style={[styles.scorePill, { backgroundColor: `${c}15` }]}>
                  <Text style={[styles.scorePillText, { color: c }]}>{stat.averageScore.toFixed(2)}</Text>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* Top / Low */}
      {(data.topStudents.length > 0 || data.lowStudents.length > 0) && (
        <View style={styles.rankingRow}>
          <RankingCard title="Top rendimiento" icon="trophy-outline" accent={colors.success} students={data.topStudents} />
          <RankingCard title="Requieren apoyo" icon="hand-heart-outline" accent={colors.warning} students={data.lowStudents} />
        </View>
      )}

      {/* Student table */}
      {data.results.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>Detalle por estudiante</Text>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableCell, { flex: 2 }]}>Estudiante</Text>
            <Text style={styles.tableCell}>Promedio</Text>
            <Text style={styles.tableCell}>Eval.</Text>
          </View>
          {data.results.map((result) => {
            const c = scoreColor(result.averageTotal);
            return (
              <View key={result.id} style={styles.tableRow}>
                <View style={{ flex: 2 }}>
                  <Text style={styles.studentName} numberOfLines={1}>
                    {result.evaluatee.name || result.evaluatee.uid}
                  </Text>
                  {result.groupName ? (
                    <Text style={styles.studentSub}>{result.groupName}</Text>
                  ) : null}
                </View>
                <Text style={[styles.tableCell, styles.tableCellBold, { color: c }]}>
                  {result.averageTotal > 0 ? result.averageTotal.toFixed(2) : '—'}
                </Text>
                <Text style={[styles.tableCell, { color: colors.textMuted }]}>
                  {result.totalEvaluators}
                </Text>
              </View>
            );
          })}
        </View>
      )}

      <View style={{ height: spacing.xl }} />
    </ScrollView>
  );
};

function KpiCard({ label, value, icon, color }: { label: string; value: string; icon: string; color: string }) {
  return (
    <View style={styles.kpiCard}>
      <View style={[styles.kpiStripe, { backgroundColor: color }]} />
      <View style={[styles.kpiIconBox, { backgroundColor: `${color}18` }]}>
        <MaterialCommunityIcons name={icon as any} size={18} color={color} />
      </View>
      <View style={styles.kpiContent}>
        <Text style={styles.kpiLabel} numberOfLines={2}>{label}</Text>
        <Text style={[styles.kpiValue, { color }]}>{value}</Text>
      </View>
    </View>
  );
}

function RubricBar({ rubric, value }: { rubric: string; value: number }) {
  const c = scoreColor(value);
  return (
    <View style={styles.rubricBlock}>
      <View style={styles.rubricHeader}>
        <Text style={styles.rubricLabel} numberOfLines={1}>{rubric}</Text>
        <Text style={[styles.rubricValue, { color: c }]}>{value.toFixed(2)}</Text>
      </View>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${(value / 5) * 100}%` as any, backgroundColor: c }]} />
      </View>
    </View>
  );
}

function RankingCard({ title, icon, accent, students }: { title: string; icon: string; accent: string; students: EvaluationResult[] }) {
  return (
    <View style={styles.rankingCard}>
      <View style={styles.rankingCardHeader}>
        <MaterialCommunityIcons name={icon as any} size={14} color={accent} />
        <Text style={styles.rankingCardTitle} numberOfLines={1}>{title}</Text>
      </View>
      {students.length === 0 ? (
        <Text style={styles.rankingEmpty}>Sin datos</Text>
      ) : (
        students.map((s) => {
          const c = scoreColor(s.averageTotal);
          return (
            <View key={s.id} style={styles.rankingItem}>
              <View style={[styles.rankingAvatar, { backgroundColor: `${c}18` }]}>
                <Text style={[styles.rankingInitials, { color: c }]}>
                  {initials(s.evaluatee.name, s.evaluatee.uid)}
                </Text>
              </View>
              <Text style={styles.rankingName} numberOfLines={1}>
                {s.evaluatee.name || s.evaluatee.uid}
              </Text>
              <Text style={[styles.rankingScore, { color: c }]}>
                {s.averageTotal.toFixed(2)}
              </Text>
            </View>
          );
        })
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xxl },
  emptyIconBox: {
    width: 88, height: 88, borderRadius: radius.xl,
    backgroundColor: colors.primarySoft,
    alignItems: 'center', justifyContent: 'center', marginBottom: spacing.lg,
  },
  emptyTitle: { color: colors.text, fontSize: 18, fontWeight: '900' },
  emptySubtitle: { color: colors.textMuted, fontSize: 13, marginTop: spacing.xs, textAlign: 'center' },

  cycleHeader: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface,
    margin: spacing.md, padding: spacing.md,
    borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, gap: spacing.md,
  },
  cycleIconBox: {
    width: 44, height: 44, borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    justifyContent: 'center', alignItems: 'center',
  },
  cycleLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 0.8, color: colors.textMuted, marginBottom: 2 },
  cycleTitle: { fontSize: 15, fontWeight: '700', color: colors.text },

  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: spacing.md, gap: spacing.sm, marginBottom: spacing.xs },
  kpiCard: {
    width: '47%', backgroundColor: colors.surface,
    borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border,
    flexDirection: 'row', alignItems: 'center', padding: spacing.sm, gap: spacing.sm, overflow: 'hidden',
  },
  kpiStripe: { width: 4, alignSelf: 'stretch', borderRadius: 2 },
  kpiIconBox: { width: 34, height: 34, borderRadius: radius.sm, justifyContent: 'center', alignItems: 'center' },
  kpiContent: { flex: 1 },
  kpiLabel: { fontSize: 10, color: colors.textMuted, fontWeight: '600', lineHeight: 13 },
  kpiValue: { fontSize: 17, fontWeight: '700', marginTop: 2 },

  card: {
    backgroundColor: colors.surface, margin: spacing.md, marginTop: spacing.sm,
    borderRadius: radius.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.border,
  },
  cardLabel: { fontSize: 14, fontWeight: '700', color: colors.text },
  sectionLabel: { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: spacing.md },

  coverageRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  coveragePercent: { fontSize: 14, fontWeight: '700' },

  barTrack: { height: 7, backgroundColor: colors.border, borderRadius: radius.pill, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: radius.pill },

  rubricBlock: { marginBottom: spacing.sm },
  rubricHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xs },
  rubricLabel: { flex: 1, fontSize: 13, color: colors.text, fontWeight: '500' },
  rubricValue: { fontSize: 13, fontWeight: '700' },

  groupStatRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  groupStatIcon: { width: 38, height: 38, borderRadius: radius.sm, justifyContent: 'center', alignItems: 'center' },
  groupStatName: { fontSize: 14, fontWeight: '700', color: colors.text },
  groupStatSub: { fontSize: 12, color: colors.textMuted, marginTop: 1 },
  scorePill: { paddingHorizontal: spacing.sm, paddingVertical: 6, borderRadius: radius.sm },
  scorePillText: { fontSize: 14, fontWeight: '700' },

  rankingRow: { flexDirection: 'row', paddingHorizontal: spacing.md, gap: spacing.sm, marginBottom: spacing.xs },
  rankingCard: {
    flex: 1, backgroundColor: colors.surface,
    borderRadius: radius.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.border,
  },
  rankingCardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  rankingCardTitle: { fontSize: 12, fontWeight: '700', color: colors.text, flex: 1 },
  rankingEmpty: { fontSize: 12, color: colors.textMuted },
  rankingItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  rankingAvatar: { width: 26, height: 26, borderRadius: 13, justifyContent: 'center', alignItems: 'center' },
  rankingInitials: { fontSize: 9, fontWeight: '900' },
  rankingName: { flex: 1, fontSize: 12, color: colors.text, fontWeight: '500' },
  rankingScore: { fontSize: 12, fontWeight: '700' },

  tableHeader: {
    flexDirection: 'row', paddingVertical: spacing.sm,
    borderBottomWidth: 1, borderBottomColor: colors.border, marginBottom: spacing.xs,
  },
  tableRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.background,
  },
  tableCell: { flex: 1, fontSize: 13, color: colors.textMuted, fontWeight: '600' },
  tableCellBold: { fontWeight: '700' },
  studentName: { fontSize: 13, fontWeight: '700', color: colors.text },
  studentSub: { fontSize: 11, color: colors.textMuted, marginTop: 1 },
});
