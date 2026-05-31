import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { colors, radius, spacing } from '../../../core/theme';
import { AppTextInput } from '../../components/AppTextInput';
import { PrimaryButton } from '../../components/PrimaryButton';
import { SurfaceCard } from '../../components/SurfaceCard';
import { useAuth } from '../../contexts/AuthContext';
import { useTeacher } from '../../contexts/TeacherContext';
import { TeacherCourseOverview } from '../../../domain/entities/academic';

export const TeacherHomeScreen = ({ navigation }: any) => {
  const { user } = useAuth();
  const { courses, isLoadingCourses, isCreatingCourse, loadCourses, createCourse, selectCourse } = useTeacher();

  const [showModal, setShowModal] = useState(false);
  const [courseName, setCourseName] = useState('');
  const [courseNrc, setCourseNrc] = useState('');
  const [courseTerm, setCourseTerm] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.uid) loadCourses(user.uid);
  }, [user?.uid]);

  const resetForm = () => {
    setCourseName('');
    setCourseNrc('');
    setCourseTerm('');
    setFormError(null);
  };

  const handleCreate = async () => {
    if (!courseName.trim() || !courseNrc.trim() || !courseTerm.trim()) {
      setFormError('Completa todos los campos');
      return;
    }
    if (!user?.uid) return;
    setFormError(null);
    const success = await createCourse(courseName.trim(), courseNrc.trim(), courseTerm.trim(), user.uid);
    if (success) {
      resetForm();
      setShowModal(false);
    } else {
      setFormError('No se pudo crear el curso. Intenta de nuevo.');
    }
  };

  const handleSelectCourse = (course: TeacherCourseOverview) => {
    selectCourse(course);
    navigation.navigate('TeacherCourseDetail', { courseId: course.id, courseName: course.name });
  };

  const totalStudents = courses.reduce((sum, c) => sum + c.activeStudentsCount, 0);

  return (
    <View style={styles.root}>
      <FlatList
        data={courses}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoadingCourses}
            onRefresh={() => user?.uid && loadCourses(user.uid)}
            tintColor={colors.primary}
          />
        }
        ListHeaderComponent={(
          <View style={styles.header}>
            <View style={styles.heroCard}>
              <View style={styles.heroTop}>
                <View style={styles.heroIconBox}>
                  <MaterialCommunityIcons name="school" size={28} color={colors.primary} />
                </View>
                <View style={{ flex: 1, marginLeft: spacing.md }}>
                  <Text style={styles.heroLabel}>Docente</Text>
                  <Text style={styles.heroName} numberOfLines={1}>{user?.name || 'Profesor'}</Text>
                </View>
              </View>
              <View style={styles.heroStats}>
                <View style={styles.heroStatItem}>
                  <Text style={styles.heroStatValue}>{courses.length}</Text>
                  <Text style={styles.heroStatLabel}>Cursos</Text>
                </View>
                <View style={styles.heroStatDivider} />
                <View style={styles.heroStatItem}>
                  <Text style={styles.heroStatValue}>{totalStudents}</Text>
                  <Text style={styles.heroStatLabel}>Estudiantes</Text>
                </View>
              </View>
            </View>

            <View style={styles.sectionRow}>
              <Text style={styles.sectionTitle}>Mis cursos</Text>
              <Pressable style={styles.newBtn} onPress={() => setShowModal(true)}>
                <MaterialCommunityIcons name="plus" size={16} color="#fff" />
                <Text style={styles.newBtnText}>Nuevo</Text>
              </Pressable>
            </View>
          </View>
        )}
        renderItem={({ item }) => (
          <Pressable style={styles.cardWrap} onPress={() => handleSelectCourse(item)}>
            <SurfaceCard>
              <View style={styles.courseRow}>
                <View style={styles.courseIconBox}>
                  <MaterialCommunityIcons name="book-open-variant" size={22} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.courseName} numberOfLines={1}>{item.name}</Text>
                  <Text style={styles.courseMeta}>NRC {item.nrc} · {item.term}</Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={20} color={colors.textMuted} />
              </View>
              <View style={styles.statsRow}>
                <StatChip icon="folder-multiple-outline" value={item.categoriesCount} label="Categorías" />
                <StatChip icon="account-group-outline" value={item.groupsCount} label="Grupos" />
                <StatChip icon="account-outline" value={item.activeStudentsCount} label="Estudiantes" />
              </View>
            </SurfaceCard>
          </Pressable>
        )}
        ListEmptyComponent={!isLoadingCourses ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconBox}>
              <MaterialCommunityIcons name="book-open-outline" size={44} color={colors.primary} />
            </View>
            <Text style={styles.emptyTitle}>Sin cursos todavía</Text>
            <Text style={styles.emptySubtitle}>Crea tu primer curso para comenzar.</Text>
          </View>
        ) : (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={colors.primary} />
          </View>
        )}
      />

      <Modal
        visible={showModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => { setShowModal(false); resetForm(); }}
      >
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.select({ ios: 'padding', android: undefined })}>
          <View style={styles.modalRoot}>
            <View style={styles.modalHeader}>
              <Pressable onPress={() => { setShowModal(false); resetForm(); }} hitSlop={10}>
                <MaterialCommunityIcons name="close" size={24} color={colors.textMuted} />
              </Pressable>
              <Text style={styles.modalTitle}>Nuevo Curso</Text>
              <View style={{ width: 24 }} />
            </View>
            <ScrollView
              style={styles.modalScroll}
              contentContainerStyle={styles.modalContent}
              keyboardShouldPersistTaps="handled"
            >
              <AppTextInput
                label="Nombre del curso"
                value={courseName}
                onChangeText={setCourseName}
                placeholder="Ej: Cálculo I"
                editable={!isCreatingCourse}
              />
              <View style={{ height: spacing.md }} />
              <AppTextInput
                label="NRC"
                value={courseNrc}
                onChangeText={setCourseNrc}
                placeholder="Ej: 12345"
                keyboardType="numeric"
                editable={!isCreatingCourse}
              />
              <View style={{ height: spacing.md }} />
              <AppTextInput
                label="Término"
                value={courseTerm}
                onChangeText={setCourseTerm}
                placeholder="Ej: 2026-1"
                editable={!isCreatingCourse}
              />
              {formError ? <Text style={styles.formError}>{formError}</Text> : null}
              <View style={{ height: spacing.xl }} />
              <PrimaryButton title="Crear Curso" onPress={handleCreate} loading={isCreatingCourse} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

