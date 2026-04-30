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
  SectionList,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTeacher } from '../../contexts/TeacherContext';

export const TeacherReportsScreen = ({ route, navigation }: any) => {
  const { courseId } = route.params;
  const { selectedCourse, isLoadingCourses } = useTeacher();
  const [reportData, setReportData] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadReports();
  }, [courseId]);

  const loadReports = async () => {
    try {
      setRefreshing(true);
      // TODO: Call TeacherContext method to fetch reports
      // For now, placeholder structure
      setReportData({
        courseName: selectedCourse?.name || 'Curso',
        totalEvaluations: 0,
        pendingEvaluations: 0,
        submittedEvaluations: 0,
        categories: [],
      });
    } catch (error) {
      Alert.alert('Error', 'No se pudieron cargar los reportes');
    } finally {
      setRefreshing(false);
    }
  };

  if (isLoadingCourses) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#0066cc" />
      </View>
    );
  }

  const sections = [
    {
      title: 'Resumen General',
      data: [
        {
          label: 'Evaluaciones Enviadas',
          value: reportData?.submittedEvaluations || 0,
          icon: 'check-circle',
          color: '#28a745',
        },
        {
          label: 'Evaluaciones Pendientes',
          value: reportData?.pendingEvaluations || 0,
          icon: 'clock-outline',
          color: '#ffc107',
        },
        {
          label: 'Total de Evaluaciones',
          value: reportData?.totalEvaluations || 0,
          icon: 'file-chart',
          color: '#0066cc',
        },
      ],
    },
    {
      title: 'Por Categoría',
      data: reportData?.categories || [],
    },
  ];

  const renderSummaryItem = ({ item }: any) => (
    <View style={styles.summaryCard}>
      <View style={[styles.iconBox, { backgroundColor: `${item.color}20` }]}>
        <MaterialCommunityIcons name={item.icon} size={24} color={item.color} />
      </View>
      <View style={styles.summaryContent}>
        <Text style={styles.summaryLabel}>{item.label}</Text>
        <Text style={styles.summaryValue}>{item.value}</Text>
      </View>
    </View>
  );

  const renderCategoryItem = ({ item }: any) => (
    <TouchableOpacity
      style={styles.categoryCard}
      onPress={() =>
        navigation.navigate('CategoryReportsScreen', {
          categoryId: item.id,
          categoryName: item.name,
        })
      }
    >
      <View>
        <Text style={styles.categoryName}>{item.name}</Text>
        <Text style={styles.categoryStats}>
          {item.groups} grupos • {item.students} estudiantes
        </Text>
      </View>
      <View style={styles.categoryScore}>
        <Text style={styles.scoreText}>
          {item.averageScore ? item.averageScore.toFixed(1) : 'N/A'}
        </Text>
        <Text style={styles.scoreLabel}>/ 5.0</Text>
      </View>
      <MaterialCommunityIcons
        name="chevron-right"
        size={24}
        color="#999"
      />
    </TouchableOpacity>
  );

  const renderSectionHeader = ({ section }: any) => (
    <Text style={styles.sectionHeader}>{section.title}</Text>
  );

  return (
    <View style={styles.container}>
      <SectionList
        sections={sections}
        keyExtractor={(item: any, index: number) => `${index}`}
        renderItem={({ item, section }: any) =>
          section.title === 'Resumen General'
            ? renderSummaryItem({ item })
            : renderCategoryItem({ item })
        }
        renderSectionHeader={renderSectionHeader}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={loadReports} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons
              name="chart-box-outline"
              size={48}
              color="#ccc"
            />
            <Text style={styles.emptyText}>
              No hay evaluaciones aún
            </Text>
            <Text style={styles.emptySubtext}>
              Los reportes aparecerán aquí cuando se envíen evaluaciones
            </Text>
          </View>
        }
        contentContainerStyle={sections[0].data.length > 0 ? undefined : { flex: 1 }}
      />

      {/* Export Button */}
      <TouchableOpacity
        style={styles.exportButton}
        onPress={() => Alert.alert('Exportar', 'Funcionalidad en desarrollo')}
      >
        <MaterialCommunityIcons name="file-export" size={20} color="#fff" />
        <Text style={styles.exportButtonText}>Exportar CSV</Text>
      </TouchableOpacity>
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
  sectionHeader: {
    fontSize: 14,
    fontWeight: '700',
    color: '#666',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f0f0f0',
  },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 12,
    marginBottom: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    gap: 12,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryContent: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: 13,
    color: '#666',
    marginBottom: 2,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  categoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 12,
    marginVertical: 6,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    gap: 12,
  },
  categoryName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  categoryStats: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  categoryScore: {
    alignItems: 'flex-end',
  },
  scoreText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0066cc',
  },
  scoreLabel: {
    fontSize: 11,
    color: '#999',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#999',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 13,
    color: '#bbb',
    marginTop: 6,
    textAlign: 'center',
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginVertical: 12,
    paddingVertical: 12,
    backgroundColor: '#0066cc',
    borderRadius: 8,
  },
  exportButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
