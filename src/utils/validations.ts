/**
 * Validation utilities for forms
 */

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

/**
 * Validates CNPJ format (simple format check)
 */
export const validateCNPJ = (cnpj: string): boolean => {
  if (!cnpj) return false;
  
  // Remove non-numeric characters
  const cleaned = cnpj.replace(/\D/g, '');
  
  // Must have 14 digits
  if (cleaned.length !== 14) return false;
  
  // Simple check - all same digits
  if (/^(\d)\1+$/.test(cleaned)) return false;
  
  return true;
};

/**
 * Validates email format
 */
export const validateEmail = (email: string): boolean => {
  if (!email) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validates phone format (Brazilian)
 */
export const validatePhone = (phone: string): boolean => {
  if (!phone) return true; // Phone is optional in most cases
  const cleaned = phone.replace(/\D/g, '');
  return cleaned.length >= 10 && cleaned.length <= 11;
};

/**
 * Validates date format and checks if it's a valid date
 */
export const validateDate = (dateString: string): boolean => {
  if (!dateString) return false;
  const date = new Date(dateString);
  return !isNaN(date.getTime());
};

/**
 * Validates password strength
 */
export const validatePassword = (password: string): { isValid: boolean; message?: string } => {
  if (!password) {
    return { isValid: false, message: 'Senha é obrigatória' };
  }
  
  if (password.length < 6) {
    return { isValid: false, message: 'Senha deve ter no mínimo 6 caracteres' };
  }
  
  return { isValid: true };
};

/**
 * Company form validation
 */
export const validateCompanyForm = (form: {
  cnpj: string;
  legalName: string;
  tradeName: string;
  address?: string;
  phone?: string;
}): ValidationResult => {
  const errors: Record<string, string> = {};

  if (!form.cnpj || !form.cnpj.trim()) {
    errors.cnpj = 'CNPJ é obrigatório';
  } else if (!validateCNPJ(form.cnpj)) {
    errors.cnpj = 'CNPJ inválido';
  }

  if (!form.legalName || !form.legalName.trim()) {
    errors.legalName = 'Razão social é obrigatória';
  }

  if (!form.tradeName || !form.tradeName.trim()) {
    errors.tradeName = 'Nome fantasia é obrigatório';
  }

  if (form.phone && !validatePhone(form.phone)) {
    errors.phone = 'Telefone inválido';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

/**
 * Branch form validation
 */
export const validateBranchForm = (form: {
  socialName: string;
  tradeName: string;
  address?: string;
  phone?: string;
}): ValidationResult => {
  const errors: Record<string, string> = {};

  if (!form.socialName || !form.socialName.trim()) {
    errors.socialName = 'Razão social é obrigatória';
  }

  if (!form.tradeName || !form.tradeName.trim()) {
    errors.tradeName = 'Nome fantasia é obrigatório';
  }

  if (form.phone && !validatePhone(form.phone)) {
    errors.phone = 'Telefone inválido';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

/**
 * Sector form validation
 */
export const validateSectorForm = (form: {
  name: string;
  description?: string;
  branchId: string;
}): ValidationResult => {
  const errors: Record<string, string> = {};

  if (!form.name || !form.name.trim()) {
    errors.name = 'Nome é obrigatório';
  }

  if (!form.branchId) {
    errors.branchId = 'Filial é obrigatória';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

/**
 * User form validation
 */
export const validateUserForm = (form: {
  sectorId: string;
  name: string;
  birthDate: string;
  email: string;
  password?: string;
  phone?: string;
  address?: string;
}, isEditing: boolean = false): ValidationResult => {
  const errors: Record<string, string> = {};

  if (!form.sectorId) {
    errors.sectorId = 'Setor é obrigatório';
  }

  if (!form.name || !form.name.trim()) {
    errors.name = 'Nome é obrigatório';
  }

  if (!form.email || !form.email.trim()) {
    errors.email = 'Email é obrigatório';
  } else if (!validateEmail(form.email)) {
    errors.email = 'Email inválido';
  }

  if (!form.birthDate) {
    errors.birthDate = 'Data de nascimento é obrigatória';
  } else if (!validateDate(form.birthDate)) {
    errors.birthDate = 'Data inválida';
  }

  // Password validation only for new users or when changing password
  if (!isEditing || (isEditing && form.password)) {
    if (!isEditing && !form.password) {
      errors.password = 'Senha é obrigatória';
    } else if (form.password) {
      const passwordCheck = validatePassword(form.password);
      if (!passwordCheck.isValid) {
        errors.password = passwordCheck.message || 'Senha inválida';
      }
    }
  }

  if (form.phone && !validatePhone(form.phone)) {
    errors.phone = 'Telefone inválido (use 10-11 dígitos)';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

/**
 * Access form validation
 */
export const validateAccessForm = (form: {
  description: string;
  moduleIds: string[];
}): ValidationResult => {
  const errors: Record<string, string> = {};

  if (!form.description || !form.description.trim()) {
    errors.description = 'Descrição é obrigatória';
  }

  if (!form.moduleIds || form.moduleIds.length === 0) {
    errors.moduleIds = 'Selecione pelo menos um módulo';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};
