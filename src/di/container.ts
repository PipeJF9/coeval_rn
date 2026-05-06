import { AcademicRepositoryImpl } from '../data/repositories/academicRepositoryImpl';
import { AuthRepositoryImpl } from '../data/repositories/authRepositoryImpl';
import { DashboardRepositoryImpl } from '../data/repositories/dashboardRepositoryImpl';
import { TeacherRepositoryImpl } from '../data/repositories/teacherRepositoryImpl';
import { AcademicRemoteDatasource } from '../data/datasources/academicRemoteDatasource';
import { AuthRemoteDatasource } from '../data/datasources/authRemoteDatasource';
import { DashboardRemoteDatasource } from '../data/datasources/dashboardRemoteDatasource';
import { TeacherRemoteDataSource } from '../data/datasources/teacherRemoteDatasource';
import { LocalCacheDatasource } from '../data/datasources/localCacheDatasource';
import { RobleDatasource } from '../data/datasources/robleDatasource';
import { GetCachedSessionUseCase, GetUserByEmailUseCase, LoginUseCase, LogoutUseCase, ForgotPasswordUseCase, RegisterStudentUseCase, ResetPasswordUseCase, SetTokenUseCase, VerifyTokenUseCase } from '../domain/usecases/authUseCases';
import { CreateEvaluationCycleUseCase, GetEvaluationCyclesByCategoryUseCase, GetEvaluationCyclesByCourseUseCase, GetPendingEvaluationsForStudentUseCase, GetStudentCourseOverviewsUseCase, SubmitEvaluationUseCase, SyncCategoryFromCsvUseCase } from '../domain/usecases/academicUseCases';
import { GetEvaluationResultsUseCase } from '../domain/usecases/dashboardUseCases';
import { TeacherUseCases } from '../domain/usecases/teacherUseCases';

const robleDatasource = new RobleDatasource();
const localCacheDatasource = new LocalCacheDatasource();

const authRemoteDatasource = new AuthRemoteDatasource(robleDatasource);
const academicRemoteDatasource = new AcademicRemoteDatasource(robleDatasource);
const dashboardRemoteDatasource = new DashboardRemoteDatasource(robleDatasource);
const teacherRemoteDataSource = new TeacherRemoteDataSource(robleDatasource);

const authRepository = new AuthRepositoryImpl(authRemoteDatasource, localCacheDatasource);
const academicRepository = new AcademicRepositoryImpl(academicRemoteDatasource);
const dashboardRepository = new DashboardRepositoryImpl(dashboardRemoteDatasource, localCacheDatasource);
const teacherRepository = new TeacherRepositoryImpl(teacherRemoteDataSource);

export const authUseCases = {
  registerStudent: new RegisterStudentUseCase(authRepository),
  login: new LoginUseCase(authRepository),
  getUserByEmail: new GetUserByEmailUseCase(authRepository),
  getCachedSession: new GetCachedSessionUseCase(authRepository),
  logout: new LogoutUseCase(authRepository),
  verifyToken: new VerifyTokenUseCase(authRepository),
  setToken: new SetTokenUseCase(authRepository),
  forgotPassword: new ForgotPasswordUseCase(authRepository),
  resetPassword: new ResetPasswordUseCase(authRepository),
};

export const academicUseCases = {
  getStudentCourseOverviews: new GetStudentCourseOverviewsUseCase(academicRepository),
  getPendingEvaluationsForStudent: new GetPendingEvaluationsForStudentUseCase(academicRepository),
  submitEvaluation: new SubmitEvaluationUseCase(academicRepository),
  createEvaluationCycle: new CreateEvaluationCycleUseCase(academicRepository),
  syncCategoryFromCsv: new SyncCategoryFromCsvUseCase(academicRepository),
  getEvaluationCyclesByCourse: new GetEvaluationCyclesByCourseUseCase(academicRepository),
  getEvaluationCyclesByCategory: new GetEvaluationCyclesByCategoryUseCase(academicRepository),
};

export const dashboardUseCases = {
  getEvaluationResults: new GetEvaluationResultsUseCase(dashboardRepository),
};

export const teacherUseCases = new TeacherUseCases(teacherRepository);