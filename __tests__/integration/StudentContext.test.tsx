import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { StudentProvider, useStudent } from '../../src/presentation/contexts/StudentContext';

jest.mock('../../src/presentation/contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('../../src/di/container', () => ({
  academicUseCases: {
    getStudentCourseOverviews: { execute: jest.fn() },
    getPendingEvaluationsForStudent: { execute: jest.fn() },
    submitEvaluation: { execute: jest.fn() },
  },
  dashboardUseCases: {
    getEvaluationResults: { executeForStudent: jest.fn() },
  },
}));

import { useAuth } from '../../src/presentation/contexts/AuthContext';
import { academicUseCases, dashboardUseCases } from '../../src/di/container';

const mockUseAuth = useAuth as jest.Mock;
const mockGetCourses = academicUseCases.getStudentCourseOverviews.execute as jest.Mock;
const mockGetPending = academicUseCases.getPendingEvaluationsForStudent.execute as jest.Mock;
const mockSubmit = academicUseCases.submitEvaluation.execute as jest.Mock;
const mockGetResults = (dashboardUseCases.getEvaluationResults as any).executeForStudent as jest.Mock;

const studentUser = { uid: 'stu1', email: 'stu@test.com', name: 'Stu', role: 'student' };

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <StudentProvider>{children}</StudentProvider>
);

const makePeer = (uid: string, n: number) => ({
  uid,
  name: `Peer ${n}`,
  email: `p${n}@test.com`,
  studentId: '',
});

const makeGroup = (id: string, name: string, peers: ReturnType<typeof makePeer>[]) => ({
  id,
  code: id,
  name,
  activeStudentsCount: peers.length,
  students: peers,
});

const makePending = (
  cycleId: string,
  peers: ReturnType<typeof makePeer>[],
  alreadyEvaluatedUids: string[] = [],
  groupId = 'g1',
  groupName = 'Grupo A',
) => ({
  cycle: { id: cycleId, title: `Ciclo ${cycleId}`, courseId: 'c1', categoryId: 'cat1', status: 'open', rubrics: [], openedBy: 'tid', openedAt: '', evaluationScope: 'own_group' },
  group: makeGroup(groupId, groupName, peers),
  categoryName: 'CategoriaA',
  category: { name: 'CategoriaA' },
  peersToEvaluate: peers,
  peersGroupedByGroup: [{ group: makeGroup(groupId, groupName, peers), peers }],
  alreadyEvaluatedUids,
});

beforeEach(() => {
  jest.clearAllMocks();
  mockGetCourses.mockResolvedValue([]);
  mockGetPending.mockResolvedValue([]);
  mockGetResults.mockResolvedValue([]);
});

// ─── Initial load ─────────────────────────────────────────────────────────────

describe('StudentContext initial load', () => {
  it('loads data on mount when user is an authenticated student', async () => {
    mockUseAuth.mockReturnValue({ user: studentUser, isAuthenticated: true });

    const course = { id: 'c1', name: 'Curso A', nrc: '001', term: '2026-1', teacherUid: 't1', categories: [] };
    mockGetCourses.mockResolvedValue([course]);

    const { result } = renderHook(() => useStudent(), { wrapper });

    await waitFor(() => expect(result.current.isLoadingCourses).toBe(false));

    expect(result.current.courses).toHaveLength(1);
    expect(result.current.courses[0].name).toBe('Curso A');
    expect(mockGetCourses).toHaveBeenCalledWith({ studentEmail: 'stu@test.com', studentUid: 'stu1' });
  });

  it('clears state and does not fetch when user is not authenticated', async () => {
    mockUseAuth.mockReturnValue({ user: null, isAuthenticated: false });

    const { result } = renderHook(() => useStudent(), { wrapper });

    await waitFor(() => expect(result.current.isLoadingCourses).toBe(false));

    expect(result.current.courses).toHaveLength(0);
    expect(mockGetCourses).not.toHaveBeenCalled();
  });

  it('does not fetch when user role is teacher', async () => {
    mockUseAuth.mockReturnValue({
      user: { uid: 't1', email: 'teacher@test.com', name: 'T', role: 'teacher' },
      isAuthenticated: true,
    });

    const { result } = renderHook(() => useStudent(), { wrapper });

    await waitFor(() => expect(result.current.isLoadingCourses).toBe(false));

    expect(result.current.courses).toHaveLength(0);
    expect(mockGetCourses).not.toHaveBeenCalled();
  });

  it('sets courses to [] when getStudentCourseOverviews throws', async () => {
    mockUseAuth.mockReturnValue({ user: studentUser, isAuthenticated: true });
    mockGetCourses.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useStudent(), { wrapper });

    await waitFor(() => expect(result.current.isLoadingCourses).toBe(false));

    expect(result.current.courses).toHaveLength(0);
  });
});