function StatChip({ icon, value, label }: { icon: any; value: number; label: string }) {
  return (
    <View style={styles.statChip}>
      <MaterialCommunityIcons name={icon} size={13} color={colors.primary} />
      <Text style={styles.statChipValue}>{value}</Text>
      <Text style={styles.statChipLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: 36 },

  header: { marginBottom: spacing.md },
  heroCard: {
    backgroundColor: colors.dark,
    borderRadius: radius.xl,
    padding: spacing.xl,
    marginBottom: spacing.lg,
  },
  heroTop: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.lg },
  heroIconBox: {
    width: 52, height: 52,
    borderRadius: radius.lg,
    backgroundColor: 'rgba(247,105,0,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  heroLabel: { color: 'rgba(255,255,255,0.55)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 },
  heroName: { color: '#FFFFFF', fontSize: 20, fontWeight: '900', marginTop: 2 },
  heroStats: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: radius.md,
    paddingVertical: spacing.md,
  },
  heroStatItem: { flex: 1, alignItems: 'center' },
  heroStatDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.12)' },
  heroStatValue: { color: '#FFFFFF', fontSize: 22, fontWeight: '900' },
  heroStatLabel: { color: 'rgba(255,255,255,0.55)', fontSize: 12, marginTop: 2 },

  sectionRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: spacing.sm,
  },
  sectionTitle: { color: colors.text, fontSize: 18, fontWeight: '900' },
  newBtn: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    backgroundColor: colors.primary, borderRadius: radius.pill,
    paddingHorizontal: spacing.md, paddingVertical: 6,
  },
  newBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },

  cardWrap: { marginBottom: spacing.md },
  courseRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
  courseIconBox: {
    width: 44, height: 44, borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: 'center', justifyContent: 'center', marginRight: spacing.md,
  },
  courseName: { color: colors.text, fontSize: 16, fontWeight: '800' },
  courseMeta: { color: colors.textMuted, fontSize: 12, marginTop: 2 },

  statsRow: { flexDirection: 'row', gap: spacing.sm },
  statChip: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.background, borderRadius: radius.sm, padding: spacing.sm,
  },
  statChipValue: { color: colors.text, fontSize: 13, fontWeight: '800' },
  statChipLabel: { color: colors.textMuted, fontSize: 11 },

  emptyState: { paddingVertical: spacing.xl * 2, alignItems: 'center', paddingHorizontal: spacing.xl },
  emptyIconBox: {
    width: 88, height: 88, borderRadius: radius.xl,
    backgroundColor: colors.primarySoft,
    alignItems: 'center', justifyContent: 'center', marginBottom: spacing.lg,
  },
  emptyTitle: { color: colors.text, fontSize: 18, fontWeight: '900' },
  emptySubtitle: { color: colors.textMuted, fontSize: 13, marginTop: spacing.xs, textAlign: 'center' },

  loadingBox: { paddingVertical: 48, alignItems: 'center' },

  modalRoot: { flex: 1, backgroundColor: colors.background },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  modalTitle: { color: colors.text, fontSize: 18, fontWeight: '800' },
  modalScroll: { flex: 1 },
  modalContent: { padding: spacing.lg },
  formError: { marginTop: spacing.md, color: colors.danger, fontSize: 13 },
});
