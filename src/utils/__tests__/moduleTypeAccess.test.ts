import { describe, expect, it } from 'vitest';
import {
  normalizeCompanyModuleType,
  isModuleAllowedForCompanyType,
  filterModulesForCompanyType,
  filterAccessesForCompanyType,
} from '../moduleTypeAccess';

describe('normalizeCompanyModuleType', () => {
  it('returns padrao for unknown value', () => expect(normalizeCompanyModuleType('other')).toBe('padrao'));
  it('returns tea', () => expect(normalizeCompanyModuleType('tea')).toBe('tea'));
  it('returns apenas-tea', () => expect(normalizeCompanyModuleType('apenas-tea')).toBe('apenas-tea'));
  it('returns padrao for undefined', () => expect(normalizeCompanyModuleType(undefined)).toBe('padrao'));
});

describe('isModuleAllowedForCompanyType', () => {
  it('tea type allows all modules', () => {
    expect(isModuleAllowedForCompanyType('modulo-tea', 'tea')).toBe(true);
    expect(isModuleAllowedForCompanyType('cadastro-paciente', 'tea')).toBe(true);
  });
  it('apenas-tea allows modulo-tea', () => {
    expect(isModuleAllowedForCompanyType('modulo-tea', 'apenas-tea')).toBe(true);
  });
  it('apenas-tea allows dependency modules', () => {
    expect(isModuleAllowedForCompanyType('cadastro-paciente', 'apenas-tea')).toBe(true);
  });
  it('apenas-tea blocks non-tea modules', () => {
    expect(isModuleAllowedForCompanyType('some-other-module', 'apenas-tea')).toBe(false);
  });
  it('padrao blocks modulo-tea', () => {
    expect(isModuleAllowedForCompanyType('modulo-tea', 'padrao')).toBe(false);
  });
  it('padrao allows non-tea modules', () => {
    expect(isModuleAllowedForCompanyType('consulta', 'padrao')).toBe(true);
  });
});

describe('filterModulesForCompanyType', () => {
  const modules = [
    { name: 'consulta' },
    { name: 'modulo-tea' },
    { name: 'cadastro-paciente' },
  ];

  it('padrao filters out tea module', () => {
    const result = filterModulesForCompanyType(modules, 'padrao');
    expect(result.map((m) => m.name)).not.toContain('modulo-tea');
    expect(result.map((m) => m.name)).toContain('consulta');
  });

  it('tea allows all', () => {
    expect(filterModulesForCompanyType(modules, 'tea')).toHaveLength(3);
  });

  it('apenas-tea filters to tea and deps only', () => {
    const result = filterModulesForCompanyType(modules, 'apenas-tea');
    expect(result.map((m) => m.name)).not.toContain('consulta');
  });
});

describe('filterAccessesForCompanyType', () => {
  const accesses = [
    { id: 'a1', modules: [{ name: 'consulta' }, { name: 'modulo-tea' }] },
    { id: 'a2', modules: [{ name: 'modulo-tea' }] },
    { id: 'a3', modules: [] },
  ];

  it('padrao removes accesses with only tea modules', () => {
    const result = filterAccessesForCompanyType(accesses, 'padrao');
    const ids = result.map((a: any) => a.id);
    expect(ids).toContain('a1');
    expect(ids).not.toContain('a2');
    expect(ids).not.toContain('a3');
  });
});
