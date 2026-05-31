import React, { useState } from 'react';
import {
  Alert,
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { colors, radius, spacing } from '../../../core/theme';
import { PrimaryButton } from '../../components/PrimaryButton';
import { AppTextInput } from '../../components/AppTextInput';
import { useTeacher } from '../../contexts/TeacherContext';
import { useAuth } from '../../contexts/AuthContext';
import type { EvaluationScope } from '../../../domain/entities/academic';

export const CreateEvaluationScreen = ({ route, navigation }: any) => {
  const courseId = route?.params?.courseId;
  const { user } = useAuth();
  const { selectedCourse, createEvaluationCycle } = useTeacher();

  const [selectedCategory, setSelectedCategory] = useState<any>(null);
  const [title, setTitle] = useState('');
  const [evaluationScope, setEvaluationScope] = useState<EvaluationScope>('own_group');
  const [rubrics, setRubrics] = useState<string[]>(['Dimensión 1', 'Dimensión 2', 'Dimensión 3']);
  const [newRubric, setNewRubric] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleAddRubric = () => {
    if (newRubric.trim()) {
      setRubrics([...rubrics, newRubric.trim()]);
      setNewRubric('');
    }
  };

  const handleRemoveRubric = (index: number) => {
    setRubrics(rubrics.filter((_, i) => i !== index));
  };

  const handleCreate = async () => {
    if (!selectedCategory) { Alert.alert('Error', 'Selecciona una actividad'); return; }
    if (!title.trim()) { Alert.alert('Error', 'Ingresa un título'); return; }
    if (rubrics.length === 0) { Alert.alert('Error', 'Agrega al menos un criterio'); return; }
    if (!user?.uid) { Alert.alert('Error', 'Usuario no identificado'); return; }

    setIsCreating(true);
    try {
      const cycle = await createEvaluationCycle({
        courseId,
        categoryId: selectedCategory.id,
        title: title.trim(),
        openedBy: user.uid,
        rubrics,
        evaluationScope,
      });
      if (cycle) {
        Alert.alert('Ciclo creado', 'La evaluación ha sido creada correctamente.', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } else {
        Alert.alert('Error', 'No se pudo crear el ciclo');
      }
    } catch {
      Alert.alert('Error', 'Ocurrió un error al crear el ciclo');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Step 1: Select activity */}
      <StepCard step={1} title="Selecciona la actividad">
        {selectedCourse && selectedCourse.categories.length > 0 ? (
          <View style={styles.optionList}>
            {selectedCourse.categories.map((category) => {
              const active = selectedCategory?.id === category.id;
              return (
                <Pressable
                  key={category.id}
                  style={[styles.optionRow, active && styles.optionRowActive]}
                  onPress={() => setSelectedCategory(category)}
                >
                  <View style={[styles.optionIcon, active && styles.optionIconActive]}>
                    <MaterialCommunityIcons name="folder" size={18} color={active ? colors.primary : colors.textMuted} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.optionText, active && styles.optionTextActive]}>
                      {category.name}
                    </Text>
                    <Text style={styles.optionSub}>
                      {category.activeStudentsCount} estudiantes
                    </Text>
                  </View>
                  {active && (
                    <MaterialCommunityIcons name="check-circle" size={20} color={colors.primary} />
                  )}
                </Pressable>
              );
            })}
          </View>
        ) : (
          <Text style={styles.emptyText}>No hay actividades disponibles en este curso.</Text>
        )}
      </StepCard>

      {/* Step 2: Title */}
      {selectedCategory && (
        <StepCard step={2} title="Título del ciclo">
          <AppTextInput
            label=""
            value={title}
            onChangeText={setTitle}
            placeholder="Ej: Evaluación de presentaciones"
            editable={!isCreating}
          />
        </StepCard>
      )}

      {/* Step 3: Scope */}
      {selectedCategory && (
        <StepCard step={3} title="Alcance de la evaluación">
          <View style={styles.optionList}>
            {SCOPE_OPTIONS.map((opt) => {
              const active = evaluationScope === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  style={[styles.optionRow, active && styles.optionRowActive]}
                  onPress={() => setEvaluationScope(opt.value)}
                  disabled={isCreating}
                >
                  <View style={[styles.optionIcon, active && styles.optionIconActive]}>
                    <MaterialCommunityIcons name={opt.icon as any} size={18} color={active ? colors.primary : colors.textMuted} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.optionText, active && styles.optionTextActive]}>{opt.label}</Text>
                    <Text style={styles.optionSub}>{opt.description}</Text>
                  </View>
                  {active && <MaterialCommunityIcons name="check-circle" size={20} color={colors.primary} />}
                </Pressable>
              );
            })}
          </View>
        </StepCard>
      )}

      {/* Step 4: Criteria */}
      {selectedCategory && (
        <StepCard step={4} title="Criterios de evaluación">
          <View style={styles.rubricList}>
            {rubrics.map((rubric, index) => (
              <View key={index} style={styles.rubricItem}>
                <View style={styles.rubricIndexBox}>
                  <Text style={styles.rubricIndexText}>{index + 1}</Text>
                </View>
                <Text style={styles.rubricText}>{rubric}</Text>
                <Pressable
                  onPress={() => handleRemoveRubric(index)}
                  disabled={isCreating}
                  hitSlop={8}
                >
                  <MaterialCommunityIcons name="close-circle-outline" size={20} color={colors.danger} />
                </Pressable>
              </View>
            ))}
          </View>
          <View style={styles.addRubricRow}>
            <TextInput
              style={styles.addRubricInput}
              placeholder="Nuevo criterio..."
              placeholderTextColor={colors.textMuted}
              value={newRubric}
              onChangeText={setNewRubric}
              editable={!isCreating}
              onSubmitEditing={handleAddRubric}
              returnKeyType="done"
            />
            <Pressable
              style={[styles.addRubricBtn, !newRubric.trim() && styles.addRubricBtnDisabled]}
              onPress={handleAddRubric}
              disabled={isCreating || !newRubric.trim()}
            >
              <MaterialCommunityIcons name="plus" size={20} color={newRubric.trim() ? '#fff' : colors.textMuted} />
            </Pressable>
          </View>
        </StepCard>
      )}

      {/* Create button */}
      {selectedCategory && title.trim() && (
        <View style={styles.createSection}>
          <PrimaryButton
            title="Crear ciclo de evaluación"
            onPress={handleCreate}
            loading={isCreating}
          />
        </View>
      )}
    </ScrollView>
  );
};

