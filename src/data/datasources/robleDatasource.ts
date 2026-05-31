import axios, { AxiosInstance, AxiosError } from 'axios';
import { RobleConfig } from '../../core/constants/robleConfig';

export interface UserData {
  _id?: string;
  id?: string;
  uid?: string;
  email: string;
  name: string;
  rol?: string;
  role?: string;
}

export interface AuthResult {
  accessToken: string;
  refreshToken?: string;
  user?: UserData;
}

export interface RobleListResponse {
  inserted?: any[];
  skipped?: any[];
  data?: any[];
}

export class RobleException extends Error {
  statusCode?: number;

  constructor(message: string, statusCode?: number) {
    super(message);
    this.name = 'RobleException';
    this.statusCode = statusCode;
  }
}

export class RobleDatasource {
  private client: AxiosInstance;
  private currentToken: string | null = null;
  
  readonly dbName = RobleConfig.dbName;
  readonly authUrl = RobleConfig.authBaseUrl;
  readonly databaseUrl = RobleConfig.databaseBaseUrl;
  readonly usersTable = 'users';

  constructor() {
    this.client = axios.create({
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Interceptor para agregar token Bearer
    this.client.interceptors.request.use((config) => {
      if (this.currentToken) {
        config.headers.Authorization = `Bearer ${this.currentToken}`;
      }
      return config;
    });

    // Interceptor para manejo de errores
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        this._log('HTTP_ERROR', `${error.config?.method?.toUpperCase()} ${error.config?.url} - ${error.response?.status}`);
        return Promise.reject(error);
      }
    );
  }

  private _log(tag: string, message: string): void {
    console.log(`[ROBLE:${tag}] ${message}`);
  }

  setToken(token: string | null): void {
    this.currentToken = token;
  }

  get currentTokenValue(): string | null {
    return this.currentToken;
  }

  private _normalizeRole(role: string): string {
    const normalized = String(role).trim().toLowerCase();
    // common variants in Spanish/English and possible abbreviations
    const studentVariants = ['student', 'estudiante', 'alumno', 'alumna', 'est', 's'];
    const teacherVariants = [
      'teacher',
      'profesor',
      'professora',
      'professore',
      'professor',
      'docente',
      'instructor',
      'instructora',
      'prof',
      't',
    ];

    if (studentVariants.includes(normalized)) return 'student';
    if (teacherVariants.includes(normalized)) return 'teacher';

    // fallback: if value contains keywords
    if (normalized.includes('prof') || normalized.includes('docen') || normalized.includes('teach')) return 'teacher';
    if (normalized.includes('estud') || normalized.includes('alu')) return 'student';

    // default to student but log unexpected roles for debugging
    console.warn(`[ROBLE] Unknown role value '${role}', defaulting to 'student'`);
    return 'student';
  }

  private _parseUserData(json: any): UserData {
    const role = this._normalizeRole(json.rol || json.role || 'student');
    return {
      _id: json._id?.toString(),
      id: json.id?.toString(),
      uid: (json.uid || json.userId || json.id || json._id)?.toString(),
      email: json.email || '',
      name: json.name || '',
      rol: role,
      role: role,
    };
  }

  private _parseAuthResult(json: any): AuthResult {
    let user: UserData | undefined;
    if (json.user) {
      user = this._parseUserData(json.user);
    }
    return {
      accessToken: json.accessToken || '',
      refreshToken: json.refreshToken,
      user,
    };
  }

  private _parseErrorBody(body: any): string | null {
    try {
      if (typeof body === 'string') {
        const data = JSON.parse(body);
        return data.message || data.error || data.msg || null;
      }
      return body.message || body.error || body.msg || null;
    } catch {
      return null;
    }
  }

  async registerUser(email: string, password: string, name: string): Promise<boolean> {
    const url = `${this.authUrl}/${this.dbName}/signup-direct`;
    try {
      this._log('REGISTER', `Attempting registration for ${email}`);
      const response = await this.client.post(url, { email, password, name });

      this._log('REGISTER', `Status: ${response.status}`);

      if (response.status === 200 || response.status === 201) {
        return true;
      }

      const errorMsg = this._parseErrorBody(response.data);
      throw new RobleException(errorMsg || 'Error al registrar usuario', response.status);
    } catch (error) {
      if (error instanceof RobleException) throw error;
      if (error instanceof AxiosError) {
        if (error.response?.status === 409 || error.response?.data?.toString().includes('already exists')) {
          throw new RobleException('Este correo ya está registrado', error.response?.status);
        }
        const errorMsg = this._parseErrorBody(error.response?.data);
        throw new RobleException(errorMsg || 'Error al registrar usuario', error.response?.status);
      }
      throw new RobleException(`Error de conexión: ${error}`);
    }
  }

