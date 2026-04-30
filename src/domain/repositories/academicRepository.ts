import {
  CsvSyncResult,
  EvaluationCycleData,
  PendingEvaluationInfo,
  TeacherCourseOverview,
} from '@/domain/entities/academic';

export interface AcademicRepository {
  getStudentCourseOverviews(input: { studentEmail: string; studentUid?: string | null }): Promise<TeacherCourseOverview[]>;
  getPendingEvaluationsForStudent(input: { studentEmail: string; studentUid: string }): Promise<PendingEvaluationInfo[]>;
  submitEvaluation(input: {
    cycleId: string;
    evaluatorUid: string;
    evaluateeUid: string;
    scores: number[];
    comments?: string | null;
  }): Promise<boolean>;
  createEvaluationCycle(input: {
    courseId: string;
    categoryId: string;
    title: string;
    openedBy: string;
    rubrics: string[];
    closesAt?: string | null;
  }): Promise<EvaluationCycleData | null>;
  syncCategoryFromCsv(input: {
    courseId: string;
    categoryName: string;
    csvContent: string;
    uploadedBy: string;
  }): Promise<CsvSyncResult>;
  getEvaluationCyclesByCourse(courseId: string): Promise<EvaluationCycleData[]>;
  getEvaluationCyclesByCategory(categoryId: string): Promise<EvaluationCycleData[]>;
}