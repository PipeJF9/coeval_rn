import { AcademicCsvParser, CsvStudentRow } from '../../core/utils/csvParser';
import {
  CategoryOverview,
  CsvSyncResult,
  EvaluationCycleData,
  GroupOverview,
  PendingEvaluationInfo,
  StudentOverview,
  TeacherCourseOverview,
} from '../../domain/entities/academic';
import { RobleDatasource } from './robleDatasource';

type Row = Record<string, unknown>;

export class AcademicRemoteDatasource {
  private readonly csvParser = new AcademicCsvParser();

  constructor(private readonly robleDatasource: RobleDatasource) {}

  private readonly coursesTable = 'courses';
  private readonly categoriesTable = 'group_categories';
  private readonly groupsTable = 'groups';
  private readonly enrollmentsTable = 'enrollments';
  private readonly importsTable = 'csv_imports';
  private readonly evaluationCyclesTable = 'evaluation_cycles';
  private readonly evaluationsTable = 'evaluations';
  private readonly usersTable = 'users';

  private str(value: unknown) {
    return value == null ? '' : String(value);
  }

  private parseDate(value: unknown) {
    if (value == null) {
      return new Date().toISOString();
    }

    const parsed = new Date(String(value));
    return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
  }

  private async readTable(tableName: string, filters?: Record<string, string | number | boolean | null | undefined>) {
    this._log(`readTable(${tableName})`, JSON.stringify(filters));
    const result = await this.robleDatasource.readTable(tableName, filters);
    this._log(`readTable(${tableName}) result`, `${result.length} rows`);
    return result;
  }

  private _log(tag: string, message: string) {
    console.log(`[ACADEMIC:${tag}] ${message}`);
  }

  private async insertRecord(tableName: string, record: Row) {
    try {
      this._log('INSERT_RECORD', `Inserting into ${tableName}: ${JSON.stringify(record)}`);
      const result = await this.robleDatasource.insertRecord(tableName, record);
      this._log('INSERT_RECORD', `Result for ${tableName}: ${result}`);
      return result;
    } catch (error) {
      this._log('INSERT_RECORD', `Error inserting into ${tableName}: ${error}`);
      throw error;
    }
  }

  private async updateRecord(tableName: string, where: Row, set: Row) {
    try {
      this._log('UPDATE_RECORD', `Updating ${tableName} with where=${JSON.stringify(where)}, set=${JSON.stringify(set)}`);
      const result = await this.robleDatasource.updateRecord(tableName, where, set);
      this._log('UPDATE_RECORD', `Result for ${tableName}: ${result}`);
      return result;
    } catch (error) {
      this._log('UPDATE_RECORD', `Error updating ${tableName}: ${error}`);
      throw error;
    }
  }

  private normalizeCategoryString(raw: string) {
    let normalized = this.csvParser.normalizeText(raw);

    if (normalized.startsWith('categoria')) {
      normalized = normalized.slice('categoria'.length);
    }

    if (normalized.includes('_')) {
      normalized = normalized.split('_')[0] ?? normalized;
    }

    return normalized;
  }

  private async readActiveEnrollmentsByGroupIds(groupIds: string[]) {
    const output: Row[] = [];
    const seenIds = new Set<string>();

    for (const groupId of groupIds) {
      if (!groupId.trim()) {
        continue;
      }

      const rows = await this.readTable(this.enrollmentsTable, {
        groupId,
        isActive: true,
      });

      for (const row of rows) {
        const rowId = this.str(row._id);
        if (rowId && seenIds.has(rowId)) {
          continue;
        }
        if (rowId) {
          seenIds.add(rowId);
        }
        output.push(row);
      }
    }

    return output;
  }

  private async findActiveStudentInGroups(studentUid: string, groupIds: string[]) {
    const rows: Row[] = [];

    for (const groupId of groupIds) {
      if (!groupId.trim()) continue;

      const byStudentUId = await this.readTable(this.enrollmentsTable, {
        groupId,
        studentUId: studentUid,
        isActive: true,
      });
      if (byStudentUId.length > 0) {
        rows.push(...byStudentUId);
        continue;
      }

      const byStudentUid = await this.readTable(this.enrollmentsTable, {
        groupId,
        studentUid,
        isActive: true,
      });
      rows.push(...byStudentUid);
    }

    return rows;
  }

