import { DashboardConsolidated, EvaluationResult } from '../../domain/entities/academic';
import { DashboardRepository } from '../../domain/repositories/dashboardRepository';
import { DashboardRemoteDatasource } from '../datasources/dashboardRemoteDatasource';
import { LocalCacheDatasource } from '../datasources/localCacheDatasource';

export class DashboardRepositoryImpl implements DashboardRepository {
  constructor(
    private readonly remoteDatasource: DashboardRemoteDatasource,
    private readonly localCacheDatasource: LocalCacheDatasource,
  ) {}

  private studentKey(input: { studentUid: string; studentEmail: string }) {
    const uid = input.studentUid.trim();
    if (uid) {
      return uid;
    }
    return input.studentEmail.trim().toLowerCase();
  }

  async getResultsForStudent(input: { studentUid: string; studentEmail: string }): Promise<EvaluationResult[]> {
    const key = this.studentKey(input);
    const cached = await this.localCacheDatasource.loadStudentResults(key);

    try {
      const remote = await this.remoteDatasource.getResultsForStudent(input);
      await this.localCacheDatasource.saveStudentResults(key, remote);
      return remote;
    } catch {
      return cached ?? [];
    }
  }

  getResultsForTeacher(cycleId: string): Promise<DashboardConsolidated> {
    return this.remoteDatasource.getResultsForTeacher(cycleId);
  }
}