// ─── totalPendingCount ────────────────────────────────────────────────────────

describe('StudentContext.totalPendingCount', () => {
  it('is 0 when there are no pending evaluations', async () => {
    mockUseAuth.mockReturnValue({ user: studentUser, isAuthenticated: true });
    mockGetPending.mockResolvedValue([]);

    const { result } = renderHook(() => useStudent(), { wrapper });

    await waitFor(() => expect(result.current.isLoadingPending).toBe(false));

    expect(result.current.totalPendingCount).toBe(0);
  });

  it('counts peers not yet evaluated', async () => {
    mockUseAuth.mockReturnValue({ user: studentUser, isAuthenticated: true });

    const peers = [makePeer('p1', 1), makePeer('p2', 2), makePeer('p3', 3)];
    mockGetPending.mockResolvedValue([makePending('cy1', peers, ['p1'])]);

    const { result } = renderHook(() => useStudent(), { wrapper });

    await waitFor(() => expect(result.current.isLoadingPending).toBe(false));

    expect(result.current.totalPendingCount).toBe(2);
  });

  it('sums pending across multiple evaluation cycles', async () => {
    mockUseAuth.mockReturnValue({ user: studentUser, isAuthenticated: true });

    const pending = [
      makePending('cy1', [makePeer('a', 1), makePeer('b', 2)], ['a'], 'g1', 'G1'),
      makePending('cy2', [makePeer('c', 3), makePeer('d', 4)], [], 'g2', 'G2'),
    ];
    mockGetPending.mockResolvedValue(pending);

    const { result } = renderHook(() => useStudent(), { wrapper });

    await waitFor(() => expect(result.current.isLoadingPending).toBe(false));

    expect(result.current.totalPendingCount).toBe(3); // 1 remaining in cy1 + 2 in cy2
  });

  it('is 0 when all peers are already evaluated', async () => {
    mockUseAuth.mockReturnValue({ user: studentUser, isAuthenticated: true });

    mockGetPending.mockResolvedValue([makePending('cy1', [makePeer('x', 1)], ['x'])]);

    const { result } = renderHook(() => useStudent(), { wrapper });

    await waitFor(() => expect(result.current.isLoadingPending).toBe(false));

    expect(result.current.totalPendingCount).toBe(0);
  });
});

// ─── peersGroupedByGroup ──────────────────────────────────────────────────────

describe('StudentContext.peersGroupedByGroup', () => {
  it('exposes peersGroupedByGroup as returned by the use case', async () => {
    mockUseAuth.mockReturnValue({ user: studentUser, isAuthenticated: true });

    const peers = [makePeer('p1', 1), makePeer('p2', 2)];
    mockGetPending.mockResolvedValue([makePending('cy1', peers)]);

    const { result } = renderHook(() => useStudent(), { wrapper });

    await waitFor(() => expect(result.current.isLoadingPending).toBe(false));

    const grouped = result.current.pendingEvaluations[0].peersGroupedByGroup;
    expect(grouped).toHaveLength(1);
    expect(grouped[0].peers).toHaveLength(2);
    expect(grouped[0].peers[0].uid).toBe('p1');
  });

  it('reflects all_groups scope with peers from multiple groups', async () => {
    mockUseAuth.mockReturnValue({ user: studentUser, isAuthenticated: true });

    const peersA = [makePeer('a1', 1), makePeer('a2', 2)];
    const peersB = [makePeer('b1', 3)];
    const allPeers = [...peersA, ...peersB];

    const pending = {
      cycle: { id: 'cy1', title: 'Ciclo 1', courseId: 'c1', categoryId: 'cat1', status: 'open', rubrics: [], openedBy: 'tid', openedAt: '', evaluationScope: 'all_groups' },
      group: makeGroup('g0', 'Mi grupo', []),
      categoryName: 'CatA',
      category: { name: 'CatA' },
      peersToEvaluate: allPeers,
      peersGroupedByGroup: [
        { group: makeGroup('g1', 'Grupo A', peersA), peers: peersA },
        { group: makeGroup('g2', 'Grupo B', peersB), peers: peersB },
      ],
      alreadyEvaluatedUids: [],
    };
    mockGetPending.mockResolvedValue([pending]);

    const { result } = renderHook(() => useStudent(), { wrapper });

    await waitFor(() => expect(result.current.isLoadingPending).toBe(false));

    const grouped = result.current.pendingEvaluations[0].peersGroupedByGroup;
    expect(grouped).toHaveLength(2);
    expect(grouped[0].group.name).toBe('Grupo A');
    expect(grouped[1].group.name).toBe('Grupo B');
    expect(result.current.totalPendingCount).toBe(3);
    expect(result.current.pendingEvaluations[0].cycle.evaluationScope).toBe('all_groups');
  });
});