  private mapStudentOverview(row: Row): StudentOverview {
    return {
      uid: this.str(row.studentUId) || this.str(row.studentUid),
      name: this.str(row.studentName),
      email: this.str(row.studentEmail),
      studentId: this.str(row.studentId),
    };
  }

  private mapGroupOverview(group: Row, students: StudentOverview[]): GroupOverview {
    const groupCode = this.str(group.groupName) || this.str(group.groupCode) || this.str(group.code);
    const displayName = this.str(group.displayName) || this.str(group.name) || groupCode;

    return {
      id: this.str(group._id),
      code: groupCode,
      name: displayName,
      activeStudentsCount: students.length,
      students,
    };
  }

  private mapCategoryOverview(category: Row, groups: GroupOverview[]): CategoryOverview {
    const activeStudentsCount = groups.reduce((sum, group) => sum + group.students.length, 0);

    return {
      id: this.str(category._id),
      name: this.str(category.name),
      activeStudentsCount,
      groups,
    };
  }

  private mapCourseOverview(course: Row, categories: CategoryOverview[]): TeacherCourseOverview {
    const groupsCount = categories.reduce((sum, category) => sum + category.groups.length, 0);
    const activeStudentsCount = categories.reduce((sum, category) => sum + category.activeStudentsCount, 0);

    return {
      id: this.str(course._id),
      name: this.str(course.name),
      nrc: this.str(course.nrc),
      term: this.str(course.term),
      categoriesCount: categories.length,
      groupsCount,
      activeStudentsCount,
      categories,
    };
  }

  private mapEvaluationCycle(row: Row): EvaluationCycleData {
    let rubrics: string[] = [];
    const criteriaRaw = row.criteria;
    if (criteriaRaw) {
      try {
        const criteria = typeof criteriaRaw === 'string' ? JSON.parse(criteriaRaw) : (criteriaRaw as Row);
        if (Array.isArray(criteria.rubrics)) {
          rubrics = criteria.rubrics.map((item: unknown) => String(item));
        }
      } catch {
        rubrics = [];
      }
    }

    return {
      id: this.str(row._id),
      courseId: this.str(row.courseId),
      groupId: this.str(row.groupId),
      title: this.str(row.title),
      status: this.str(row.status),
      openedBy: this.str(row.openedBy),
      openedAt: this.parseDate(row.openedAt),
      closesAt: row.closeAt == null ? null : this.parseDate(row.closeAt),
      rubrics,
    };
  }

  private mapPeerEvaluation(row: Row) {
    let scores: number[] = [];
    const resultsRaw = row.results;
    if (resultsRaw) {
      try {
        const results = typeof resultsRaw === 'string' ? JSON.parse(resultsRaw) : (resultsRaw as Row);
        if (Array.isArray(results.scores)) {
          scores = results.scores.map((item: unknown) => (typeof item === 'number' ? item : Number(item) || 0));
        }
      } catch {
        scores = [];
      }
    }

    return {
      id: this.str(row._id),
      cycleId: this.str(row.cycleId),
      evaluatorUid: this.str(row.evaluatorUid),
      evaluateeUid: this.str(row.evaluateeUid),
      scores,
      comments: this.str(row.comments) || null,
      createdAt: this.parseDate(row.createdAt),
      updatedAt: row.updatedAt == null ? null : this.parseDate(row.updatedAt),
    };
  }

