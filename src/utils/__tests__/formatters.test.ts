import { describe, expect, it } from 'vitest';
import {
  onlyDigits,
  normalizeEmail,
  isValidEmail,
  isValidCPF,
  formatCPF,
  formatCNPJ,
  formatCEP,
  formatPhone,
  formatDateInput,
  parseApiDateToLocalDate,
} from '../formatters';

describe('onlyDigits', () => {
  it('removes non-digit chars', () => expect(onlyDigits('abc123!@#')).toBe('123'));
  it('handles empty', () => expect(onlyDigits('')).toBe(''));
  it('handles null-like', () => expect(onlyDigits(null as any)).toBe(''));
});

describe('normalizeEmail', () => {
  it('trims and lowercases', () => expect(normalizeEmail('  USER@EXAMPLE.COM  ')).toBe('user@example.com'));
});

describe('isValidEmail', () => {
  it('returns true for valid email', () => expect(isValidEmail('a@b.com')).toBe(true));
  it('returns false for empty', () => expect(isValidEmail('')).toBe(false));
  it('returns false for invalid', () => expect(isValidEmail('notanemail')).toBe(false));
});

describe('isValidCPF', () => {
  it('returns true for valid CPF', () => expect(isValidCPF('529.982.247-25')).toBe(true));
  it('returns false for all same digits', () => expect(isValidCPF('111.111.111-11')).toBe(false));
  it('returns false for wrong length', () => expect(isValidCPF('12345')).toBe(false));
  it('returns false for invalid check digits', () => expect(isValidCPF('123.456.789-00')).toBe(false));
});

describe('formatCPF', () => {
  it('formats full CPF', () => expect(formatCPF('52998224725')).toBe('529.982.247-25'));
  it('formats partial 3 digits', () => expect(formatCPF('123')).toBe('123'));
  it('formats partial 4 digits', () => expect(formatCPF('1234')).toBe('123.4'));
  it('formats partial 7 digits', () => expect(formatCPF('1234567')).toBe('123.456.7'));
  it('returns empty for empty', () => expect(formatCPF('')).toBe(''));
});

describe('formatCNPJ', () => {
  it('formats full CNPJ', () => expect(formatCNPJ('11222333000181')).toBe('11.222.333/0001-81'));
  it('formats partial', () => expect(formatCNPJ('11')).toBe('11'));
  it('formats 3 digits', () => expect(formatCNPJ('112')).toBe('11.2'));
  it('formats 6 digits', () => expect(formatCNPJ('112223')).toBe('11.222.3'));
  it('formats 9 digits', () => expect(formatCNPJ('112223330')).toBe('11.222.333/0'));
  it('returns empty for empty', () => expect(formatCNPJ('')).toBe(''));
});

describe('formatCEP', () => {
  it('formats full CEP', () => expect(formatCEP('01310100')).toBe('01310-100'));
  it('formats partial', () => expect(formatCEP('01310')).toBe('01310'));
  it('returns empty for empty', () => expect(formatCEP('')).toBe(''));
});

describe('formatPhone', () => {
  it('formats mobile number', () => expect(formatPhone('11987654321')).toBe('(11) 98765-4321'));
  it('formats 10-digit number', () => expect(formatPhone('1134567890')).toBe('(11) 34567-890'));
  it('partial 2 digits', () => expect(formatPhone('11')).toBe('(11'));
  it('partial 3 digits', () => expect(formatPhone('119')).toBe('(11) 9'));
  it('partial 7 digits', () => expect(formatPhone('1198765')).toBe('(11) 9876-5'));
  it('returns empty for empty', () => expect(formatPhone('')).toBe(''));
});

describe('formatDateInput', () => {
  it('formats full date', () => expect(formatDateInput('25122024')).toBe('25/12/2024'));
  it('partial 2 digits', () => expect(formatDateInput('25')).toBe('25'));
  it('partial 4 digits', () => expect(formatDateInput('2512')).toBe('25/12'));
  it('returns empty for empty', () => expect(formatDateInput('')).toBe(''));
});

describe('parseApiDateToLocalDate', () => {
  it('returns null for empty', () => expect(parseApiDateToLocalDate('')).toBeNull());
  it('returns null for null', () => expect(parseApiDateToLocalDate(null)).toBeNull());
  it('parses date-only string without UTC shifting', () => {
    const d = parseApiDateToLocalDate('2024-06-15');
    expect(d?.getFullYear()).toBe(2024);
    expect(d?.getMonth()).toBe(5);
    expect(d?.getDate()).toBe(15);
  });
  it('parses ISO datetime', () => {
    const d = parseApiDateToLocalDate('2024-06-15T12:00:00Z');
    expect(d).not.toBeNull();
  });
  it('returns null for invalid', () => expect(parseApiDateToLocalDate('not-a-date')).toBeNull());
});

