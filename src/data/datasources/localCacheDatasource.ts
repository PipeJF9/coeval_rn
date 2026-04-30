import { clearByPrefix, readJson, removeItem, writeJson } from '../../core/utils/storage';
import { EvaluationResult, PendingEvaluationInfo, TeacherCourseOverview } from '../../domain/entities/academic';
import { User } from '../../domain/entities/user';

const SESSION_PREFIX = 'coeval.session.';
const STUDENT_COURSES_PREFIX = 'coeval.student.courses.';
const STUDENT_PENDING_PREFIX = 'coeval.student.pending.';
const STUDENT_RESULTS_PREFIX = 'coeval.student.results.';

export interface SessionPayload {
  token: string;
  refreshToken?: string;
  user: User;
}

export class LocalCacheDatasource {
  async saveSession(payload: SessionPayload) {
    await writeJson(`${SESSION_PREFIX}current`, payload);
  }

  async loadSession() {
    return readJson<SessionPayload>(`${SESSION_PREFIX}current`);
  }

  async clearSession() {
    await removeItem(`${SESSION_PREFIX}current`);
  }

  async saveStudentCourses(key: string, courses: TeacherCourseOverview[]) {
    await writeJson(`${STUDENT_COURSES_PREFIX}${key}`, courses);
  }

  async loadStudentCourses(key: string) {
    return readJson<TeacherCourseOverview[]>(`${STUDENT_COURSES_PREFIX}${key}`);
  }

  async savePendingEvaluations(key: string, pending: PendingEvaluationInfo[]) {
    await writeJson(`${STUDENT_PENDING_PREFIX}${key}`, pending);
  }

  async loadPendingEvaluations(key: string) {
    return readJson<PendingEvaluationInfo[]>(`${STUDENT_PENDING_PREFIX}${key}`);
  }

  async saveStudentResults(key: string, results: EvaluationResult[]) {
    await writeJson(`${STUDENT_RESULTS_PREFIX}${key}`, results);
  }

  async loadStudentResults(key: string) {
    return readJson<EvaluationResult[]>(`${STUDENT_RESULTS_PREFIX}${key}`);
  }

  async invalidateStudentKey(key: string) {
    await removeItem(`${STUDENT_PENDING_PREFIX}${key}`);
    await removeItem(`${STUDENT_COURSES_PREFIX}${key}`);
    await removeItem(`${STUDENT_RESULTS_PREFIX}${key}`);
  }

  async clearAllStudentCaches() {
    await clearByPrefix(STUDENT_COURSES_PREFIX);
    await clearByPrefix(STUDENT_PENDING_PREFIX);
    await clearByPrefix(STUDENT_RESULTS_PREFIX);
  }
}