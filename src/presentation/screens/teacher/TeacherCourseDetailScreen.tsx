import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import * as DocumentPicker from 'expo-document-picker';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { colors, radius, spacing } from '../../../core/theme';
import { SurfaceCard } from '../../components/SurfaceCard';
import { PrimaryButton } from '../../components/PrimaryButton';
import { useTeacher } from '../../contexts/TeacherContext';
import { useAuth } from '../../contexts/AuthContext';
import { EvaluationCycleData } from '../../../domain/entities/academic';
import { academicUseCases } from '../../../di/container';

export const TeacherCourseDetailScreen = ({ route, navigation }: any) => {
  const courseId = route?.params?.courseId;
  const { user } = useAuth();
  const { courses, isSyncingCsv, syncProgress, uploadCsv, selectCourse } = useTeacher();

  const [showCsvModal, setShowCsvModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<{ uri: string; name: string } | null>(null);
  const [derivedCategoryName, setDerivedCategoryName] = useState('');
  const [csvContent, setCsvContent] = useState('');

  const [cycles, setCycles] = useState<EvaluationCycleData[]>([]);
  const [isLoadingCycles, setIsLoadingCycles] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const course = courses.find((c) => c.id === courseId);

  useEffect(() => {
    if (course) selectCourse(course);
  }, [course?.id]);

  useEffect(() => {
    if (courseId) loadCycles();
  }, [courseId]);

  const loadCycles = async () => {
    setIsLoadingCycles(true);
    try {
      const result = await academicUseCases.getEvaluationCyclesByCourse.execute(courseId);
      setCycles(result);
    } catch {
      // silently fail
    } finally {
      setIsLoadingCycles(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadCycles();
    setRefreshing(false);
  };

  const extractCategoryName = (fileName: string): string | null => {
    const nameWithoutExt = fileName.replace(/\.csv$/i, '');
    const normalized = nameWithoutExt.toLowerCase()
      .replace(/[áàäâã]/g, 'a').replace(/[éèëê]/g, 'e')
      .replace(/[íìïî]/g, 'i').replace(/[óòöôõ]/g, 'o')
      .replace(/[úùüû]/g, 'u').replace(/ñ/g, 'n');
    if (!normalized.startsWith('categoria')) return null;
    return nameWithoutExt;
  };

  const resetCsvModal = () => {
    setSelectedFile(null);
    setCsvContent('');
    setDerivedCategoryName('');
    setShowCsvModal(false);
  };

  const handlePickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: 'text/csv' });
      if (!result.canceled && result.assets.length > 0) {
        const file = result.assets[0];
        const categoryName = extractCategoryName(file.name);
        if (!categoryName) {
          Alert.alert('Nombre de archivo inválido', 'El archivo debe comenzar con "Categoria" (ej: CategoriaA_AllGroups.csv)');
          return;
        }
        setSelectedFile({ uri: file.uri, name: file.name });
        setDerivedCategoryName(categoryName);
        const response = await fetch(file.uri);
        setCsvContent(await response.text());
      }
    } catch {
      Alert.alert('Error', 'No se pudo seleccionar el archivo');
    }
  };

  const handleUploadCsv = async () => {
    if (!csvContent.trim()) { Alert.alert('Error', 'Selecciona un archivo CSV'); return; }
    if (!user?.uid || !course) { Alert.alert('Error', 'Información incompleta'); return; }

    const success = await uploadCsv(course.id, derivedCategoryName, csvContent, user.uid);
    if (success) {
      resetCsvModal();
      await loadCycles();
    }
  };

  if (!course) {
    return (
      <View style={styles.fallback}>
        <Text style={styles.fallbackText}>Curso no encontrado</Text>
      </View>
    );
  }

  // Organize cycles by categoryId
  const cyclesByCategory = new Map<string, EvaluationCycleData[]>();
  for (const cycle of cycles) {
    const key = cycle.categoryId || '';
    if (!key) continue;
    const list = cyclesByCategory.get(key) ?? [];
    list.push(cycle);
    cyclesByCategory.set(key, list);
  }

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  };

  return (
    <View style={styles.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {/* Course header */}
        <View style={styles.courseHeader}>
          <Text style={styles.courseName}>{course.name}</Text>
          <View style={styles.courseMetaRow}>
            <View style={styles.metaChip}>
              <MaterialCommunityIcons name="identifier" size={14} color="rgba(255,255,255,0.7)" />
              <Text style={styles.metaChipText}>{course.nrc}</Text>
            </View>
            <View style={styles.metaChip}>
              <MaterialCommunityIcons name="calendar" size={14} color="rgba(255,255,255,0.7)" />
              <Text style={styles.metaChipText}>{course.term}</Text>
            </View>
          </View>
          <View style={styles.headerStats}>
            <View style={styles.headerStatItem}>
              <Text style={styles.headerStatValue}>{course.activeStudentsCount}</Text>
              <Text style={styles.headerStatLabel}>Estudiantes</Text>
            </View>
            <View style={styles.headerStatDivider} />
            <View style={styles.headerStatItem}>
              <Text style={styles.headerStatValue}>{course.groupsCount}</Text>
              <Text style={styles.headerStatLabel}>Grupos</Text>
            </View>
            <View style={styles.headerStatDivider} />
            <View style={styles.headerStatItem}>
              <Text style={styles.headerStatValue}>{course.categoriesCount}</Text>
              <Text style={styles.headerStatLabel}>Categorías</Text>
            </View>
          </View>
        </View>

        {/* Action buttons */}
        <View style={styles.actionsRow}>
          <Pressable style={styles.actionBtn} onPress={() => setShowCsvModal(true)}>
            <MaterialCommunityIcons name="file-upload" size={18} color="#fff" />
            <Text style={styles.actionBtnText}>Cargar CSV</Text>
          </Pressable>
          <Pressable
            style={[styles.actionBtn, styles.actionBtnOutline]}
            onPress={() => navigation.navigate('CreateEvaluation', { courseId: course.id })}
          >
            <MaterialCommunityIcons name="plus-circle-outline" size={18} color={colors.primary} />
            <Text style={[styles.actionBtnText, { color: colors.primary }]}>Nueva evaluación</Text>
          </Pressable>
        </View>

        {/* Categories section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Actividades ({course.categoriesCount})</Text>
          {course.categories.length === 0 ? (
            <EmptyCard icon="folder-open-outline" message="Sin actividades. Carga un CSV para crear." />
          ) : (
            course.categories.map((category) => (
              <View key={category.id} style={styles.categoryCard}>
                <View style={styles.categoryCardHeader}>
                  <View style={styles.categoryIconBox}>
                    <MaterialCommunityIcons name="folder" size={16} color={colors.primary} />
                  </View>
                  <Text style={styles.categoryName}>{category.name}</Text>
                  <View style={styles.categoryBadge}>
                    <Text style={styles.categoryBadgeText}>{category.groups.length} grupos</Text>
                  </View>
                </View>
                {category.groups.map((group, idx) => (
                  <View
                    key={group.id}
                    style={[styles.groupRow, idx < category.groups.length - 1 && styles.groupRowDivider]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.groupName}>{group.name}</Text>
                      <Text style={styles.groupCode}>{group.code}</Text>
                    </View>
                    <View style={styles.studentCountBadge}>
                      <MaterialCommunityIcons name="account-multiple" size={12} color="#fff" />
                      <Text style={styles.studentCountText}>{group.activeStudentsCount}</Text>
                    </View>
                  </View>
                ))}
              </View>
            ))
          )}
        </View>

        {/* Evaluation cycles section */}
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionTitle}>Ciclos de evaluación</Text>
            {isLoadingCycles && <ActivityIndicator size="small" color={colors.primary} />}
          </View>

          {!isLoadingCycles && cycles.length === 0 ? (
            <EmptyCard icon="clipboard-text-outline" message="Sin ciclos. Pulsa «Nueva evaluación» para crear." />
          ) : (
            course.categories.map((category) => {
              const categoryCycles = cyclesByCategory.get(category.id) ?? [];
              if (categoryCycles.length === 0) return null;
              return (
                <View key={category.id} style={styles.cycleCategoryBlock}>
                  <Text style={styles.cycleCategoryLabel}>{category.name.toUpperCase()}</Text>
                  {categoryCycles.map((cycle) => {
                    const isOpen = cycle.status === 'open' || cycle.isOpen === true;
                    return (
                      <Pressable
                        key={cycle.id}
                        style={styles.cycleCard}
                        onPress={() =>
                          navigation.navigate('EvaluationResponses', {
                            cycleId: cycle.id,
                            cycleName: cycle.title,
                          })
                        }
                      >
                        <View style={styles.cycleCardHeader}>
                          <Text style={styles.cycleTitle} numberOfLines={1}>{cycle.title}</Text>
                          <View style={[styles.statusPill, isOpen ? styles.pillOpen : styles.pillClosed]}>
                            <View style={[styles.statusDot, { backgroundColor: isOpen ? colors.success : colors.border }]} />
                            <Text style={[styles.statusText, { color: isOpen ? colors.success : colors.textMuted }]}>
                              {isOpen ? 'Abierta' : 'Cerrada'}
                            </Text>
                          </View>
                          <MaterialCommunityIcons name="chart-bar" size={16} color={colors.primary} />
                        </View>
                        {cycle.rubrics.length > 0 && (
                          <View style={styles.rubricChips}>
                            {cycle.rubrics.map((r, i) => (
                              <View key={i} style={styles.rubricChip}>
                                <Text style={styles.rubricChipText}>{r}</Text>
                              </View>
                            ))}
                          </View>
                        )}
                        {cycle.closesAt && (
                          <View style={styles.cycleClosesRow}>
                            <MaterialCommunityIcons name="clock-outline" size={11} color={colors.textMuted} />
                            <Text style={styles.cycleClosesText}>Cierra: {formatDate(cycle.closesAt)}</Text>
                          </View>
                        )}
                      </Pressable>
                    );
                  })}
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* CSV upload modal */}
      <Modal
        visible={showCsvModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={resetCsvModal}
      >
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.select({ ios: 'padding', android: undefined })}>
          <View style={styles.modalRoot}>
            <View style={styles.modalHeader}>
              <Pressable onPress={resetCsvModal} hitSlop={10}>
                <MaterialCommunityIcons name="close" size={24} color={colors.textMuted} />
              </Pressable>
              <Text style={styles.modalTitle}>Cargar CSV</Text>
              <View style={{ width: 24 }} />
            </View>
            <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
              <View style={styles.csvHintBox}>
                <MaterialCommunityIcons name="information-outline" size={16} color={colors.info} />
                <Text style={styles.csvHintText}>
                  El nombre del archivo debe comenzar con "Categoria" (ej: CategoriaA_AllGroups.csv).{'\n'}La categoría se detectará automáticamente del nombre del archivo.
                </Text>
              </View>
              <Pressable
                style={[styles.filePickBtn, isSyncingCsv && styles.disabled]}
                onPress={handlePickFile}
                disabled={isSyncingCsv}
              >
                <MaterialCommunityIcons name="file-upload-outline" size={24} color={colors.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.filePickText}>
                    {selectedFile ? selectedFile.name : 'Seleccionar archivo CSV'}
                  </Text>
                  {!selectedFile && (
                    <Text style={styles.filePickSub}>Toca para abrir el selector de archivos</Text>
                  )}
                </View>
                {selectedFile && (
                  <MaterialCommunityIcons name="check-circle" size={20} color={colors.success} />
                )}
              </Pressable>
              {derivedCategoryName ? (
                <View style={styles.detectedCategoryBox}>
                  <MaterialCommunityIcons name="folder-check" size={16} color={colors.success} />
                  <Text style={styles.detectedCategoryText}>Categoría detectada: <Text style={styles.detectedCategoryName}>{derivedCategoryName}</Text></Text>
                </View>
              ) : null}

              {syncProgress && (
                <View
                  style={[
                    styles.progressBox,
                    syncProgress.status === 'success' && styles.progressSuccess,
                    syncProgress.status === 'error' && styles.progressError,
                  ]}
                >
                  <Text style={styles.progressText}>{syncProgress.message}</Text>
                </View>
              )}

              <View style={{ height: spacing.lg }} />
              <PrimaryButton
                title="Procesar CSV"
                onPress={handleUploadCsv}
                loading={isSyncingCsv}
              />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

function EmptyCard({ icon, message }: { icon: any; message: string }) {
  return (
    <View style={styles.emptyCard}>
      <MaterialCommunityIcons name={icon} size={28} color={colors.border} />
      <Text style={styles.emptyCardText}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  fallback: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  fallbackText: { color: colors.text, fontSize: 16, fontWeight: '700' },

  courseHeader: {
    backgroundColor: colors.dark,
    padding: spacing.xl,
    paddingTop: spacing.lg,
  },
  courseName: { color: '#FFFFFF', fontSize: 26, fontWeight: '900' },
  courseMetaRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  metaChip: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaChipText: { color: 'rgba(255,255,255,0.75)', fontSize: 13 },
  headerStats: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    marginTop: spacing.lg,
  },
  headerStatItem: { flex: 1, alignItems: 'center' },
  headerStatDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.12)' },
  headerStatValue: { color: '#FFFFFF', fontSize: 20, fontWeight: '900' },
  headerStatLabel: { color: 'rgba(255,255,255,0.55)', fontSize: 11, marginTop: 2 },

  actionsRow: {
    flexDirection: 'row', gap: spacing.sm,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
  },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
    backgroundColor: colors.primary, paddingVertical: spacing.md, borderRadius: radius.md,
  },
  actionBtnOutline: {
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.primary,
  },
  actionBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  section: { padding: spacing.lg, paddingTop: spacing.md },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  sectionTitle: { fontSize: 16, fontWeight: '900', color: colors.text, marginBottom: spacing.md },

  categoryCard: {
    backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border,
    marginBottom: spacing.md, overflow: 'hidden',
  },
  categoryCardHeader: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.background,
  },
  categoryIconBox: {
    width: 28, height: 28, borderRadius: radius.sm,
    backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center',
  },
  categoryName: { flex: 1, fontSize: 14, fontWeight: '700', color: colors.text },
  categoryBadge: { backgroundColor: colors.primarySoft, paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radius.pill },
  categoryBadgeText: { fontSize: 11, color: colors.primary, fontWeight: '700' },
  groupRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  groupRowDivider: { borderBottomWidth: 1, borderBottomColor: colors.background },
  groupName: { fontSize: 13, fontWeight: '700', color: colors.text },
  groupCode: { fontSize: 11, color: colors.textMuted, marginTop: 1 },
  studentCountBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.primary, paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radius.pill,
  },
  studentCountText: { color: '#fff', fontSize: 11, fontWeight: '700' },

  emptyCard: {
    backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.xl,
    alignItems: 'center', borderWidth: 1, borderColor: colors.border, gap: spacing.sm,
  },
  emptyCardText: { color: colors.textMuted, fontSize: 13, textAlign: 'center' },

  cycleCategoryBlock: { marginBottom: spacing.md },
  cycleCategoryLabel: { fontSize: 11, fontWeight: '700', color: colors.textMuted, letterSpacing: 0.6, marginBottom: spacing.sm },
  cycleCard: {
    backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md,
    marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border,
  },
  cycleCardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs },
  cycleTitle: { flex: 1, fontSize: 14, fontWeight: '700', color: colors.text },
  statusPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radius.pill,
  },
  pillOpen: { backgroundColor: '#e6f9ee' },
  pillClosed: { backgroundColor: colors.background },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 10, fontWeight: '700' },
  rubricChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: spacing.xs },
  rubricChip: {
    backgroundColor: colors.primarySoft, paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radius.sm,
  },
  rubricChipText: { fontSize: 11, color: colors.primary, fontWeight: '600' },
  cycleClosesRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: spacing.xs },
  cycleClosesText: { fontSize: 11, color: colors.textMuted },

  modalRoot: { flex: 1, backgroundColor: colors.background },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.surface, paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  modalTitle: { color: colors.text, fontSize: 18, fontWeight: '800' },
  modalScroll: { flex: 1 },
  modalContent: { padding: spacing.lg },
  csvHintBox: {
    flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start',
    backgroundColor: `${colors.info}10`, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.lg,
  },
  csvHintText: { flex: 1, fontSize: 12, color: colors.text, lineHeight: 18 },
  filePickBtn: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.surface, borderWidth: 2, borderColor: colors.primary,
    borderStyle: 'dashed', borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md,
  },
  filePickText: { fontSize: 14, fontWeight: '700', color: colors.primary },
  filePickSub: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  detectedCategoryBox: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: `${colors.success}12`, borderRadius: radius.md,
    padding: spacing.md, marginBottom: spacing.md,
  },
  detectedCategoryText: { flex: 1, fontSize: 13, color: colors.text },
  detectedCategoryName: { fontWeight: '700', color: colors.success },
  disabled: { opacity: 0.55 },
  progressBox: {
    backgroundColor: `${colors.warning}18`, borderLeftWidth: 3, borderLeftColor: colors.warning,
    padding: spacing.md, borderRadius: radius.sm, marginBottom: spacing.md,
  },
  progressSuccess: { backgroundColor: `${colors.success}18`, borderLeftColor: colors.success },
  progressError: { backgroundColor: `${colors.danger}18`, borderLeftColor: colors.danger },
  progressText: { fontSize: 13, color: colors.text, lineHeight: 20 },
});
