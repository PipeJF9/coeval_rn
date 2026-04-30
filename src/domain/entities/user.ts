export type UserRole = 'student' | 'teacher';

export interface User {
  id?: string;
  uid?: string;
  email: string;
  name: string;
  role: UserRole;
}

export interface AuthResult {
  accessToken: string;
  refreshToken?: string;
  user?: User;
}