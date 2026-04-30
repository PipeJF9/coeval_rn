import { AuthResult, User } from '../../domain/entities/user';
import { AuthRepository } from '../../domain/repositories/authRepository';
import { AuthRemoteDatasource } from '../datasources/authRemoteDatasource';
import { LocalCacheDatasource, SessionPayload } from '../datasources/localCacheDatasource';

export class AuthRepositoryImpl implements AuthRepository {
  constructor(
    private readonly remoteDatasource: AuthRemoteDatasource,
    private readonly localCacheDatasource: LocalCacheDatasource,
  ) {}

  async registerStudent(input: { email: string; password: string; name: string }) {
    const success = await this.remoteDatasource.registerUser(input.email, input.password, input.name);
    if (!success) {
      throw new Error('No se pudo registrar el usuario');
    }

    const authResult = await this.remoteDatasource.loginUser(input.email, input.password);
    const uid = authResult.user?.id ?? authResult.user?.uid ?? this.remoteDatasource.extractUidFromToken(authResult.accessToken);

    if (!uid) {
      throw new Error('No se pudo obtener el UID de autenticación');
    }

    const savedUser = authResult.user ?? {
      id: uid,
      uid,
      email: input.email,
      name: input.name,
      role: 'student' as const,
    };

    await this.localCacheDatasource.saveSession({
      token: authResult.accessToken,
      refreshToken: authResult.refreshToken,
      user: savedUser,
    });
    this.remoteDatasource.setToken(authResult.accessToken);
  }

  async login(input: { email: string; password: string }): Promise<AuthResult> {
    const result = await this.remoteDatasource.loginUser(input.email, input.password);
    // Prefer authoritative user data from the users table after login
    const dbUser = await this.remoteDatasource.getUserData(input.email);
    const user = dbUser ?? result.user ?? undefined;

    if (user) {
      await this.localCacheDatasource.saveSession({
        token: result.accessToken,
        refreshToken: result.refreshToken,
        user,
      });
    }

    return {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      user,
    };
  }

  getUserByEmail(email: string) {
    return this.remoteDatasource.getUserData(email);
  }

  async getCachedSession() {
    return this.localCacheDatasource.loadSession();
  }

  async logout() {
    await this.remoteDatasource.logout();
    await this.localCacheDatasource.clearSession();
    await this.localCacheDatasource.clearAllStudentCaches();
  }

  verifyToken() {
    return this.remoteDatasource.verifyToken();
  }

  refreshToken(refreshToken: string) {
    return this.remoteDatasource.refreshToken(refreshToken);
  }

  extractUidFromToken(token: string) {
    return this.remoteDatasource.extractUidFromToken(token);
  }

  setToken(token: string | null) {
    this.remoteDatasource.setToken(token);
  }

  forgotPassword(email: string) {
    return this.remoteDatasource.forgotPassword(email);
  }

  resetPassword(token: string, newPassword: string) {
    return this.remoteDatasource.resetPassword(token, newPassword);
  }
}