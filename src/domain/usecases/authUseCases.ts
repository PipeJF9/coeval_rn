import { AuthRepository } from '@/domain/repositories/authRepository';

export class RegisterStudentUseCase {
  constructor(private readonly repository: AuthRepository) {}

  execute(input: { email: string; password: string; name: string }) {
    return this.repository.registerStudent(input);
  }
}

export class LoginUseCase {
  constructor(private readonly repository: AuthRepository) {}

  execute(input: { email: string; password: string }) {
    return this.repository.login(input);
  }
}

export class GetUserByEmailUseCase {
  constructor(private readonly repository: AuthRepository) {}

  execute(email: string) {
    return this.repository.getUserByEmail(email);
  }
}

export class GetCachedSessionUseCase {
  constructor(private readonly repository: AuthRepository) {}

  execute() {
    return this.repository.getCachedSession();
  }
}

export class LogoutUseCase {
  constructor(private readonly repository: AuthRepository) {}

  execute() {
    return this.repository.logout();
  }
}

export class VerifyTokenUseCase {
  constructor(private readonly repository: AuthRepository) {}

  execute() {
    return this.repository.verifyToken();
  }
}

export class SetTokenUseCase {
  constructor(private readonly repository: AuthRepository) {}

  execute(token: string | null) {
    this.repository.setToken(token);
  }
}

export class ForgotPasswordUseCase {
  constructor(private readonly repository: AuthRepository) {}

  execute(email: string) {
    return this.repository.forgotPassword(email);
  }
}

export class ResetPasswordUseCase {
  constructor(private readonly repository: AuthRepository) {}

  execute(token: string, newPassword: string) {
    return this.repository.resetPassword(token, newPassword);
  }
}