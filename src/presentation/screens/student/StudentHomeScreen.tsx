import React from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { colors, radius, spacing } from '../../../core/theme';
import { SurfaceCard } from '../../components/SurfaceCard';
import { SectionHeader } from '../../components/SectionHeader';
import { useAuth } from '../../contexts/AuthContext';
import { useStudent } from '../../contexts/StudentContext';

export function StudentHomeScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const { courses, pendingEvaluations, isLoadingCourses, isLoadingPending, refreshAll, totalPendingCount } = useStudent();

  return (
    <FlatList
      data={courses}
      keyExtractor={(item) => item.id}
      refreshControl={<RefreshControl refreshing={isLoadingCourses || isLoadingPending} onRefresh={refreshAll} />}
      contentContainerStyle={styles.content}
      ListHeaderComponent={(
        <View style={styles.headerWrap}>
          <View style={styles.heroCard}>
            <Text style={styles.heroLabel}>Bienvenido</Text>
            <Text style={styles.heroName}>{user?.name || 'Estudiante'}</Text>
            <Text style={styles.heroEmail}>{user?.email}</Text>

            <View style={styles.heroStats}>
              <View style={styles.heroStatBox}>
                <Text style={styles.heroStatValue}>{courses.length}</Text>
                <Text style={styles.heroStatLabel}>Cursos</Text>
              </View>
              <View style={styles.heroStatBox}>
                <Text style={styles.heroStatValue}>{totalPendingCount}</Text>
                <Text style={styles.heroStatLabel}>Pendientes</Text>
              </View>
            </View>
          </View>

          <SurfaceCard>
            <SectionHeader title="Evaluaciones pendientes" subtitle="Accede desde el curso correspondiente" />
            {pendingEvaluations.length === 0 ? (
              <Text style={styles.emptyText}>No tienes evaluaciones pendientes.</Text>
            ) : (
              pendingEvaluations.map((pending) => (
                <View key={pending.cycle.id} style={styles.pendingRow}>
                  <View style={styles.pendingTextBlock}>
                    <Text style={styles.pendingTitle}>{pending.cycle.title}</Text>
                    <Text style={styles.pendingSubtitle}>{pending.category?.name ?? pending.categoryName}</Text>
                  </View>
                  <View style={styles.pendingBadge}>
                    <MaterialCommunityIcons name="clipboard-text-outline" size={14} color="#FFFFFF" />
                    <Text style={styles.pendingBadgeText}>{pending.peersToEvaluate.filter((peer) => !pending.alreadyEvaluatedUids.includes(peer.uid)).length}</Text>
                  </View>
                </View>
              ))
            )}
          </SurfaceCard>

          <View style={{ height: spacing.lg }} />

          <SectionHeader title="Mis cursos" subtitle="Selecciona un curso para ver categorías y grupos" />
        </View>
      )}
      renderItem={({ item }) => (
        <Pressable onPress={() => navigation.navigate('CourseDetail', { courseId: item.id })} style={styles.cardWrap}>
          <SurfaceCard>
            <View style={styles.courseHeader}>
              <View style={styles.courseIcon}>
                <MaterialCommunityIcons name="book-open-variant" size={22} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.courseName}>{item.name}</Text>
                <Text style={styles.courseMeta}>NRC {item.nrc} · {item.term}</Text>
              </View>
              {pendingEvaluations.some((pending) => pending.cycle.courseId === item.id) ? (
                <View style={styles.courseBadge}>
                  <Text style={styles.courseBadgeText}>
                    {pendingEvaluations
                      .filter((pending) => pending.cycle.courseId === item.id)
                      .reduce((sum, pending) => sum + pending.peersToEvaluate.filter((peer) => !pending.alreadyEvaluatedUids.includes(peer.uid)).length, 0)}
                  </Text>
                </View>
              ) : null}
            </View>
          </SurfaceCard>
        </Pressable>
      )}
      ListEmptyComponent={(
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateTitle}>No estás inscrito en cursos todavía</Text>
          <Text style={styles.emptyStateSubtitle}>Cuando se sincronice tu categoría, aparecerán aquí tus cursos.</Text>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    paddingBottom: 32,
    backgroundColor: colors.background,
  },
  headerWrap: {
    marginBottom: spacing.md,
  },
  heroCard: {
    backgroundColor: colors.dark,
    borderRadius: radius.xl,
    padding: spacing.xl,
    marginBottom: spacing.lg,
  },
  heroLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 13, textTransform: 'uppercase', letterSpacing: 1 },
  heroName: { marginTop: spacing.xs, color: '#FFFFFF', fontSize: 28, fontWeight: '900' },
  heroEmail: { marginTop: spacing.xs, color: 'rgba(255,255,255,0.8)', fontSize: 13 },
  heroStats: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg },
  heroStatBox: { flex: 1, borderRadius: radius.md, backgroundColor: 'rgba(255,255,255,0.08)', padding: spacing.md },
  heroStatValue: { color: '#FFFFFF', fontSize: 24, fontWeight: '900' },
  heroStatLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 2 },
  pendingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
  pendingTextBlock: { flex: 1, paddingRight: spacing.md },
  pendingTitle: { color: colors.text, fontSize: 14, fontWeight: '700' },
  pendingSubtitle: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  pendingBadge: { minWidth: 38, borderRadius: radius.pill, backgroundColor: colors.primary, paddingHorizontal: spacing.sm, paddingVertical: 6, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  pendingBadgeText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800', marginLeft: 4 },
  cardWrap: { marginBottom: spacing.md },
  courseHeader: { flexDirection: 'row', alignItems: 'center' },
  courseIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', marginRight: spacing.md },
  courseName: { color: colors.text, fontSize: 16, fontWeight: '800' },
  courseMeta: { marginTop: 2, color: colors.textMuted, fontSize: 12 },
  courseBadge: { minWidth: 32, height: 32, borderRadius: radius.pill, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.sm },
  courseBadgeText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
  emptyText: { color: colors.textMuted, fontSize: 13 },
  emptyState: { padding: spacing.xl, alignItems: 'center' },
  emptyStateTitle: { color: colors.text, fontWeight: '800', fontSize: 16 },
  emptyStateSubtitle: { marginTop: spacing.xs, color: colors.textMuted, fontSize: 13, textAlign: 'center' },
});