  async getStudentCourseOverviews(input: { studentEmail: string; studentUid?: string | null }) {
    const normalizedEmail = input.studentEmail.trim().toLowerCase();
    const normalizedUid = (input.studentUid ?? '').trim();

    const enrollmentsByEmail = await this.readTable(this.enrollmentsTable, {
      studentEmail: normalizedEmail,
      isActive: true,
    });

    const enrollmentsByUid: Row[] = [];
    if (normalizedUid) {
      const byStudentUId = await this.readTable(this.enrollmentsTable, {
        studentUId: normalizedUid,
        isActive: true,
      });
      enrollmentsByUid.push(...byStudentUId);

      if (byStudentUId.length === 0) {
        const byStudentUid = await this.readTable(this.enrollmentsTable, {
          studentUid: normalizedUid,
          isActive: true,
        });
        enrollmentsByUid.push(...byStudentUid);
      }
    }

    const enrollmentMap = new Map<string, Row>();
    for (const row of [...enrollmentsByEmail, ...enrollmentsByUid]) {
      const rowId = this.str(row._id);
      const dedupeKey = rowId || `${this.str(row.groupId)}-${this.str(row.studentEmail)}-${this.str(row.studentUId)}`;
      enrollmentMap.set(dedupeKey, row);
    }

    if (enrollmentMap.size === 0) {
      return [];
    }

    const groupIds = [...enrollmentMap.values()]
      .map((row) => this.str(row.groupId))
      .filter((groupId) => groupId.length > 0);

    if (groupIds.length === 0) {
      return [];
    }

    const groupsById = new Map<string, Row>();
    for (const groupId of [...new Set(groupIds)]) {
      const rows = await this.readTable(this.groupsTable, { _id: groupId });
      if (rows.length > 0) {
        groupsById.set(groupId, rows[0]);
      }
    }

    const courseIds = [...groupsById.values()]
      .map((group) => this.str(group.courseId))
      .filter((courseId) => courseId.length > 0);

    if (courseIds.length === 0) {
      return [];
    }

    const courses: Row[] = [];
    for (const courseId of [...new Set(courseIds)]) {
      const rows = await this.readTable(this.coursesTable, { _id: courseId });
      if (rows.length > 0) {
        courses.push(rows[0]);
      }
    }

    const result: TeacherCourseOverview[] = [];
    for (const course of courses) {
      const courseId = this.str(course._id);
      const categories = await this.readTable(this.categoriesTable, { courseId });
      const groups = await this.readTable(this.groupsTable, { courseId });
      const groupIdList = groups.map((group) => this.str(group._id)).filter(Boolean);
      const activeEnrollments = await this.readActiveEnrollmentsByGroupIds(groupIdList);

      const groupsByCategory = new Map<string, Row[]>();
      for (const group of groups) {
        const categoryId = this.str(group.categoryId);
        if (!categoryId) continue;
        const existing = groupsByCategory.get(categoryId) ?? [];
        existing.push(group);
        groupsByCategory.set(categoryId, existing);
      }

      const studentRowsByGroup = new Map<string, Row[]>();
      const studentsByGroup = new Map<string, number>();
      const studentsByCategory = new Map<string, number>();
      const categoryIdByGroupId = new Map<string, string>();

      for (const group of groups) {
        const groupId = this.str(group._id);
        const categoryId = this.str(group.categoryId);
        if (groupId && categoryId) {
          categoryIdByGroupId.set(groupId, categoryId);
        }
      }

      for (const enrollment of activeEnrollments) {
        const groupId = this.str(enrollment.groupId);
        const categoryId = categoryIdByGroupId.get(groupId) ?? '';
        if (groupId) {
          studentsByGroup.set(groupId, (studentsByGroup.get(groupId) ?? 0) + 1);
          const rows = studentRowsByGroup.get(groupId) ?? [];
          rows.push(enrollment);
          studentRowsByGroup.set(groupId, rows);
        }
        if (categoryId) {
          studentsByCategory.set(categoryId, (studentsByCategory.get(categoryId) ?? 0) + 1);
        }
      }

      const categoryOverview = categories.map((category) => {
        const categoryId = this.str(category._id);
        const categoryGroups = groupsByCategory.get(categoryId) ?? [];

        const groupOverview = categoryGroups.map((group) => {
          const groupId = this.str(group._id);
          const studentList = (studentRowsByGroup.get(groupId) ?? []).map((enrollment) => this.mapStudentOverview(enrollment));

          return {
            id: groupId,
            code: this.str(group.groupName) || this.str(group.groupCode) || this.str(group.code),
            name: this.str(group.displayName) || this.str(group.name) || this.str(group.groupName) || this.str(group.groupCode) || this.str(group.code),
            activeStudentsCount: studentsByGroup.get(groupId) ?? 0,
            students: studentList,
          } as GroupOverview;
        });

        return {
          id: categoryId,
          name: this.str(category.name),
          activeStudentsCount: studentsByCategory.get(categoryId) ?? 0,
          groups: groupOverview,
        } as CategoryOverview;
      });

      result.push(this.mapCourseOverview(course, categoryOverview));
    }

    return result;
  }

  async getEvaluationCyclesByCourse(courseId: string) {
    const rows = await this.readTable(this.evaluationCyclesTable, { courseId });
    return rows.map((row) => this.mapEvaluationCycle(row));
  }

