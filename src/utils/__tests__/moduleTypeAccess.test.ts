import { describe, expect, it } from 'vitest';
import {
  filterAccessesForCompanyType,
  filterModulesForCompanyType,
  isModuleAllowedForCompanyType,
  normalizeCompanyModuleType,
} from '../moduleTypeAccess';

describe('moduleTypeAccess', () => {
  it('normalizes unknown module type to padrao', () => {
    expect(normalizeCompanyModuleType('x')).toBe('padrao');
    expect(normalizeCompanyModuleType('tea')).toBe('tea');
  });

  it('applies module visibility rules by company type', () => {
    expect(isModuleAllowedForCompanyType('modulo-tea', 'padrao')).toBe(false);
    expect(isModuleAllowedForCompanyType('modulo-tea', 'tea')).toBe(true);
    expect(isModuleAllowedForCompanyType('cadastro-medico', 'apenas-tea')).toBe(true);
    expect(isModuleAllowedForCompanyType('dashboard', 'apenas-tea')).toBe(false);
  });

  it('filters modules and accesses consistently', () => {
    const modules = [
      { name: 'dashboard' },
      { name: 'modulo-tea' },
      { name: 'cadastro-paciente' },
    ];

    const filteredModules = filterModulesForCompanyType(modules, 'apenas-tea');
    expect(filteredModules.map((m) => m.name)).toEqual(['modulo-tea', 'cadastro-paciente']);

    const accesses = [
      { id: 'a1', modules: [{ name: 'dashboard' }] },
      { id: 'a2', modules: [{ name: 'modulo-tea' }] },
    ];

    const filteredAccesses = filterAccessesForCompanyType(accesses, 'apenas-tea');
    expect(filteredAccesses).toHaveLength(1);
    expect(filteredAccesses[0].id).toBe('a2');
  });
});
