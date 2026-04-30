import {
  DashboardConsolidated,
  EvaluationResult,
  GroupOverview,
  StudentOverview,
} from '../../domain/entities/academic';
import { RobleDatasource } from './robleDatasource';

type Row = Record<string, unknown>;

export class DashboardRemoteDatasource {
  constructor(private readonly robleDatasource: RobleDatasource) {}

  private readonly evaluationsTable = 'evaluations';
  private readonly evaluationCyclesTable = 'evaluation_cycles';
  private readonly usersTable = 'users';
  private readonly groupsTable = 'groups';
  private readonly enrollmentsTable = 'enrollments';

  private str(value: unknown) {
    return value == null ? '' : String(value);
  }

  private async readTable(tableName: string, filters?: Record<string, string | number | boolean | null | undefined>) {
    return this.robleDatasource.readTable(tableName, filters);
  }

  private mapStudent(row: Row): StudentOverview {
    return {
      uid: this.str(row.studentUId) || this.str(row.studentUid) || this.str(row.uid),
      name: this.str(row.studentName),
      email: this.str(row.studentEmail),
      studentId: this.str(row.studentId),
    };
  }

  private mapGroup(row: Row, students: StudentOverview[]): GroupOverview {
    return {
      id: this.str(row._id),
      code: this.str(row.groupName) || this.str(row.groupCode) || this.str(row.code),
      name: this.str(row.displayName) || this.str(row.name) || this.str(row.groupName) || this.str(row.groupCode) || this.str(row.code),
      activeStudentsCount: students.length,
      students,
    };
  }

  private parseRubrics(row: Row) {
    const criteria = row.criteria;
    if (!criteria) return [] as string[];
    try {
      const value = typeof criteria === 'string' ? JSON.parse(criteria) : (criteria as Row);
      if (Array.isArray(value.rubrics)) {
        return value.rubrics.map((item: unknown) => String(item));
      }
    } catch {
      return [] as string[];
    }
    return [] as string[];
  }

  private mapResult(cycleId: string, row: Row, rubrics: string[], groupName = '', categoryName = '', studentName = '', studentEmail = '', studentId = ''): EvaluationResult {
    const resultsRaw = row.results;
    const comments: string[] = [];
    const rubricScores: Record<string, number> = {};
    let count = 0;

    if (resultsRaw) {
      try {
        const results = typeof resultsRaw === 'string' ? JSON.parse(resultsRaw) : (resultsRaw as Row);
        const scores = Array.isArray(results.scores) ? results.scores : [];
        const comment = this.str(row.comments);
        if (comment) comments.push(comment);

        scores.forEach((value: unknown, index: number) => {
          const rubricName = rubrics[index] ?? `Criterio ${index + 1}`;
          rubricScores[rubricName] = (rubricScores[rubricName] ?? 0) + (typeof value === 'number' ? value : Number(value) || 0);
        });
        count = 1;
      } catch {
        count = 0;
      }
    }

    const averageValues = Object.values(rubricScores);
    if (count > 0) {
      for (const key of Object.keys(rubricScores)) {
        rubricScores[key] = rubricScores[key] / count;
      }
    }

    const averageTotal = averageValues.length > 0
      ? averageValues.reduce((sum, current) => sum + current, 0) / averageValues.length
      : 0;

    return {
      id: `${cycleId}_${this.str(row.evaluateeUid)}`,
      cycleId: this.str(row.cycleId),
      cycleTitle: '',
      evaluatee: {
        uid: this.str(row.evaluateeUid),
        name: studentName || this.str(row.evaluateeUid),
        email: studentEmail,
        studentId,
      },
      categoryName,
      groupName,
      rubricScores,
      averageTotal,
      comments,
      totalEvaluators: 1,
    };
  }

