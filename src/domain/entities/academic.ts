export interface TeacherCourseOverview {
  id: string;
  name: string;
  nrc: string;
  term: string;
  categoriesCount: number;
  groupsCount: number;
  activeStudentsCount: number;
  categories: CategoryOverview[];
}

export interface CategoryOverview {
  id: string;
  name: string;
  activeStudentsCount: number;
  groups: GroupOverview[];
}

export interface GroupOverview {
  id: string;
  code: string;
  name: string;
  activeStudentsCount: number;
  students: StudentOverview[];
}

export interface StudentOverview {
  uid: string;
  name: string;
  email: string;
  studentId: string;
}

export interface CsvSyncResult {
  createdGroups: number;
  activatedEnrollments: number;
  closedEnrollments: number;
  totalRows: number;
}

export type EvaluationScope = 'own_group' | 'all_groups';

export interface EvaluationCycleData {
  id: string;
  courseId: string;
  categoryId: string;
  groupId?: string;  // kept optional for backward compat with old records
  title: string;
  status: string;
  openedBy: string;
  openedAt: string;
  closesAt?: string | null;
  rubrics: string[];
  evaluationScope: EvaluationScope;

  // Computed fields (derived from category/group lookups, not from ROBLE)
  isOpen?: boolean;
  isClosed?: boolean;
}

export interface PeerEvaluationData {
  id: string;
  cycleId: string;
  evaluatorUid: string;
  evaluateeUid: string;
  scores: number[];
  comments?: string | null;
  createdAt: string;
  updatedAt?: string | null;
}

export interface PendingEvaluationInfo {
  cycle: EvaluationCycleData;
  group: GroupOverview;
  categoryName: string;
  category: {
    name: string;
  };
  peersToEvaluate: StudentOverview[];
  peersGroupedByGroup: Array<{ group: GroupOverview; peers: StudentOverview[] }>;
  alreadyEvaluatedUids: string[];
}

export interface EvaluationResult {
  id: string;
  cycleId: string;
  cycleTitle: string;
  evaluatee: StudentOverview;
  categoryName: string;
  groupName: string;
  rubricScores: Record<string, number>;
  averageTotal: number;
  comments: string[];
  totalEvaluators: number;
}

export interface GroupStats {
  groupId: string;
  groupName: string;
  totalStudents: number;
  evaluatedStudents: number;
  averageScore: number;
  pendingStudents: number;
  completionRate: number;
}

export interface DashboardConsolidated {
  cycleTitle: string;
  results: EvaluationResult[];
  groupAverage: number;
  totalStudents: number;
  evaluatedStudents: number;
  pendingStudents: number;
  totalEvaluationsSubmitted: number;
  rubricAverages: Record<string, number>;
  groupStats: GroupStats[];
  topStudents: EvaluationResult[];
  lowStudents: EvaluationResult[];
}