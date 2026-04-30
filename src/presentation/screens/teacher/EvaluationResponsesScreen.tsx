import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
  Switch,
  Dimensions,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTeacher } from '../../contexts/TeacherContext';

export const EvaluationResponsesScreen = ({ route, navigation }: any) => {
  const { cycleId, cycleName } = route.params;
  const { selectedCourse } = useTeacher();
  const [responses, setResponses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [filterSubmitted, setFilterSubmitted] = useState<boolean | null>(null);
  const [filterStudent, setFilterStudent] = useState('');
  const [showFilterModal, setShowFilterModal] = useState(false);

  useEffect(() => {
    loadResponses();
  }, [cycleId]);

  const loadResponses = async () => {
    try {
      setIsLoading(true);
      // TODO: Fetch evaluation responses from TeacherRemoteDataSource
      // For now, placeholder
      setResponses([]);
    } catch (error) {
      Alert.alert('Error', 'No se pudieron cargar las respuestas');
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadResponses();
    setRefreshing(false);
  };

  const filteredResponses = responses.filter((resp: any) => {
    if (filterSubmitted !== null && resp.submitted !== filterSubmitted) return false;
    if (filterStudent && !resp.studentName.toLowerCase().includes(filterStudent.toLowerCase()))
      return false;
    return true;
  });

  const renderResponseItem = ({ item }: any) => (
    <TouchableOpacity
      style={styles.responseCard}
      onPress={() =>
        navigation.navigate('DetailedResponseScreen', {
          responseId: item.id,
          studentName: item.studentName,
          score: item.score,
        })
      }
    >
      <View style={styles.responseHeader}>
        <View>
          <Text style={styles.studentName}>{item.studentName}</Text>
          <Text style={styles.studentEmail}>{item.email}</Text>
        </View>
        {item.submitted ? (
          <View style={styles.statusBadge}>
            <MaterialCommunityIcons name="check" size={14} color="#fff" />
            <Text style={styles.statusText}>Enviado</Text>
          </View>
        ) : (
          <View style={[styles.statusBadge, styles.pendingBadge]}>
            <MaterialCommunityIcons name="clock-outline" size={14} color="#fff" />
            <Text style={styles.statusText}>Pendiente</Text>
          </View>
        )}
      </View>

      {item.submitted && (
        <View style={styles.responseStats}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Puntaje</Text>
            <Text style={styles.statValue}>{item.score?.toFixed(1) || 'N/A'}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Respuestas</Text>
            <Text style={styles.statValue}>{item.answersCount || 0}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Completitud</Text>
            <Text style={styles.statValue}>{item.completeness || 0}%</Text>
          </View>
        </View>
      )}

      <Text style={styles.submittedDate}>
        {item.submitted
          ? `Enviado: ${new Date(item.submittedAt).toLocaleDateString()}`
          : 'No enviado'}
      </Text>
    </TouchableOpacity>
  );

  const getStats = () => {
    return {
      total: responses.length,
      submitted: responses.filter((r: any) => r.submitted).length,
      pending: responses.filter((r: any) => !r.submitted).length,
      averageScore:
        responses.length > 0
          ? (
              responses.reduce((sum: number, r: any) => sum + (r.score || 0), 0) /
              responses.length
            ).toFixed(1)
          : 0,
    };
  };

  const stats = getStats();

  return (
    <View style={styles.container}>
      {/* Header Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statBox}>
          <Text style={styles.statBoxValue}>{stats.submitted}</Text>
          <Text style={styles.statBoxLabel}>Enviadas</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statBoxValue}>{stats.pending}</Text>
          <Text style={styles.statBoxLabel}>Pendientes</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statBoxValue}>{stats.averageScore}</Text>
          <Text style={styles.statBoxLabel}>Promedio</Text>
        </View>
      </View>

      {/* Filter Bar */}
      <View style={styles.filterBar}>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowFilterModal(true)}
        >
          <MaterialCommunityIcons name="filter" size={18} color="#0066cc" />
          <Text style={styles.filterButtonText}>Filtros</Text>
        </TouchableOpacity>

        {(filterSubmitted !== null || filterStudent) && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={() => {
              setFilterSubmitted(null);
              setFilterStudent('');
            }}
          >
            <Text style={styles.clearButtonText}>Limpiar</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Responses List */}
      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#0066cc" />
        </View>
      ) : (
        <FlatList
          data={filteredResponses}
          renderItem={renderResponseItem}
          keyExtractor={(item: any) => item.id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={filteredResponses.length === 0 ? { flex: 1 } : undefined}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons
                name="inbox-outline"
                size={48}
                color="#ccc"
              />
              <Text style={styles.emptyText}>No hay respuestas</Text>
            </View>
          }
        />
      )}

      {/* Filter Modal */}
      <Modal
        visible={showFilterModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFilterModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.filterModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filtros</Text>
              <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                <MaterialCommunityIcons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Estado</Text>
              <View style={styles.filterOptions}>
                <TouchableOpacity
                  style={[
                    styles.filterOption,
                    filterSubmitted === null && styles.filterOptionActive,
                  ]}
                  onPress={() => setFilterSubmitted(null)}
                >
                  <Text
                    style={[
                      styles.filterOptionText,
                      filterSubmitted === null && styles.filterOptionTextActive,
                    ]}
                  >
                    Todos
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.filterOption,
                    filterSubmitted === true && styles.filterOptionActive,
                  ]}
                  onPress={() => setFilterSubmitted(true)}
                >
                  <Text
                    style={[
                      styles.filterOptionText,
                      filterSubmitted === true && styles.filterOptionTextActive,
                    ]}
                  >
                    Enviados
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.filterOption,
                    filterSubmitted === false && styles.filterOptionActive,
                  ]}
                  onPress={() => setFilterSubmitted(false)}
                >
                  <Text
                    style={[
                      styles.filterOptionText,
                      filterSubmitted === false && styles.filterOptionTextActive,
                    ]}
                  >
                    Pendientes
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Buscar Estudiante</Text>
              <TextInput
                style={styles.searchInput}
                placeholder="Nombre o email..."
                value={filterStudent}
                onChangeText={setFilterStudent}
              />
            </View>

            <TouchableOpacity
              style={styles.applyButton}
              onPress={() => setShowFilterModal(false)}
            >
              <Text style={styles.applyButtonText}>Aplicar Filtros</Text>
            </TouchableOpacity>
          </View>
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
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  statBoxValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0066cc',
  },
  statBoxLabel: {
    fontSize: 11,
    color: '#999',
    marginTop: 4,
  },
  filterBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  filterButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#0066cc',
    borderRadius: 6,
    gap: 6,
  },
  filterButtonText: {
    color: '#0066cc',
    fontSize: 13,
    fontWeight: '600',
  },
  clearButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#dc3545',
    borderRadius: 6,
  },
  clearButtonText: {
    color: '#dc3545',
    fontSize: 12,
    fontWeight: '600',
  },
  responseCard: {
    marginHorizontal: 12,
    marginVertical: 6,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  responseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  studentName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  studentEmail: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#28a745',
    borderRadius: 4,
  },
  pendingBadge: {
    backgroundColor: '#ffc107',
  },
  statusText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  responseStats: {
    flexDirection: 'row',
    gap: 12,
    marginVertical: 8,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 11,
    color: '#999',
  },
  statValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0066cc',
    marginTop: 2,
  },
  submittedDate: {
    fontSize: 11,
    color: '#bbb',
    marginTop: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  filterModal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  filterSection: {
    marginBottom: 20,
  },
  filterSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  filterOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  filterOption: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 6,
    alignItems: 'center',
  },
  filterOptionActive: {
    borderColor: '#0066cc',
    backgroundColor: '#e6f0ff',
  },
  filterOptionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  filterOptionTextActive: {
    color: '#0066cc',
  },
  searchInput: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 6,
    fontSize: 13,
  },
  applyButton: {
    paddingVertical: 12,
    backgroundColor: '#0066cc',
    borderRadius: 6,
    alignItems: 'center',
    marginBottom: 16,
  },
  applyButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
