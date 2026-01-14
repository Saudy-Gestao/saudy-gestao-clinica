// Types for Authentication

export interface User {
  id: string;
  name: string;
  email: string;
  cpf?: string;
  role: 'patient' | 'doctor' | 'admin' | 'staff';
  createdAt: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  cpf: string;
  password: string;
  confirmPassword: string;
}

export interface CompanyRegisterData {
  company: {
    cnpj: string;
    legalName: string;
    tradeName: string;
    address: string;
    phone: string;
  };
  branch: {
    socialName: string;
    tradeName: string;
    address: string;
    phone: string;
  };
  sector: {
    name: string;
    description: string;
  };
  user: {
    name: string;
    birthDate: string;
    email: string;
    password: string;
    phone: string;
    address: string;
  };
  accesses: {
    description: string;
  }[];
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface ResetPasswordData {
  email: string;
  code?: string;
  newPassword?: string;
}

export interface PasswordStrength {
  minLength: boolean;
  hasNumber: boolean;
  hasSpecialChar: boolean;
}
