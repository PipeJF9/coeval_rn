import { AuthResult, User } from '@/domain/entities/user';

export interface AuthRepository {
  registerStudent(input: { email: string; password: string; name: string }): Promise<void>;
  login(input: { email: string; password: string }): Promise<AuthResult>;
  getUserByEmail(email: string): Promise<User | null>;
  getCachedSession(): Promise<{ token: string; refreshToken?: string; user: User } | null>;
  logout(): Promise<void>;
  verifyToken(): Promise<boolean>;
  refreshToken(refreshToken: string): Promise<AuthResult | null>;
  extractUidFromToken(token: string): string | null;
  setToken(token: string | null): void;
  forgotPassword(email: string): Promise<void>;
  resetPassword(token: string, newPassword: string): Promise<void>;
}