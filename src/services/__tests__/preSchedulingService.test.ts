import { beforeEach, describe, expect, it, vi } from 'vitest';
import axios from 'axios';
import api from '../api';
import preSchedulingService from '../preSchedulingService';

const { publicApiGetMock, publicApiPostMock } = vi.hoisted(() => ({
  publicApiGetMock: vi.fn(),
  publicApiPostMock: vi.fn(),
}));

vi.mock('../api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => ({
      get: publicApiGetMock,
      post: publicApiPostMock,
    })),
  },
}));

describe('preSchedulingService', () => {
  beforeEach(() => {
    (api.get as any).mockReset();
    (api.post as any).mockReset();
    publicApiGetMock.mockReset();
    publicApiPostMock.mockReset();
  });

  it('calls list endpoint with params', async () => {
    (api.get as any).mockResolvedValue({ data: { total: 1, items: [] } });

    const data = await preSchedulingService.list({ search: 'maria' });

    expect(api.get).toHaveBeenCalledWith('/care/pre-scheduling/', { params: { search: 'maria' } });
    expect(data.total).toBe(1);
  });

  it('normalizes localhost link origin on sendLink', async () => {
    Object.defineProperty(window, 'location', {
      value: { origin: 'https://saudy.app' },
      configurable: true,
    });

    (api.post as any).mockResolvedValue({
      data: {
        message: 'ok',
        publicUrl: 'http://localhost:3000/care/pre-scheduling/public/token',
        whatsapp: {
          message: 'Acesse http://localhost:3000/care/pre-scheduling/public/token',
          provider: 'mock',
        },
      },
    });

    const result = await preSchedulingService.sendLink('appt-1');
    expect(api.post).toHaveBeenCalledWith('/care/pre-scheduling/appt-1/send-link', {});
    expect(result.publicUrl).toBe('https://saudy.app/care/pre-scheduling/public/token');
    expect(result.whatsapp?.message).toContain('https://saudy.app/care/pre-scheduling/public/token');
  });

  it('uses public api for getPublicMeta', async () => {
    publicApiGetMock.mockResolvedValue({ data: { id: 'x' } });
    const result = await preSchedulingService.getPublicMeta('token-1');
    expect(publicApiGetMock).toHaveBeenCalledWith('/care/pre-scheduling/public/token-1');
    expect(result).toEqual({ id: 'x' });
    expect((axios.create as any)).toHaveBeenCalled();
  });

  it('calls private endpoints for pre authorization flow', async () => {
    (api.post as any).mockResolvedValueOnce({ data: { message: 'ok' } });
    (api.get as any).mockResolvedValueOnce({ data: { items: [{ id: 'd1' }] } });
    (api.post as any).mockResolvedValueOnce({ data: { status: 'COMPLETED' } });
    (api.post as any).mockResolvedValueOnce({ data: { status: 'COMPLETED' } });
    (api.get as any).mockResolvedValueOnce({ data: new Blob(['x']) });

    const preAuth = await preSchedulingService.preAuthorize('appt-1', { guideNumber: '123' });
    const docs = await preSchedulingService.getDocuments('appt-1');
    const review = await preSchedulingService.reviewDocuments('appt-1', { action: 'APPROVE' });
    const finalized = await preSchedulingService.manualFinalize('appt-1');
    const blob = await preSchedulingService.viewDocument('appt-1', 'doc-1');

    expect(api.post).toHaveBeenNthCalledWith(1, '/care/pre-scheduling/appt-1/pre-authorize', { guideNumber: '123' });
    expect(api.get).toHaveBeenNthCalledWith(1, '/care/pre-scheduling/appt-1/documents');
    expect(api.post).toHaveBeenNthCalledWith(2, '/care/pre-scheduling/appt-1/review-documents', { action: 'APPROVE' });
    expect(api.post).toHaveBeenNthCalledWith(3, '/care/pre-scheduling/appt-1/manual-finalize');
    expect(api.get).toHaveBeenNthCalledWith(2, '/care/pre-scheduling/appt-1/documents/doc-1/view', { responseType: 'blob' });
    expect(preAuth).toEqual({ message: 'ok' });
    expect(docs).toEqual({ items: [{ id: 'd1' }] });
    expect(review).toEqual({ status: 'COMPLETED' });
    expect(finalized).toEqual({ status: 'COMPLETED' });
    expect(blob).toBeInstanceOf(Blob);
  });

  it('calls public endpoints for verify/upload/anamnesis/finalize', async () => {
    publicApiPostMock
      .mockResolvedValueOnce({ data: { verified: true } })
      .mockResolvedValueOnce({ data: { id: 'doc-1' } })
      .mockResolvedValueOnce({ data: { message: 'saved' } })
      .mockResolvedValueOnce({ data: { status: 'WAITING_PATIENT_DOCUMENTS' } });

    const verified = await preSchedulingService.verifyPublic('token-1', { recognizedCpf: '123' });
    const uploaded = await preSchedulingService.uploadPublicDocument('token-1', {
      documentType: 'RG',
      fileName: 'rg.pdf',
      fileBase64: 'abc',
    });
    const anamnesis = await preSchedulingService.submitPublicAnamnesis('token-1', {
      answers: [{ questionId: 'q1', answerText: 'ok' }],
    });
    const finalized = await preSchedulingService.finalizePublicDocuments('token-1');

    expect(publicApiPostMock).toHaveBeenNthCalledWith(1, '/care/pre-scheduling/public/token-1/verify', { recognizedCpf: '123' });
    expect(publicApiPostMock).toHaveBeenNthCalledWith(2, '/care/pre-scheduling/public/token-1/upload', {
      documentType: 'RG',
      fileName: 'rg.pdf',
      fileBase64: 'abc',
    });
    expect(publicApiPostMock).toHaveBeenNthCalledWith(3, '/care/pre-scheduling/public/token-1/anamnesis', {
      answers: [{ questionId: 'q1', answerText: 'ok' }],
    });
    expect(publicApiPostMock).toHaveBeenNthCalledWith(4, '/care/pre-scheduling/public/token-1/finalize');
    expect(verified).toEqual({ verified: true });
    expect(uploaded).toEqual({ id: 'doc-1' });
    expect(anamnesis).toEqual({ message: 'saved' });
    expect(finalized).toEqual({ status: 'WAITING_PATIENT_DOCUMENTS' });
  });

  it('keeps non-local links untouched on sendLink', async () => {
    Object.defineProperty(window, 'location', {
      value: { origin: 'https://saudy.app' },
      configurable: true,
    });

    (api.post as any).mockResolvedValue({
      data: {
        message: 'ok',
        publicUrl: 'https://externo.app/public/token',
        whatsapp: { provider: 'mock', message: 'Acesse https://externo.app/public/token' },
      },
    });

    const result = await preSchedulingService.sendLink('appt-2', { notes: 'enviar' });
    expect(api.post).toHaveBeenCalledWith('/care/pre-scheduling/appt-2/send-link', { notes: 'enviar' });
    expect(result.publicUrl).toBe('https://externo.app/public/token');
    expect(result.whatsapp?.message).toBe('Acesse https://externo.app/public/token');
  });

  it('returns invalid public url unchanged on sendLink', async () => {
    Object.defineProperty(window, 'location', {
      value: { origin: 'https://saudy.app' },
      configurable: true,
    });

    (api.post as any).mockResolvedValue({
      data: {
        message: 'ok',
        publicUrl: 'nao-e-url',
        whatsapp: { provider: 'mock', message: 'Acesse nao-e-url' },
      },
    });

    const result = await preSchedulingService.sendLink('appt-3');
    expect(result.publicUrl).toBe('nao-e-url');
    expect(result.whatsapp?.message).toBe('Acesse nao-e-url');
  });
});
