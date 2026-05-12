import { describe, expect, it, vi, beforeEach } from 'vitest';
import { findExistingCpf } from '../cpfRegistry';
import doctorService from '../../services/doctorService';
import patientService from '../../services/patientService';

vi.mock('../../services/doctorService', () => ({ default: { listDoctors: vi.fn() } }));
vi.mock('../../services/patientService', () => ({ default: { listPatients: vi.fn() } }));

const mockedPatients = vi.mocked(patientService.listPatients);
const mockedDoctors = vi.mocked(doctorService.listDoctors);

describe('findExistingCpf', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedPatients.mockResolvedValue([] as any);
    mockedDoctors.mockResolvedValue([] as any);
  });

  it('returns exists false for empty CPF', async () => {
    const result = await findExistingCpf({ cpf: '' });
    expect(result).toEqual({ exists: false });
    expect(mockedPatients).not.toHaveBeenCalled();
  });

  it('returns exists false when no match', async () => {
    mockedPatients.mockResolvedValue([{ id: '1', cpf: '11111111111' }] as any);
    const result = await findExistingCpf({ cpf: '52998224725' });
    expect(result).toEqual({ exists: false });
  });

  it('finds patient match', async () => {
    mockedPatients.mockResolvedValue([{ id: 'p1', cpf: '529.982.247-25' }] as any);
    const result = await findExistingCpf({ cpf: '52998224725' });
    expect(result).toEqual({ exists: true, entityType: 'patient', entityId: 'p1' });
  });

  it('finds doctor match when no patient match', async () => {
    mockedDoctors.mockResolvedValue([{ id: 'd1', cpf: '52998224725' }] as any);
    const result = await findExistingCpf({ cpf: '52998224725' });
    expect(result).toEqual({ exists: true, entityType: 'doctor', entityId: 'd1' });
  });

  it('skips current entity when checking', async () => {
    mockedPatients.mockResolvedValue([{ id: 'p1', cpf: '52998224725' }] as any);
    const result = await findExistingCpf({ cpf: '52998224725', currentEntityType: 'patient', currentEntityId: 'p1' });
    expect(result).toEqual({ exists: false });
  });

  it('handles array-wrapped response', async () => {
    mockedPatients.mockResolvedValue({ items: [{ id: 'p2', cpf: '52998224725' }] } as any);
    const result = await findExistingCpf({ cpf: '52998224725' });
    expect(result.exists).toBe(true);
  });

  it('handles nested data response', async () => {
    mockedPatients.mockResolvedValue({ data: { items: [{ id: 'p3', cpf: '52998224725' }] } } as any);
    const result = await findExistingCpf({ cpf: '52998224725' });
    expect(result.exists).toBe(true);
  });
});
