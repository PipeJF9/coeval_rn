import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { AuthProvider, useAuth } from '../../src/presentation/contexts/AuthContext';

// Mock the entire DI container so no real network calls are made
jest.mock('../../src/di/container', () => ({
  authUseCases: {
    getCachedSession: { execute: jest.fn() },
    setToken: { execute: jest.fn() },
    verifyToken: { execute: jest.fn() },
    getUserByEmail: { execute: jest.fn() },
    login: { execute: jest.fn() },
    logout: { execute: jest.fn() },
    registerStudent: { execute: jest.fn() },
    forgotPassword: { execute: jest.fn() },
    resetPassword: { execute: jest.fn() },
  },
}));

import { authUseCases } from '../../src/di/container';

const mockGetCachedSession = authUseCases.getCachedSession.execute as jest.Mock;
const mockVerifyToken = authUseCases.verifyToken.execute as jest.Mock;
const mockGetUserByEmail = authUseCases.getUserByEmail.execute as jest.Mock;
const mockLogin = authUseCases.login.execute as jest.Mock;
const mockLogout = authUseCases.logout.execute as jest.Mock;
const mockRegister = authUseCases.registerStudent.execute as jest.Mock;
const mockForgotPassword = authUseCases.forgotPassword.execute as jest.Mock;
const mockResetPassword = authUseCases.resetPassword.execute as jest.Mock;

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
);

beforeEach(() => {
  jest.clearAllMocks();
  mockGetCachedSession.mockResolvedValue(null); // No cached session by default
  mockVerifyToken.mockResolvedValue(true);
});

// ─── Bootstrap / session restore ─────────────────────────────────────────────

describe('AuthContext session restore', () => {
  it('starts in bootstrapping state, then finishes when there is no cached session', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.isBootstrapping).toBe(true);

    await waitFor(() => expect(result.current.isBootstrapping).toBe(false));

    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('restores a valid cached session and sets the user', async () => {
    const cachedUser = { uid: 'uid1', email: 'ana@test.com', name: 'Ana', role: 'student' };
    mockGetCachedSession.mockResolvedValue({ token: 'tok123', user: cachedUser });
    mockVerifyToken.mockResolvedValue(true);
    mockGetUserByEmail.mockResolvedValue(cachedUser);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.isBootstrapping).toBe(false));

    expect(result.current.user).not.toBeNull();
    expect(result.current.user?.email).toBe('ana@test.com');
    expect(result.current.isAuthenticated).toBe(true);
  });

  it('clears user when cached session token is invalid', async () => {
    const cachedUser = { uid: 'uid1', email: 'ana@test.com', name: 'Ana', role: 'student' };
    mockGetCachedSession.mockResolvedValue({ token: 'expired', user: cachedUser });
    mockVerifyToken.mockResolvedValue(false);
    mockLogout.mockResolvedValue(undefined);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.isBootstrapping).toBe(false));

    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });
});

// ─── login ────────────────────────────────────────────────────────────────────

describe('AuthContext.login', () => {
  it('sets the user and returns true on successful login', async () => {
    const user = { uid: 'u1', email: 'test@test.com', name: 'Test', role: 'student' };
    mockLogin.mockResolvedValue({ accessToken: 'tok', user });

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isBootstrapping).toBe(false));

    let loginResult: boolean;
    await act(async () => {
      loginResult = await result.current.login({ email: 'test@test.com', password: 'pass' });
    });

    expect(loginResult!).toBe(true);
    expect(result.current.user?.email).toBe('test@test.com');
    expect(result.current.isAuthenticated).toBe(true);
  });

  it('normalizes teacher role variants', async () => {
    const user = { uid: 'u1', email: 'prof@test.com', name: 'Prof', role: 'profesor' };
    mockLogin.mockResolvedValue({ accessToken: 'tok', user });

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isBootstrapping).toBe(false));

    await act(async () => {
      await result.current.login({ email: 'prof@test.com', password: 'pass' });
    });

    expect(result.current.user?.role).toBe('teacher');
  });

  it('normalizes "professor" to teacher role', async () => {
    const user = { uid: 'u2', email: 'p@test.com', name: 'P', role: 'professor' };
    mockLogin.mockResolvedValue({ accessToken: 'tok', user });

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isBootstrapping).toBe(false));

    await act(async () => {
      await result.current.login({ email: 'p@test.com', password: 'pass' });
    });

    expect(result.current.user?.role).toBe('teacher');
  });

  it('keeps "student" role unchanged', async () => {
    const user = { uid: 'u3', email: 's@test.com', name: 'S', role: 'student' };
    mockLogin.mockResolvedValue({ accessToken: 'tok', user });

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isBootstrapping).toBe(false));

    await act(async () => {
      await result.current.login({ email: 's@test.com', password: 'pass' });
    });

    expect(result.current.user?.role).toBe('student');
  });

  it('sets an error message and returns false on failure', async () => {
    mockLogin.mockRejectedValue(new Error('Credenciales incorrectas'));

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isBootstrapping).toBe(false));

    let loginResult: boolean;
    await act(async () => {
      loginResult = await result.current.login({ email: 'x@x.com', password: 'bad' });
    });

    expect(loginResult!).toBe(false);
    expect(result.current.error).toBe('Credenciales incorrectas');
    expect(result.current.user).toBeNull();
  });
});

// ─── logout ───────────────────────────────────────────────────────────────────

describe('AuthContext.logout', () => {
  it('clears the user and isAuthenticated after logout', async () => {
    const user = { uid: 'u1', email: 'a@b.com', name: 'A', role: 'student' };
    mockLogin.mockResolvedValue({ accessToken: 'tok', user });
    mockLogout.mockResolvedValue(undefined);

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isBootstrapping).toBe(false));

    // Login first
    await act(async () => { await result.current.login({ email: 'a@b.com', password: 'p' }); });
    expect(result.current.isAuthenticated).toBe(true);

    // Then logout
    await act(async () => { await result.current.logout(); });
    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });
});

// ─── register ─────────────────────────────────────────────────────────────────

describe('AuthContext.register', () => {
  it('returns true on successful registration', async () => {
    mockRegister.mockResolvedValue(undefined);

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isBootstrapping).toBe(false));

    let ok: boolean;
    await act(async () => {
      ok = await result.current.register({ email: 'new@test.com', password: 'pass', name: 'New' });
    });

    expect(ok!).toBe(true);
  });

  it('sets error and returns false on registration failure', async () => {
    mockRegister.mockRejectedValue(new Error('Este correo ya está registrado'));

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isBootstrapping).toBe(false));

    let ok: boolean;
    await act(async () => {
      ok = await result.current.register({ email: 'dup@test.com', password: 'pass', name: 'Dup' });
    });

    expect(ok!).toBe(false);
    expect(result.current.error).toBe('Este correo ya está registrado');
  });
});

// ─── clearError ───────────────────────────────────────────────────────────────

describe('AuthContext.clearError', () => {
  it('clears the current error', async () => {
    mockLogin.mockRejectedValue(new Error('Bad login'));

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isBootstrapping).toBe(false));

    await act(async () => { await result.current.login({ email: 'x@x.com', password: 'bad' }); });
    expect(result.current.error).toBeTruthy();

    act(() => { result.current.clearError(); });
    expect(result.current.error).toBeNull();
  });
});
