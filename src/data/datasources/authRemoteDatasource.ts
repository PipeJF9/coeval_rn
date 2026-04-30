import { AuthResult, RobleDatasource, UserData } from './robleDatasource';

export class AuthRemoteDatasource {
  constructor(private readonly robleDatasource: RobleDatasource) {}

  setToken(token: string | null) {
    this.robleDatasource.setToken(token);
  }

  extractUidFromToken(token: string) {
    return this.robleDatasource.extractUidFromToken(token);
  }

  registerUser(email: string, password: string, name: string) {
    return this.robleDatasource.registerUser(email, password, name);
  }

  loginUser(email: string, password: string): Promise<AuthResult> {
    return this.robleDatasource.loginUser(email, password);
  }

  getUserData(email: string): Promise<UserData | null> {
    return this.robleDatasource.getUserData(email);
  }

  logout() {
    return this.robleDatasource.logout();
  }

  verifyToken() {
    return this.robleDatasource.verifyToken();
  }

  refreshToken(refreshToken: string) {
    return this.robleDatasource.refreshToken(refreshToken);
  }

  forgotPassword(email: string) {
    return this.robleDatasource.forgotPassword(email);
  }

  resetPassword(token: string, newPassword: string) {
    return this.robleDatasource.resetPassword(token, newPassword);
  }
}