  async getResultsForStudent(input: { studentUid: string; studentEmail: string }) {
    const normalizedEmail = input.studentEmail.trim().toLowerCase();
    const normalizedUid = input.studentUid.trim();
    const evaluatorKeys = new Set<string>([
      ...(normalizedUid ? [normalizedUid] : []),
      ...(normalizedEmail ? [normalizedEmail, `email:${normalizedEmail}`] : []),
    ]);

    const evaluateeFilters = [
      { evaluateeUid: normalizedUid },
      { evaluateeUid: normalizedEmail },
      { evaluateeUid: `email:${normalizedEmail}` },
    ];

    const uniqueRows = new Map<string, Row>();
    for (const filter of evaluateeFilters) {
      const rows = await this.readTable(this.evaluationsTable, filter);
      for (const row of rows) {
        const key = this.str(row._id) || `${this.str(row.cycleId)}-${this.str(row.evaluateeUid)}`;
        uniqueRows.set(key, row);
      }
    }

    if (uniqueRows.size === 0) {
      return [];
    }

    const cycleIds = [...new Set([...uniqueRows.values()].map((row) => this.str(row.cycleId)).filter(Boolean))];
    const cycleInfoById = new Map<string, { title: string; rubrics: string[]; categoryId: string; categoryName: string; groupId: string }>();

    for (const cycleId of cycleIds) {
      const rows = await this.readTable(this.evaluationCyclesTable, { _id: cycleId });
      if (rows.length > 0) {
        const row = rows[0];
        cycleInfoById.set(cycleId, {
          title: this.str(row.title) || 'Evaluación',
          rubrics: this.parseRubrics(row),
          categoryId: this.str(row.categoryId),
          categoryName: this.str(row.categoryName),
          groupId: this.str(row.groupId),
        });
      }
    }

    const groupedByCycle = new Map<string, Row[]>();
    for (const row of uniqueRows.values()) {
      const cycleId = this.str(row.cycleId);
      const list = groupedByCycle.get(cycleId) ?? [];
      list.push(row);
      groupedByCycle.set(cycleId, list);
    }

    const result: EvaluationResult[] = [];
    for (const [cycleId, rows] of groupedByCycle.entries()) {
      const cycleInfo = cycleInfoById.get(cycleId);
      const cycle = cycleInfo ?? { title: 'Evaluación', rubrics: [] as string[], categoryId: '', categoryName: '', groupId: '' };
      const evaluateeUid = this.str(rows[0]?.evaluateeUid);
      const userRows = await this.readTable(this.usersTable, { uid: evaluateeUid });
      const fallbackStudentName = userRows.length > 0 ? this.str(userRows[0].name) : evaluateeUid;

      const groupId = this.str(rows[0]?.evaluateeGroupIdAtEval) || this.str(rows[0]?.evaluatorGroupIdAtEval) || cycle.groupId;
      let groupName = '';
      if (groupId) {
        const groupRows = await this.readTable(this.groupsTable, { _id: groupId });
        if (groupRows.length > 0) {
          groupName = this.str(groupRows[0].displayName) || this.str(groupRows[0].name) || this.str(groupRows[0].groupName);
        }
      }

      const studentId = '';
      const rubricScores: Record<string, number> = {};
      const comments: string[] = [];
      let totalEvaluators = 0;

      for (const row of rows) {
        const resultsRaw = row.results;
        if (!resultsRaw) continue;
        try {
          const results = typeof resultsRaw === 'string' ? JSON.parse(resultsRaw) : (resultsRaw as Row);
          const scores = Array.isArray(results.scores) ? results.scores : [];
          const comment = this.str(row.comments);
          if (comment) {
            comments.push(comment);
          }
          scores.forEach((value: unknown, index: number) => {
            const rubric = cycle.rubrics[index] ?? `Criterio ${index + 1}`;
            rubricScores[rubric] = (rubricScores[rubric] ?? 0) + (typeof value === 'number' ? value : Number(value) || 0);
          });
          totalEvaluators += 1;
        } catch {
          // ignore malformed record
        }
      }

      if (totalEvaluators > 0) {
        for (const key of Object.keys(rubricScores)) {
          rubricScores[key] = rubricScores[key] / totalEvaluators;
        }
      }

      const averageValues = Object.values(rubricScores);
      const averageTotal = averageValues.length > 0
        ? averageValues.reduce((sum, current) => sum + current, 0) / averageValues.length
        : 0;

      result.push({
        id: `${cycleId}_${evaluateeUid}`,
        cycleId,
        cycleTitle: cycle.title,
        evaluatee: {
          uid: evaluateeUid,
          name: fallbackStudentName,
          email: normalizedEmail,
          studentId,
        },
        categoryName: cycle.categoryName,
        groupName,
        rubricScores,
        averageTotal,
        comments,
        totalEvaluators,
      });
    }

    result.sort((a, b) => b.averageTotal - a.averageTotal);
    return result;
  }

  async getResultsForTeacher(cycleId: string) {
    const cycleRows = await this.readTable(this.evaluationCyclesTable, { _id: cycleId });
    const title = cycleRows.length > 0 ? this.str(cycleRows[0].title) : 'Evaluación';
    return {
      cycleTitle: title,
      results: [],
      groupAverage: 0,
      totalStudents: 0,
      evaluatedStudents: 0,
      pendingStudents: 0,
      totalEvaluationsSubmitted: 0,
      rubricAverages: {},
    } satisfies DashboardConsolidated;
  }
}