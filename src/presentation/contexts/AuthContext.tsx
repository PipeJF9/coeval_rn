import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

import { authUseCases } from '../../di/container';
import { User } from '../../domain/entities/user';

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isBootstrapping: boolean;
  isSubmitting: boolean;
  error: string | null;
  login: (input: { email: string; password: string }) => Promise<boolean>;
  register: (input: { email: string; password: string; name: string }) => Promise<boolean>;
  logout: () => Promise<void>;
  forgotPassword: (email: string) => Promise<boolean>;
  resetPassword: (token: string, newPassword: string) => Promise<boolean>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function restoreSession() {
      try {
        const session = await authUseCases.getCachedSession.execute();
        if (!active) return;

        if (!session) {
          setIsBootstrapping(false);
          return;
        }

        authUseCases.setToken.execute(session.token);
        const isValid = await authUseCases.verifyToken.execute();
        if (!isValid) {
          await authUseCases.logout.execute();
          if (active) {
            setUser(null);
            setIsBootstrapping(false);
          }
          return;
        }

        const freshUser = await authUseCases.getUserByEmail.execute(session.user.email);
        if (active) {
          const resolved = freshUser ?? session.user;
          // normalize role to expected values
          const normalizeRole = (r: any) => {
            if (!r) return 'student';
            const v = String(r).toLowerCase();
            if (v === 'teacher' || v === 'profesor' || v === 'professor') return 'teacher';
            return 'student';
          };

          const safeUser = resolved
            ? { ...resolved, role: normalizeRole(resolved.role ?? resolved.rol) }
            : null;

          setUser(safeUser);
          setIsBootstrapping(false);
        }
      } catch (bootstrapError) {
        if (active) {
          setError('No se pudo restaurar la sesión');
          setUser(null);
          setIsBootstrapping(false);
        }
      }
    }

    restoreSession();

    return () => {
      active = false;
    };
  }, []);

  const login = async (input: { email: string; password: string }) => {
    setIsSubmitting(true);
    setError(null);
    try {
      const result = await authUseCases.login.execute(input);
      if (result.accessToken) {
        authUseCases.setToken.execute(result.accessToken);
      }

      const fetched = result.user ?? (await authUseCases.getUserByEmail.execute(input.email));
      const normalizeRole = (r: any) => {
        if (!r) return 'student';
        const v = String(r).toLowerCase();
        if (v === 'teacher' || v === 'profesor' || v === 'professor') return 'teacher';
        return 'student';
      };

      const safeUser = fetched ? { ...fetched, role: normalizeRole(fetched.role ?? fetched.rol) } : null;
      setUser(safeUser);
      return true;
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : 'No se pudo iniciar sesión');
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const register = async (input: { email: string; password: string; name: string }) => {
    setIsSubmitting(true);
    setError(null);
    try {
      await authUseCases.registerStudent.execute(input);
      return true;
    } catch (registerError) {
      setError(registerError instanceof Error ? registerError.message : 'No se pudo registrar la cuenta');
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const logout = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      await authUseCases.logout.execute();
      authUseCases.setToken.execute(null);
      setUser(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const forgotPassword = async (email: string) => {
    setIsSubmitting(true);
    setError(null);
    try {
      await authUseCases.forgotPassword.execute(email);
      return true;
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No se pudo enviar el correo');
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetPassword = async (token: string, newPassword: string) => {
    setIsSubmitting(true);
    setError(null);
    try {
      await authUseCases.resetPassword.execute(token, newPassword);
      return true;
    } catch (resetError) {
      setError(resetError instanceof Error ? resetError.message : 'No se pudo restablecer la contraseña');
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const clearError = () => setError(null);

  const value: AuthContextValue = {
    user,
    isAuthenticated: Boolean(user),
    isBootstrapping,
    isSubmitting,
    error,
    login,
    register,
    logout,
    forgotPassword,
    resetPassword,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}