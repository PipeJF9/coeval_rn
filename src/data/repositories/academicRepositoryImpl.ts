import AsyncStorage from '@react-native-async-storage/async-storage';
import { AcademicRemoteDatasource } from '../datasources/academicRemoteDatasource';
import {
  TeacherCourseOverview,
  PendingEvaluationInfo,
  EvaluationCycleData,
  PeerEvaluationData,
  CsvSyncResult,
} from '../../domain/entities/academic';


export interface AcademicRepository {
  // Student flows
  getStudentCourseOverviews(input: { studentEmail: string; studentUid?: string | null }): Promise<TeacherCourseOverview[]>;
  getPendingEvaluationsForStudent(input: { studentEmail: string; studentUid: string }): Promise<PendingEvaluationInfo[]>;
  getSubmittedEvaluations(input: { cycleId: string; evaluatorUid: string }): Promise<PeerEvaluationData[]>;
  submitEvaluation(input: {
    cycleId: string;
    evaluatorUid: string;
    evaluateeUid: string;
    scores: number[];
    comments?: string | null;
  }): Promise<boolean>;

  // Teacher/Admin flows
  getEvaluationCyclesByCourse(courseId: string): Promise<EvaluationCycleData[]>;
  getEvaluationCyclesByCategory(categoryId: string): Promise<EvaluationCycleData[]>;
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

  // Cache management
  clearCache(): Promise<void>;
}

const CACHE_KEYS = {
  STUDENT_COURSES: (email: string) => `academic:courses:${email}`,
  PENDING_EVALUATIONS: (email: string) => `academic:pending:${email}`,
  EVALUATION_CYCLES: (id: string) => `academic:cycles:${id}`,
};

const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutos

export class AcademicRepositoryImpl implements AcademicRepository {
  constructor(private remoteDatasource: AcademicRemoteDatasource) {}

  private async _isCacheValid(cacheTimestamp: number): Promise<boolean> {
    const now = Date.now();
    return now - cacheTimestamp < CACHE_DURATION_MS;
  }

  private async _getCachedData<T>(key: string): Promise<T | null> {
    try {
      const cached = await AsyncStorage.getItem(key);
      if (!cached) return null;

      const { data, timestamp } = JSON.parse(cached);
      if (!(await this._isCacheValid(timestamp))) {
        await AsyncStorage.removeItem(key);
        return null;
      }

      return data as T;
    } catch (error) {
      console.error(`[CACHE] Error reading ${key}:`, error);
      return null;
    }
  }

  private async _setCachedData<T>(key: string, data: T): Promise<void> {
    try {
      await AsyncStorage.setItem(
        key,
        JSON.stringify({
          data,
          timestamp: Date.now(),
        })
      );
    } catch (error) {
      console.error(`[CACHE] Error writing ${key}:`, error);
    }
  }

  async getStudentCourseOverviews(input: {
    studentEmail: string;
    studentUid?: string | null;
  }): Promise<TeacherCourseOverview[]> {
    const cacheKey = CACHE_KEYS.STUDENT_COURSES(input.studentEmail);

    // Try cache first
    const cached = await this._getCachedData<TeacherCourseOverview[]>(cacheKey);
    if (cached) {
      console.log(`[ACADEMIC] Loaded courses from cache for ${input.studentEmail}`);
      return cached;
    }

    // Cache miss: fetch from remote
    console.log(`[ACADEMIC] Fetching courses from ROBLE for ${input.studentEmail}`);
    try {
      const courses = await this.remoteDatasource.getStudentCourseOverviews({
        studentEmail: input.studentEmail,
        studentUid: input.studentUid ?? undefined,
      });

      await this._setCachedData(cacheKey, courses);
      return courses;
    } catch (error) {
      console.error(`[ACADEMIC] Error fetching courses:`, error);
      return [];
    }
  }

  async getPendingEvaluationsForStudent(input: {
    studentEmail: string;
    studentUid: string;
  }): Promise<PendingEvaluationInfo[]> {
    const cacheKey = CACHE_KEYS.PENDING_EVALUATIONS(input.studentEmail);

    // Try cache first
    const cached = await this._getCachedData<PendingEvaluationInfo[]>(cacheKey);
    if (cached) {
      console.log(`[ACADEMIC] Loaded pending evaluations from cache for ${input.studentEmail}`);
      return cached.map((item) => ({
        ...item,
        category: item.category ?? { name: item.categoryName ?? '' },
      }));
    }

    // Cache miss: fetch from remote
    console.log(`[ACADEMIC] Fetching pending evaluations from ROBLE for ${input.studentEmail}`);
    try {
      const pending = await this.remoteDatasource.getPendingEvaluationsForStudent({
        studentEmail: input.studentEmail,
        studentUid: input.studentUid,
      });

      await this._setCachedData(cacheKey, pending);
      return pending;
    } catch (error) {
      console.error(`[ACADEMIC] Error fetching pending evaluations:`, error);
      return [];
    }
  }

