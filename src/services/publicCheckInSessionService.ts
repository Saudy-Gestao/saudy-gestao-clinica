import axios from 'axios';
import { getApiBaseUrl } from './getApiBaseUrl';
import type { AuthResponse, LoginCredentials, User } from '../types/auth';

const TOTEM_TOKEN_KEY = 'publicCheckInToken';
const TOTEM_USER_KEY = 'publicCheckInUser';
const TOTEM_AUTH_EVENT = 'public-check-in-auth:changed';

const authApi = axios.create({
  baseURL: getApiBaseUrl(),
});

class PublicCheckInSessionService {
  private emitChanged() {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event(TOTEM_AUTH_EVENT));
    }
  }

  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await authApi.post<AuthResponse>('/auth/login', credentials);

    if (response.data.token) {
      // sessionStorage is cleared when the tab closes, reducing PII exposure on shared devices (totems)
      sessionStorage.setItem(TOTEM_TOKEN_KEY, response.data.token);
      sessionStorage.setItem(TOTEM_USER_KEY, JSON.stringify(response.data.user));
      this.emitChanged();
    }

    return response.data;
  }

  logout(): void {
    sessionStorage.removeItem(TOTEM_TOKEN_KEY);
    sessionStorage.removeItem(TOTEM_USER_KEY);
    this.emitChanged();
  }

  getToken(): string | null {
    return sessionStorage.getItem(TOTEM_TOKEN_KEY);
  }

  getCurrentUser(): User | null {
    const userStr = sessionStorage.getItem(TOTEM_USER_KEY);
    if (!userStr) return null;

    try {
      return JSON.parse(userStr) as User;
    } catch {
      return null;
    }
  }

  isAuthenticated(): boolean {
    return Boolean(this.getToken());
  }

  getAuthChangedEventName(): string {
    return TOTEM_AUTH_EVENT;
  }
}

export default new PublicCheckInSessionService();
