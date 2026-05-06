import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { colors, radius, spacing } from '../../../core/theme';
import { TeacherCourseOverview } from '../../../domain/entities/academic';
import { AppTextInput } from '../../components/AppTextInput';
import { PrimaryButton } from '../../components/PrimaryButton';
import { SectionHeader } from '../../components/SectionHeader';
import { SurfaceCard } from '../../components/SurfaceCard';
import { useAuth } from '../../contexts/AuthContext';
import { useTeacher } from '../../contexts/TeacherContext';

type SelectedCsvFile = {
  uri: string;
  name: string;
  categoryName: string;
};

export function TeacherHomeScreen({ navigation }: any) {
  const { user } = useAuth();
  const {
    courses,
    isLoadingCourses,
    isCreatingCourse,
    isSyncingCsv,
    syncProgress,
    loadCourses,
    createCourse,
    uploadCsv,
  } = useTeacher();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCsvModal, setShowCsvModal] = useState(false);
  const [courseName, setCourseName] = useState('');
  const [courseNrc, setCourseNrc] = useState('');
  const [courseTerm, setCourseTerm] = useState('');
  const [activeCourse, setActiveCourse] = useState<TeacherCourseOverview | null>(null);
  const [selectedCsvFile, setSelectedCsvFile] = useState<SelectedCsvFile | null>(null);
  const [csvContent, setCsvContent] = useState('');
  const [isReadingCsv, setIsReadingCsv] = useState(false);

  useEffect(() => {
    if (user?.uid) {
      void loadCourses(user.uid);
    }
  }, [loadCourses, user?.uid]);

  const refreshCourses = () => {
    if (user?.uid) {
      void loadCourses(user.uid);
    }
  };

  const stats = useMemo(() => {
    const totalCategories = courses.reduce((sum, course) => sum + course.categoriesCount, 0);
    const totalGroups = courses.reduce((sum, course) => sum + course.groupsCount, 0);
    const totalStudents = courses.reduce((sum, course) => sum + course.activeStudentsCount, 0);

    return [
      { label: 'Cursos', value: courses.length },
      { label: 'Categorías', value: totalCategories },
      { label: 'Grupos', value: totalGroups },
      { label: 'Estudiantes', value: totalStudents },
    ];
  }, [courses]);

  const normalizeText = (value: string) =>
    value
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '');

  const extractCategoryFromFileName = (fileName: string) => {
    const withoutExtension = fileName.replace(/\.csv$/i, '');
    const normalized = normalizeText(withoutExtension);

    if (!normalized.startsWith('categoria')) {
      return null;
    }

    const prefix = withoutExtension.split('_')[0] ?? withoutExtension;
    return prefix.trim();
  };

  const handleCreateCourse = async () => {
    if (!courseName.trim() || !courseNrc.trim() || !courseTerm.trim()) {
      Alert.alert('Faltan datos', 'Completa nombre, NRC y término.');
      return;
    }

    if (!user?.uid) {
      Alert.alert('Sesión inválida', 'No se pudo identificar al profesor.');
      return;
    }

    const success = await createCourse(courseName.trim(), courseNrc.trim(), courseTerm.trim(), user.uid);
    if (!success) {
      Alert.alert('Error', 'No se pudo crear el curso.');
      return;
    }

    setCourseName('');
    setCourseNrc('');
    setCourseTerm('');
    setShowCreateModal(false);
  };

  const openCsvModal = (course: TeacherCourseOverview) => {
    setActiveCourse(course);
    setSelectedCsvFile(null);
    setCsvContent('');
    setShowCsvModal(true);
  };

  const handlePickCsvFile = async () => {
    try {
      if (!activeCourse) {
        Alert.alert('Curso no seleccionado', 'Selecciona un curso primero.');
        return;
      }

      setIsReadingCsv(true);
      const result = await DocumentPicker.getDocumentAsync({
        type: 'text/csv',
        copyToCacheDirectory: true,
      });

      if (result.canceled || result.assets.length === 0) {
        return;
      }

      const asset = result.assets[0];
      const categoryName = extractCategoryFromFileName(asset.name);

      if (!categoryName) {
        Alert.alert(
          'Nombre inválido',
          'El archivo debe iniciar con "Categoria" para inferir la categoría automáticamente.'
        );
        return;
      }

      const response = await fetch(asset.uri);
      const content = await response.text();

      setSelectedCsvFile({
        uri: asset.uri,
        name: asset.name,
        categoryName,
      });
      setCsvContent(content);
    } catch (error) {
      Alert.alert('Error', 'No se pudo leer el archivo CSV.');
    } finally {
      setIsReadingCsv(false);
    }
  };

  const handleSubmitCsv = async () => {
    if (!activeCourse) {
      Alert.alert('Curso no seleccionado', 'Selecciona un curso primero.');
      return;
    }

    if (!selectedCsvFile || !csvContent.trim()) {
      Alert.alert('CSV requerido', 'Selecciona un archivo CSV válido.');
      return;
    }

    if (!user?.uid) {
      Alert.alert('Sesión inválida', 'No se pudo identificar al profesor.');
      return;
    }

    const success = await uploadCsv(activeCourse.id, selectedCsvFile.categoryName, csvContent, user.uid);
    if (success) {
      setShowCsvModal(false);
      setSelectedCsvFile(null);
      setCsvContent('');
      setActiveCourse(null);
    } else {
      Alert.alert('Error', 'No se pudo procesar el CSV.');
    }
  };

  const renderCourse = ({ item }: { item: TeacherCourseOverview }) => {
    return (
      <View style={styles.courseWrap}>
        <SurfaceCard>
          <View style={styles.courseHeader}>
            <View style={styles.courseIcon}>
              <MaterialCommunityIcons name="book-open-variant" size={20} color={colors.primary} />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.courseTitle}>{item.name}</Text>
              <Text style={styles.courseMeta}>NRC {item.nrc} · {item.term}</Text>
            </View>
          </View>

          <View style={styles.statsRow}>
            <StatPill label="Categorías" value={item.categoriesCount} />
            <StatPill label="Grupos" value={item.groupsCount} />
            <StatPill label="Estudiantes" value={item.activeStudentsCount} />
          </View>

          <View style={styles.actionRow}>
            <Pressable style={styles.secondaryAction} onPress={() => navigation.navigate('TeacherCourseDetail', { courseId: item.id })}>
              <Text style={styles.secondaryActionText}>Ver detalle</Text>
            </Pressable>
            <Pressable style={styles.secondaryAction} onPress={() => openCsvModal(item)}>
              <Text style={styles.secondaryActionText}>Cargar CSV</Text>
            </Pressable>
          </View>

          <PrimaryButton
            title="Lanzar examen por categoría"
            onPress={() => navigation.navigate('CreateEvaluation', { courseId: item.id })}
            style={{ marginTop: spacing.md }}
          />

          {item.categories.length > 0 ? (
            <View style={styles.categoryList}>
              <Text style={styles.categoriesTitle}>Categorías y grupos</Text>
              {item.categories.map((category) => (
                <View key={category.id} style={styles.categoryRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.categoryName}>{category.name}</Text>
                    <Text style={styles.categoryMetaText}>{category.groups.length} grupos · {category.activeStudentsCount} estudiantes</Text>
                  </View>
                  <View style={styles.categoryBadge}>
                    <Text style={styles.categoryBadgeText}>{category.groups.length}</Text>
                  </View>
                </View>
              ))}
            </View>
          ) : null}
        </SurfaceCard>
      </View>
    );
  };

  return (
    <>
      <FlatList
        data={courses}
        keyExtractor={(item) => item.id}
        renderItem={renderCourse}
        refreshControl={<RefreshControl refreshing={isLoadingCourses || isSyncingCsv || isReadingCsv} onRefresh={refreshCourses} />}
        contentContainerStyle={styles.content}
        ListHeaderComponent={(
          <View>
            <View style={styles.heroCard}>
              <Text style={styles.heroLabel}>Profesor</Text>
              <Text style={styles.heroName}>{user?.name ?? 'Docente'}</Text>
              <Text style={styles.heroEmail}>{user?.email}</Text>

              <View style={styles.heroStats}>
                {stats.map((stat) => (
                  <View key={stat.label} style={styles.heroStatBox}>
                    <Text style={styles.heroStatValue}>{stat.value}</Text>
                    <Text style={styles.heroStatLabel}>{stat.label}</Text>
                  </View>
                ))}
              </View>
            </View>

            <SurfaceCard>
              <SectionHeader title="Gestión de cursos" subtitle="Crea cursos y sincroniza categorías con CSV." />
              <PrimaryButton title="Nuevo curso" onPress={() => setShowCreateModal(true)} />
            </SurfaceCard>

            <View style={{ height: spacing.lg }} />

            <SectionHeader title="Mis cursos" subtitle="Selecciona un curso para revisar su estructura y lanzar evaluaciones." />
          </View>
        )}
        ListEmptyComponent={(
          <SurfaceCard>
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="school-outline" size={40} color={colors.textMuted} />
              <Text style={styles.emptyTitle}>No tienes cursos todavía</Text>
              <Text style={styles.emptySubtitle}>Crea tu primer curso para empezar a sincronizar categorías por CSV.</Text>
            </View>
          </SurfaceCard>
        )}
        ListFooterComponent={<View style={{ height: spacing.xl }} />}
      />

      <Modal visible={showCreateModal} animationType="slide" onRequestClose={() => setShowCreateModal(false)}>
        <View style={styles.modalRoot}>
          <View style={styles.modalHeader}>
            <Pressable onPress={() => setShowCreateModal(false)} hitSlop={10}>
              <MaterialCommunityIcons name="close" size={24} color={colors.textMuted} />
            </Pressable>
            <Text style={styles.modalTitle}>Crear curso</Text>
            <View style={{ width: 24 }} />
          </View>

          <View style={styles.modalContent}>
            <AppTextInput label="Nombre del curso" value={courseName} onChangeText={setCourseName} placeholder="Ej: Cálculo I" editable={!isCreatingCourse} />
            <View style={{ height: spacing.md }} />
            <AppTextInput label="NRC" value={courseNrc} onChangeText={setCourseNrc} placeholder="Ej: 12345" editable={!isCreatingCourse} />
            <View style={{ height: spacing.md }} />
            <AppTextInput label="Término" value={courseTerm} onChangeText={setCourseTerm} placeholder="Ej: 2026-1" editable={!isCreatingCourse} />
            <View style={{ height: spacing.xl }} />
            <PrimaryButton title={isCreatingCourse ? 'Creando...' : 'Crear curso'} onPress={handleCreateCourse} loading={isCreatingCourse} />
          </View>
        </View>
      </Modal>

      <Modal visible={showCsvModal} animationType="slide" onRequestClose={() => setShowCsvModal(false)}>
        <View style={styles.modalRoot}>
          <View style={styles.modalHeader}>
            <Pressable onPress={() => setShowCsvModal(false)} hitSlop={10}>
              <MaterialCommunityIcons name="close" size={24} color={colors.textMuted} />
            </Pressable>
            <Text style={styles.modalTitle}>Cargar CSV</Text>
            <View style={{ width: 24 }} />
          </View>

          <View style={styles.modalContent}>
            <Text style={styles.modalCourseName}>{activeCourse?.name ?? 'Curso'}</Text>
            <Text style={styles.modalInstruction}>
              Selecciona un archivo cuyo nombre comience con "Categoria". El nombre del archivo se usará para sincronizar la categoría.
            </Text>

            <Pressable style={styles.fileCard} onPress={handlePickCsvFile} disabled={isSyncingCsv || isReadingCsv}>
              {isReadingCsv ? (
                <ActivityIndicator color={colors.primary} />
              ) : (
                <MaterialCommunityIcons name="file-delimited-outline" size={22} color={colors.primary} />
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.fileCardTitle}>{selectedCsvFile ? 'Archivo seleccionado' : 'Seleccionar CSV'}</Text>
                <Text style={styles.fileCardSubtitle}>{selectedCsvFile?.name ?? 'Toca para buscar un archivo .csv'}</Text>
                {selectedCsvFile ? <Text style={styles.fileCardMeta}>Categoría inferida: {selectedCsvFile.categoryName}</Text> : null}
              </View>
            </Pressable>

            {syncProgress ? (
              <View style={[styles.progressBox, syncProgress.status === 'success' && styles.progressSuccess, syncProgress.status === 'error' && styles.progressError]}>
                <Text style={styles.progressText}>{syncProgress.message}</Text>
              </View>
            ) : null}

            <View style={{ height: spacing.lg }} />
            <PrimaryButton title={isSyncingCsv ? 'Procesando...' : 'Procesar CSV'} onPress={handleSubmitCsv} loading={isSyncingCsv} />
          </View>
        </View>
      </Modal>
    </>
  );
}