  async getEvaluationCyclesByGroup(groupId: string) {
    const rows = await this.readTable(this.evaluationCyclesTable, { groupId });
    return rows.map((row) => this.mapEvaluationCycle(row));
  }

  async createEvaluationCycle(input: {
    courseId: string;
    groupId: string;
    title: string;
    openedBy: string;
    rubrics: string[];
    closesAt?: string | null;
  }) {
    // Get group information
    const groupRows = await this.readTable(this.groupsTable, { _id: input.groupId });
    if (groupRows.length === 0) {
      throw new Error('Grupo no encontrado');
    }

    const group = groupRows[0];
    const categoryId = this.str(group.categoryId);
    const categoryRows = await this.readTable(this.categoriesTable, { _id: categoryId });

    const inserted = await this.insertRecord(this.evaluationCyclesTable, {
      courseId: input.courseId,
      groupId: input.groupId,
      title: input.title,
      openedBy: input.openedBy,
      openedAt: new Date().toISOString(),
      closeAt: input.closesAt ?? null,
      status: 'open',
      criteria: { rubrics: input.rubrics },
    });

    if (!inserted) {
      return null;
    }

    return this.mapEvaluationCycle(inserted);
  }

  async getSubmittedEvaluations(input: { cycleId: string; evaluatorUid: string }) {
    const requestedEvaluator = input.evaluatorUid.trim().toLowerCase();

    const rows = await this.readTable(this.evaluationsTable, {
      cycleId: input.cycleId,
      evaluatorUid: input.evaluatorUid,
    });

    const unique = new Map<string, Row>();
    for (const row of rows) {
      const rowId = this.str(row._id);
      const key = rowId || `${this.str(row.cycleId)}-${this.str(row.evaluatorUid)}-${this.str(row.evaluateeUid)}`;
      unique.set(key, row);
    }

    return [...unique.values()].map((row) => this.mapPeerEvaluation(row));
  }

