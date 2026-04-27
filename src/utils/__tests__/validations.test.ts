import { describe, expect, it } from 'vitest';
import {
  validateAccessForm,
  validateBranchForm,
  validateCNPJ,
  validateCompanyForm,
  validateDate,
  validateEmail,
  validatePassword,
  validatePhone,
  validateSectorForm,
  validateUserForm,
} from '../validations';

describe('validations utils', () => {
  it('validates primitive fields', () => {
    expect(validateCNPJ('12.345.678/0001-95')).toBe(true);
    expect(validateCNPJ('')).toBe(false);
    expect(validateCNPJ('123')).toBe(false);
    expect(validateCNPJ('11.111.111/1111-11')).toBe(false);
    expect(validateEmail('foo@bar.com')).toBe(true);
    expect(validateEmail('  FOO@BAR.COM  ')).toBe(true);
    expect(validateEmail('')).toBe(false);
    expect(validateEmail('foo')).toBe(false);
    expect(validatePhone('')).toBe(true);
    expect(validatePhone('(11) 98888-7777')).toBe(true);
    expect(validatePhone('123')).toBe(false);
    expect(validateDate('')).toBe(false);
    expect(validateDate('2026-01-15')).toBe(true);
    expect(validateDate('invalid')).toBe(false);
  });

  it('validates password rule set', () => {
    expect(validatePassword('').isValid).toBe(false);
    expect(validatePassword('123').isValid).toBe(false);
    expect(validatePassword('123456').isValid).toBe(true);
  });

  it('validates company, branch and sector forms', () => {
    const company = validateCompanyForm({
      cnpj: '12.345.678/0001-95',
      legalName: 'Empresa LTDA',
      tradeName: 'Empresa',
      phone: '(11) 99999-9999',
    });
    expect(company.isValid).toBe(true);

    const branch = validateBranchForm({ tradeName: 'Filial A', phone: '(11) 3333-2222' });
    expect(branch.isValid).toBe(true);

    const sector = validateSectorForm({ name: 'Recepcao', branchId: 'b1' });
    expect(sector.isValid).toBe(true);
  });

  it('validates user and access forms with error cases', () => {
    const user = validateUserForm({
      branchId: '',
      sectorId: '',
      name: '',
      birthDate: 'invalid',
      email: 'foo',
      password: '1',
      phone: '123',
    });
    expect(user.isValid).toBe(false);
    expect(user.errors.branchId).toBeDefined();
    expect(user.errors.email).toBeDefined();
    expect(user.errors.password).toBeDefined();

    const access = validateAccessForm({ description: '', moduleIds: [] });
    expect(access.isValid).toBe(false);
    expect(access.errors.description).toBeDefined();
    expect(access.errors.moduleIds).toBeDefined();
  });

  it('validates company/branch/sector invalid paths', () => {
    const companyMissingCnpj = validateCompanyForm({
      cnpj: '   ',
      legalName: 'Empresa',
      tradeName: 'Fantasia',
    });
    expect(companyMissingCnpj.isValid).toBe(false);
    expect(companyMissingCnpj.errors.cnpj).toBe('CNPJ é obrigatório');

    const company = validateCompanyForm({
      cnpj: '11111111111111',
      legalName: '   ',
      tradeName: '',
      phone: '1234',
    });
    expect(company.isValid).toBe(false);
    expect(company.errors.cnpj).toBe('CNPJ inválido');
    expect(company.errors.legalName).toBeDefined();
    expect(company.errors.tradeName).toBeDefined();
    expect(company.errors.phone).toBeDefined();

    const branch = validateBranchForm({ tradeName: '   ', phone: '123' });
    expect(branch.isValid).toBe(false);
    expect(branch.errors.tradeName).toBeDefined();
    expect(branch.errors.phone).toBeDefined();

    const sector = validateSectorForm({ name: '   ', branchId: '' });
    expect(sector.isValid).toBe(false);
    expect(sector.errors.name).toBeDefined();
    expect(sector.errors.branchId).toBeDefined();
  });

  it('validates editing mode password branches for user form', () => {
    const editingWithoutPassword = validateUserForm({
      branchId: 'b1',
      sectorId: 's1',
      name: 'Joao',
      birthDate: '2020-01-01',
      email: 'joao@saudy.com',
      phone: '(11) 99999-9999',
    }, true);
    expect(editingWithoutPassword.isValid).toBe(true);

    const editingWithInvalidPassword = validateUserForm({
      branchId: 'b1',
      sectorId: 's1',
      name: 'Joao',
      birthDate: '2020-01-01',
      email: 'joao@saudy.com',
      password: '123',
    }, true);
    expect(editingWithInvalidPassword.isValid).toBe(false);
    expect(editingWithInvalidPassword.errors.password).toBeDefined();
  });

  it('requires password for new user when not editing', () => {
    const newUser = validateUserForm({
      branchId: 'b1',
      sectorId: 's1',
      name: 'Maria',
      birthDate: '2020-01-01',
      email: 'maria@saudy.com',
      password: '',
    }, false);

    expect(newUser.isValid).toBe(false);
    expect(newUser.errors.password).toBe('Senha é obrigatória');
  });

  it('requires email and birthDate when missing', () => {
    const result = validateUserForm({
      branchId: 'b1',
      sectorId: 's1',
      name: 'Maria',
      birthDate: '',
      email: '   ',
      password: '123456',
    }, false);

    expect(result.isValid).toBe(false);
    expect(result.errors.email).toBe('Email é obrigatório');
    expect(result.errors.birthDate).toBe('Data de nascimento é obrigatória');
  });
});
