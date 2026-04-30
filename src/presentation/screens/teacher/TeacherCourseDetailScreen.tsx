import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
  FlatList,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTeacher } from '../../contexts/TeacherContext';
import { useAuth } from '../../contexts/AuthContext';
import { TeacherCourseOverview } from '../../../domain/entities/academic';

const Papa = require('papaparse');

export const TeacherCourseDetailScreen = ({ route, navigation }: any) => {
  const courseId = route?.params?.courseId;
  const { user } = useAuth();
  const { courses, isSyncingCsv, syncProgress, uploadCsv } = useTeacher();

  const [showCsvModal, setShowCsvModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<{ uri: string; name: string } | null>(null);
  const [categoryName, setCategoryName] = useState('');
  const [csvContent, setCsvContent] = useState('');

  // Find the course from the courses array
  const course = courses.find((c) => c.id === courseId);

  const handlePickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'text/csv',
      });

      if (!result.canceled && result.assets.length > 0) {
        const file = result.assets[0];
        setSelectedFile({ uri: file.uri, name: file.name });

        // Read file content
        const response = await fetch(file.uri);
        const text = await response.text();
        setCsvContent(text);
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo seleccionar el archivo');
    }
  };

  const handleUploadCsv = async () => {
    if (!categoryName.trim()) {
      Alert.alert('Error', 'Por favor ingresa el nombre de la categoría');
      return;
    }

    if (!csvContent.trim()) {
      Alert.alert('Error', 'Por favor selecciona un archivo CSV');
      return;
    }

    if (!user?.uid || !course) {
      Alert.alert('Error', 'Información incompleta');
      return;
    }

    try {
      const success = await uploadCsv(course.id, categoryName, csvContent, user.uid);

      if (success) {
        setCategoryName('');
        setSelectedFile(null);
        setCsvContent('');
        setShowCsvModal(false);
      }
    } catch (error) {
      Alert.alert('Error', 'Error al subir el CSV');
    }
  };

  if (!course) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Curso no encontrado</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Course Header */}
        <View style={styles.courseHeader}>
          <Text style={styles.courseName}>{course.name}</Text>
          <View style={styles.courseMetaRow}>
            <View style={styles.metaItem}>
              <MaterialCommunityIcons name="identifier" size={16} color="#666" />
              <Text style={styles.metaText}>{course.nrc}</Text>
            </View>
            <View style={styles.metaItem}>
              <MaterialCommunityIcons name="calendar" size={16} color="#666" />
              <Text style={styles.metaText}>{course.term}</Text>
            </View>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actionsSection}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => setShowCsvModal(true)}
          >
            <MaterialCommunityIcons name="file-upload" size={20} color="#fff" />
            <Text style={styles.actionButtonText}>Cargar CSV</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.secondaryButton]}
            onPress={() => navigation.navigate('CreateEvaluation', { courseId: course.id })}
          >
            <MaterialCommunityIcons name="plus" size={20} color="#0066cc" />
            <Text style={[styles.actionButtonText, { color: '#0066cc' }]}>Evaluación</Text>
          </TouchableOpacity>
        </View>

        {/* Categories and Groups */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Categorías ({course.categoriesCount})</Text>

          {course.categories.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="folder-open" size={32} color="#ccc" />
              <Text style={styles.emptyText}>No hay categorías aún</Text>
            </View>
          ) : (
            course.categories.map((category) => (
              <View key={category.id} style={styles.categoryCard}>
                <View style={styles.categoryHeader}>
                  <Text style={styles.categoryName}>{category.name}</Text>
                  <View style={styles.categoryBadge}>
                    <Text style={styles.categoryBadgeText}>{category.groups.length} grupos</Text>
                  </View>
                </View>

                <View style={styles.groupsList}>
                  {category.groups.map((group) => (
                    <View key={group.id} style={styles.groupItem}>
                      <View>
                        <Text style={styles.groupName}>{group.name}</Text>
                        <Text style={styles.groupCode}>{group.code}</Text>
                      </View>
                      <View style={styles.studentCountBadge}>
                        <MaterialCommunityIcons name="account-multiple" size={14} color="#fff" />
                        <Text style={styles.studentCountText}>{group.activeStudentsCount}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            ))
          )}
        </View>

        {/* Summary Stats */}
        <View style={styles.summarySection}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{course.activeStudentsCount}</Text>
            <Text style={styles.summaryLabel}>Estudiantes</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{course.groupsCount}</Text>
            <Text style={styles.summaryLabel}>Grupos</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{course.categoriesCount}</Text>
            <Text style={styles.summaryLabel}>Categorías</Text>
          </View>
        </View>
      </ScrollView>

      {/* CSV Upload Modal */}
      <Modal visible={showCsvModal} animationType="slide" onRequestClose={() => setShowCsvModal(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowCsvModal(false)}>
              <Text style={styles.modalCloseButton}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Cargar CSV</Text>
            <View style={{ width: 30 }} />
          </View>

          <ScrollView style={styles.modalContent}>
            <Text style={styles.instructionText}>
              Selecciona un archivo CSV con la siguiente estructura:{'\n'}
              categoryName | groupDisplayName | groupName | email | id | name | etc.
            </Text>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Nombre de Categoría</Text>
              <TextInput
                style={styles.input}
                placeholder="Ej: Categoría A"
                value={categoryName}
                onChangeText={setCategoryName}
                editable={!isSyncingCsv}
              />
            </View>

            <TouchableOpacity
              style={[styles.filePickButton, isSyncingCsv && styles.buttonDisabled]}
              onPress={handlePickFile}
              disabled={isSyncingCsv}
            >
              <MaterialCommunityIcons name="file-upload" size={24} color="#0066cc" />
              <View>
                <Text style={styles.filePickButtonText}>
                  {selectedFile ? 'Archivo seleccionado' : 'Seleccionar archivo'}
                </Text>
                {selectedFile && (
                  <Text style={styles.fileNameText}>{selectedFile.name}</Text>
                )}
              </View>
            </TouchableOpacity>

            {syncProgress && (
              <View
                style={[
                  styles.progressBox,
                  syncProgress.status === 'success' && styles.successBox,
                  syncProgress.status === 'error' && styles.errorBox,
                ]}
              >
                <Text style={styles.progressText}>{syncProgress.message}</Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.submitButton, isSyncingCsv && styles.buttonDisabled]}
              onPress={handleUploadCsv}
              disabled={isSyncingCsv}
            >
              {isSyncingCsv ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>Procesar CSV</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  courseHeader: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  courseName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  courseMetaRow: {
    flexDirection: 'row',
    gap: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 13,
    color: '#666',
  },

  actionsSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#0066cc',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  secondaryButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#0066cc',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },

  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  categoryCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#0066cc',
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  categoryBadge: {
    backgroundColor: '#e6f0ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  categoryBadgeText: {
    fontSize: 12,
    color: '#0066cc',
    fontWeight: '600',
  },

  groupsList: {
    gap: 8,
  },
  groupItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  groupName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  groupCode: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  studentCountBadge: {
    backgroundColor: '#0066cc',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  studentCountText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },

  emptyState: {
    alignItems: 'center',
    paddingVertical: 20,
    backgroundColor: '#fff',
    borderRadius: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
  },

  summarySection: {
    paddingHorizontal: 16,
    paddingBottom: 20,
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-around',
  },
  summaryCard: {
    backgroundColor: '#fff',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 8,
    flex: 1,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0066cc',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },

  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    marginTop: 40,
  },
  modalHeader: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalCloseButton: {
    fontSize: 24,
    color: '#666',
    width: 30,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  instructionText: {
    fontSize: 12,
    color: '#666',
    backgroundColor: '#f0f0f0',
    padding: 12,
    borderRadius: 6,
    marginBottom: 16,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
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
  filePickButton: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#0066cc',
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  filePickButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0066cc',
  },
  fileNameText: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  progressBox: {
    backgroundColor: '#fff3cd',
    borderLeftWidth: 3,
    borderLeftColor: '#ffc107',
    padding: 12,
    borderRadius: 4,
    marginBottom: 16,
  },
  successBox: {
    backgroundColor: '#d4edda',
    borderLeftColor: '#28a745',
  },
  errorBox: {
    backgroundColor: '#f8d7da',
    borderLeftColor: '#dc3545',
  },
  progressText: {
    fontSize: 13,
    color: '#1a1a1a',
  },
  submitButton: {
    backgroundColor: '#0066cc',
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  errorText: {
    fontSize: 16,
    color: '#dc3545',
    textAlign: 'center',
    marginTop: 20,
  },
});