  async getPendingEvaluationsForStudent(input: { studentEmail: string; studentUid: string }) {
    const normalizedEmail = input.studentEmail.trim().toLowerCase();
    const normalizedUid = input.studentUid.trim();

    // 1. Find enrollments by email
    const enrollmentsByEmail = await this.readTable(this.enrollmentsTable, {
      studentEmail: normalizedEmail,
      isActive: true,
    });

    // 2. Find enrollments by UID
    const enrollmentsByUid: Row[] = [];
    if (normalizedUid) {
      const byUId = await this.readTable(this.enrollmentsTable, {
        studentUId: normalizedUid,
        isActive: true,
      });
      enrollmentsByUid.push(...byUId);

      if (byUId.length === 0) {
        const byUid = await this.readTable(this.enrollmentsTable, {
          studentUid: normalizedUid,
          isActive: true,
        });
        enrollmentsByUid.push(...byUid);
      }
    }

    // 3. Deduplicate enrollments
    const enrollmentMap = new Map<string, Row>();
    for (const row of [...enrollmentsByEmail, ...enrollmentsByUid]) {
      const rowId = this.str(row._id);
      if (rowId) {
        enrollmentMap.set(rowId, row);
      }
    }

    if (enrollmentMap.size === 0) {
      return [];
    }

    // 4. Extract groupIds from enrollments
    const groupIds = [...enrollmentMap.values()]
      .map((row) => this.str(row.groupId))
      .filter(Boolean);

    if (groupIds.length === 0) {
      return [];
    }

    // 5. Load groups and extract categoryIds
    const groupsById = new Map<string, Row>();
    const categoryIds = new Set<string>();
    for (const groupId of [...new Set(groupIds)]) {
      const rows = await this.readTable(this.groupsTable, { _id: groupId });
      if (rows.length > 0) {
        groupsById.set(groupId, rows[0]);
        const categoryId = this.str(rows[0].categoryId);
        if (categoryId) {
          categoryIds.add(categoryId);
        }
      }
    }

    // 6. Load categories
    const categoriesById = new Map<string, Row>();
    for (const categoryId of categoryIds) {
      const rows = await this.readTable(this.categoriesTable, { _id: categoryId });
      if (rows.length > 0) {
        categoriesById.set(categoryId, rows[0]);
      }
    }

    // 7. Load open evaluation cycles for each group
    const openCycles: EvaluationCycleData[] = [];
    for (const groupId of [...new Set(groupIds)]) {
      const cycleRows = await this.readTable(this.evaluationCyclesTable, {
        groupId,
        status: 'open',
      });
      openCycles.push(...cycleRows.map((row) => this.mapEvaluationCycle(row)));
    }

    if (openCycles.length === 0) {
      return [];
    }

    // 8. Build result for each cycle
    const result: PendingEvaluationInfo[] = [];

    for (const cycle of openCycles) {
      const groupId = cycle.groupId;
      const groupData = groupsById.get(groupId);

      if (!groupData) {
        continue;
      }

      const categoryId = this.str(groupData.categoryId);
      const category = categoriesById.get(categoryId);
      const categoryName = category ? this.str(category.name) : '';

      // 9. Load active enrollments for the group
      const activeEnrollments = await this.readActiveEnrollmentsByGroupIds([groupId]);
      const students = activeEnrollments.map((enrollment) => this.mapStudentOverview(enrollment));

      // 10. Filter to peers (not self)
      const peersToEvaluate = students.filter((student) => {
        const email = student.email.trim().toLowerCase();
        const uid = student.uid.trim();
        return email !== normalizedEmail && (normalizedUid.length === 0 || uid !== normalizedUid);
      });

      if (peersToEvaluate.length === 0) {
        continue;
      }

      // 11. Find already evaluated peers
      const evaluatorKeys = new Set<string>();
      if (normalizedUid) {
        evaluatorKeys.add(normalizedUid);
      }
      if (normalizedEmail) {
        evaluatorKeys.add(normalizedEmail);
        evaluatorKeys.add(`email:${normalizedEmail}`);
      }

      const submittedById = new Map<string, { evaluateeUid: string }>();
      for (const evaluatorKey of evaluatorKeys) {
        const submitted = await this.getSubmittedEvaluations({ cycleId: cycle.id, evaluatorUid: evaluatorKey });
        for (const item of submitted) {
          submittedById.set(item.id, { evaluateeUid: item.evaluateeUid });
        }
      }

      const alreadyEvaluatedUids = new Set<string>();
      for (const peer of peersToEvaluate) {
        const peerUid = peer.uid.trim();
        const peerEmail = peer.email.trim().toLowerCase();
        const peerKeys = new Set<string>([
          ...(peerUid ? [peerUid] : []),
          ...(peerEmail ? [peerEmail, `email:${peerEmail}`] : []),
        ]);

        const matched = [...submittedById.values()].some((evaluation) =>
          peerKeys.has(evaluation.evaluateeUid.trim().toLowerCase())
        );
        if (matched && peerUid) {
          alreadyEvaluatedUids.add(peerUid);
        }
      }

      // 12. Build group overview
      const group = this.mapGroupOverview(groupData, students);

      result.push({
        cycle,
        group,
        categoryName,
        category: { name: categoryName },
        peersToEvaluate,
        alreadyEvaluatedUids: [...alreadyEvaluatedUids],
      });
    }

    return result;
  }

