import api from './api';
import type { 
  LoginCredentials, 
  RegisterData, 
  CompanyRegisterData,
  AuthResponse, 
  ResetPasswordData,
  AdmRegisterRequestData,
  AdmVerifyCodeData,
  User 
} from '../types/auth';

class AuthService {
  private emitAuthChanged() {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('auth:changed'));
    }
  }

  /**
   * Login do usuário
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>('/auth/login', credentials);
    
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      this.emitAuthChanged();
    }
    
    return response.data;
  }

  /**
   * Login dedicado para ADM Hub
   */
  async loginAdm(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>('/auth/adm/login', credentials);

    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      this.emitAuthChanged();
    }

    return response.data;
  }

  /**
   * Registro de novo usuário
   */
  async register(data: RegisterData): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>('/auth/register', data);
    
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      this.emitAuthChanged();
    }
    
    return response.data;
  }

  /**
   * Registro de empresa completa
   */
  async registerCompany(data: CompanyRegisterData): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>('/auth/register', data);
    
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      this.emitAuthChanged();
    }
    
    return response.data;
  }

  /**
   * Logout do usuário
   */
  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.emitAuthChanged();
  }

  /**
   * Enviar código de recuperação de senha
   */
  async sendResetCode(identifier: string): Promise<void> {
    await api.post('/auth/forgot-password', { identifier });
  }

  /**
   * Verificar código de recuperação
   */
  async verifyResetCode(identifier: string, code: string): Promise<void> {
    await api.post('/auth/verify-code', { identifier, code });
  }

  /**
   * Redefinir senha
   */
  async resetPassword(data: ResetPasswordData): Promise<void> {
    await api.post('/auth/reset-password', data);
  }

  /**
   * Solicita código para registro de administrador ADM Hub
   */
  async requestAdmRegisterCode(data: AdmRegisterRequestData): Promise<{ message: string }> {
    const response = await api.post<{ message: string }>('/auth/adm/request-register-code', data);
    return response.data;
  }

  /**
   * Valida código do registro ADM e autentica usuário
   */
  async verifyAdmRegisterCode(data: AdmVerifyCodeData): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>('/auth/adm/verify-register-code', data);

    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      this.emitAuthChanged();
    }

    return response.data;
  }

  /**
   * Obter usuário atual
   */
  getCurrentUser(): User | null {
    const userStr = localStorage.getItem('user');
    if (!userStr) return null;
    
    try {
      return JSON.parse(userStr) as User;
    } catch {
      return null;
    }
  }

  /**
   * Verificar se o usuário está autenticado
   */
  isAuthenticated(): boolean {
    return !!localStorage.getItem('token');
  }

  /**
   * Obter token de autenticação
   */
  getToken(): string | null {
    return localStorage.getItem('token');
  }
}

export default new AuthService();
