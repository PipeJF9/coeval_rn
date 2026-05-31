import React, { useMemo } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View, SafeAreaView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radius, spacing } from '../../../core/theme';
import { SurfaceCard } from '../../components/SurfaceCard';
import { SectionHeader } from '../../components/SectionHeader';
import { useStudent } from '../../contexts/StudentContext';
import { useAuth } from '../../contexts/AuthContext';

export function DashboardScreen() {
  const { results, isLoadingResults, refreshResults } = useStudent();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  // Filtrar solo evaluaciones completadas (donde el usuario actual es el evaluado)
  const completedResults = useMemo(() => {
    return results.filter(result => result.evaluatee.uid === user?.uid || result.evaluatee.email === user?.email);
  }, [results, user?.uid, user?.email]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <FlatList
        data={completedResults}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={isLoadingResults} onRefresh={refreshResults} />}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.lg }]}
        scrollIndicatorInsets={{ right: 1 }}
        ListHeaderComponent={(
          <>
            <Text style={styles.title}>Resultados de evaluación</Text>
            <Text style={styles.subtitle}>Consulta aquí el resumen de tus evaluaciones recibidas.</Text>
            <View style={{ height: spacing.lg }} />
          </>
        )}
        renderItem={({ item }) => (
          <View style={styles.cardWrapper}>
            <SurfaceCard>
              <View style={styles.cardHeader}>
                <View style={styles.iconBox}>
                  <MaterialCommunityIcons name="chart-box" size={22} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{item.cycleTitle}</Text>
                  <Text style={styles.cardMeta}>{item.categoryName || item.groupName || 'Resultado individual'}</Text>
                </View>
                <Text style={[styles.score, { color: getScoreColor(item.averageTotal) }]}>{item.averageTotal.toFixed(1)}</Text>
              </View>

              <View style={styles.divider} />

              {Object.entries(item.rubricScores).map(([label, value]) => (
                <View key={label} style={styles.rubricRow}>
                  <View style={styles.rubricLabelRow}>
                    <Text style={styles.rubricLabel}>{label}</Text>
                    <Text style={[styles.rubricValue, { color: getScoreColor(value) }]}>{value.toFixed(1)}</Text>
                  </View>
                  <View style={styles.rubricTrack}>
                    <View
                      style={[
                        styles.rubricFill,
                        {
                          width: `${Math.min((value / 5) * 100, 100)}%` as any,
                          backgroundColor: getScoreColor(value),
                        },
                      ]}
                    />
                  </View>
                </View>
              ))}

              {item.comments.length > 0 ? (
                <View style={styles.commentsBlock}>
                  <SectionHeader title="Comentarios" />
                  {item.comments.map((comment, index) => (
                    <Text key={`${item.id}-${index}`} style={styles.commentText}>• "{comment}"</Text>
                  ))}
                </View>
              ) : null}
            </SurfaceCard>
          </View>
        )}
        ListEmptyComponent={(
          <View style={styles.emptyState}>
            <View style={styles.emptyIconBox}>
              <MaterialCommunityIcons name="chart-box-outline" size={44} color={colors.primary} />
            </View>
            <Text style={styles.emptyTitle}>Sin resultados todavía</Text>
            <Text style={styles.emptySubtitle}>Cuando tus compañeros completen evaluaciones, aparecerán aquí.</Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

function getScoreColor(score: number) {
  if (score >= 4.5) return colors.success;
  if (score >= 3.5) return colors.info;
  if (score >= 2.5) return colors.warning;
  return colors.danger;
}

const styles = StyleSheet.create({
  content: { 
    paddingHorizontal: spacing.lg, 
    paddingBottom: spacing.xl + 36, 
    backgroundColor: colors.background 
  },
  title: { color: colors.text, fontSize: 24, fontWeight: '900' },
  subtitle: { marginTop: spacing.xs, color: colors.textMuted, fontSize: 13 },
  cardWrapper: { 
    marginBottom: spacing.lg 
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  iconBox: { width: 42, height: 42, borderRadius: 14, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', marginRight: spacing.md },
  cardTitle: { color: colors.text, fontSize: 15, fontWeight: '800' },
  cardMeta: { marginTop: 2, color: colors.textMuted, fontSize: 12 },
  score: { fontSize: 28, fontWeight: '900' },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.md },
  rubricRow: { marginBottom: spacing.sm },
  rubricLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xs },
  rubricLabel: { color: colors.text, fontSize: 13, fontWeight: '500' },
  rubricValue: { fontWeight: '800', fontSize: 13 },
  rubricTrack: { height: 6, backgroundColor: colors.border, borderRadius: radius.pill, overflow: 'hidden' },
  rubricFill: { height: '100%', borderRadius: radius.pill },
  commentsBlock: { marginTop: spacing.md },
  commentText: { color: colors.textMuted, fontSize: 13, fontStyle: 'italic', marginBottom: 4 },
  emptyState: { paddingVertical: spacing.xl * 2, alignItems: 'center', paddingHorizontal: spacing.xl },
  emptyIconBox: {
    width: 88, height: 88, borderRadius: radius.xl,
    backgroundColor: colors.primarySoft,
    alignItems: 'center', justifyContent: 'center', marginBottom: spacing.lg,
  },
  emptyTitle: { color: colors.text, fontWeight: '900', fontSize: 18 },
  emptySubtitle: { color: colors.textMuted, fontSize: 13, marginTop: spacing.xs, textAlign: 'center' },
});