  async submitEvaluation(input: {
    cycleId: string;
    evaluatorUid: string;
    evaluateeUid: string;
    scores: number[];
    comments?: string | null;
  }) {
    try {
      this._log('SUBMIT_EVALUATION', `Starting submission for evaluatorUid=${input.evaluatorUid}, evaluateeUid=${input.evaluateeUid}`);
      
      const cycles = await this.readTable(this.evaluationCyclesTable, { _id: input.cycleId });
      if (cycles.length === 0) {
        this._log('SUBMIT_EVALUATION', `Error: Cycle not found with id=${input.cycleId}`);
        throw new Error('El ciclo de coevaluación no existe');
      }

      const cycle = cycles[0];
      if (this.str(cycle.status).toLowerCase() !== 'open') {
        this._log('SUBMIT_EVALUATION', `Error: Cycle status is ${cycle.status}, not open`);
        throw new Error('El ciclo está cerrado');
      }

      // Get categoryId from the group
      const groupId = this.str(cycle.groupId);
      this._log('SUBMIT_EVALUATION', `groupId from cycle: ${groupId}`);

      const groups = await this.readTable(this.groupsTable, { _id: groupId });
      const categoryId = groups.length > 0 ? this.str(groups[0].categoryId) : '';
      
      this._log('SUBMIT_EVALUATION', `Searching for enrollments with categoryGroupIds=[${groupId}]`);
      this._log('SUBMIT_EVALUATION', `Looking for evaluator: ${input.evaluatorUid}, evaluatee: ${input.evaluateeUid}`);

      const evaluatorEnrollment = await this.findActiveStudentInGroups(input.evaluatorUid, [groupId]);
      const evaluateeEnrollment = await this.findActiveStudentInGroups(input.evaluateeUid, [groupId]);

      this._log('SUBMIT_EVALUATION', `Found evaluator enrollments: ${evaluatorEnrollment.length}, evaluatee enrollments: ${evaluateeEnrollment.length}`);
      
      if (evaluatorEnrollment.length > 0) {
        this._log('SUBMIT_EVALUATION', `Evaluator enrollment: groupId=${this.str(evaluatorEnrollment[0].groupId)}`);
      }
      if (evaluateeEnrollment.length > 0) {
        this._log('SUBMIT_EVALUATION', `Evaluatee enrollment: groupId=${this.str(evaluateeEnrollment[0].groupId)}, _id=${this.str(evaluateeEnrollment[0]._id)}`);
      }

      let existing = await this.readTable(this.evaluationsTable, {
        cycleId: input.cycleId,
        evaluatorUid: input.evaluatorUid,
        evaluateeUid: input.evaluateeUid,
      });

      if (existing.length === 0) {
        const cycleRows = await this.readTable(this.evaluationsTable, { cycleId: input.cycleId });
        const requestedEvaluator = input.evaluatorUid.trim().toLowerCase();
        existing = cycleRows.filter((row) => {
          const evaluatorValue = this.str(row.evaluatorUid).trim().toLowerCase();
          return (
            this.str(row.evaluateeUid).trim().toLowerCase() === input.evaluateeUid.trim().toLowerCase() &&
            evaluatorValue === requestedEvaluator
          );
        });
      }

      this._log('SUBMIT_EVALUATION', `Found existing evaluations: ${existing.length}`);

      const payload = {
        cycleId: input.cycleId,
        evaluatorUid: input.evaluatorUid,
        evaluateeUid: input.evaluateeUid,
        results: { scores: input.scores },
        comments: input.comments ?? '',
        updatedAt: new Date().toISOString(),
        evaluatorGroupIdAtEval: evaluatorEnrollment.length > 0 ? this.str(evaluatorEnrollment[0].groupId) : groupId,
        evaluateeGroupIdAtEval: evaluateeEnrollment.length > 0 ? this.str(evaluateeEnrollment[0].groupId) : groupId,
        enrollmentIdAtEval: evaluateeEnrollment.length > 0 ? this.str(evaluateeEnrollment[0]._id) : groupId,
      };
      
      this._log('SUBMIT_EVALUATION', `Payload: ${JSON.stringify(payload)}`);

      if (existing.length > 0) {
        this._log('SUBMIT_EVALUATION', `Updating existing evaluation with id=${existing[0]._id}`);
        const result = await this.updateRecord(this.evaluationsTable, { _id: this.str(existing[0]._id) }, payload);
        this._log('SUBMIT_EVALUATION', `Update complete. Result: ${result}`);
        if (!result) {
          throw new Error('Fallo al actualizar la evaluación en Roble');
        }
        return true;
      }

      this._log('SUBMIT_EVALUATION', `Creating new evaluation`);
      const inserted = await this.insertRecord(this.evaluationsTable, {
        ...payload,
        createdAt: new Date().toISOString(),
      });

      this._log('SUBMIT_EVALUATION', `Insert complete. Result: ${inserted}`);
      if (!inserted) {
        throw new Error('Fallo al guardar la evaluación en Roble');
      }
      return true;
    } catch (error) {
      this._log('SUBMIT_EVALUATION', `FATAL ERROR: ${error}`);
      throw error;
    }
  }

