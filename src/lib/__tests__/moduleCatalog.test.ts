import { describe, expect, it } from 'vitest';
import {
  extractAllowedModules,
  filterSectionsForUser,
  findSectionKeyForPath,
  normalizeModuleKey,
  OVERVIEW_SECTION_KEY,
} from '../moduleCatalog';

describe('normalizeModuleKey', () => {
  it('returns empty string for falsy values', () => {
    expect(normalizeModuleKey(undefined)).toBe('');
    expect(normalizeModuleKey('')).toBe('');
  });

  it('maps known aliases regardless of accents/case', () => {
    expect(normalizeModuleKey('Autorização e Recepção')).toBe('pre-atendimento');
    expect(normalizeModuleKey('Teleconsulta')).toBe('consulta');
    expect(normalizeModuleKey('BI Gestão')).toBe('bi-gestao');
  });

  it('falls back to a slugified version for unknown values', () => {
    expect(normalizeModuleKey('Modulo Desconhecido')).toBe('modulo-desconhecido');
  });
});

describe('extractAllowedModules', () => {
  it('returns an empty array when user has no access info', () => {
    expect(extractAllowedModules(null)).toEqual([]);
    expect(extractAllowedModules({})).toEqual([]);
  });

  it('collects modules from accesses and top-level modules without duplicates', () => {
    const user = {
      accesses: [{ modules: [{ name: 'Consulta' }, { name: 'Laudo' }] }],
      modules: ['consulta', { name: 'Estoque' }],
    };
    expect(extractAllowedModules(user)).toEqual(['consulta', 'laudo', 'estoque']);
  });

  it('supports the legacy `access` field', () => {
    const user = { access: [{ modules: [{ name: 'Financeiro' }] }] };
    expect(extractAllowedModules(user)).toEqual(['financeiro']);
  });
});

describe('filterSectionsForUser', () => {
  it('shows every section when the user has no restrictions and is not a doctor', () => {
    const sections = filterSectionsForUser({});
    expect(sections.length).toBeGreaterThan(0);
  });

  it('limits a doctor with no explicit modules to the default doctor modules', () => {
    const sections = filterSectionsForUser({ doctorId: 'doc-1' });
    const moduleNames = sections.flatMap((s) => s.items.map((i) => i.moduleName));
    expect(moduleNames).toContain('consulta');
    expect(moduleNames).toContain('laudo');
    expect(moduleNames).not.toContain('agendamento');
  });

  it('respects explicit allowed modules and fallback module names', () => {
    const user = { modules: ['whatsapp-config'] };
    const sections = filterSectionsForUser(user);
    const routes = sections.flatMap((s) => s.items.map((i) => i.route));
    expect(routes).toContain('/conversas');
    expect(routes).toContain('/whatsapp');
  });

  it('always keeps "Meus Chamados" visible', () => {
    const user = { modules: ['some-unrelated-module'] };
    const sections = filterSectionsForUser(user);
    const routes = sections.flatMap((s) => s.items.map((i) => i.route));
    expect(routes).toContain('/meus-chamados');
  });
});

describe('findSectionKeyForPath', () => {
  it('returns the overview key for root/dashboard/empty paths', () => {
    expect(findSectionKeyForPath('')).toBe(OVERVIEW_SECTION_KEY);
    expect(findSectionKeyForPath('/')).toBe(OVERVIEW_SECTION_KEY);
    expect(findSectionKeyForPath('/dashboard')).toBe(OVERVIEW_SECTION_KEY);
  });

  it('finds the section key for an exact or nested route match', () => {
    expect(findSectionKeyForPath('/consulta')).toBe('operacao-clinica');
    expect(findSectionKeyForPath('/consulta/123')).toBe('operacao-clinica');
  });

  it('returns null when no section matches', () => {
    expect(findSectionKeyForPath('/rota-inexistente')).toBeNull();
  });
});
