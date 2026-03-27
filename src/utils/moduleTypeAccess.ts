import type { Module } from '../services/moduleService';

export type CompanyModuleType = 'padrao' | 'tea' | 'apenas-tea';

const TEA_MODULE_NAMES = new Set([
  'modulo-tea',
]);

const TEA_DEPENDENCY_MODULE_NAMES = new Set([
  'cadastro-paciente',
  'cadastro-procedimento',
  'cadastro-medico',
  'autorizacao-convenio',
]);

export const normalizeCompanyModuleType = (value: unknown): CompanyModuleType => {
  if (value === 'tea' || value === 'apenas-tea') return value;
  return 'padrao';
};

export const isModuleAllowedForCompanyType = (moduleName: string, moduleType: CompanyModuleType) => {
  if (moduleType === 'tea') return true;
  if (moduleType === 'apenas-tea') {
    return TEA_MODULE_NAMES.has(moduleName) || TEA_DEPENDENCY_MODULE_NAMES.has(moduleName);
  }
  return !TEA_MODULE_NAMES.has(moduleName);
};

export const filterModulesForCompanyType = <T extends { name?: string | null }>(
  modules: T[],
  moduleType: CompanyModuleType,
) => modules.filter((module) => isModuleAllowedForCompanyType(String(module?.name || ''), moduleType));

export const filterAccessesForCompanyType = <T extends { modules?: Module[] | null }>(
  accesses: T[],
  moduleType: CompanyModuleType,
) => (
  accesses
    .map((access) => ({
      ...access,
      modules: filterModulesForCompanyType(Array.isArray(access.modules) ? access.modules : [], moduleType),
    }))
    .filter((access) => Array.isArray(access.modules) && access.modules.length > 0)
);