  async loginUser(email: string, password: string): Promise<AuthResult> {
    const url = `${this.authUrl}/${this.dbName}/login`;
    try {
      this._log('LOGIN', `Attempting login for ${email}`);
      const response = await this.client.post(url, { email, password });

      this._log('LOGIN', `Status: ${response.status}`);

      if (response.status === 200 || response.status === 201) {
        const result = this._parseAuthResult(response.data);
        this.currentToken = result.accessToken;
        return result;
      }

      const errorMsg = this._parseErrorBody(response.data);
      throw new RobleException(errorMsg || 'Credenciales incorrectas', response.status);
    } catch (error) {
      if (error instanceof RobleException) throw error;
      if (error instanceof AxiosError) {
        const errorMsg = this._parseErrorBody(error.response?.data);
        throw new RobleException(errorMsg || 'Error de conexión', error.response?.status);
      }
      throw new RobleException(`Error de conexión: ${error}`);
    }
  }

  async saveUserData(email: string, name: string, role: string, uid: string): Promise<boolean> {
    const url = `${this.databaseUrl}/${this.dbName}/insert`;
    try {
      this._log('SAVE_USER', `Saving user ${email} with uid ${uid}`);

      const record = { uid, email, name, rol: role };
      const body = { tableName: this.usersTable, records: [record] };

      const response = await this.client.post(url, body);

      this._log('SAVE_USER', `Status: ${response.status}`);

      if (response.status === 200 || response.status === 201) {
        const data = response.data as RobleListResponse;
        return (data.inserted?.length || 0) > 0;
      }

      this._log('SAVE_USER', `Failed with status: ${response.status}`);
      return false;
    } catch (error) {
      this._log('SAVE_USER', `Error: ${error}`);
      return false;
    }
  }

  async getUserData(email: string): Promise<UserData | null> {
    const query = new URLSearchParams({
      tableName: this.usersTable,
      email,
    });

    const url = `${this.databaseUrl}/${this.dbName}/read?${query.toString()}`;

    try {
      this._log('GET_USER', `Fetching user with email ${email}`);
      const response = await this.client.get(url);

      this._log('GET_USER', `Status: ${response.status}`);

      if (response.status === 200) {
        const data = response.data;
        if (Array.isArray(data) && data.length > 0) {
          return this._parseUserData(data[0]);
        } else if (typeof data === 'object' && data !== null) {
          if (data.data && Array.isArray(data.data) && data.data.length > 0) {
            return this._parseUserData(data.data[0]);
          }
          if (data.email) {
            return this._parseUserData(data);
          }
        }
      }
      return null;
    } catch (error) {
      this._log('GET_USER', `Error: ${error}`);
      return null;
    }
  }

  async logout(): Promise<boolean> {
    if (!this.currentToken) return true;

    const url = `${this.authUrl}/${this.dbName}/logout`;
    try {
      const response = await this.client.post(url, {});
      this.currentToken = null;
      return response.status === 200;
    } catch (error) {
      this.currentToken = null;
      return false;
    }
  }

