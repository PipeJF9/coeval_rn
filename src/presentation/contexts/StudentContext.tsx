import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { academicUseCases, dashboardUseCases } from '../../di/container';
import {
  EvaluationResult,
  PendingEvaluationInfo,
  TeacherCourseOverview,
} from '../../domain/entities/academic';
import { useAuth } from './AuthContext';

interface StudentContextValue {
  courses: TeacherCourseOverview[];
  pendingEvaluations: PendingEvaluationInfo[];
  results: EvaluationResult[];
  isLoadingCourses: boolean;
  isLoadingPending: boolean;
  isLoadingResults: boolean;
  totalPendingCount: number;
  refreshCourses: () => Promise<void>;
  refreshPendingEvaluations: () => Promise<void>;
  refreshResults: () => Promise<void>;
  refreshAll: () => Promise<void>;
  submitEvaluation: (input: {
    cycleId: string;
    evaluateeUid: string;
    scores: number[];
    comments?: string | null;
  }) => Promise<boolean>;
  clearStudentState: () => void;
}

const StudentContext = createContext<StudentContextValue | undefined>(undefined);

export function StudentProvider({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const [courses, setCourses] = useState<TeacherCourseOverview[]>([]);
  const [pendingEvaluations, setPendingEvaluations] = useState<PendingEvaluationInfo[]>([]);
  const [results, setResults] = useState<EvaluationResult[]>([]);
  const [isLoadingCourses, setIsLoadingCourses] = useState(false);
  const [isLoadingPending, setIsLoadingPending] = useState(false);
  const [isLoadingResults, setIsLoadingResults] = useState(false);

  const studentEmail = user?.email.trim().toLowerCase() ?? '';
  const studentUid = (user?.uid ?? user?.id ?? '').trim();

  const clearStudentState = () => {
    setCourses([]);
    setPendingEvaluations([]);
    setResults([]);
  };

  const refreshCourses = useCallback(async () => {
    if (!isAuthenticated || !user || user.role !== 'student') {
      clearStudentState();
      return;
    }

    setIsLoadingCourses(true);
    try {
      const value = await academicUseCases.getStudentCourseOverviews.execute({
        studentEmail,
        studentUid: studentUid || null,
      });
      setCourses(value);
    } catch (error) {
      console.error('[StudentContext] refreshCourses failed:', error);
      setCourses([]);
    } finally {
      setIsLoadingCourses(false);
    }
  }, [isAuthenticated, studentEmail, studentUid]);

  const refreshPendingEvaluations = useCallback(async () => {
    if (!isAuthenticated || !user || user.role !== 'student' || (!studentEmail && !studentUid)) {
      setPendingEvaluations([]);
      return;
    }

    setIsLoadingPending(true);
    try {
      const value = await academicUseCases.getPendingEvaluationsForStudent.execute({
        studentEmail,
        studentUid: studentUid || studentEmail,
      });
      setPendingEvaluations(value);
    } catch (error) {
      console.error('[StudentContext] refreshPendingEvaluations failed:', error);
      setPendingEvaluations([]);
    } finally {
      setIsLoadingPending(false);
    }
  }, [isAuthenticated, studentEmail, studentUid]);

  
  const refreshResults = useCallback(async () => {
    if (!isAuthenticated || !user || user.role !== 'student' || (!studentEmail && !studentUid)) {
      setResults([]);
      return;
    }

    setIsLoadingResults(true);
    try {
      const value = await dashboardUseCases.getEvaluationResults.executeForStudent({
        studentUid: studentUid || studentEmail,
        studentEmail,
      });
      setResults(value);
    } catch (error) {
      console.error('[StudentContext] refreshResults failed:', error);
      setResults([]);
    } finally {
      setIsLoadingResults(false); // ← ya lo tienes, está bien
    }
  }, [isAuthenticated, studentEmail, studentUid]);

  const refreshAll = async () => {
    await Promise.all([refreshCourses(), refreshPendingEvaluations(), refreshResults()]);
  };

  const submitEvaluation: StudentContextValue['submitEvaluation'] = async (input) => {
    if (!studentEmail && !studentUid) {
      return false;
    }

    const success = await academicUseCases.submitEvaluation.execute({
      cycleId: input.cycleId,
      evaluatorUid: studentUid || studentEmail,
      evaluateeUid: input.evaluateeUid,
      scores: input.scores,
      comments: input.comments ?? null,
    });

    if (success) {
      await refreshPendingEvaluations();
      await refreshResults();
      await refreshCourses();
    }

    return success;
  };

  useEffect(() => {
    if (!isAuthenticated || !user || user.role !== 'student') {
      clearStudentState();
      return;
    }

    refreshAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, studentEmail, studentUid]);

  const totalPendingCount = pendingEvaluations.reduce((sum, pending) => {
    const evaluated = new Set(pending.alreadyEvaluatedUids);
    const remaining = pending.peersToEvaluate.filter((peer) => !evaluated.has(peer.uid)).length;
    return sum + remaining;
  }, 0);

  const value: StudentContextValue = {
    courses,
    pendingEvaluations,
    results,
    isLoadingCourses,
    isLoadingPending,
    isLoadingResults,
    totalPendingCount,
    refreshCourses,
    refreshPendingEvaluations,
    refreshResults,
    refreshAll,
    submitEvaluation,
    clearStudentState,
  };

  return <StudentContext.Provider value={value}>{children}</StudentContext.Provider>;
}

export function useStudent() {
  const context = useContext(StudentContext);
  if (!context) {
    throw new Error('useStudent must be used within StudentProvider');
  }
  return context;
}