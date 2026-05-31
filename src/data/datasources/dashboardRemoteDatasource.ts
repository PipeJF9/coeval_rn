import {
  DashboardConsolidated,
  EvaluationResult,
  GroupOverview,
  GroupStats,
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
    const normalizedUid  = input.studentUid.trim();

    console.log('[DASHBOARD:GET_RESULTS]', `uid=${normalizedUid}, email=${normalizedEmail}`);

    
    const [byUid, byEmail, byEmailPrefixed] = await Promise.all([
      normalizedUid   ? this.readTable(this.evaluationsTable, { evaluateeUid: normalizedUid }) : Promise.resolve([]),
      normalizedEmail ? this.readTable(this.evaluationsTable, { evaluateeUid: normalizedEmail }) : Promise.resolve([]),
      normalizedEmail ? this.readTable(this.evaluationsTable, { evaluateeUid: `email:${normalizedEmail}` }) : Promise.resolve([]),
    ]);

    const uniqueRows = new Map<string, Row>();
    for (const row of [...byUid, ...byEmail, ...byEmailPrefixed]) {
      const key = this.str(row._id) || `${this.str(row.cycleId)}-${this.str(row.evaluateeUid)}`;
      uniqueRows.set(key, row);
    }

    console.log('[DASHBOARD:GET_RESULTS]', `Total unique rows: ${uniqueRows.size}`);
    if (uniqueRows.size === 0) return [];

    const cycleIds = [...new Set(
      [...uniqueRows.values()].map((r) => this.str(r.cycleId)).filter(Boolean)
    )];

    
    const cycleResults = await Promise.all(
      cycleIds.map((id) => this.readTable(this.evaluationCyclesTable, { _id: id }))
    );

    const cycleInfoById = new Map<string, {
      title: string; rubrics: string[]; categoryName: string; groupId: string;
    }>();
    cycleIds.forEach((id, i) => {
      const row = cycleResults[i]?.[0];
      if (row) {
        cycleInfoById.set(id, {
          title:        this.str(row.title) || 'Evaluación',
          rubrics:      this.parseRubrics(row),
          categoryName: this.str(row.categoryName),
          groupId:      this.str(row.groupId),
        });
      }
    });

    const groupedByCycle = new Map<string, Row[]>();
    for (const row of uniqueRows.values()) {
      const cycleId = this.str(row.cycleId);
      const list = groupedByCycle.get(cycleId) ?? [];
      list.push(row);
      groupedByCycle.set(cycleId, list);
    }

    const entries = [...groupedByCycle.entries()];
    const resultItems = await Promise.all(entries.map(async ([cycleId, rows]) => {
      const cycle = cycleInfoById.get(cycleId) ?? {
        title: 'Evaluación', rubrics: [] as string[], categoryName: '', groupId: '',
      };

      const evaluateeUid = this.str(rows[0]?.evaluateeUid);
      const groupId = this.str(rows[0]?.evaluateeGroupIdAtEval)
                  || this.str(rows[0]?.evaluatorGroupIdAtEval)
                  || cycle.groupId;

      const [userRows, groupRows] = await Promise.all([
        evaluateeUid ? this.readTable(this.usersTable, { uid: evaluateeUid }) : Promise.resolve([]),
        groupId      ? this.readTable(this.groupsTable, { _id: groupId })     : Promise.resolve([]),
      ]);

      const fallbackName = userRows[0] ? this.str(userRows[0].name) : evaluateeUid;
      const groupName    = groupRows[0]
        ? this.str(groupRows[0].displayName) || this.str(groupRows[0].name) || this.str(groupRows[0].groupName)
        : '';

      const rubricScores: Record<string, number> = {};
      const comments: string[] = [];
      let totalEvaluators = 0;

      for (const row of rows) {
        if (!row.results) continue;
        try {
          const parsed = typeof row.results === 'string' ? JSON.parse(row.results) : row.results as Row;
          const scores: unknown[] = Array.isArray(parsed.scores) ? parsed.scores : [];
          const comment = this.str(row.comments);
          if (comment) comments.push(comment);
          scores.forEach((v, i) => {
            const rubric = cycle.rubrics[i] ?? `Criterio ${i + 1}`;
            rubricScores[rubric] = (rubricScores[rubric] ?? 0) + (typeof v === 'number' ? v : Number(v) || 0);
          });
          totalEvaluators += 1;
        } catch { /* ignorar registros malformados */ }
      }

      if (totalEvaluators > 0) {
        for (const key of Object.keys(rubricScores)) {
          rubricScores[key] = rubricScores[key] / totalEvaluators;
        }
      }

      const vals = Object.values(rubricScores);
      const averageTotal = vals.length > 0
        ? vals.reduce((s, v) => s + v, 0) / vals.length
        : 0;

      return {
        id: `${cycleId}_${evaluateeUid}`,
        cycleId,
        cycleTitle:     cycle.title,
        evaluatee:      { uid: evaluateeUid, name: fallbackName, email: normalizedEmail, studentId: '' },
        categoryName:   cycle.categoryName,
        groupName,
        rubricScores,
        averageTotal,
        comments,
        totalEvaluators,
      } satisfies EvaluationResult;
    }));

    return resultItems.sort((a, b) => b.averageTotal - a.averageTotal);
  }
  async getResultsForTeacher(cycleId: string): Promise<DashboardConsolidated> {
    const empty: DashboardConsolidated = {
      cycleTitle: 'Evaluación',
      results: [],
      groupAverage: 0,
      totalStudents: 0,
      evaluatedStudents: 0,
      pendingStudents: 0,
      totalEvaluationsSubmitted: 0,
      rubricAverages: {},
      groupStats: [],
      topStudents: [],
      lowStudents: [],
    };

    const cycleRows = await this.readTable(this.evaluationCyclesTable, { _id: cycleId });
    if (cycleRows.length === 0) return empty;

    const cycle = cycleRows[0];
    const cycleTitle = this.str(cycle.title) || 'Evaluación';
    // categoryId is stored in the groupId column (ROBLE schema doesn't have categoryId)
    const categoryId = this.str(cycle.groupId || cycle.categoryId);
    const rubrics = this.parseRubrics(cycle);

    // Load all groups in the category
    const categoryGroups = categoryId
      ? await this.readTable(this.groupsTable, { categoryId })
      : [];

    const groupInfoById = new Map<string, { name: string }>();
    for (const g of categoryGroups) {
      const gid = this.str(g._id);
      if (gid) {
        groupInfoById.set(gid, {
          name: this.str(g.displayName) || this.str(g.name) || this.str(g.groupName) || this.str(g.groupCode) || gid,
        });
      }
    }

    // Load all active enrollments across all groups in the category
    const allEnrollmentsRaw: Row[] = [];
    const enrollmentGroupIdByUid = new Map<string, string>();
    for (const g of categoryGroups) {
      const gid = this.str(g._id);
      if (!gid) continue;
      const rows = await this.readTable(this.enrollmentsTable, { groupId: gid, isActive: true });
      for (const row of rows) {
        allEnrollmentsRaw.push(row);
        const uid = this.str(row.studentUId) || this.str(row.studentUid);
        if (uid && !enrollmentGroupIdByUid.has(uid)) {
          enrollmentGroupIdByUid.set(uid, gid);
        }
      }
    }

    const allEvaluations = await this.readTable(this.evaluationsTable, { cycleId });

    // Build student info map from enrollments
    const studentInfoByUid = new Map<string, { name: string; email: string; studentId: string }>();
    for (const enrollment of allEnrollmentsRaw) {
      const uid = this.str(enrollment.studentUId) || this.str(enrollment.studentUid);
      const emailKey = `email:${this.str(enrollment.studentEmail).toLowerCase()}`;
      const info = {
        name: this.str(enrollment.studentName),
        email: this.str(enrollment.studentEmail),
        studentId: this.str(enrollment.studentId),
      };
      if (uid) studentInfoByUid.set(uid, info);
      studentInfoByUid.set(emailKey, info);
    }

    // Group evaluations by evaluatee
    const evalsByEvaluatee = new Map<string, Row[]>();
    for (const evalRow of allEvaluations) {
      const uid = this.str(evalRow.evaluateeUid);
      if (!uid) continue;
      const list = evalsByEvaluatee.get(uid) ?? [];
      list.push(evalRow);
      evalsByEvaluatee.set(uid, list);
    }

    // Collect all student UIDs (from enrollments + evaluations)
    const allStudentUids = new Set<string>([
      ...allEnrollmentsRaw.map((e) => this.str(e.studentUId) || this.str(e.studentUid)).filter(Boolean),
      ...allEvaluations.map((e) => this.str(e.evaluateeUid)).filter(Boolean),
    ]);

    const results: EvaluationResult[] = [];
    const rubricTotals: Record<string, number> = {};
    const rubricCounts: Record<string, number> = {};

    for (const evaluateeUid of allStudentUids) {
      const evals = evalsByEvaluatee.get(evaluateeUid) ?? [];
      const rubricScores: Record<string, number> = {};
      const comments: string[] = [];
      let totalEvaluators = 0;

      for (const evalRow of evals) {
        if (!evalRow.results) continue;
        try {
          const parsed = typeof evalRow.results === 'string'
            ? JSON.parse(evalRow.results as string)
            : (evalRow.results as Row);
          const scores: unknown[] = Array.isArray(parsed.scores) ? parsed.scores : [];
          const comment = this.str(evalRow.comments);
          if (comment) comments.push(comment);
          scores.forEach((v, i) => {
            const rubric = rubrics[i] ?? `Criterio ${i + 1}`;
            rubricScores[rubric] = (rubricScores[rubric] ?? 0) + (typeof v === 'number' ? v : Number(v) || 0);
          });
          totalEvaluators++;
        } catch { /* skip malformed rows */ }
      }

      if (totalEvaluators > 0) {
        for (const key of Object.keys(rubricScores)) {
          rubricScores[key] /= totalEvaluators;
          rubricTotals[key] = (rubricTotals[key] ?? 0) + rubricScores[key];
          rubricCounts[key] = (rubricCounts[key] ?? 0) + 1;
        }
      }

      const vals = Object.values(rubricScores);
      const averageTotal = vals.length > 0 ? vals.reduce((s, v) => s + v, 0) / vals.length : 0;

      const studentInfo = studentInfoByUid.get(evaluateeUid)
        ?? studentInfoByUid.get(`email:${evaluateeUid.toLowerCase()}`);

      const studentGroupId = enrollmentGroupIdByUid.get(evaluateeUid) ?? '';
      const studentGroupName = groupInfoById.get(studentGroupId)?.name ?? '';

      results.push({
        id: `${cycleId}_${evaluateeUid}`,
        cycleId,
        cycleTitle,
        evaluatee: {
          uid: evaluateeUid,
          name: studentInfo?.name || evaluateeUid,
          email: studentInfo?.email || '',
          studentId: studentInfo?.studentId || '',
        },
        categoryName: '',
        groupName: studentGroupName,
        rubricScores,
        averageTotal,
        comments,
        totalEvaluators,
      });
    }

    results.sort((a, b) => b.averageTotal - a.averageTotal);

    const evaluatedResults = results.filter((r) => r.totalEvaluators > 0);
    const evaluatedStudents = evaluatedResults.length;
    const totalStudents = Math.max(allEnrollmentsRaw.length, results.length);
    const groupAverage = evaluatedResults.length > 0
      ? evaluatedResults.reduce((s, r) => s + r.averageTotal, 0) / evaluatedResults.length
      : 0;

    const rubricAverages: Record<string, number> = {};
    for (const key of Object.keys(rubricTotals)) {
      rubricAverages[key] = rubricCounts[key] > 0 ? rubricTotals[key] / rubricCounts[key] : 0;
    }

    const topStudents = evaluatedResults.slice(0, 3);
    const lowStudents = [...evaluatedResults].reverse().slice(0, 3);

    // Per-group stats
    const groupStats: GroupStats[] = [];
    for (const [gid, ginfo] of groupInfoById.entries()) {
      const groupEnrollmentUids = new Set(
        allEnrollmentsRaw
          .filter((e) => this.str(e.groupId) === gid)
          .map((e) => this.str(e.studentUId) || this.str(e.studentUid))
          .filter(Boolean)
      );
      const groupResults = evaluatedResults.filter((r) => enrollmentGroupIdByUid.get(r.evaluatee.uid) === gid);
      const gTotal = groupEnrollmentUids.size;
      const gEvaluated = groupResults.length;
      const gAvg = gEvaluated > 0
        ? groupResults.reduce((s, r) => s + r.averageTotal, 0) / gEvaluated
        : 0;
      groupStats.push({
        groupId: gid,
        groupName: ginfo.name,
        totalStudents: gTotal,
        evaluatedStudents: gEvaluated,
        averageScore: gAvg,
        pendingStudents: gTotal - gEvaluated,
        completionRate: gTotal > 0 ? (gEvaluated / gTotal) * 100 : 0,
      });
    }

    return {
      cycleTitle,
      results,
      groupAverage,
      totalStudents,
      evaluatedStudents,
      pendingStudents: totalStudents - evaluatedStudents,
      totalEvaluationsSubmitted: allEvaluations.length,
      rubricAverages,
      groupStats,
      topStudents,
      lowStudents,
    };
  }
}