  async verifyToken(): Promise<boolean> {
    if (!this.currentToken) return false;

    const url = `${this.authUrl}/${this.dbName}/verify-token`;
    try {
      const response = await this.client.get(url);
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }

  async refreshToken(refreshToken: string): Promise<AuthResult | null> {
    const url = `${this.authUrl}/${this.dbName}/refresh-token`;
    try {
      const response = await this.client.post(url, { refreshToken });

      if (response.status === 200) {
        const result = this._parseAuthResult(response.data);
        this.currentToken = result.accessToken;
        return result;
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  async forgotPassword(email: string): Promise<boolean> {
    const url = `${this.authUrl}/${this.dbName}/forgot-password`;
    try {
      this._log('FORGOT_PASSWORD', `Requesting password reset for ${email}`);
      const response = await this.client.post(url, { email });

      this._log('FORGOT_PASSWORD', `Status: ${response.status}`);

      if (response.status === 200 || response.status === 201) {
        return true;
      }

      const errorMsg = this._parseErrorBody(response.data);
      throw new RobleException(errorMsg || 'Error al enviar el correo de recuperación', response.status);
    } catch (error) {
      if (error instanceof RobleException) throw error;
      if (error instanceof AxiosError) {
        const errorMsg = this._parseErrorBody(error.response?.data);
        throw new RobleException(errorMsg || 'Error de conexión', error.response?.status);
      }
      throw new RobleException(`Error de conexión: ${error}`);
    }
  }

  async resetPassword(token: string, newPassword: string): Promise<boolean> {
    const url = `${this.authUrl}/${this.dbName}/reset-password`;
    try {
      this._log('RESET_PASSWORD', 'Resetting password');
      const response = await this.client.post(url, { token, newPassword });

      this._log('RESET_PASSWORD', `Status: ${response.status}`);

      if (response.status === 200 || response.status === 201) {
        return true;
      }

      const errorMsg = this._parseErrorBody(response.data);
      throw new RobleException(errorMsg || 'Error al restablecer la contraseña', response.status);
    } catch (error) {
      if (error instanceof RobleException) throw error;
      if (error instanceof AxiosError) {
        const errorMsg = this._parseErrorBody(error.response?.data);
        throw new RobleException(errorMsg || 'Error de conexión', error.response?.status);
      }
      throw new RobleException(`Error de conexión: ${error}`);
    }
  }

  async readTable(
    tableName: string,
    filters?: Record<string, string | number | boolean>
  ): Promise<any[]> {
    const query = new URLSearchParams({ tableName });
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        query.append(key, String(value));
      });
    }

    const url = `${this.databaseUrl}/${this.dbName}/read?${query.toString()}`;

    try {
      this._log('READ_TABLE', `Reading table ${tableName}`);
      const response = await this.client.get(url);

      if (response.status === 200) {
        const data = response.data;
        if (Array.isArray(data)) return data;
        if (data.data && Array.isArray(data.data)) return data.data;
      }
      return [];
    } catch (error) {
      this._log('READ_TABLE', `Error reading ${tableName}: ${error}`);
      return [];
    }
  }

  async insertTable(tableName: string, records: any[]): Promise<any[]> {
    const url = `${this.databaseUrl}/${this.dbName}/insert`;
    try {
      this._log('INSERT_TABLE', `Inserting ${records.length} records into ${tableName}`);
      const response = await this.client.post(url, { tableName, records });

      this._log('INSERT_TABLE', `Response status: ${response.status}`);
      this._log('INSERT_TABLE', `Response data: ${JSON.stringify(response.data)}`);

      if (response.status === 200 || response.status === 201) {
        const data = response.data as RobleListResponse;
        const inserted = data.inserted ?? [];
        this._log('INSERT_TABLE', `Inserted ${inserted.length} records`);
        return inserted;
      }

      this._log('INSERT_TABLE', `Failed: HTTP ${response.status}`);
      return [];
    } catch (error) {
      this._log('INSERT_TABLE', `Error inserting into ${tableName}: ${error}`);
      return [];
    }
  }

  async insertRecord(tableName: string, record: any): Promise<any | null> {
    const inserted = await this.insertTable(tableName, [record]);
    return inserted.length > 0 ? inserted[0] : null;
  }

  async updateRecord(tableName: string, where: any, set: any): Promise<boolean> {
    const url = `${this.databaseUrl}/${this.dbName}/update`;
    try {
      this._log('UPDATE_RECORD', `Updating ${tableName}`);
      const response = await this.client.post(url, { tableName, where, set });

      if (response.status === 200 || response.status === 201) {
        return true;
      }
      return false;
    } catch (error) {
      this._log('UPDATE_RECORD', `Error updating ${tableName}: ${error}`);
      return false;
    }
  }

  extractUidFromToken(token: string): string | null {
    try {
      const parts = token.split('.');
      if (parts.length < 2) return null;

      // Decode JWT payload (add padding if needed)
      const payload = parts[1];
      const needed = (4 - (payload.length % 4)) % 4;
      const padded = payload + '='.repeat(needed);
      const decoded = atob(padded);
      const claims = JSON.parse(decoded);

      return claims.sub || claims.uid || claims.id || claims.userId || null;
    } catch (error) {
      return null;
    }
  }
}
