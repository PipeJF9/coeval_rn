import React, { createContext, useContext, useState, useCallback } from 'react';
import { teacherUseCases } from '../../di/container';
import { TeacherCourseOverview, EvaluationCycleData, EvaluationScope } from '../../domain/entities/academic';

interface TeacherContextType {
  // State
  courses: TeacherCourseOverview[];
  selectedCourse: TeacherCourseOverview | null;
  isLoadingCourses: boolean;
  isCreatingCourse: boolean;
  isSyncingCsv: boolean;
  syncProgress: { message: string; status: 'success' | 'error' | 'loading' } | null;
  evaluationCycles: EvaluationCycleData[];

  // Actions
  loadCourses(teacherUid: string): Promise<void>;
  createCourse(name: string, nrc: string, term: string, teacherUid: string): Promise<boolean>;
  selectCourse(course: TeacherCourseOverview): void;
  deselectCourse(): void;
  uploadCsv(courseId: string, categoryName: string, csvContent: string, uploadedBy: string): Promise<boolean>;
  loadEvaluationCycles(categoryId: string): Promise<void>;
  createEvaluationCycle(input: {
    courseId: string;
    categoryId: string;
    title: string;
    openedBy: string;
    rubrics: string[];
    closesAt?: string | null;
    evaluationScope: EvaluationScope;
  }): Promise<EvaluationCycleData | null>;
  clearState(): void;
}

const TeacherContext = createContext<TeacherContextType | undefined>(undefined);

export function TeacherProvider({ children }: { children: React.ReactNode }) {
  const [courses, setCourses] = useState<TeacherCourseOverview[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<TeacherCourseOverview | null>(null);
  const [isLoadingCourses, setIsLoadingCourses] = useState(false);
  const [isCreatingCourse, setIsCreatingCourse] = useState(false);
  const [isSyncingCsv, setIsSyncingCsv] = useState(false);
  const [syncProgress, setSyncProgress] = useState<{
    message: string;
    status: 'success' | 'error' | 'loading';
  } | null>(null);
  const [evaluationCycles, setEvaluationCycles] = useState<EvaluationCycleData[]>([]);

  const loadCourses = useCallback(
    async (teacherUid: string) => {
      setIsLoadingCourses(true);
      try {
        const result = await teacherUseCases.getTeacherCourses.execute(teacherUid);
        setCourses(result);
      } catch (error) {
        console.error('[TEACHER] Error loading courses:', error);
      } finally {
        setIsLoadingCourses(false);
      }
    },
    [teacherUseCases]
  );

  const createCourse = useCallback(
    async (name: string, nrc: string, term: string, teacherUid: string) => {
      setIsCreatingCourse(true);
      try {
        const result = await teacherUseCases.createCourse.execute({
          name,
          nrc,
          term,
          teacherUid,
        });

        if (result) {
          // Reload courses
          await loadCourses(teacherUid);
          return true;
        }
        return false;
      } catch (error) {
        console.error('[TEACHER] Error creating course:', error);
        return false;
      } finally {
        setIsCreatingCourse(false);
      }
    },
    [teacherUseCases, loadCourses]
  );

  const selectCourse = useCallback((course: TeacherCourseOverview) => {
    setSelectedCourse(course);
  }, []);

  const deselectCourse = useCallback(() => {
    setSelectedCourse(null);
  }, []);

  const uploadCsv = useCallback(
    async (courseId: string, categoryName: string, csvContent: string, uploadedBy: string) => {
      setIsSyncingCsv(true);
      setSyncProgress({ message: 'Subiendo y procesando CSV...', status: 'loading' });

      try {
        const result = await teacherUseCases.syncCsv.execute({
          courseId,
          categoryName,
          csvContent,
          uploadedBy,
        });

        const message = `✅ Sincronización completada:\n${result.createdGroups} grupos creados\n${result.activatedEnrollments} estudiantes agregados\n${result.closedEnrollments} enrollments cerrados`;
        setSyncProgress({ message, status: 'success' });

        // Reload courses to reflect changes
        if (selectedCourse && selectedCourse.id === courseId) {
          const updated = await teacherUseCases.getTeacherCourses.execute(uploadedBy);
          const newSelected = updated.find((c) => c.id === courseId);
          if (newSelected) {
            setSelectedCourse(newSelected);
          }
          setCourses(updated);
        }

        return true;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
        setSyncProgress({ message: `❌ Error: ${errorMessage}`, status: 'error' });
        console.error('[TEACHER] Error syncing CSV:', error);
        return false;
      } finally {
        setIsSyncingCsv(false);
      }
    },
    [teacherUseCases, selectedCourse]
  );

  const loadEvaluationCycles = useCallback(
    async (categoryId: string) => {
      try {
        const cycles = await teacherUseCases.getEvaluationCycles.execute(categoryId);
        setEvaluationCycles(cycles);
      } catch (error) {
        console.error('[TEACHER] Error loading evaluation cycles:', error);
        setEvaluationCycles([]);
      }
    },
    [teacherUseCases]
  );

  const createEvaluationCycle = useCallback(
    async (input: {
      courseId: string;
      categoryId: string;
      title: string;
      openedBy: string;
      rubrics: string[];
      closesAt?: string | null;
      evaluationScope: EvaluationScope;
    }) => {
      try {
        const cycle = await teacherUseCases.createEvaluationCycle.execute(input);
        if (cycle) {
          setEvaluationCycles([...evaluationCycles, cycle]);
        }
        return cycle;
      } catch (error) {
        console.error('[TEACHER] Error creating evaluation cycle:', error);
        return null;
      }
    },
    [teacherUseCases, evaluationCycles]
  );

  const clearState = useCallback(() => {
    setCourses([]);
    setSelectedCourse(null);
    setEvaluationCycles([]);
    setSyncProgress(null);
  }, []);

  const value: TeacherContextType = {
    courses,
    selectedCourse,
    isLoadingCourses,
    isCreatingCourse,
    isSyncingCsv,
    syncProgress,
    evaluationCycles,
    loadCourses,
    createCourse,
    selectCourse,
    deselectCourse,
    uploadCsv,
    loadEvaluationCycles,
    createEvaluationCycle,
    clearState,
  };

  return <TeacherContext.Provider value={value}>{children}</TeacherContext.Provider>;
};

export const useTeacher = (): TeacherContextType => {
  const context = useContext(TeacherContext);
  if (!context) {
    throw new Error('useTeacher debe ser usado dentro de TeacherProvider');
  }
  return context;
};
