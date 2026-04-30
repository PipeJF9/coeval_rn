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
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useTeacher } from '../../contexts/TeacherContext';
import { TeacherCourseOverview } from '../../../domain/entities/academic';

export const TeacherHomeScreen = ({ navigation }: any) => {
  const { user } = useAuth();
  const { courses, isLoadingCourses, isCreatingCourse, loadCourses, createCourse, selectCourse } = useTeacher();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [courseName, setCourseName] = useState('');
  const [courseNrc, setCourseNrc] = useState('');
  const [courseTerm, setCourseTerm] = useState('');

  useEffect(() => {
    if (user?.uid) {
      loadCourses(user.uid);
    }
  }, [user?.uid, loadCourses]);

  const handleCreateCourse = async () => {
    if (!courseName.trim() || !courseNrc.trim() || !courseTerm.trim()) {
      Alert.alert('Error', 'Por favor completa todos los campos');
      return;
    }

    if (!user?.uid) {
      Alert.alert('Error', 'Usuario no identificado');
      return;
    }

    try {
      const success = await createCourse(courseName, courseNrc, courseTerm, user.uid);
      if (success) {
        setCourseName('');
        setCourseNrc('');
        setCourseTerm('');
        setShowCreateModal(false);
        Alert.alert('Éxito', 'Curso creado correctamente');
      } else {
        Alert.alert('Error', 'No se pudo crear el curso');
      }
    } catch (error) {
      Alert.alert('Error', 'Error al crear el curso');
    }
  };

  const handleSelectCourse = (course: TeacherCourseOverview) => {
    selectCourse(course);
    navigation.navigate('TeacherCourseDetail', { courseId: course.id });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mis Cursos</Text>
        <TouchableOpacity style={styles.createButton} onPress={() => setShowCreateModal(true)}>
          <Text style={styles.createButtonText}>+ Nuevo Curso</Text>
        </TouchableOpacity>
      </View>

      {isLoadingCourses ? (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#0066cc" />
        </View>
      ) : courses.length === 0 ? (
        <View style={styles.centerContent}>
          <Text style={styles.emptyText}>No tienes cursos aún</Text>
        </View>
      ) : (
        <ScrollView style={styles.coursesList} showsVerticalScrollIndicator={false}>
          {courses.map((course) => (
            <TouchableOpacity
              key={course.id}
              style={styles.courseCard}
              onPress={() => handleSelectCourse(course)}
            >
              <View style={styles.courseHeader}>
                <Text style={styles.courseName}>{course.name}</Text>
                <Text style={styles.courseNrc}>NRC: {course.nrc}</Text>
              </View>

              <View style={styles.courseStats}>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Categorías</Text>
                  <Text style={styles.statValue}>{course.categoriesCount}</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Grupos</Text>
                  <Text style={styles.statValue}>{course.groupsCount}</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Estudiantes</Text>
                  <Text style={styles.statValue}>{course.activeStudentsCount}</Text>
                </View>
              </View>

              <Text style={styles.courseTerm}>{course.term}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Modal para crear curso */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowCreateModal(false)}>
              <Text style={styles.modalCloseButton}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Crear Nuevo Curso</Text>
            <View style={{ width: 30 }} />
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Nombre del Curso</Text>
              <TextInput
                style={styles.input}
                placeholder="Ej: Cálculo I"
                value={courseName}
                onChangeText={setCourseName}
                editable={!isCreatingCourse}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>NRC</Text>
              <TextInput
                style={styles.input}
                placeholder="Ej: 12345"
                value={courseNrc}
                onChangeText={setCourseNrc}
                editable={!isCreatingCourse}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Término</Text>
              <TextInput
                style={styles.input}
                placeholder="Ej: 2026-1"
                value={courseTerm}
                onChangeText={setCourseTerm}
                editable={!isCreatingCourse}
              />
            </View>

            <TouchableOpacity
              style={[styles.submitButton, isCreatingCourse && styles.submitButtonDisabled]}
              onPress={handleCreateCourse}
              disabled={isCreatingCourse}
            >
              {isCreatingCourse ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>Crear Curso</Text>
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
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  createButton: {
    backgroundColor: '#0066cc',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
  },
  coursesList: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  courseCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#0066cc',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  courseHeader: {
    marginBottom: 12,
  },
  courseName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  courseNrc: {
    fontSize: 13,
    color: '#666',
  },
  courseStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#f0f0f0',
    marginBottom: 8,
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0066cc',
  },
  courseTerm: {
    fontSize: 12,
    color: '#999',
    textAlign: 'right',
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
  formGroup: {
    marginBottom: 20,
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
  submitButton: {
    backgroundColor: '#0066cc',
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
