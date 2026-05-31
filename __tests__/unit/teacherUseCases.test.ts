import {
  CreateCourseUseCase,
  CreateEvaluationCycleUseCase,
  GetEvaluationCyclesUseCase,
  SyncCsvUseCase,
  TeacherUseCases,
} from '../../src/domain/usecases/teacherUseCases';

const mockRepo = {
  getTeacherCourseOverviews: jest.fn(),
  createCourse: jest.fn(),
  syncCategoryFromCsv: jest.fn(),
  getEvaluationCyclesByCategory: jest.fn(),
  createEvaluationCycle: jest.fn(),
};

beforeEach(() => jest.clearAllMocks());

// ─── CreateCourseUseCase ──────────────────────────────────────────────────────

describe('CreateCourseUseCase', () => {
  const useCase = new CreateCourseUseCase(mockRepo as any);

  it('rejects when name is blank', async () => {
    await expect(useCase.execute({ name: '', nrc: 'NRC01', term: '2025-1', teacherUid: 'uid' }))
      .rejects.toThrow('El nombre del curso es requerido');
  });

  it('rejects when name is only whitespace', async () => {
    await expect(useCase.execute({ name: '   ', nrc: 'NRC01', term: '2025-1', teacherUid: 'uid' }))
      .rejects.toThrow('El nombre del curso es requerido');
  });

  it('rejects when nrc is blank', async () => {
    await expect(useCase.execute({ name: 'Curso', nrc: '', term: '2025-1', teacherUid: 'uid' }))
      .rejects.toThrow('El NRC es requerido');
  });

  it('rejects when term is blank', async () => {
    await expect(useCase.execute({ name: 'Curso', nrc: 'NRC01', term: '', teacherUid: 'uid' }))
      .rejects.toThrow('El término es requerido');
  });

  it('delegates to repository when all fields are valid', async () => {
    const created = { id: '1', name: 'Curso', nrc: 'NRC01', term: '2025-1', categories: [], categoriesCount: 0, groupsCount: 0, activeStudentsCount: 0 };
    mockRepo.createCourse.mockResolvedValue(created);

    const result = await useCase.execute({ name: 'Curso', nrc: 'NRC01', term: '2025-1', teacherUid: 'uid' });

    expect(mockRepo.createCourse).toHaveBeenCalledWith({ name: 'Curso', nrc: 'NRC01', term: '2025-1', teacherUid: 'uid' });
    expect(result).toEqual(created);
  });
});

// ─── SyncCsvUseCase ───────────────────────────────────────────────────────────

describe('SyncCsvUseCase', () => {
  const useCase = new SyncCsvUseCase(mockRepo as any);

  it('rejects when courseId is blank', async () => {
    await expect(useCase.execute({ courseId: '', categoryName: 'Cat', csvContent: 'data', uploadedBy: 'uid' }))
      .rejects.toThrow('El ID del curso es requerido');
  });

  it('rejects when categoryName is blank', async () => {
    await expect(useCase.execute({ courseId: 'c1', categoryName: '', csvContent: 'data', uploadedBy: 'uid' }))
      .rejects.toThrow('El nombre de la categoría es requerido');
  });

  it('rejects when csvContent is blank', async () => {
    await expect(useCase.execute({ courseId: 'c1', categoryName: 'Cat', csvContent: '   ', uploadedBy: 'uid' }))
      .rejects.toThrow('El contenido del CSV es requerido');
  });

  it('delegates to repository when all fields are valid', async () => {
    const syncResult = { createdGroups: 2, activatedEnrollments: 10, closedEnrollments: 0, totalRows: 10 };
    mockRepo.syncCategoryFromCsv.mockResolvedValue(syncResult);

    const result = await useCase.execute({ courseId: 'c1', categoryName: 'CatA', csvContent: 'a,b,c', uploadedBy: 'uid' });
    expect(result).toEqual(syncResult);
  });
});

// ─── GetEvaluationCyclesUseCase ───────────────────────────────────────────────

describe('GetEvaluationCyclesUseCase', () => {
  const useCase = new GetEvaluationCyclesUseCase(mockRepo as any);

  it('rejects when categoryId is blank', async () => {
    await expect(useCase.execute('')).rejects.toThrow('El ID de la categoría es requerido');
    await expect(useCase.execute('   ')).rejects.toThrow('El ID de la categoría es requerido');
  });

  it('delegates to repository for a valid categoryId', async () => {
    mockRepo.getEvaluationCyclesByCategory.mockResolvedValue([]);
    await useCase.execute('cat123');
    expect(mockRepo.getEvaluationCyclesByCategory).toHaveBeenCalledWith('cat123');
  });
});

// ─── CreateEvaluationCycleUseCase ─────────────────────────────────────────────

describe('CreateEvaluationCycleUseCase', () => {
  const useCase = new CreateEvaluationCycleUseCase(mockRepo as any);

  const validInput = {
    courseId: 'course1',
    categoryId: 'cat1',
    title: 'Evaluación 1',
    openedBy: 'teacher-uid',
    rubrics: ['Criterio 1', 'Criterio 2'],
  };

  it('rejects when courseId is blank', async () => {
    await expect(useCase.execute({ ...validInput, courseId: '' }))
      .rejects.toThrow('El ID del curso es requerido');
  });

  it('rejects when categoryId is blank', async () => {
    await expect(useCase.execute({ ...validInput, categoryId: '' }))
      .rejects.toThrow('El ID de la categoría es requerido');
  });

  it('rejects when title is blank', async () => {
    await expect(useCase.execute({ ...validInput, title: '   ' }))
      .rejects.toThrow('El título del ciclo es requerido');
  });

  it('rejects when rubrics array is empty', async () => {
    await expect(useCase.execute({ ...validInput, rubrics: [] }))
      .rejects.toThrow('Al menos un rubric es requerido');
  });

  it('delegates to repository when input is valid', async () => {
    const cycle = { id: 'cyc1', ...validInput, status: 'open', openedAt: new Date().toISOString(), closesAt: null };
    mockRepo.createEvaluationCycle.mockResolvedValue(cycle);

    const result = await useCase.execute(validInput);
    expect(mockRepo.createEvaluationCycle).toHaveBeenCalledWith(validInput);
    expect(result).toEqual(cycle);
  });
});

// ─── TeacherUseCases factory ──────────────────────────────────────────────────

describe('TeacherUseCases', () => {
  it('instantiates all use cases', () => {
    const useCases = new TeacherUseCases(mockRepo as any);
    expect(useCases.getTeacherCourses).toBeDefined();
    expect(useCases.createCourse).toBeDefined();
    expect(useCases.syncCsv).toBeDefined();
    expect(useCases.getEvaluationCycles).toBeDefined();
    expect(useCases.createEvaluationCycle).toBeDefined();
  });
});
