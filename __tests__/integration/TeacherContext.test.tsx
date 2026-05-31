import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { TeacherProvider, useTeacher } from '../../src/presentation/contexts/TeacherContext';

jest.mock('../../src/di/container', () => ({
  teacherUseCases: {
    getTeacherCourses: { execute: jest.fn() },
    createCourse: { execute: jest.fn() },
    syncCsv: { execute: jest.fn() },
    getEvaluationCycles: { execute: jest.fn() },
    createEvaluationCycle: { execute: jest.fn() },
  },
}));

import { teacherUseCases } from '../../src/di/container';

const mockGetCourses = teacherUseCases.getTeacherCourses.execute as jest.Mock;
const mockCreateCourse = teacherUseCases.createCourse.execute as jest.Mock;
const mockSyncCsv = teacherUseCases.syncCsv.execute as jest.Mock;
const mockGetCycles = teacherUseCases.getEvaluationCycles.execute as jest.Mock;
const mockCreateCycle = teacherUseCases.createEvaluationCycle.execute as jest.Mock;

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <TeacherProvider>{children}</TeacherProvider>
);

beforeEach(() => {
  jest.clearAllMocks();
});

// ─── loadCourses ──────────────────────────────────────────────────────────────

describe('TeacherContext.loadCourses', () => {
  it('populates courses on success', async () => {
    const courses = [
      { id: 'c1', name: 'Cálculo', nrc: '001', term: '2026-1', teacherUid: 'tid', categories: [] },
      { id: 'c2', name: 'Álgebra', nrc: '002', term: '2026-1', teacherUid: 'tid', categories: [] },
    ];
    mockGetCourses.mockResolvedValue(courses);

    const { result } = renderHook(() => useTeacher(), { wrapper });

    await act(async () => { await result.current.loadCourses('tid'); });

    expect(result.current.courses).toHaveLength(2);
    expect(result.current.courses[0].name).toBe('Cálculo');
    expect(result.current.isLoadingCourses).toBe(false);
  });

  it('sets loading true during fetch then false after', async () => {
    let resolveCourses!: (v: any[]) => void;
    mockGetCourses.mockReturnValue(new Promise((res) => { resolveCourses = res; }));

    const { result } = renderHook(() => useTeacher(), { wrapper });

    act(() => { result.current.loadCourses('tid'); });

    await waitFor(() => expect(result.current.isLoadingCourses).toBe(true));

    await act(async () => { resolveCourses([]); });

    expect(result.current.isLoadingCourses).toBe(false);
  });

  it('leaves courses empty and stops loading on error', async () => {
    mockGetCourses.mockRejectedValue(new Error('Server error'));

    const { result } = renderHook(() => useTeacher(), { wrapper });

    await act(async () => { await result.current.loadCourses('tid'); });

    expect(result.current.courses).toHaveLength(0);
    expect(result.current.isLoadingCourses).toBe(false);
  });
});

// ─── createCourse ─────────────────────────────────────────────────────────────

describe('TeacherContext.createCourse', () => {
  it('returns true and reloads courses on success', async () => {
    const newCourse = { id: 'c1', name: 'Física', nrc: '010', term: '2026-1', teacherUid: 'tid', categories: [] };
    mockCreateCourse.mockResolvedValue(newCourse);
    mockGetCourses.mockResolvedValue([newCourse]);

    const { result } = renderHook(() => useTeacher(), { wrapper });

    let ok: boolean;
    await act(async () => {
      ok = await result.current.createCourse('Física', '010', '2026-1', 'tid');
    });

    expect(ok!).toBe(true);
    expect(mockCreateCourse).toHaveBeenCalledWith({
      name: 'Física',
      nrc: '010',
      term: '2026-1',
      teacherUid: 'tid',
    });
    expect(mockGetCourses).toHaveBeenCalledWith('tid');
    expect(result.current.courses).toHaveLength(1);
  });

  it('returns false when createCourse use case returns falsy', async () => {
    mockCreateCourse.mockResolvedValue(null);

    const { result } = renderHook(() => useTeacher(), { wrapper });

    let ok: boolean;
    await act(async () => {
      ok = await result.current.createCourse('X', '000', '2026-1', 'tid');
    });

    expect(ok!).toBe(false);
    expect(mockGetCourses).not.toHaveBeenCalled();
  });

  it('returns false and does not reload on thrown error', async () => {
    mockCreateCourse.mockRejectedValue(new Error('Duplicate NRC'));

    const { result } = renderHook(() => useTeacher(), { wrapper });

    let ok: boolean;
    await act(async () => {
      ok = await result.current.createCourse('X', '000', '2026-1', 'tid');
    });

    expect(ok!).toBe(false);
    expect(mockGetCourses).not.toHaveBeenCalled();
  });
});

