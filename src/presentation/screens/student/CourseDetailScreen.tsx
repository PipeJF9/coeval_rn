import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { colors, radius, spacing } from '../../../core/theme';
import { SurfaceCard } from '../../components/SurfaceCard';
import { SectionHeader } from '../../components/SectionHeader';
import { useAuth } from '../../contexts/AuthContext';
import { useStudent } from '../../contexts/StudentContext';
import { StudentStackParamList } from '../../../navigation/StudentTabs';

type Props = NativeStackScreenProps<StudentStackParamList, 'CourseDetail'>;

export function CourseDetailScreen({ navigation, route }: Props) {
  const { courseId } = route.params;
  const { user } = useAuth();
  const { courses, pendingEvaluations } = useStudent();
  const course = courses.find((item) => item.id === courseId);

  if (!course) {
    return (
      <View style={styles.fallback}>
        <Text style={styles.fallbackTitle}>Curso no encontrado</Text>
      </View>
    );
  }

  const coursePendings = pendingEvaluations.filter((pending) => pending.cycle.courseId === course.id);

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <View style={styles.courseBanner}>
        <Text style={styles.courseTitle}>{course.name}</Text>
        <Text style={styles.courseMeta}>NRC {course.nrc} · {course.term}</Text>
        <View style={styles.courseStats}>
          <StatBox label="Categorías" value={String(course.categoriesCount)} />
          <StatBox label="Grupos" value={String(course.groupsCount)} />
          <StatBox label="Estudiantes" value={String(course.activeStudentsCount)} />
        </View>
      </View>

      <SurfaceCard>
        <SectionHeader title="Evaluaciones pendientes" subtitle="Ahora se envían a toda la categoría" />
        {coursePendings.length === 0 ? (
          <Text style={styles.emptyText}>No hay evaluaciones activas para este curso.</Text>
        ) : (
          coursePendings.map((pending) => {
            const remaining = pending.peersToEvaluate.filter((peer) => !pending.alreadyEvaluatedUids.includes(peer.uid)).length;
            return (
              <View key={pending.cycle.id} style={styles.pendingCard}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.pendingTitle}>{pending.cycle.title}</Text>
                  <Text style={styles.pendingSubtitle}>{pending.category?.name ?? pending.categoryName}</Text>
                  <Text style={styles.pendingDetails}>{remaining} compañeros por evaluar</Text>
                </View>
                <Pressable
                  style={styles.pendingAction}
                  onPress={() => navigation.navigate('EvaluatePeers', { pendingId: pending.cycle.id })}
                >
                  <MaterialCommunityIcons name="arrow-right" size={18} color="#FFFFFF" />
                </Pressable>
              </View>
            );
          })
        )}
      </SurfaceCard>

      <View style={{ height: spacing.lg }} />

      <SectionHeader title="Categorías y grupos" subtitle="Tu grupo se muestra marcado como Tú" />

      {course.categories.map((category) => {
        const myGroups = category.groups.filter((group) =>
          group.students.some((student) => student.email.trim().toLowerCase() === user?.email.trim().toLowerCase()),
        );

        return (
          <SurfaceCard key={category.id}>
            <Text style={styles.categoryTitle}>{category.name}</Text>
            {myGroups.length === 0 ? (
              <Text style={styles.emptyText}>Sin grupos activos en esta categoría.</Text>
            ) : (
              myGroups.map((group) => (
                <View key={group.id} style={styles.groupBlock}>
                  <Text style={styles.groupTitle}>Grupo: {group.name} ({group.code})</Text>
                  {group.students.map((student) => {
                    const isMe = student.email.trim().toLowerCase() === user?.email.trim().toLowerCase();
                    return (
                      <Text key={student.uid} style={[styles.studentLine, isMe && styles.studentLineMe]}>
                        - {student.name || student.email}{isMe ? ' (Tú)' : ''}
                      </Text>
                    );
                  })}
                </View>
              ))
            )}
          </SurfaceCard>
        );
      })}
    </ScrollView>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: 36 },
  courseBanner: { backgroundColor: colors.dark, borderRadius: radius.xl, padding: spacing.xl, marginBottom: spacing.lg },
  courseTitle: { color: '#FFFFFF', fontSize: 26, fontWeight: '900' },
  courseMeta: { marginTop: spacing.xs, color: 'rgba(255,255,255,0.82)', fontSize: 13 },
  courseStats: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  statBox: { flex: 1, borderRadius: radius.md, backgroundColor: 'rgba(255,255,255,0.08)', padding: spacing.md },
  statValue: { color: '#FFFFFF', fontSize: 20, fontWeight: '900' },
  statLabel: { color: 'rgba(255,255,255,0.74)', fontSize: 11, marginTop: 2 },
  pendingCard: { marginTop: spacing.sm, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  pendingTitle: { color: colors.text, fontSize: 15, fontWeight: '800' },
  pendingSubtitle: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  pendingDetails: { color: colors.textMuted, fontSize: 12, marginTop: 6 },
  pendingAction: { width: 44, height: 44, borderRadius: radius.pill, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  categoryTitle: { color: colors.text, fontSize: 16, fontWeight: '800', marginBottom: spacing.sm },
  groupBlock: { marginTop: spacing.sm },
  groupTitle: { color: colors.text, fontSize: 13, fontWeight: '700', marginBottom: 4 },
  studentLine: { color: colors.textMuted, fontSize: 12, marginBottom: 2 },
  studentLineMe: { color: colors.primary, fontWeight: '800' },
  emptyText: { color: colors.textMuted, fontSize: 13 },
  fallback: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  fallbackTitle: { color: colors.text, fontSize: 16, fontWeight: '800' },
});