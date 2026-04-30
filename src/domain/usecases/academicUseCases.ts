import { AcademicRepository } from '@/domain/repositories/academicRepository';

export class GetStudentCourseOverviewsUseCase {
  constructor(private readonly repository: AcademicRepository) {}

  execute(input: { studentEmail: string; studentUid?: string | null }) {
    return this.repository.getStudentCourseOverviews(input);
  }
}

export class GetPendingEvaluationsForStudentUseCase {
  constructor(private readonly repository: AcademicRepository) {}

  execute(input: { studentEmail: string; studentUid: string }) {
    return this.repository.getPendingEvaluationsForStudent(input);
  }
}

export class SubmitEvaluationUseCase {
  constructor(private readonly repository: AcademicRepository) {}

  execute(input: {
    cycleId: string;
    evaluatorUid: string;
    evaluateeUid: string;
    scores: number[];
    comments?: string | null;
  }) {
    return this.repository.submitEvaluation(input);
  }
}

export class CreateEvaluationCycleUseCase {
  constructor(private readonly repository: AcademicRepository) {}

  execute(input: {
    courseId: string;
    categoryId: string;
    title: string;
    openedBy: string;
    rubrics: string[];
    closesAt?: string | null;
  }) {
    return this.repository.createEvaluationCycle(input);
  }
}

export class SyncCategoryFromCsvUseCase {
  constructor(private readonly repository: AcademicRepository) {}

  execute(input: {
    courseId: string;
    categoryName: string;
    csvContent: string;
    uploadedBy: string;
  }) {
    return this.repository.syncCategoryFromCsv(input);
  }
}

export class GetEvaluationCyclesByCourseUseCase {
  constructor(private readonly repository: AcademicRepository) {}

  execute(courseId: string) {
    return this.repository.getEvaluationCyclesByCourse(courseId);
  }
}

export class GetEvaluationCyclesByCategoryUseCase {
  constructor(private readonly repository: AcademicRepository) {}

  execute(categoryId: string) {
    return this.repository.getEvaluationCyclesByCategory(categoryId);
  }
}