  async syncCategoryFromCsv(input: {
    courseId: string;
    categoryName: string;
    csvContent: string;
    uploadedBy: string;
  }) {
    const normalizedCategory = this.normalizeCategoryString(input.categoryName);
    const parsedRows = this.csvParser.parseRows(input.csvContent).filter((row) => {
      const rowCategory = this.normalizeCategoryString(row.categoryName);
      return rowCategory === normalizedCategory || rowCategory.includes(normalizedCategory);
    });

    if (parsedRows.length === 0) {
      throw new Error(`El CSV no tiene filas válidas para la categoría ${input.categoryName}`);
    }

    const categoryRows = await this.readTable(this.categoriesTable, {
      courseId: input.courseId,
      name: input.categoryName,
    });
    let categoryId = this.str(categoryRows[0]?._id);
    if (!categoryId) {
      const insertedCategory = await this.insertRecord(this.categoriesTable, {
        courseId: input.courseId,
        name: input.categoryName,
        createdAt: new Date().toISOString(),
      });
      categoryId = this.str(insertedCategory?._id);
    }

    if (!categoryId) {
      throw new Error('No se pudo crear/encontrar la categoría');
    }

    const fileHash = String(input.csvContent.length);
    const previousImports = await this.readTable(this.importsTable, {
      courseId: input.courseId,
      categoryId,
      fileHash,
      status: 'completed',
    });

    if (previousImports.length > 0) {
      return {
        createdGroups: 0,
        activatedEnrollments: 0,
        closedEnrollments: 0,
        totalRows: parsedRows.length,
      } satisfies CsvSyncResult;
    }

    const importInserted = await this.insertRecord(this.importsTable, {
      courseId: input.courseId,
      categoryId,
      uploadedBy: input.uploadedBy,
      uploadedAt: new Date().toISOString(),
      fileHash,
      status: 'processing',
    });

    const importId = this.str(importInserted?._id);
    let createdGroups = 0;
    let activatedEnrollments = 0;

    const groupIdsByName = new Map<string, string>();
    const categoryGroups = await this.readTable(this.groupsTable, { courseId: input.courseId, categoryId });
    for (const group of categoryGroups) {
      const groupId = this.str(group._id);
      const groupName = this.str(group.groupName) || this.str(group.groupCode) || this.str(group.code) || this.str(group.name);
      if (groupId && groupName) {
        groupIdsByName.set(groupName, groupId);
      }
    }

    const uniqueRowsByGroup = new Map<string, CsvStudentRow>();
    for (const row of parsedRows) {
      if (!uniqueRowsByGroup.has(row.groupName)) {
        uniqueRowsByGroup.set(row.groupName, row);
      }
    }

    for (const row of uniqueRowsByGroup.values()) {
      if (!groupIdsByName.has(row.groupName)) {
        const inserted = await this.insertRecord(this.groupsTable, {
          courseId: input.courseId,
          categoryId,
          groupName: row.groupName,
          displayName: row.groupDisplayName,
          nrc: row.groupName,
          createdAt: new Date().toISOString(),
        });
        const insertedGroupId = this.str(inserted?._id);
        if (insertedGroupId) {
          groupIdsByName.set(row.groupName, insertedGroupId);
          createdGroups += 1;
        }
      }
    }

    for (const row of parsedRows) {
      const groupId = groupIdsByName.get(row.groupName);
      if (!groupId) continue;

      const foundUsers = await this.readTable(this.usersTable, { email: row.studentEmail });
      const studentUid = foundUsers.length > 0
        ? this.str(foundUsers[0].uid) || this.str(foundUsers[0]._id)
        : `email:${row.studentEmail}`;

      const existingEnrollments = await this.readTable(this.enrollmentsTable, {
        groupId,
        studentEmail: row.studentEmail,
      });

      if (existingEnrollments.length > 0) {
        const updated = await this.updateRecord(this.enrollmentsTable, { _id: this.str(existingEnrollments[0]._id) }, {
          studentUId: studentUid,
          studentName: row.studentName,
          studentEmail: row.studentEmail,
          studentId: row.studentId,
          isActive: true,
          sourceImportId: importId,
          validFrom: new Date().toISOString(),
        });
        if (updated) {
          activatedEnrollments += 1;
        }
        continue;
      }

      const insertedEnrollment = await this.insertRecord(this.enrollmentsTable, {
        groupId,
        studentUId: studentUid,
        studentName: row.studentName,
        studentEmail: row.studentEmail,
        studentId: row.studentId,
        enrolledAt: new Date().toISOString(),
        isActive: true,
        validFrom: new Date().toISOString(),
        sourceImportId: importId,
        createdAt: new Date().toISOString(),
      });

      if (insertedEnrollment) {
        activatedEnrollments += 1;
      }
    }

    if (importId) {
      await this.updateRecord(this.importsTable, { _id: importId }, { status: 'completed' });
    }

    return {
      createdGroups,
      activatedEnrollments,
      closedEnrollments: 0,
      totalRows: parsedRows.length,
    } satisfies CsvSyncResult;
  }
}