// ─── uploadCsv ────────────────────────────────────────────────────────────────

describe('TeacherContext.uploadCsv', () => {
  it('sets syncProgress to success with summary on completion', async () => {
    mockSyncCsv.mockResolvedValue({
      createdGroups: 2,
      activatedEnrollments: 10,
      closedEnrollments: 3,
    });
    mockGetCourses.mockResolvedValue([]);

    const { result } = renderHook(() => useTeacher(), { wrapper });

    await act(async () => {
      await result.current.uploadCsv('c1', 'CategoriaA', 'csv,content', 'tid');
    });

    expect(result.current.syncProgress?.status).toBe('success');
    expect(result.current.syncProgress?.message).toContain('2 grupos creados');
    expect(result.current.syncProgress?.message).toContain('10 estudiantes agregados');
    expect(result.current.syncProgress?.message).toContain('3 enrollments cerrados');
    expect(result.current.isSyncingCsv).toBe(false);
  });

  it('sets syncProgress to error when syncCsv throws', async () => {
    mockSyncCsv.mockRejectedValue(new Error('CSV inválido'));

    const { result } = renderHook(() => useTeacher(), { wrapper });

    let ok: boolean;
    await act(async () => {
      ok = await result.current.uploadCsv('c1', 'CategoriaA', 'bad', 'tid');
    });

    expect(ok!).toBe(false);
    expect(result.current.syncProgress?.status).toBe('error');
    expect(result.current.syncProgress?.message).toContain('CSV inválido');
    expect(result.current.isSyncingCsv).toBe(false);
  });

  it('returns true on successful upload', async () => {
    mockSyncCsv.mockResolvedValue({ createdGroups: 0, activatedEnrollments: 5, closedEnrollments: 0 });
    mockGetCourses.mockResolvedValue([]);

    const { result } = renderHook(() => useTeacher(), { wrapper });

    let ok: boolean;
    await act(async () => {
      ok = await result.current.uploadCsv('c1', 'CategoriaB', 'data', 'tid');
    });

    expect(ok!).toBe(true);
  });
});

// ─── loadEvaluationCycles / createEvaluationCycle ────────────────────────────

const makeCycle = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: 'cy1',
  title: 'Ciclo 1',
  courseId: 'c1',
  categoryId: 'cat1',
  status: 'open',
  rubrics: [],
  openedBy: 'tid',
  openedAt: '',
  evaluationScope: 'own_group',
  ...overrides,
});

describe('TeacherContext.loadEvaluationCycles', () => {
  it('populates evaluationCycles', async () => {
    mockGetCycles.mockResolvedValue([makeCycle()]);

    const { result } = renderHook(() => useTeacher(), { wrapper });

    await act(async () => { await result.current.loadEvaluationCycles('cat1'); });

    expect(result.current.evaluationCycles).toHaveLength(1);
    expect(result.current.evaluationCycles[0].title).toBe('Ciclo 1');
  });

  it('sets evaluationCycles to [] on error', async () => {
    mockGetCycles.mockRejectedValue(new Error('fail'));

    const { result } = renderHook(() => useTeacher(), { wrapper });

    await act(async () => { await result.current.loadEvaluationCycles('cat1'); });

    expect(result.current.evaluationCycles).toHaveLength(0);
  });
});