// ─── submitEvaluation ─────────────────────────────────────────────────────────

describe('StudentContext.submitEvaluation', () => {
  it('returns true and refreshes data on success', async () => {
    mockUseAuth.mockReturnValue({ user: studentUser, isAuthenticated: true });
    mockSubmit.mockResolvedValue(true);

    const { result } = renderHook(() => useStudent(), { wrapper });
    await waitFor(() => expect(result.current.isLoadingPending).toBe(false));

    jest.clearAllMocks();
    mockGetCourses.mockResolvedValue([]);
    mockGetPending.mockResolvedValue([]);
    mockGetResults.mockResolvedValue([]);

    let ok: boolean;
    await act(async () => {
      ok = await result.current.submitEvaluation({
        cycleId: 'cy1',
        evaluateeUid: 'p1',
        scores: [4, 5, 3],
        comments: 'Good work',
      });
    });

    expect(ok!).toBe(true);
    expect(mockSubmit).toHaveBeenCalledWith({
      cycleId: 'cy1',
      evaluatorUid: 'stu1',
      evaluateeUid: 'p1',
      scores: [4, 5, 3],
      comments: 'Good work',
    });
    expect(mockGetPending).toHaveBeenCalled();
    expect(mockGetResults).toHaveBeenCalled();
  });

  it('returns false and does not refresh when submit fails', async () => {
    mockUseAuth.mockReturnValue({ user: studentUser, isAuthenticated: true });
    mockSubmit.mockResolvedValue(false);

    const { result } = renderHook(() => useStudent(), { wrapper });
    await waitFor(() => expect(result.current.isLoadingPending).toBe(false));

    jest.clearAllMocks();

    let ok: boolean;
    await act(async () => {
      ok = await result.current.submitEvaluation({
        cycleId: 'cy1',
        evaluateeUid: 'p1',
        scores: [3],
      });
    });

    expect(ok!).toBe(false);
    expect(mockGetPending).not.toHaveBeenCalled();
  });

  it('returns false without calling submit when student has no identifier', async () => {
    mockUseAuth.mockReturnValue({
      user: { uid: '', email: '', name: 'Ghost', role: 'student' },
      isAuthenticated: true,
    });

    const { result } = renderHook(() => useStudent(), { wrapper });
    await waitFor(() => expect(result.current.isLoadingCourses).toBe(false));

    let ok: boolean;
    await act(async () => {
      ok = await result.current.submitEvaluation({ cycleId: 'cy1', evaluateeUid: 'p1', scores: [5] });
    });

    expect(ok!).toBe(false);
    expect(mockSubmit).not.toHaveBeenCalled();
  });
});

// ─── clearStudentState ────────────────────────────────────────────────────────

describe('StudentContext.clearStudentState', () => {
  it('resets all lists to empty', async () => {
    mockUseAuth.mockReturnValue({ user: studentUser, isAuthenticated: true });

    const course = { id: 'c1', name: 'Curso A', nrc: '001', term: '2026-1', teacherUid: 't1', categories: [] };
    mockGetCourses.mockResolvedValue([course]);

    const { result } = renderHook(() => useStudent(), { wrapper });
    await waitFor(() => expect(result.current.isLoadingCourses).toBe(false));

    expect(result.current.courses).toHaveLength(1);

    act(() => { result.current.clearStudentState(); });

    expect(result.current.courses).toHaveLength(0);
    expect(result.current.pendingEvaluations).toHaveLength(0);
    expect(result.current.results).toHaveLength(0);
  });
});