  async getSubmittedEvaluations(input: {
    cycleId: string;
    evaluatorUid: string;
  }): Promise<PeerEvaluationData[]> {
    try {
      return await this.remoteDatasource.getSubmittedEvaluations({
        cycleId: input.cycleId,
        evaluatorUid: input.evaluatorUid,
      });
    } catch (error) {
      console.error(`[ACADEMIC] Error fetching submitted evaluations:`, error);
      return [];
    }
  }

  async submitEvaluation(input: {
    cycleId: string;
    evaluatorUid: string;
    evaluateeUid: string;
    scores: number[];
    comments?: string | null;
  }): Promise<boolean> {
    try {
      const result = await this.remoteDatasource.submitEvaluation({
        cycleId: input.cycleId,
        evaluatorUid: input.evaluatorUid,
        evaluateeUid: input.evaluateeUid,
        scores: input.scores,
        comments: input.comments,
      });

      // Clear related caches
      await this.clearCache();

      return result;
    } catch (error) {
      console.error(`[ACADEMIC] Error submitting evaluation:`, error);
      return false;
    }
  }

  async getEvaluationCyclesByCourse(courseId: string): Promise<EvaluationCycleData[]> {
    try {
      return await this.remoteDatasource.getEvaluationCyclesByCourse(courseId);
    } catch (error) {
      console.error(`[ACADEMIC] Error fetching evaluation cycles:`, error);
      return [];
    }
  }

  async getEvaluationCyclesByCategory(categoryId: string): Promise<EvaluationCycleData[]> {
    try {
      const cacheKey = CACHE_KEYS.EVALUATION_CYCLES(categoryId);
      const cached = await this._getCachedData<EvaluationCycleData[]>(cacheKey);
      if (cached) {
        return cached;
      }

      const cycles = await this.remoteDatasource.getEvaluationCyclesByCategory(categoryId);
      await this._setCachedData(cacheKey, cycles);
      return cycles;
    } catch (error) {
      console.error(`[ACADEMIC] Error fetching cycles by category:`, error);
      return [];
    }
  }

  async createEvaluationCycle(input: {
    courseId: string;
    categoryId: string;
    title: string;
    openedBy: string;
    rubrics: string[];
    closesAt?: string | null;
  }): Promise<EvaluationCycleData | null> {
    try {
      const result = await this.remoteDatasource.createEvaluationCycle({
        courseId: input.courseId,
        categoryId: input.categoryId,
        title: input.title,
        openedBy: input.openedBy,
        rubrics: input.rubrics,
        closesAt: input.closesAt,
      });

      // Clear related caches
      await this.clearCache();

      return result;
    } catch (error) {
      console.error(`[ACADEMIC] Error creating evaluation cycle:`, error);
      return null;
    }
  }

  async syncCategoryFromCsv(input: {
    courseId: string;
    categoryName: string;
    csvContent: string;
    uploadedBy: string;
  }): Promise<CsvSyncResult> {
    try {
      const result = await this.remoteDatasource.syncCategoryFromCsv({
        courseId: input.courseId,
        categoryName: input.categoryName,
        csvContent: input.csvContent,
        uploadedBy: input.uploadedBy,
      });

      // Clear related caches
      await this.clearCache();

      return result;
    } catch (error) {
      console.error(`[ACADEMIC] Error syncing CSV:`, error);
      return {
        createdGroups: 0,
        activatedEnrollments: 0,
        closedEnrollments: 0,
        totalRows: 0,
      };
    }
  }

  async clearCache(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const academicKeys = keys.filter((k) => k.startsWith('academic:'));
      await AsyncStorage.multiRemove(academicKeys);
      console.log(`[CACHE] Cleared ${academicKeys.length} academic cache entries`);
    } catch (error) {
      console.error(`[CACHE] Error clearing cache:`, error);
    }
  }
}
