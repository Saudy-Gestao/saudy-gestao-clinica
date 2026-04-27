import { describe, expect, it } from 'vitest';
import {
  formatCEP,
  formatCNPJ,
  formatCPF,
  formatDateInput,
  formatPhone,
  isValidCPF,
  isValidEmail,
  onlyDigits,
  parseApiDateToLocalDate,
} from '../formatters';

describe('formatters', () => {
  it('normalizes digits and validates cpf/email', () => {
    expect(onlyDigits('(11) 99999-0000')).toBe('11999990000');
    expect(isValidCPF('529.982.247-25')).toBe(true);
    expect(isValidCPF('111.111.111-11')).toBe(false);
    expect(isValidEmail('a@b.com')).toBe(true);
    expect(isValidEmail('invalid')).toBe(false);
  });

  it('formats cpf/cnpj/cep/phone/date', () => {
    expect(formatCPF('52998224725')).toBe('529.982.247-25');
    expect(formatCNPJ('12345678000195')).toBe('12.345.678/0001-95');
    expect(formatCEP('12345678')).toBe('12345-678');
    expect(formatPhone('11988887777')).toBe('(11) 98888-7777');
    expect(formatDateInput('18032026')).toBe('18/03/2026');
  });

  it('parses api date values safely', () => {
    const localDate = parseApiDateToLocalDate('2026-03-18');
    expect(localDate).toBeInstanceOf(Date);
    expect(localDate?.getFullYear()).toBe(2026);
    expect(parseApiDateToLocalDate('invalid-date')).toBeNull();
  });
});