const SCOPE_OPTIONS: { value: EvaluationScope; label: string; description: string; icon: string }[] = [
  {
    value: 'own_group',
    label: 'Compañeros de grupo',
    description: 'Cada estudiante evalúa solo a los integrantes de su propio grupo',
    icon: 'account-group',
  },
  {
    value: 'all_groups',
    label: 'Todos los grupos',
    description: 'Cada estudiante evalúa a integrantes de todos los demás grupos de la categoría',
    icon: 'account-multiple',
  },
];

function StepCard({ step, title, children }: { step: number; title: string; children: React.ReactNode }) {
  return (
    <View style={styles.stepCard}>
      <View style={styles.stepHeader}>
        <View style={styles.stepNumBox}>
          <Text style={styles.stepNum}>{step}</Text>
        </View>
        <Text style={styles.stepTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: 36 },

  stepCard: {
    backgroundColor: colors.surface, borderRadius: radius.lg,
    padding: spacing.lg, marginBottom: spacing.md,
    borderWidth: 1, borderColor: colors.border,
  },
  stepHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  stepNumBox: {
    width: 28, height: 28, borderRadius: radius.pill,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  stepNum: { color: '#fff', fontSize: 13, fontWeight: '900' },
  stepTitle: { color: colors.text, fontSize: 15, fontWeight: '800' },

  optionList: { gap: spacing.sm },
  optionRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md,
  },
  optionRowActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  optionIcon: {
    width: 36, height: 36, borderRadius: radius.sm,
    backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center',
  },
  optionIconActive: { backgroundColor: `${colors.primary}20` },
  optionText: { fontSize: 14, fontWeight: '700', color: colors.textMuted },
  optionTextActive: { color: colors.primary },
  optionSub: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  emptyText: { color: colors.textMuted, fontSize: 13, textAlign: 'center', paddingVertical: spacing.md },

  rubricList: { gap: spacing.sm, marginBottom: spacing.md },
  rubricItem: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.background, borderRadius: radius.md, padding: spacing.sm,
  },
  rubricIndexBox: {
    width: 24, height: 24, borderRadius: radius.pill,
    backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center',
  },
  rubricIndexText: { color: colors.primary, fontSize: 11, fontWeight: '900' },
  rubricText: { flex: 1, fontSize: 13, color: colors.text, fontWeight: '600' },
  addRubricRow: { flexDirection: 'row', gap: spacing.sm },
  addRubricInput: {
    flex: 1, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    fontSize: 13, color: colors.text,
  },
  addRubricBtn: {
    width: 44, height: 44, backgroundColor: colors.primary,
    borderRadius: radius.md, alignItems: 'center', justifyContent: 'center',
  },
  addRubricBtnDisabled: { backgroundColor: colors.border },

  createSection: { marginTop: spacing.xs },
});
