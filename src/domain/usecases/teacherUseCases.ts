import { TeacherRepository } from '../repositories/teacherRepositoryImpl';
import { TeacherCourseOverview, CsvSyncResult, EvaluationCycleData, EvaluationScope } from '../../domain/entities/academic';

export class GetTeacherCoursesUseCase {
  constructor(private repository: TeacherRepository) {}

  async execute(teacherUid: string): Promise<TeacherCourseOverview[]> {
    return this.repository.getTeacherCourseOverviews(teacherUid);
  }
}

export class CreateCourseUseCase {
  constructor(private repository: TeacherRepository) {}

  async execute(input: { name: string; nrc: string; term: string; teacherUid: string }): Promise<TeacherCourseOverview | null> {
    if (!input.name.trim()) {
      throw new Error('El nombre del curso es requerido');
    }
    if (!input.nrc.trim()) {
      throw new Error('El NRC es requerido');
    }
    if (!input.term.trim()) {
      throw new Error('El término es requerido');
    }

    return this.repository.createCourse(input);
  }
}

export class SyncCsvUseCase {
  constructor(private repository: TeacherRepository) {}

  async execute(input: {
    courseId: string;
    categoryName: string;
    csvContent: string;
    uploadedBy: string;
  }): Promise<CsvSyncResult> {
    if (!input.courseId.trim()) {
      throw new Error('El ID del curso es requerido');
    }
    if (!input.categoryName.trim()) {
      throw new Error('El nombre de la categoría es requerido');
    }
    if (!input.csvContent.trim()) {
      throw new Error('El contenido del CSV es requerido');
    }

    return this.repository.syncCategoryFromCsv(input);
  }
}

export class GetEvaluationCyclesUseCase {
  constructor(private repository: TeacherRepository) {}

  async execute(categoryId: string): Promise<EvaluationCycleData[]> {
    if (!categoryId.trim()) {
      throw new Error('El ID de la categoría es requerido');
    }

    return this.repository.getEvaluationCyclesByCategory(categoryId);
  }
}

export class CreateEvaluationCycleUseCase {
  constructor(private repository: TeacherRepository) {}

  async execute(input: {
    courseId: string;
    categoryId: string;
    title: string;
    openedBy: string;
    rubrics: string[];
    closesAt?: string | null;
    evaluationScope: EvaluationScope;
  }): Promise<EvaluationCycleData | null> {
    if (!input.courseId.trim()) {
      throw new Error('El ID del curso es requerido');
    }
    if (!input.categoryId.trim()) {
      throw new Error('El ID de la categoría es requerido');
    }
    if (!input.title.trim()) {
      throw new Error('El título del ciclo es requerido');
    }
    if (!input.rubrics || input.rubrics.length === 0) {
      throw new Error('Al menos un rubric es requerido');
    }

    return this.repository.createEvaluationCycle(input);
  }
}

// Factory for all teacher use cases
export class TeacherUseCases {
  readonly getTeacherCourses: GetTeacherCoursesUseCase;
  readonly createCourse: CreateCourseUseCase;
  readonly syncCsv: SyncCsvUseCase;
  readonly getEvaluationCycles: GetEvaluationCyclesUseCase;
  readonly createEvaluationCycle: CreateEvaluationCycleUseCase;

  constructor(repository: TeacherRepository) {
    this.getTeacherCourses = new GetTeacherCoursesUseCase(repository);
    this.createCourse = new CreateCourseUseCase(repository);
    this.syncCsv = new SyncCsvUseCase(repository);
    this.getEvaluationCycles = new GetEvaluationCyclesUseCase(repository);
    this.createEvaluationCycle = new CreateEvaluationCycleUseCase(repository);
  }
}
