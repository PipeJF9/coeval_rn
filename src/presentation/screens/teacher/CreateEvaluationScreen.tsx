import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
  FlatList,
  ScrollView,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTeacher } from '../../contexts/TeacherContext';
import { useAuth } from '../../contexts/AuthContext';

export const CreateEvaluationScreen = ({ route, navigation }: any) => {
  const courseId = route?.params?.courseId;
  const { user } = useAuth();
  const { selectedCourse, createEvaluationCycle } = useTeacher();

  const [selectedCategory, setSelectedCategory] = useState<any>(null);
  const [selectedGroup, setSelectedGroup] = useState<any>(null);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [title, setTitle] = useState('');
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
    setRubrics(rubrics.filter((_, i: number) => i !== index));
  };

  const handleCreateCycle = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Por favor ingresa un título');
      return;
    }

    if (!selectedGroup) {
      Alert.alert('Error', 'Por favor selecciona un grupo');
      return;
    }

    if (rubrics.length === 0) {
      Alert.alert('Error', 'Al menos un rubric es requerido');
      return;
    }

    if (!user?.uid) {
      Alert.alert('Error', 'Usuario no identificado');
      return;
    }

    setIsCreating(true);
    try {
      const cycle = await createEvaluationCycle({
        courseId,
        groupId: selectedGroup.id,
        title,
        openedBy: user.uid,
        rubrics,
      });

      if (cycle) {
        Alert.alert('Éxito', 'Ciclo de evaluación creado');
        navigation.goBack();
      } else {
        Alert.alert('Error', 'No se pudo crear el ciclo');
      }
    } catch (error) {
      Alert.alert('Error', 'Error al crear el ciclo');
    } finally {
      setIsCreating(false);
    }
  };

  const groups = selectedCategory?.groups || [];

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Step 1: Select Category */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Selecciona Categoría</Text>

          {selectedCourse && selectedCourse.categories.length > 0 ? (
            <View style={styles.optionsList}>
              {selectedCourse.categories.map((category) => (
                <TouchableOpacity
                  key={category.id}
                  style={[
                    styles.optionButton,
                    selectedCategory?.id === category.id && styles.optionButtonActive,
                  ]}
                  onPress={() => {
                    setSelectedCategory(category);
                    setSelectedGroup(null);
                  }}
                >
                  <MaterialCommunityIcons
                    name="folder"
                    size={20}
                    color={selectedCategory?.id === category.id ? '#0066cc' : '#666'}
                  />
                  <Text
                    style={[
                      styles.optionText,
                      selectedCategory?.id === category.id && styles.optionTextActive,
                    ]}
                  >
                    {category.name} ({category.groups.length} grupos)
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <Text style={styles.emptyText}>No hay categorías disponibles</Text>
          )}
        </View>

        {/* Step 2: Select Group */}
        {selectedCategory && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>2. Selecciona Grupo</Text>

            {groups.length > 0 ? (
              <View style={styles.optionsList}>
                {groups.map((group: any) => (
                  <TouchableOpacity
                    key={group.id}
                    style={[
                      styles.optionButton,
                      selectedGroup?.id === group.id && styles.optionButtonActive,
                    ]}
                    onPress={() => setSelectedGroup(group)}
                  >
                    <MaterialCommunityIcons
                      name="account-multiple"
                      size={20}
                      color={selectedGroup?.id === group.id ? '#0066cc' : '#666'}
                    />
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          styles.optionText,
                          selectedGroup?.id === group.id && styles.optionTextActive,
                        ]}
                      >
                        {group.name}
                      </Text>
                      <Text style={styles.optionSubtext}>
                        {group.code} • {group.activeStudentsCount} estudiantes
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <Text style={styles.emptyText}>No hay grupos en esta categoría</Text>
            )}
          </View>
        )}

        {/* Step 3: Enter Title */}
        {selectedGroup && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>3. Título del Ciclo</Text>

            <TextInput
              style={styles.input}
              placeholder="Ej: Evaluación de Presentaciones"
              value={title}
              onChangeText={setTitle}
              editable={!isCreating}
            />
          </View>
        )}

        {/* Step 4: Define Rubrics */}
        {selectedGroup && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>4. Dimensiones de Evaluación</Text>

            <View style={styles.rubricsList}>
              {rubrics.map((rubric: string, index: number) => (
                <View key={index} style={styles.rubricItem}>
                  <MaterialCommunityIcons
                    name="drag-vertical"
                    size={16}
                    color="#999"
                    style={styles.dragHandle}
                  />
                  <Text style={styles.rubricText}>{rubric}</Text>
                  <TouchableOpacity
                    onPress={() => handleRemoveRubric(index)}
                    disabled={isCreating}
                  >
                    <MaterialCommunityIcons
                      name="close"
                      size={20}
                      color="#dc3545"
                    />
                  </TouchableOpacity>
                </View>
              ))}
            </View>

            <View style={styles.addRubricBox}>
              <TextInput
                style={styles.rubricInput}
                placeholder="Nueva dimensión..."
                value={newRubric}
                onChangeText={setNewRubric}
                editable={!isCreating}
              />
              <TouchableOpacity
                style={styles.addRubricButton}
                onPress={handleAddRubric}
                disabled={isCreating || !newRubric.trim()}
              >
                <MaterialCommunityIcons name="plus" size={20} color="#0066cc" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Create Button */}
        {selectedGroup && (
          <View style={styles.section}>
            <TouchableOpacity
              style={[styles.createButton, isCreating && styles.buttonDisabled]}
              onPress={handleCreateCycle}
              disabled={isCreating}
            >
              {isCreating ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <MaterialCommunityIcons name="check" size={20} color="#fff" />
                  <Text style={styles.createButtonText}>Crear Ciclo</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  section: {
    padding: 16,
    backgroundColor: '#fff',
    marginVertical: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  optionsList: {
    gap: 8,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    gap: 12,
  },
  optionButtonActive: {
    borderColor: '#0066cc',
    backgroundColor: '#e6f0ff',
  },
  optionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  optionTextActive: {
    color: '#0066cc',
  },
  optionSubtext: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    paddingVertical: 20,
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1a1a1a',
  },
  rubricsList: {
    gap: 8,
    marginBottom: 12,
  },
  rubricItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#f5f5f5',
    borderRadius: 6,
    gap: 8,
  },
  dragHandle: {
    marginRight: 4,
  },
  rubricText: {
    flex: 1,
    fontSize: 13,
    color: '#1a1a1a',
  },
  addRubricBox: {
    flexDirection: 'row',
    gap: 8,
  },
  rubricInput: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
  },
  addRubricButton: {
    width: 40,
    height: 40,
    borderWidth: 1,
    borderColor: '#0066cc',
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#e6f0ff',
  },
  createButton: {
    backgroundColor: '#28a745',
    paddingVertical: 12,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
