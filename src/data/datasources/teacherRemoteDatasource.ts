import { AcademicCsvParser, CsvStudentRow } from '../../core/utils/csvParser';
import {
  TeacherCourseOverview,
  CategoryOverview,
  GroupOverview,
  CsvSyncResult,
  EvaluationCycleData,
} from '../../domain/entities/academic';
import { RobleDatasource } from './robleDatasource';

type Row = Record<string, unknown>;

export class TeacherRemoteDataSource {
  private readonly csvParser = new AcademicCsvParser();

  constructor(private readonly robleDatasource: RobleDatasource) {}

  private readonly coursesTable = 'courses';
  private readonly categoriesTable = 'group_categories';
  private readonly groupsTable = 'groups';
  private readonly enrollmentsTable = 'enrollments';
  private readonly importsTable = 'csv_imports';
  private readonly evaluationCyclesTable = 'evaluation_cycles';
  private readonly usersTable = 'users';

  private str(value: unknown): string {
    return value == null ? '' : String(value);
  }

  private parseDate(value: unknown): string {
    if (value == null) {
      return new Date().toISOString();
    }
    const parsed = new Date(String(value));
    return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
  }

  private _log(tag: string, message: string): void {
    console.log(`[TEACHER:${tag}] ${message}`);
  }

  private async readTable(tableName: string, filters?: Record<string, string | number | boolean>) {
    this._log(`readTable(${tableName})`, JSON.stringify(filters));
    const result = await this.robleDatasource.readTable(tableName, filters);
    this._log(`readTable(${tableName}) result`, `${result.length} rows`);
    return result;
  }

  private async insertRecord(tableName: string, record: Row) {
    return this.robleDatasource.insertRecord(tableName, record);
  }

  private async updateRecord(tableName: string, where: Row, set: Row) {
    return this.robleDatasource.updateRecord(tableName, where, set);
  }

  private async getCategoryById(courseId: string, categoryId: string): Promise<Row | null> {
    const rows = await this.readTable(this.categoriesTable, {
      _id: categoryId,
      courseId,
    });

    return rows.length > 0 ? rows[0] : null;
  }

  private async getGroupsByCategory(courseId: string, categoryId: string): Promise<Row[]> {
    return this.readTable(this.groupsTable, {
      courseId,
      categoryId,
    });
  }

  private async findOne(tableName: string, filters: Record<string, string | number | boolean>): Promise<Row | null> {
    const rows = await this.readTable(tableName, filters);
    return rows.length > 0 ? rows[0] : null;
  }

  private normalizeCategoryString(raw: string): string {
    let normalized = this.csvParser.normalizeText(raw);

    if (normalized.startsWith('categoria')) {
      normalized = normalized.slice('categoria'.length);
    }

    if (normalized.includes('_')) {
      normalized = normalized.split('_')[0] ?? normalized;
    }

    return normalized;
  }

  private mapStudentOverview(row: Row) {
    return {
      uid: this.str(row.studentUId) || this.str(row.studentUid),
      name: this.str(row.studentName),
      email: this.str(row.studentEmail),
      studentId: this.str(row.studentId),
    };
  }

