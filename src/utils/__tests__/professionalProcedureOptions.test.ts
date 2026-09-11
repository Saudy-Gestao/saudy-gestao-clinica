import { describe, expect, it } from 'vitest';
import { getProfessionalProcedureOptions } from '../professionalProcedureOptions';

const modalidades = [
  { value: 'm1', label: 'Terapias' },
  { value: 'm2', label: 'Exames' },
];

describe('getProfessionalProcedureOptions', () => {
  it('limits procedures to the selected specialty inside the selected modality', () => {
    const procedures = [
      { id: 'p1', name: 'Fonoaudiologia', especialidade: { id: 'e1', modalidadeId: 'm1' } },
      { id: 'p2', name: 'Terapia ocupacional', especialidade: { id: 'e2', modalidadeId: 'm1' } },
      { id: 'p3', name: 'Ressonância', especialidade: { id: 'e3', modalidadeId: 'm2' } },
    ];

    const result = getProfessionalProcedureOptions(procedures, new Set(['m1']), modalidades, new Set(['e1']));

    expect(result.map((item) => item.value)).toEqual(['p1']);
  });

  it('supports multiple selected specialties without including another specialty from the modality', () => {
    const procedures = [
      { id: 'p1', name: 'Fonoaudiologia', especialidadeId: 'e1', modalidadeId: 'm1' },
      { id: 'p2', name: 'Terapia ocupacional', especialidadeId: 'e2', modalidadeId: 'm1' },
      { id: 'p3', name: 'Psicologia', especialidadeId: 'e3', modalidadeId: 'm1' },
    ];

    const result = getProfessionalProcedureOptions(procedures, new Set(['m1']), modalidades, new Set(['e1', 'e2']));

    expect(result.map((item) => item.value)).toEqual(['p1', 'p2']);
  });

  it('keeps modality-only filtering for groups without a selected specialty', () => {
    const procedures = [
      { id: 'p1', name: 'Fonoaudiologia', especialidadeId: 'e1', modalidadeId: 'm1' },
      { id: 'p2', name: 'Ressonância', especialidadeId: 'e2', modalidadeId: 'm2' },
      { id: 'p3', name: 'Procedimento legado', modalidades: ['Terapias'] },
    ];

    const result = getProfessionalProcedureOptions(procedures, new Set(['m1']), modalidades, new Set());

    expect(result.map((item) => item.value)).toEqual(['p1', 'p3']);
  });
});
