import { describe, expect, it } from 'vitest';
import { isDoctorUser, isAdminUser, hasModuleAccess } from '../userRole';

describe('isDoctorUser', () => {
  it('returns false for null', () => expect(isDoctorUser(null)).toBe(false));
  it('returns false for non-object', () => expect(isDoctorUser('string')).toBe(false));
  it('returns true when doctorId is set', () => expect(isDoctorUser({ doctorId: '123' })).toBe(true));
  it('returns true when doctor.id is set', () => expect(isDoctorUser({ doctor: { id: '1' } })).toBe(true));
  it('returns true when sector name is medicos', () => expect(isDoctorUser({ sector: { name: 'medicos' } })).toBe(true));
  it('returns true when sector name is médicos', () => expect(isDoctorUser({ sector: { name: 'médicos' } })).toBe(true));
  it('returns false for other sector', () => expect(isDoctorUser({ sector: { name: 'recepcao' } })).toBe(false));
});

describe('isAdminUser', () => {
  it('returns false for null', () => expect(isAdminUser(null)).toBe(false));
  it('returns true for isAdmHubOnly', () => expect(isAdminUser({ isAdmHubOnly: true })).toBe(true));
  it('returns true for role admin', () => expect(isAdminUser({ role: 'admin' })).toBe(true));
  it('returns true for role Administrador (with accent)', () => expect(isAdminUser({ role: 'Administrador' })).toBe(true));
  it('returns true for perfil admin', () => expect(isAdminUser({ perfil: 'admin' })).toBe(true));
  it('returns true when accessDescription includes admin', () => {
    expect(isAdminUser({ accessDescription: 'administrador geral' })).toBe(true);
  });
  it('returns true when accesses array has admin string', () => {
    expect(isAdminUser({ accesses: ['admin'] })).toBe(true);
  });
  it('returns true when accesses array has object with admin name', () => {
    expect(isAdminUser({ accesses: [{ name: 'Admin' }] })).toBe(true);
  });
  it('returns true when single access object has admin label', () => {
    expect(isAdminUser({ access: { label: 'administrador' } })).toBe(true);
  });
  it('returns true when user name is admin', () => {
    expect(isAdminUser({ name: 'admin' })).toBe(true);
  });
  it('returns false for regular user', () => {
    expect(isAdminUser({ role: 'user', name: 'João Silva' })).toBe(false);
  });
});

describe('hasModuleAccess', () => {
  it('returns false for null', () => expect(hasModuleAccess(null, 'configuracoes')).toBe(false));

  it('fails open when the user has no access records at all', () => {
    expect(hasModuleAccess({ accesses: [] }, 'configuracoes')).toBe(true);
    expect(hasModuleAccess({}, 'configuracoes')).toBe(true);
  });

  it('returns true when a module with that name is granted', () => {
    const user = { accesses: [{ modules: [{ name: 'cadastro-paciente' }, { name: 'configuracoes' }] }] };
    expect(hasModuleAccess(user, 'configuracoes')).toBe(true);
  });

  it('returns false when accesses exist but the module is not granted', () => {
    const user = { accesses: [{ modules: [{ name: 'cadastro-paciente' }] }] };
    expect(hasModuleAccess(user, 'configuracoes')).toBe(false);
  });

  it('is case/accent-insensitive and checks across multiple accesses', () => {
    const user = {
      accesses: [
        { modules: [{ name: 'cadastro-paciente' }] },
        { modules: [{ name: 'Configuracoes' }] },
      ],
    };
    expect(hasModuleAccess(user, 'CONFIGURAÇÕES')).toBe(true);
  });

  it('supports the singular `access` field shape', () => {
    const user = { access: { modules: [{ name: 'configuracoes' }] } };
    expect(hasModuleAccess(user, 'configuracoes')).toBe(true);
  });
});