  private mapGroupOverview(group: Row, students: any[]): GroupOverview {
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

  private async readActiveEnrollmentsByGroupIds(groupIds: string[]): Promise<Row[]> {
    const output: Row[] = [];
    const seenIds = new Set<string>();

    for (const groupId of groupIds) {
      if (!groupId.trim()) continue;

      const rows = await this.readTable(this.enrollmentsTable, {
        groupId,
        isActive: true,
      });

      for (const row of rows) {
        const rowId = this.str(row._id);
        if (rowId && seenIds.has(rowId)) continue;
        if (rowId) seenIds.add(rowId);
        output.push(row);
      }
    }

    return output;
  }

  private async findStudentUidByEmail(email: string): Promise<string | null> {
    const userRows = await this.readTable(this.usersTable, { email });
    if (userRows.length === 0) return null;

    const user = userRows[0];
    const uid = this.str(user.uid);
    return uid || this.str(user._id) || null;
  }

  private async ensureCategory(courseId: string, categoryName: string): Promise<string | null> {
    const existing = await this.readTable(this.categoriesTable, {
      courseId,
      name: categoryName,
    });

    if (existing.length > 0) {
      return this.str(existing[0]._id);
    }

    const inserted = await this.insertRecord(this.categoriesTable, {
      courseId,
      name: categoryName,
      createdAt: new Date().toISOString(),
    });

    if (!inserted) {
      return null;
    }

    const created = await this.findOne(this.categoriesTable, {
      courseId,
      name: categoryName,
    });

    return created ? this.str(created._id) : null;
  }

  private async ensureCategoryById(courseId: string, categoryId: string): Promise<Row | null> {
    if (!categoryId.trim()) {
      return null;
    }

    return this.getCategoryById(courseId, categoryId);
  }

  private async ensureGroup(
    courseId: string,
    categoryId: string,
    groupName: string,
    displayName: string,
    nrc?: string
  ): Promise<string | null> {
    // Try existing by groupName
    const existingByGroupName = await this.readTable(this.groupsTable, {
      courseId,
      categoryId,
      groupName,
    });

    if (existingByGroupName.length > 0) {
      return this.str(existingByGroupName[0]._id);
    }

    // Try existing by displayName/name
    const existingByName = await this.readTable(this.groupsTable, {
      courseId,
      categoryId,
      name: displayName,
    });

    if (existingByName.length > 0) {
      return this.str(existingByName[0]._id);
    }

    // Insert with multiple payload attempts (schema variations)
    const nowIso = new Date().toISOString();
    const payloads = [
      {
        courseId,
        categoryId,
        groupName,
        displayName,
        ...(nrc ? { nrc } : {}),
        createdAt: nowIso,
      },
      {
        courseId,
        categoryId,
        name: displayName,
        groupCode: groupName,
        ...(nrc ? { nrc } : {}),
        createdAt: nowIso,
      },
      {
        courseId,
        categoryId,
        name: groupName,
        code: groupName,
        createdAt: nowIso,
      },
    ];

    for (const payload of payloads) {
      const inserted = await this.insertRecord(this.groupsTable, payload);
      if (inserted) {
        const created = await this.findOne(this.groupsTable, {
          courseId,
          categoryId,
          groupName,
        }) ?? await this.findOne(this.groupsTable, {
          courseId,
          categoryId,
          name: displayName,
        }) ?? await this.findOne(this.groupsTable, {
          courseId,
          categoryId,
          name: groupName,
        });

        if (created) {
          return this.str(created._id);
        }
      }
    }

    return null;
  }

  private async ensureGroupsBulk(
    courseId: string,
    categoryId: string,
    rows: CsvStudentRow[]
  ): Promise<[Map<string, string>, number]> {
    const uniqueRowsByGroup = new Map<string, CsvStudentRow>();
    for (const row of rows) {
      if (!uniqueRowsByGroup.has(row.groupName)) {
        uniqueRowsByGroup.set(row.groupName, row);
      }
    }

    // Load existing groups
    const existing = await this.readTable(this.groupsTable, {
      courseId,
      categoryId,
    });

    const result = new Map<string, string>();
    for (const group of existing) {
      const groupId = this.str(group._id);
      if (!groupId) continue;

      const groupName = this.str(group.groupName);
      const groupCode = this.str(group.groupCode);
      const code = this.str(group.code);
      const name = this.str(group.name);
      const displayName = this.str(group.displayName);

      if (groupName) result.set(groupName, groupId);
      if (groupCode) result.set(groupCode, groupId);
      if (code) result.set(code, groupId);

      // Try to match by displayName or name
      const fromName = [...uniqueRowsByGroup.values()].find(
        (r) => r.groupDisplayName === name || r.groupDisplayName === displayName
      );
      if (fromName) {
        result.set(fromName.groupName, groupId);
      }
    }

    let createdGroups = 0;
    for (const row of uniqueRowsByGroup.values()) {
      if (result.has(row.groupName)) continue;

      const inserted = await this.ensureGroup(courseId, categoryId, row.groupName, row.groupDisplayName, row.groupName);

      if (inserted) {
        result.set(row.groupName, inserted);
        createdGroups++;
      }
    }

    return [result, createdGroups];
  }

  // ============ PUBLIC METHODS ============

  async createCourse(input: { name: string; nrc: string; term: string; teacherUid: string }): Promise<TeacherCourseOverview | null> {
    const now = new Date().toISOString();
    const inserted = await this.insertRecord(this.coursesTable, {
      name: input.name,
      nrc: input.nrc,
      term: input.term,
      createdBy: input.teacherUid,
      createdAt: now,
    });

    if (!inserted) return null;

    const created = await this.findOne(this.coursesTable, {
      createdBy: input.teacherUid,
      name: input.name,
      nrc: input.nrc,
      term: input.term,
    });

    if (!created) return null;

    return {
      id: this.str(created._id),
      name: this.str(created.name),
      nrc: this.str(created.nrc),
      term: this.str(created.term),
      categoriesCount: 0,
      groupsCount: 0,
      activeStudentsCount: 0,
      categories: [],
    };
  }

  async getTeacherCourseOverviews(teacherUid: string): Promise<TeacherCourseOverview[]> {
    try {
      const courses = await this.readTable(this.coursesTable, { createdBy: teacherUid });
      if (!Array.isArray(courses)) {
        this._log('ERROR', `readTable returned non-array for courses: ${typeof courses}`);
        return [];
      }
      return this.buildCourseOverviews(courses);
    } catch (error) {
      this._log('ERROR', `getTeacherCourseOverviews failed: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  }

  private async buildCourseOverviews(courses: Row[]): Promise<TeacherCourseOverview[]> {
    const output: TeacherCourseOverview[] = [];
    
    if (!Array.isArray(courses) || courses.length === 0) {
      this._log('buildCourseOverviews', `No courses to process`);
      return output;
    }

    for (const course of courses) {
      try {
        const courseId = this.str(course._id);
        if (!courseId) continue;

        const categories = await this.readTable(this.categoriesTable, { courseId });
        const groups = await this.readTable(this.groupsTable, { courseId });
        const groupIds = groups.map((g) => this.str(g._id)).filter(Boolean);
        const activeEnrollments = await this.readActiveEnrollmentsByGroupIds(groupIds);

        // Organize groups by category
        const groupsByCategory = new Map<string, Row[]>();
        const categoryIdByGroupId = new Map<string, string>();

        for (const group of groups) {
          if (!group) {
            this._log('buildCourseOverviews', 'Found null/undefined group in groups array');
            continue;
          }
          const categoryId = this.str(group.categoryId);
          const groupId = this.str(group._id);
          if (categoryId && groupId) {
            categoryIdByGroupId.set(groupId, categoryId);
            const existing = groupsByCategory.get(categoryId) || [];
            existing.push(group);
            groupsByCategory.set(categoryId, existing);
          }
        }

      // Count students by group and category
      const studentsByGroup = new Map<string, number>();
      const studentsByCategory = new Map<string, number>();
      const studentRowsByGroup = new Map<string, Row[]>();

      for (const enrollment of activeEnrollments) {
        const groupId = this.str(enrollment.groupId);
        const categoryId = categoryIdByGroupId.get(groupId) || '';

        if (groupId) {
          studentsByGroup.set(groupId, (studentsByGroup.get(groupId) || 0) + 1);
          const existing = studentRowsByGroup.get(groupId) || [];
          existing.push(enrollment);
          studentRowsByGroup.set(groupId, existing);
        }

        if (categoryId) {
          studentsByCategory.set(categoryId, (studentsByCategory.get(categoryId) || 0) + 1);
        }
      }

      // Build category overviews
      const categoryOverview: CategoryOverview[] = categories.map((category) => {
        const categoryId = this.str(category._id);
        const categoryGroups = groupsByCategory.get(categoryId) || [];

        const groupOverview = categoryGroups.map((group) => {
          const groupId = this.str(group._id);
          const studentList = (studentRowsByGroup.get(groupId) || []).map((e) => this.mapStudentOverview(e));
          return this.mapGroupOverview(group, studentList);
        });

        return {
          id: categoryId,
          name: this.str(category.name),
          activeStudentsCount: studentsByCategory.get(categoryId) || 0,
          groups: groupOverview,
        };
      });

      output.push({
        id: courseId,
        name: this.str(course.name),
        nrc: this.str(course.nrc),
        term: this.str(course.term),
        categoriesCount: categories.length,
        groupsCount: groups.length,
        activeStudentsCount: activeEnrollments.length,
        categories: categoryOverview,
      });
      } catch (error) {
        this._log('ERROR', `Failed to process course ${course?._id}: ${error instanceof Error ? error.message : String(error)}`);
        // Continue processing other courses instead of crashing
      }
    }

    return output;
  }

  async syncCategoryFromCsv(input: {
    courseId: string;
    categoryName: string;
    csvContent: string;
    uploadedBy: string;
  }): Promise<CsvSyncResult> {
    const normalizedCategory = this.normalizeCategoryString(input.categoryName);
    const parsedRows = this.csvParser.parseRows(input.csvContent).filter((row) => {
      const rowCategory = this.normalizeCategoryString(row.categoryName);
      return rowCategory === normalizedCategory || rowCategory.includes(normalizedCategory);
    });

    if (parsedRows.length === 0) {
      throw new Error(`El CSV no tiene filas válidas para la categoría ${input.categoryName}`);
    }

    // Ensure category exists
    const categoryId = await this.ensureCategory(input.courseId, input.categoryName);
    if (!categoryId) {
      throw new Error('No se pudo crear/encontrar la categoría');
    }

    // Check if CSV was already synced
    const fileHash = String(input.csvContent.length);
    const previousImports = await this.readTable(this.importsTable, {
      courseId: input.courseId,
      categoryId,
      fileHash,
      status: 'completed',
    });

    if (previousImports.length > 0) {
      this._log('SYNC', `CSV ya procesado previamente (fileHash=${fileHash}).`);
      return {
        createdGroups: 0,
        activatedEnrollments: 0,
        closedEnrollments: 0,
        totalRows: parsedRows.length,
      };
    }

    // Create import record
    const importInserted = await this.insertRecord(this.importsTable, {
      courseId: input.courseId,
      categoryId,
      uploadedBy: input.uploadedBy,
      uploadedAt: new Date().toISOString(),
      fileHash,
      status: 'processing',
    });

    const importRecord = importInserted
      ? await this.findOne(this.importsTable, {
          courseId: input.courseId,
          categoryId,
          fileHash,
          status: 'processing',
        })
      : null;
    const importId = importRecord ? this.str(importRecord._id) : '';
    let createdGroups = 0;
    let activatedEnrollments = 0;
    let closedEnrollments = 0;

    // Ensure groups exist
    const [groupIdByName, newGroupsCount] = await this.ensureGroupsBulk(input.courseId, categoryId, parsedRows);
    createdGroups = newGroupsCount;

    // Map students to UIDs and desired groups
    const uidByEmail = new Map<string, string>();
    const desiredByStudentEmail = new Map<string, CsvStudentRow>();

    for (const row of parsedRows) {
      const ensuredGroupId = groupIdByName.get(row.groupName);
      if (!ensuredGroupId) continue;

      let studentUid = uidByEmail.get(row.studentEmail) || '';
      if (!studentUid) {
        const found = await this.findStudentUidByEmail(row.studentEmail);
        studentUid = found || `email:${row.studentEmail}`;
        uidByEmail.set(row.studentEmail, studentUid);
      }

      desiredByStudentEmail.set(row.studentEmail.toLowerCase(), row);
    }

    if (groupIdByName.size === 0) {
      throw new Error('No se pudieron crear/leer grupos. Revisa nombres de columnas.');
    }

    // Get current active enrollments
    const groupsInCategory = await this.readTable(this.groupsTable, {
      courseId: input.courseId,
      categoryId,
    });
    const groupIdsInCategory = new Set(groupsInCategory.map((g) => this.str(g._id)).filter(Boolean));

    const activeEnrollments = await this.readActiveEnrollmentsByGroupIds([...groupIdsInCategory]);

    const activeByStudentEmail = new Map<string, Row>();
    for (const enrollment of activeEnrollments) {
      const email = this.str(enrollment.studentEmail).toLowerCase();
      const uid = this.str(enrollment.studentUId) || this.str(enrollment.studentUid);
      const key = email || uid;
      if (key) {
        activeByStudentEmail.set(key, enrollment);
      }
    }

    const nowIso = new Date().toISOString();

    // Close enrollments not in desired state
    for (const [studentKey, currentEnrollment] of activeByStudentEmail.entries()) {
      const desiredRow = desiredByStudentEmail.get(studentKey);
      const currentGroupId = this.str(currentEnrollment.groupId);
      const desiredGroupId = desiredRow ? (groupIdByName.get(desiredRow.groupName) || '') : '';

      if (!desiredRow || desiredGroupId !== currentGroupId) {
        const closed = await this.updateRecord(
          this.enrollmentsTable,
          { _id: this.str(currentEnrollment._id) },
          { isActive: false, validTo: nowIso }
        );
        if (closed) {
          closedEnrollments++;
        }
      }
    }

    // Create new enrollments
    for (const [studentEmail, row] of desiredByStudentEmail.entries()) {
      const existingActive = activeByStudentEmail.get(studentEmail);
      const desiredGroupId = groupIdByName.get(row.groupName) || '';
      const studentUid = uidByEmail.get(row.studentEmail) || `email:${row.studentEmail}`;

      if (!desiredGroupId) continue;

      const alreadyInSameGroup = existingActive && this.str(existingActive.groupId) === desiredGroupId;

      if (!alreadyInSameGroup) {
        const inserted = await this.insertRecord(this.enrollmentsTable, {
          groupId: desiredGroupId,
          studentUId: studentUid,
          studentName: row.studentName,
          studentEmail: row.studentEmail,
          enrolledAt: nowIso,
          isActive: true,
          validFrom: nowIso,
          sourceImportId: importId,
          createdAt: nowIso,
        });

        if (inserted) {
          activatedEnrollments++;
        }
      }
    }

    // Mark import as completed
    if (importId) {
      try {
        await this.updateRecord(
          this.importsTable,
          { _id: importId },
          { status: 'completed' }
        );
      } catch (error) {
        this._log('SYNC', `No se pudo marcar csv_imports como completado: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    return {
      createdGroups,
      activatedEnrollments,
      closedEnrollments,
      totalRows: parsedRows.length,
    };
  }

  async getEvaluationCyclesByCourse(courseId: string): Promise<EvaluationCycleData[]> {
    const rows = await this.readTable(this.evaluationCyclesTable, { courseId });
    return rows.map((row) => this.mapEvaluationCycle(row));
  }

  async getEvaluationCyclesByCategory(courseId: string, categoryId: string): Promise<EvaluationCycleData[]> {
    const groups = await this.getGroupsByCategory(courseId, categoryId);
    const groupIds = [...new Set(groups.map((group) => this.str(group._id)).filter(Boolean))];
    const cycles: EvaluationCycleData[] = [];
    const seen = new Set<string>();

    for (const groupId of groupIds) {
      const rows = await this.readTable(this.evaluationCyclesTable, { courseId, groupId });
      for (const row of rows) {
        const cycle = this.mapEvaluationCycle(row);
        if (cycle.id && !seen.has(cycle.id)) {
          seen.add(cycle.id);
          cycles.push(cycle);
        }
      }
    }

    return cycles;
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

  async createEvaluationCycle(input: {
    courseId: string;
    categoryId: string;
    title: string;
    openedBy: string;
    rubrics: string[];
    closesAt?: string | null;
  }): Promise<EvaluationCycleData | null> {
    const category = await this.ensureCategoryById(input.courseId, input.categoryId);
    if (!category) {
      throw new Error('Categoría no encontrada');
    }

    const groups = await this.getGroupsByCategory(input.courseId, input.categoryId);
    if (groups.length === 0) {
      throw new Error('La categoría no tiene grupos asociados');
    }

    const now = new Date().toISOString();
    const firstGroup = groups[0];
    const inserted = await this.insertRecord(this.evaluationCyclesTable, {
      courseId: input.courseId,
      groupId: this.str(firstGroup?._id),
      categoryId: input.categoryId,
      title: input.title,
      openedBy: input.openedBy,
      openedAt: now,
      closeAt: input.closesAt ?? null,
      status: 'open',
      criteria: { rubrics: input.rubrics },
    });

    if (!inserted) return null;

    const created = await this.findOne(this.evaluationCyclesTable, {
      courseId: input.courseId,
      groupId: this.str(firstGroup?._id),
      title: input.title,
      openedBy: input.openedBy,
    });

    return created ? this.mapEvaluationCycle(created) : null;
  }

  async createEvaluationCyclesForCategory(input: {
    courseId: string;
    categoryId: string;
    title: string;
    openedBy: string;
    rubrics: string[];
    closesAt?: string | null;
  }): Promise<EvaluationCycleData[]> {
    const category = await this.ensureCategoryById(input.courseId, input.categoryId);
    if (!category) {
      throw new Error('Categoría no encontrada');
    }

    const groups = await this.getGroupsByCategory(input.courseId, input.categoryId);
    if (groups.length === 0) {
      throw new Error('La categoría no tiene grupos asociados');
    }

    const createdCycles: EvaluationCycleData[] = [];
    for (const group of groups) {
      const inserted = await this.insertRecord(this.evaluationCyclesTable, {
        courseId: input.courseId,
        groupId: this.str(group._id),
        categoryId: input.categoryId,
        title: input.title,
        openedBy: input.openedBy,
        openedAt: new Date().toISOString(),
        closeAt: input.closesAt ?? null,
        status: 'open',
        criteria: { rubrics: input.rubrics },
      });

      if (inserted) {
        const created = await this.findOne(this.evaluationCyclesTable, {
          courseId: input.courseId,
          groupId: this.str(group._id),
          title: input.title,
          openedBy: input.openedBy,
        });

        if (created) {
          createdCycles.push(this.mapEvaluationCycle(created));
        }
      }
    }

    return createdCycles;
  }

}
