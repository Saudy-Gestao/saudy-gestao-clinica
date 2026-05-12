import { describe, expect, it } from 'vitest';
import {
  validateCNPJ,
  validateEmail,
  validatePhone,
  validateDate,
  validatePassword,
  validateCompanyForm,
  validateBranchForm,
  validateSectorForm,
  validateUserForm,
  validateAccessForm,
} from '../validations';

describe('validateCNPJ', () => {
  it('returns false for empty string', () => expect(validateCNPJ('')).toBe(false));
  it('returns false for wrong length', () => expect(validateCNPJ('12345')).toBe(false));
  it('returns false for all same digits', () => expect(validateCNPJ('11111111111111')).toBe(false));
  it('returns true for valid 14-digit CNPJ', () => expect(validateCNPJ('11222333000181')).toBe(true));
  it('strips non-numeric chars before validating', () => expect(validateCNPJ('11.222.333/0001-81')).toBe(true));
});

describe('validateEmail', () => {
  it('returns false for empty', () => expect(validateEmail('')).toBe(false));
  it('returns false for invalid format', () => expect(validateEmail('not-an-email')).toBe(false));
  it('returns true for valid email', () => expect(validateEmail('user@example.com')).toBe(true));
  it('trims and lowercases before checking', () => expect(validateEmail('  USER@EXAMPLE.COM  ')).toBe(true));
});

describe('validatePhone', () => {
  it('returns true for empty (optional)', () => expect(validatePhone('')).toBe(true));
  it('returns false for too short', () => expect(validatePhone('12345')).toBe(false));
  it('returns true for 10-digit phone', () => expect(validatePhone('1134567890')).toBe(true));
  it('returns true for 11-digit phone', () => expect(validatePhone('11934567890')).toBe(true));
  it('strips non-digits', () => expect(validatePhone('(11) 93456-7890')).toBe(true));
});

describe('validateDate', () => {
  it('returns false for empty', () => expect(validateDate('')).toBe(false));
  it('returns true for valid ISO date', () => expect(validateDate('2024-01-15')).toBe(true));
  it('returns false for invalid date', () => expect(validateDate('not-a-date')).toBe(false));
});

describe('validatePassword', () => {
  it('returns invalid for empty', () => expect(validatePassword('')).toMatchObject({ isValid: false }));
  it('returns invalid for too short', () => expect(validatePassword('abc')).toMatchObject({ isValid: false }));
  it('returns valid for 6+ chars', () => expect(validatePassword('abcdef')).toMatchObject({ isValid: true }));
});

describe('validateCompanyForm', () => {
  const base = { cnpj: '11222333000181', legalName: 'Empresa', tradeName: 'Nome' };

  it('returns valid for correct data', () => {
    expect(validateCompanyForm(base)).toMatchObject({ isValid: true, errors: {} });
  });
  it('errors on missing cnpj', () => {
    const res = validateCompanyForm({ ...base, cnpj: '' });
    expect(res.isValid).toBe(false);
    expect(res.errors.cnpj).toBeTruthy();
  });
  it('errors on invalid cnpj', () => {
    const res = validateCompanyForm({ ...base, cnpj: '11111111111111' });
    expect(res.errors.cnpj).toBeTruthy();
  });
  it('errors on missing legalName', () => {
    expect(validateCompanyForm({ ...base, legalName: '' }).errors.legalName).toBeTruthy();
  });
  it('errors on missing tradeName', () => {
    expect(validateCompanyForm({ ...base, tradeName: '' }).errors.tradeName).toBeTruthy();
  });
  it('errors on invalid phone', () => {
    expect(validateCompanyForm({ ...base, phone: '123' }).errors.phone).toBeTruthy();
  });
  it('accepts valid phone', () => {
    expect(validateCompanyForm({ ...base, phone: '11934567890' }).isValid).toBe(true);
  });
});

describe('validateBranchForm', () => {
  it('valid when tradeName provided', () => {
    expect(validateBranchForm({ tradeName: 'Filial' })).toMatchObject({ isValid: true });
  });
  it('invalid when tradeName missing', () => {
    expect(validateBranchForm({ tradeName: '' }).isValid).toBe(false);
  });
  it('invalid when phone is bad', () => {
    expect(validateBranchForm({ tradeName: 'Filial', phone: '123' }).errors.phone).toBeTruthy();
  });
});

describe('validateSectorForm', () => {
  const base = { name: 'Setor', branchId: 'b1' };
  it('valid with correct data', () => expect(validateSectorForm(base)).toMatchObject({ isValid: true }));
  it('invalid when name missing', () => expect(validateSectorForm({ ...base, name: '' }).isValid).toBe(false));
  it('invalid when branchId missing', () => expect(validateSectorForm({ ...base, branchId: '' }).isValid).toBe(false));
});

describe('validateUserForm', () => {
  const base = {
    branchId: 'b1',
    sectorId: 's1',
    name: 'João',
    birthDate: '1990-01-01',
    email: 'joao@test.com',
    password: 'secret123',
  };

  it('valid for new user with all fields', () => expect(validateUserForm(base)).toMatchObject({ isValid: true }));
  it('invalid when branchId missing', () => expect(validateUserForm({ ...base, branchId: '' }).isValid).toBe(false));
  it('invalid when sectorId missing', () => expect(validateUserForm({ ...base, sectorId: '' }).isValid).toBe(false));
  it('invalid when name missing', () => expect(validateUserForm({ ...base, name: '' }).isValid).toBe(false));
  it('invalid when email missing', () => expect(validateUserForm({ ...base, email: '' }).isValid).toBe(false));
  it('invalid when email is bad', () => expect(validateUserForm({ ...base, email: 'bad' }).isValid).toBe(false));
  it('invalid when birthDate missing', () => expect(validateUserForm({ ...base, birthDate: '' }).isValid).toBe(false));
  it('invalid when password missing for new user', () => {
    const { password: _, ...noPass } = base;
    expect(validateUserForm(noPass as any)).toMatchObject({ isValid: false });
  });
  it('valid when editing without password', () => {
    const { password: _, ...noPass } = base;
    expect(validateUserForm(noPass as any, true)).toMatchObject({ isValid: true });
  });
  it('validates password when editing and password provided', () => {
    expect(validateUserForm({ ...base, password: '123' }, true).isValid).toBe(false);
  });
  it('invalid phone when provided and bad', () => {
    expect(validateUserForm({ ...base, phone: '123' }).errors.phone).toBeTruthy();
  });
});

describe('validateAccessForm', () => {
  it('valid with description and modules', () => {
    expect(validateAccessForm({ description: 'Admin', moduleIds: ['m1'] })).toMatchObject({ isValid: true });
  });
  it('invalid when description missing', () => {
    expect(validateAccessForm({ description: '', moduleIds: ['m1'] }).isValid).toBe(false);
  });
  it('invalid when no modules', () => {
    expect(validateAccessForm({ description: 'Admin', moduleIds: [] }).isValid).toBe(false);
  });
});