function StatPill({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.statPill}>
      <Text style={styles.statPillValue}>{value}</Text>
      <Text style={styles.statPillLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    paddingBottom: 36,
    backgroundColor: colors.background,
  },
  heroCard: {
    backgroundColor: colors.dark,
    borderRadius: radius.xl,
    padding: spacing.xl,
    marginBottom: spacing.lg,
  },
  heroLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  heroName: {
    marginTop: spacing.xs,
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '900',
  },
  heroEmail: {
    marginTop: spacing.xs,
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
  },
  heroStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  heroStatBox: {
    flexBasis: '47%',
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.08)',
    padding: spacing.md,
  },
  heroStatValue: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
  },
  heroStatLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    marginTop: 2,
  },
  courseWrap: {
    marginBottom: spacing.md,
  },
  courseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  courseIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  courseTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  courseMeta: {
    marginTop: 2,
    color: colors.textMuted,
    fontSize: 12,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  statPill: {
    flex: 1,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  statPillValue: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
  },
  statPillLabel: {
    marginTop: 2,
    color: colors.textMuted,
    fontSize: 11,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  secondaryAction: {
    flex: 1,
    minHeight: 44,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryActionText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  categoryList: {
    marginTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
  },
  categoriesTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
    marginBottom: spacing.sm,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  categoryName: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  categoryMetaText: {
    marginTop: 2,
    color: colors.textMuted,
    fontSize: 12,
  },
  categoryBadge: {
    minWidth: 34,
    height: 34,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  categoryBadgeText: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: '800',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  emptyTitle: {
    marginTop: spacing.md,
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  emptySubtitle: {
    marginTop: spacing.xs,
    color: colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
  },
  modalRoot: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: 40,
  },
  modalHeader: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  modalTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  modalContent: {
    padding: spacing.lg,
  },
  modalCourseName: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '900',
  },
  modalInstruction: {
    marginTop: spacing.xs,
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  fileCard: {
    marginTop: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  fileCardTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
  },
  fileCardSubtitle: {
    marginTop: 2,
    color: colors.textMuted,
    fontSize: 12,
  },
  fileCardMeta: {
    marginTop: 4,
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: '700',
  },
  progressBox: {
    marginTop: spacing.lg,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  progressSuccess: {
    borderColor: 'rgba(46, 139, 87, 0.35)',
    backgroundColor: 'rgba(46, 139, 87, 0.08)',
  },
  progressError: {
    borderColor: 'rgba(209, 73, 91, 0.35)',
    backgroundColor: 'rgba(209, 73, 91, 0.08)',
  },
  progressText: {
    color: colors.text,
    fontSize: 13,
    lineHeight: 18,
  },
});
