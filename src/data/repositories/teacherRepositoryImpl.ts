import AsyncStorage from '@react-native-async-storage/async-storage';
import { TeacherRemoteDataSource } from '../datasources/teacherRemoteDatasource';
import { TeacherCourseOverview, CsvSyncResult, EvaluationCycleData, EvaluationScope } from '../../domain/entities/academic';

export interface TeacherRepository {
  // Courses
  createCourse(input: { name: string; nrc: string; term: string; teacherUid: string }): Promise<TeacherCourseOverview | null>;
  getTeacherCourseOverviews(teacherUid: string): Promise<TeacherCourseOverview[]>;

  // CSV Sync
  syncCategoryFromCsv(input: {
    courseId: string;
    categoryName: string;
    csvContent: string;
    uploadedBy: string;
  }): Promise<CsvSyncResult>;

  // Evaluation Cycles
  getEvaluationCyclesByCategory(categoryId: string): Promise<EvaluationCycleData[]>;
  createEvaluationCycle(input: {
    courseId: string;
    categoryId: string;
    title: string;
    openedBy: string;
    rubrics: string[];
    closesAt?: string | null;
    evaluationScope: EvaluationScope;
  }): Promise<EvaluationCycleData | null>;

  // Cache
  clearCache(): Promise<void>;
}

const CACHE_KEYS = {
  TEACHER_COURSES: (teacherUid: string) => `teacher:courses:${teacherUid}`,
  EVALUATION_CYCLES: (categoryId: string) => `teacher:cycles:cat:${categoryId}`,
};

const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutos

export class TeacherRepositoryImpl implements TeacherRepository {
  constructor(private remoteDatasource: TeacherRemoteDataSource) {}

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

  async createCourse(input: {
    name: string;
    nrc: string;
    term: string;
    teacherUid: string;
  }): Promise<TeacherCourseOverview | null> {
    try {
      const course = await this.remoteDatasource.createCourse(input);

      // Invalidate courses cache
      await this.clearCache();

      return course;
    } catch (error) {
      console.error('[TEACHER] Error creating course:', error);
      return null;
    }
  }

  async getTeacherCourseOverviews(teacherUid: string): Promise<TeacherCourseOverview[]> {
    const cacheKey = CACHE_KEYS.TEACHER_COURSES(teacherUid);

    // Try cache first
    const cached = await this._getCachedData<TeacherCourseOverview[]>(cacheKey);
    if (cached) {
      console.log(`[TEACHER] Loaded courses from cache for ${teacherUid}`);
      return cached;
    }

    // Cache miss: fetch from remote
    console.log(`[TEACHER] Fetching courses from ROBLE for ${teacherUid}`);
    try {
      const courses = await this.remoteDatasource.getTeacherCourseOverviews(teacherUid);
      
      if (!Array.isArray(courses)) {
        console.error(`[TEACHER] getTeacherCourseOverviews returned non-array:`, courses);
        return [];
      }

      await this._setCachedData(cacheKey, courses);
      console.log(`[TEACHER] Loaded ${courses.length} courses for ${teacherUid}`);
      return courses;
    } catch (error) {
      console.error(`[TEACHER] Error fetching courses:`, error instanceof Error ? error.message : error);
      return [];
    }
  }

  async syncCategoryFromCsv(input: {
    courseId: string;
    categoryName: string;
    csvContent: string;
    uploadedBy: string;
  }): Promise<CsvSyncResult> {
    try {
      const result = await this.remoteDatasource.syncCategoryFromCsv(input);

      // Clear caches after sync
      await this.clearCache();

      return result;
    } catch (error) {
      console.error(`[TEACHER] Error syncing CSV:`, error);
      throw error;
    }
  }

  async getEvaluationCyclesByCategory(categoryId: string): Promise<EvaluationCycleData[]> {
    const cacheKey = CACHE_KEYS.EVALUATION_CYCLES(categoryId);

    const cached = await this._getCachedData<EvaluationCycleData[]>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const cycles = await this.remoteDatasource.getEvaluationCyclesByCategory(categoryId);
      await this._setCachedData(cacheKey, cycles);
      return cycles;
    } catch (error) {
      console.error(`[TEACHER] Error fetching cycles:`, error);
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
    evaluationScope: EvaluationScope;
  }): Promise<EvaluationCycleData | null> {
    try {
      const cycle = await this.remoteDatasource.createEvaluationCycle(input);

      // Clear related caches
      await this.clearCache();

      return cycle;
    } catch (error) {
      console.error(`[TEACHER] Error creating evaluation cycle:`, error);
      return null;
    }
  }

  async clearCache(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const teacherKeys = keys.filter((k) => k.startsWith('teacher:'));
      await AsyncStorage.multiRemove(teacherKeys);
      console.log(`[CACHE] Cleared ${teacherKeys.length} teacher cache entries`);
    } catch (error) {
      console.error(`[CACHE] Error clearing cache:`, error);
    }
  }
}
