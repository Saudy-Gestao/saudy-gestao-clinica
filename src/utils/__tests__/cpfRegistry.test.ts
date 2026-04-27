import { beforeEach, describe, expect, it, vi } from 'vitest';
import { findExistingCpf } from '../cpfRegistry';
import patientService from '../../services/patientService';
import doctorService from '../../services/doctorService';

vi.mock('../../services/patientService', () => ({
  default: {
    listPatients: vi.fn(),
  },
}));

vi.mock('../../services/doctorService', () => ({
  default: {
    listDoctors: vi.fn(),
  },
}));

describe('findExistingCpf', () => {
  beforeEach(() => {
    vi.mocked(patientService.listPatients).mockReset();
    vi.mocked(doctorService.listDoctors).mockReset();
  });

  it('returns no match for empty cpf', async () => {
    const result = await findExistingCpf({ cpf: '' });
    expect(result).toEqual({ exists: false });
  });

  it('finds duplicate in patients first', async () => {
    vi.mocked(patientService.listPatients).mockResolvedValue([{ id: 'p1', cpf: '52998224725' }] as any);
    vi.mocked(doctorService.listDoctors).mockResolvedValue([{ id: 'd1', cpf: '11111111111' }] as any);

    const result = await findExistingCpf({ cpf: '529.982.247-25' });
    expect(result).toEqual({ exists: true, entityType: 'patient', entityId: 'p1' });
  });

  it('ignores current entity and can match doctor', async () => {
    vi.mocked(patientService.listPatients).mockResolvedValue([{ id: 'p1', cpf: '52998224725' }] as any);
    vi.mocked(doctorService.listDoctors).mockResolvedValue([{ id: 'd1', cpf: '52998224725' }] as any);

    const result = await findExistingCpf({
      cpf: '52998224725',
      currentEntityType: 'patient',
      currentEntityId: 'p1',
    });

    expect(result).toEqual({ exists: true, entityType: 'doctor', entityId: 'd1' });
  });

  it('reads nested list payloads and fallback id fields', async () => {
    vi.mocked(patientService.listPatients).mockResolvedValue({
      data: {
        items: [{ _id: 'legacy-patient', cpf: '11122233344' }],
      },
    } as any);
    vi.mocked(doctorService.listDoctors).mockResolvedValue({
      results: [{ doctorId: 'legacy-doctor', cpf: '99988877766' }],
    } as any);

    const patientResult = await findExistingCpf({ cpf: '111.222.333-44' });
    const doctorResult = await findExistingCpf({ cpf: '999.888.777-66' });

    expect(patientResult).toEqual({ exists: true, entityType: 'patient', entityId: 'legacy-patient' });
    expect(doctorResult).toEqual({ exists: true, entityType: 'doctor', entityId: 'legacy-doctor' });
  });

  it('ignores current doctor and returns no duplicate when only self matches', async () => {
    vi.mocked(patientService.listPatients).mockResolvedValue([] as any);
    vi.mocked(doctorService.listDoctors).mockResolvedValue([{ id: 'd1', cpf: '52998224725' }] as any);

    const result = await findExistingCpf({
      cpf: '52998224725',
      currentEntityType: 'doctor',
      currentEntityId: 'd1',
    });

    expect(result).toEqual({ exists: false });
  });
});
