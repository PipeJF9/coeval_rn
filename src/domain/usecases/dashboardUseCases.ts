import { DashboardRepository } from '@/domain/repositories/dashboardRepository';

export class GetEvaluationResultsUseCase {
  constructor(private readonly repository: DashboardRepository) {}

  executeForStudent(input: { studentUid: string; studentEmail: string }) {
    return this.repository.getResultsForStudent(input);
  }

  executeForTeacher(cycleId: string) {
    return this.repository.getResultsForTeacher(cycleId);
  }
}