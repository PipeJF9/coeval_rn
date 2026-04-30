import { DashboardConsolidated, EvaluationResult } from '@/domain/entities/academic';

export interface DashboardRepository {
  getResultsForStudent(input: { studentUid: string; studentEmail: string }): Promise<EvaluationResult[]>;
  getResultsForTeacher(cycleId: string): Promise<DashboardConsolidated>;
}