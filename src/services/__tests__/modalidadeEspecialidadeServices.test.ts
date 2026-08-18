import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from '../api';
import modalidadeService from '../modalidadeService';
import especialidadeService from '../especialidadeService';

vi.mock('../api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

const mockedApi = vi.mocked(api);
const data = { id: 'r1', ok: true };

beforeEach(() => {
  vi.clearAllMocks();
  mockedApi.get.mockResolvedValue({ data });
  mockedApi.post.mockResolvedValue({ data });
  mockedApi.put.mockResolvedValue({ data });
  mockedApi.delete.mockResolvedValue({ data });
});

describe('modalidadeService', () => {
  it('listModalidades', async () => {
    await modalidadeService.listModalidades({ search: 'tomo', isActive: true });
    expect(mockedApi.get).toHaveBeenCalledWith('/procedures/modalidades/', { params: { search: 'tomo', isActive: true } });
  });
  it('getModalidade', async () => {
    await modalidadeService.getModalidade('m1');
    expect(mockedApi.get).toHaveBeenCalledWith('/procedures/modalidades/m1');
  });
  it('createModalidade', async () => {
    await modalidadeService.createModalidade({ name: 'Tomografia' });
    expect(mockedApi.post).toHaveBeenCalledWith('/procedures/modalidades/', { name: 'Tomografia' });
  });
  it('updateModalidade', async () => {
    await modalidadeService.updateModalidade('m1', { isActive: false });
    expect(mockedApi.put).toHaveBeenCalledWith('/procedures/modalidades/m1', { isActive: false });
  });
  it('deleteModalidade', async () => {
    await modalidadeService.deleteModalidade('m1');
    expect(mockedApi.delete).toHaveBeenCalledWith('/procedures/modalidades/m1');
  });
  it('getModalidadeAuditLog', async () => {
    await modalidadeService.getModalidadeAuditLog('m1');
    expect(mockedApi.get).toHaveBeenCalledWith('/procedures/modalidades/m1/audit');
  });
});

describe('especialidadeService', () => {
  it('listEspecialidades', async () => {
    await especialidadeService.listEspecialidades({ modalidadeId: 'm1' });
    expect(mockedApi.get).toHaveBeenCalledWith('/procedures/especialidades/', { params: { modalidadeId: 'm1' } });
  });
  it('getEspecialidade', async () => {
    await especialidadeService.getEspecialidade('e1');
    expect(mockedApi.get).toHaveBeenCalledWith('/procedures/especialidades/e1');
  });
  it('createEspecialidade', async () => {
    await especialidadeService.createEspecialidade({ modalidadeId: 'm1', name: 'TC Crânio' });
    expect(mockedApi.post).toHaveBeenCalledWith('/procedures/especialidades/', { modalidadeId: 'm1', name: 'TC Crânio' });
  });
  it('updateEspecialidade', async () => {
    await especialidadeService.updateEspecialidade('e1', { metodos: ['Com contraste'] });
    expect(mockedApi.put).toHaveBeenCalledWith('/procedures/especialidades/e1', { metodos: ['Com contraste'] });
  });
  it('deleteEspecialidade', async () => {
    await especialidadeService.deleteEspecialidade('e1');
    expect(mockedApi.delete).toHaveBeenCalledWith('/procedures/especialidades/e1');
  });
  it('getEspecialidadeAuditLog', async () => {
    await especialidadeService.getEspecialidadeAuditLog('e1');
    expect(mockedApi.get).toHaveBeenCalledWith('/procedures/especialidades/e1/audit');
  });
});