describe('TeacherContext.createEvaluationCycle', () => {
  it('appends the new cycle to evaluationCycles', async () => {
    const existing = makeCycle({ id: 'cy0', title: 'Ciclo 0' });
    const created = makeCycle({ id: 'cy1', title: 'Ciclo 1', rubrics: ['R1'] });

    mockGetCycles.mockResolvedValue([existing]);
    mockCreateCycle.mockResolvedValue(created);

    const { result } = renderHook(() => useTeacher(), { wrapper });

    await act(async () => { await result.current.loadEvaluationCycles('cat1'); });
    expect(result.current.evaluationCycles).toHaveLength(1);

    let cycle: any;
    await act(async () => {
      cycle = await result.current.createEvaluationCycle({
        courseId: 'c1',
        categoryId: 'cat1',
        title: 'Ciclo 1',
        openedBy: 'tid',
        rubrics: ['R1'],
        evaluationScope: 'own_group',
      });
    });

    expect(cycle).toEqual(created);
    expect(result.current.evaluationCycles).toHaveLength(2);
    expect(result.current.evaluationCycles[1].title).toBe('Ciclo 1');
  });

  it('passes evaluationScope "all_groups" to the use case', async () => {
    const created = makeCycle({ evaluationScope: 'all_groups' });
    mockCreateCycle.mockResolvedValue(created);

    const { result } = renderHook(() => useTeacher(), { wrapper });

    await act(async () => {
      await result.current.createEvaluationCycle({
        courseId: 'c1',
        categoryId: 'cat1',
        title: 'Ciclo todos',
        openedBy: 'tid',
        rubrics: ['R1'],
        evaluationScope: 'all_groups',
      });
    });

    expect(mockCreateCycle).toHaveBeenCalledWith(
      expect.objectContaining({ evaluationScope: 'all_groups' })
    );
    expect(result.current.evaluationCycles[0].evaluationScope).toBe('all_groups');
  });

  it('returns null and does not append when creation fails', async () => {
    mockCreateCycle.mockRejectedValue(new Error('server error'));

    const { result } = renderHook(() => useTeacher(), { wrapper });

    let cycle: any;
    await act(async () => {
      cycle = await result.current.createEvaluationCycle({
        courseId: 'c1',
        categoryId: 'cat1',
        title: 'Bad',
        openedBy: 'tid',
        rubrics: [],
        evaluationScope: 'own_group',
      });
    });

    expect(cycle).toBeNull();
    expect(result.current.evaluationCycles).toHaveLength(0);
  });
});

// ─── selectCourse / deselectCourse ───────────────────────────────────────────

describe('TeacherContext.selectCourse / deselectCourse', () => {
  it('sets selectedCourse then clears it', () => {
    const { result } = renderHook(() => useTeacher(), { wrapper });

    const course = { id: 'c1', name: 'Bio', nrc: '003', term: '2026-1', teacherUid: 'tid', categories: [] };

    act(() => { result.current.selectCourse(course); });
    expect(result.current.selectedCourse?.id).toBe('c1');

    act(() => { result.current.deselectCourse(); });
    expect(result.current.selectedCourse).toBeNull();
  });
});

// ─── clearState ───────────────────────────────────────────────────────────────

describe('TeacherContext.clearState', () => {
  it('resets all state to initial values', async () => {
    const courses = [{ id: 'c1', name: 'X', nrc: '1', term: '2026-1', teacherUid: 'tid', categories: [] }];
    const cycles = [makeCycle({ id: 'cy1', title: 'T' })];
    mockGetCourses.mockResolvedValue(courses);
    mockGetCycles.mockResolvedValue(cycles);

    const { result } = renderHook(() => useTeacher(), { wrapper });

    await act(async () => { await result.current.loadCourses('tid'); });
    await act(async () => { await result.current.loadEvaluationCycles('cat1'); });
    act(() => { result.current.selectCourse(courses[0]); });

    expect(result.current.courses).toHaveLength(1);
    expect(result.current.evaluationCycles).toHaveLength(1);
    expect(result.current.selectedCourse).not.toBeNull();

    act(() => { result.current.clearState(); });

    expect(result.current.courses).toHaveLength(0);
    expect(result.current.evaluationCycles).toHaveLength(0);
    expect(result.current.selectedCourse).toBeNull();
    expect(result.current.syncProgress).toBeNull();
  });
});
