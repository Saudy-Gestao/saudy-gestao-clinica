import { describe, expect, it } from 'vitest';
import { isDoctorUser } from '../userRole';

describe('isDoctorUser', () => {
  it('returns true when doctorId is present', () => {
    expect(isDoctorUser({ doctorId: 'doc-1' })).toBe(true);
  });

  it('returns true when nested doctor exists', () => {
    expect(isDoctorUser({ doctor: { id: 'doc-2' } })).toBe(true);
  });

  it('returns true for medicos sector and false otherwise', () => {
    expect(isDoctorUser({ sector: { name: 'Médicos' } })).toBe(true);
    expect(isDoctorUser({ sector: { name: 'Recepcao' } })).toBe(false);
    expect(isDoctorUser(null)).toBe(false);
  });
});
