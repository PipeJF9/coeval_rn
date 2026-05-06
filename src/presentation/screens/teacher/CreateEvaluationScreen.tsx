import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { colors, radius, spacing } from '../../../core/theme';
import { CategoryOverview, TeacherCourseOverview } from '../../../domain/entities/academic';
import { AppTextInput } from '../../components/AppTextInput';
import { PrimaryButton } from '../../components/PrimaryButton';
import { SectionHeader } from '../../components/SectionHeader';
import { SurfaceCard } from '../../components/SurfaceCard';
import { useAuth } from '../../contexts/AuthContext';
import { useTeacher } from '../../contexts/TeacherContext';

export function CreateEvaluationScreen({ route, navigation }: any) {
  const courseId = route?.params?.courseId;
  const { user } = useAuth();
  const { courses, selectedCourse, createEvaluationCycle } = useTeacher();

  const course = useMemo<TeacherCourseOverview | undefined>(() => {
    if (selectedCourse?.id === courseId) {
      return selectedCourse ?? undefined;
    }

    return courses.find((item) => item.id === courseId) ?? selectedCourse ?? courses[0] ?? undefined;
  }, [courseId, courses, selectedCourse]);

  const [selectedCategory, setSelectedCategory] = useState<CategoryOverview | null>(null);
  const [title, setTitle] = useState('');
  const [rubrics, setRubrics] = useState<string[]>(['Dimensión 1', 'Dimensión 2', 'Dimensión 3']);
  const [newRubric, setNewRubric] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (!course?.categories.length) {
      setSelectedCategory(null);
      return;
    }

    setSelectedCategory((current) => {
      if (current && course.categories.some((category) => category.id === current.id)) {
        return current;
      }

      return course.categories[0] ?? null;
    });
  }, [course?.id, course?.categories]);

  const handleAddRubric = () => {
    const nextRubric = newRubric.trim();
    if (!nextRubric) {
      return;
    }

    setRubrics((current) => [...current, nextRubric]);
    setNewRubric('');
  };

  const handleRemoveRubric = (index: number) => {
    setRubrics((current) => current.filter((_, itemIndex) => itemIndex !== index));
  };

  const handleCreateCycle = async () => {
    if (!course) {
      Alert.alert('Curso no disponible', 'Selecciona un curso válido.');
      return;
    }

    if (!selectedCategory) {
      Alert.alert('Falta categoría', 'Selecciona una categoría para lanzar el examen.');
      return;
    }

    if (!title.trim()) {
      Alert.alert('Falta título', 'Ingresa un título para el ciclo.');
      return;
    }

    if (rubrics.length === 0) {
      Alert.alert('Faltan dimensiones', 'Agrega al menos una dimensión de evaluación.');
      return;
    }

    if (!user?.uid) {
      Alert.alert('Sesión inválida', 'No se pudo identificar al profesor.');
      return;
    }

    setIsCreating(true);
    try {
      const cycles = await createEvaluationCycle({
        courseId: course.id,
        categoryId: selectedCategory.id,
        title: title.trim(),
        openedBy: user.uid,
        rubrics,
      });

      if (cycles.length === 0) {
        Alert.alert('Error', 'No se pudo crear el ciclo.');
        return;
      }

      Alert.alert(
        'Éxito',
        `Se lanzó el examen en ${cycles.length} grupo${cycles.length === 1 ? '' : 's'} de la categoría ${selectedCategory.name}.`
      );
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', 'No se pudo crear el ciclo de evaluación.');
    } finally {
      setIsCreating(false);
    }
  };

  if (!course) {
    return (
      <View style={styles.fallback}>
        <MaterialCommunityIcons name="alert-circle-outline" size={40} color={colors.textMuted} />
        <Text style={styles.fallbackTitle}>Curso no encontrado</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <SurfaceCard>
        <Text style={styles.courseLabel}>Curso seleccionado</Text>
        <Text style={styles.courseTitle}>{course.name}</Text>
        <Text style={styles.courseMeta}>NRC {course.nrc} · {course.term}</Text>
      </SurfaceCard>

      <View style={{ height: spacing.lg }} />

      <SurfaceCard>
        <SectionHeader
          title="1. Selecciona categoría"
          subtitle="El examen se creará para todos los grupos que pertenezcan a esta categoría."
        />

        {course.categories.length === 0 ? (
          <Text style={styles.emptyText}>No hay categorías disponibles todavía.</Text>
        ) : (
          <View style={styles.optionsList}>
            {course.categories.map((category) => {
              const isSelected = selectedCategory?.id === category.id;

              return (
                <Pressable
                  key={category.id}
                  style={[styles.optionButton, isSelected && styles.optionButtonActive]}
                  onPress={() => setSelectedCategory(category)}
                >
                  <MaterialCommunityIcons
                    name="folder-outline"
                    size={20}
                    color={isSelected ? colors.primary : colors.textMuted}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.optionText, isSelected && styles.optionTextActive]}>{category.name}</Text>
                    <Text style={styles.optionSubtext}>{category.groups.length} grupos · {category.activeStudentsCount} estudiantes</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}
      </SurfaceCard>

      <View style={{ height: spacing.lg }} />

      {selectedCategory ? (
        <SurfaceCard>
          <SectionHeader title="2. Define el ciclo" subtitle="Personaliza el nombre y las dimensiones de evaluación." />

          <AppTextInput
            label="Título del ciclo"
            value={title}
            onChangeText={setTitle}
            placeholder="Ej: Evaluación de presentaciones"
            editable={!isCreating}
          />

          <View style={{ height: spacing.lg }} />

          <Text style={styles.subsectionTitle}>Dimensiones</Text>
          <View style={styles.rubricList}>
            {rubrics.map((rubric, index) => (
              <View key={`${rubric}-${index}`} style={styles.rubricItem}>
                <MaterialCommunityIcons name="drag-vertical" size={18} color={colors.textMuted} />
                <Text style={styles.rubricText}>{rubric}</Text>
                <Pressable onPress={() => handleRemoveRubric(index)} disabled={isCreating} hitSlop={8}>
                  <MaterialCommunityIcons name="close" size={20} color={colors.danger} />
                </Pressable>
              </View>
            ))}
          </View>

          <View style={styles.addRow}>
            <View style={{ flex: 1 }}>
              <AppTextInput
                label="Nueva dimensión"
                value={newRubric}
                onChangeText={setNewRubric}
                placeholder="Ej: Claridad, argumentación, evidencia"
                editable={!isCreating}
              />
            </View>
            <Pressable style={styles.addButton} onPress={handleAddRubric} disabled={isCreating || !newRubric.trim()}>
              <MaterialCommunityIcons name="plus" size={20} color={colors.primary} />
            </Pressable>
          </View>

          <View style={styles.summaryBox}>
            <Text style={styles.summaryTitle}>Alcance del lanzamiento</Text>
            <Text style={styles.summaryText}>
              Se lanzará a {selectedCategory.groups.length} grupo{selectedCategory.groups.length === 1 ? '' : 's'} de la categoría {selectedCategory.name}.
            </Text>
          </View>

          <View style={{ height: spacing.lg }} />
          <PrimaryButton title="Lanzar examen" onPress={handleCreateCycle} loading={isCreating} />
        </SurfaceCard>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: 36,
  },
  courseLabel: {
    color: colors.textMuted,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontWeight: '700',
  },
  courseTitle: {
    marginTop: spacing.xs,
    color: colors.text,
    fontSize: 22,
    fontWeight: '900',
  },
  courseMeta: {
    marginTop: 4,
    color: colors.textMuted,
    fontSize: 13,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 13,
  },
  optionsList: {
    gap: spacing.sm,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  optionButtonActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  optionText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
  },
  optionTextActive: {
    color: colors.primaryDark,
  },
  optionSubtext: {
    marginTop: 2,
    color: colors.textMuted,
    fontSize: 12,
  },
  subsectionTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
    marginBottom: spacing.sm,
  },
  rubricList: {
    gap: spacing.sm,
  },
  rubricItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
  },
  rubricText: {
    flex: 1,
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  addButton: {
    width: 54,
    height: 54,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 1,
  },
  summaryBox: {
    marginTop: spacing.lg,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
  },
  summaryTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
  },
  summaryText: {
    marginTop: 4,
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  fallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    padding: spacing.xl,
  },
  fallbackTitle: {
    marginTop: spacing.md,
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
});
