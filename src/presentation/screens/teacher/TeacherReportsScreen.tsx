import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { colors, radius, spacing } from '../../../core/theme';
import { SurfaceCard } from '../../components/SurfaceCard';
import { useAuth } from '../../contexts/AuthContext';
import { useTeacher } from '../../contexts/TeacherContext';
import { EvaluationCycleData } from '../../../domain/entities/academic';
import { academicUseCases } from '../../../di/container';

export const TeacherReportsScreen = ({ navigation }: any) => {
  const { courses, isLoadingCourses, loadCourses } = useTeacher();
  const { user } = useAuth();

  const [expandedCourseId, setExpandedCourseId] = useState<string | null>(null);
  const [cyclesByCourse, setCyclesByCourse] = useState<Record<string, EvaluationCycleData[]>>({});
  const [loadingCourseId, setLoadingCourseId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (user?.uid && courses.length === 0 && !isLoadingCourses) {
      loadCourses(user.uid);
    }
  }, [user?.uid]);

  const onRefresh = async () => {
    if (!user?.uid) return;
    setRefreshing(true);
    setCyclesByCourse({});
    setExpandedCourseId(null);
    await loadCourses(user.uid);
    setRefreshing(false);
  };

  const toggleCourse = async (courseId: string) => {
    if (expandedCourseId === courseId) {
      setExpandedCourseId(null);
      return;
    }
    setExpandedCourseId(courseId);
    if (!cyclesByCourse[courseId]) {
      setLoadingCourseId(courseId);
      try {
        const cycles = await academicUseCases.getEvaluationCyclesByCourse.execute(courseId);
        setCyclesByCourse((prev) => ({ ...prev, [courseId]: cycles }));
      } catch {
        setCyclesByCourse((prev) => ({ ...prev, [courseId]: [] }));
      } finally {
        setLoadingCourseId(null);
      }
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
  };

  if (isLoadingCourses && courses.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!isLoadingCourses && courses.length === 0) {
    return (
      <View style={styles.center}>
        <View style={styles.emptyIconBox}>
          <MaterialCommunityIcons name="chart-box-outline" size={44} color={colors.primary} />
        </View>
        <Text style={styles.emptyTitle}>Sin cursos</Text>
        <Text style={styles.emptySubtitle}>
          Crea un curso y agrega ciclos de evaluación para ver reportes aquí.
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={courses}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }
      ListHeaderComponent={
        <Text style={styles.hint}>Selecciona un curso para ver sus ciclos y resultados</Text>
      }
      renderItem={({ item: course }) => {
        const isExpanded = expandedCourseId === course.id;
        const isLoadingThis = loadingCourseId === course.id;
        const cycles = cyclesByCourse[course.id] ?? [];

        return (
          <View style={styles.courseBlock}>
            <Pressable style={styles.courseRow} onPress={() => toggleCourse(course.id)}>
              <View style={styles.courseIconBox}>
                <MaterialCommunityIcons name="book-open-variant" size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.courseName} numberOfLines={1}>{course.name}</Text>
                <Text style={styles.courseMeta}>
                  NRC {course.nrc} · {course.term} · {course.groupsCount} grupos · {course.activeStudentsCount} est.
                </Text>
              </View>
              {isLoadingThis ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <MaterialCommunityIcons
                  name={isExpanded ? 'chevron-up' : 'chevron-down'}
                  size={22}
                  color={colors.textMuted}
                />
              )}
            </Pressable>

            {isExpanded && (
              <View style={styles.cyclesContainer}>
                {cycles.length === 0 ? (
                  <View style={styles.noCyclesState}>
                    <MaterialCommunityIcons name="clipboard-text-outline" size={20} color={colors.border} />
                    <Text style={styles.noCyclesText}>Sin ciclos de evaluación</Text>
                  </View>
                ) : (
                  cycles.map((cycle, index) => {
                    const isOpen = cycle.status === 'open' || cycle.isOpen === true;
                    const isLast = index === cycles.length - 1;
                    return (
                      <Pressable
                        key={cycle.id}
                        style={[styles.cycleRow, !isLast && styles.cycleRowBorder]}
                        onPress={() =>
                          navigation.navigate('EvaluationResponses', {
                            cycleId: cycle.id,
                            cycleName: cycle.title,
                          })
                        }
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={styles.cycleTitle} numberOfLines={1}>{cycle.title}</Text>
                          {cycle.rubrics.length > 0 && (
                            <Text style={styles.cycleRubrics} numberOfLines={1}>
                              {cycle.rubrics.join(' · ')}
                            </Text>
                          )}
                          {cycle.closesAt && (
                            <Text style={styles.cycleMeta}>Cierra: {formatDate(cycle.closesAt)}</Text>
                          )}
                        </View>
                        <View style={styles.cycleRight}>
                          <View style={[styles.statusPill, isOpen ? styles.pillOpen : styles.pillClosed]}>
                            <View style={[styles.statusDot, { backgroundColor: isOpen ? colors.success : colors.border }]} />
                            <Text style={[styles.statusText, { color: isOpen ? colors.success : colors.textMuted }]}>
                              {isOpen ? 'Abierta' : 'Cerrada'}
                            </Text>
                          </View>
                          <MaterialCommunityIcons name="chevron-right" size={18} color={colors.border} />
                        </View>
                      </Pressable>
                    );
                  })
                )}
              </View>
            )}
          </View>
        );
      }}
    />
  );
};

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xxl },
  emptyIconBox: {
    width: 88, height: 88, borderRadius: radius.xl,
    backgroundColor: colors.primarySoft,
    alignItems: 'center', justifyContent: 'center', marginBottom: spacing.lg,
  },
  emptyTitle: { color: colors.text, fontSize: 18, fontWeight: '900' },
  emptySubtitle: { color: colors.textMuted, fontSize: 13, marginTop: spacing.xs, textAlign: 'center', lineHeight: 20 },

  content: { padding: spacing.md, paddingBottom: 36 },
  hint: { fontSize: 13, color: colors.textMuted, textAlign: 'center', marginBottom: spacing.md },

  courseBlock: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    marginBottom: spacing.sm,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  courseRow: {
    flexDirection: 'row', alignItems: 'center',
    padding: spacing.md, gap: spacing.sm,
  },
  courseIconBox: {
    width: 40, height: 40, borderRadius: radius.sm,
    backgroundColor: colors.primarySoft,
    justifyContent: 'center', alignItems: 'center',
  },
  courseName: { fontSize: 15, fontWeight: '700', color: colors.text },
  courseMeta: { fontSize: 12, color: colors.textMuted, marginTop: 2 },

  cyclesContainer: {
    borderTopWidth: 1, borderTopColor: colors.border,
    paddingHorizontal: spacing.md, paddingBottom: spacing.sm, paddingTop: spacing.xs,
  },
  noCyclesState: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  noCyclesText: { fontSize: 13, color: colors.textMuted, fontStyle: 'italic' },

  cycleRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md, gap: spacing.sm },
  cycleRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.background },
  cycleTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
  cycleRubrics: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  cycleMeta: { fontSize: 11, color: colors.textMuted, marginTop: 2 },

  cycleRight: { alignItems: 'flex-end', gap: 4 },
  statusPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: spacing.sm, paddingVertical: 3,
    borderRadius: radius.pill,
  },
  pillOpen: { backgroundColor: '#e6f9ee' },
  pillClosed: { backgroundColor: colors.background },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 10, fontWeight: '700' },
});
