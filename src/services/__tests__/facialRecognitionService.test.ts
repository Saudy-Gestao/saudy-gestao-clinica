import { beforeEach, describe, expect, it, vi } from 'vitest';

const { requestUseMock, postMock, getTokenMock } = vi.hoisted(() => ({
  requestUseMock: vi.fn(),
  postMock: vi.fn(),
  getTokenMock: vi.fn(),
}));

vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => ({
      interceptors: { request: { use: requestUseMock } },
      post: postMock,
    })),
  },
}));

vi.mock('../publicCheckInSessionService', () => ({
  default: {
    getToken: getTokenMock,
  },
}));

import facialRecognitionService from '../facialRecognitionService';

describe('facialRecognitionService', () => {
  beforeEach(() => {
    postMock.mockReset();
    getTokenMock.mockReset();
  });

  it('adds token unless request skips auth', async () => {
    getTokenMock.mockReturnValue('face-token');
    localStorage.setItem('token', 'fallback-token');

    const onFulfilled = requestUseMock.mock.calls[0][0];
    const withAuth = await onFulfilled({ headers: {} });
    const withoutAuth = await onFulfilled({ headers: {}, skipAuth: true });

    expect(withAuth.headers.Authorization).toBe('Bearer face-token');
    expect(withoutAuth.headers.Authorization).toBeUndefined();
  });

  it('scans and registers faces through API', async () => {
    postMock
      .mockResolvedValueOnce({ data: { trust: 98, patient: { id: 'p1', name: 'Maria', cpf: '52998224725' } } })
      .mockResolvedValueOnce({ data: { id: 'f1', message: 'ok' } });

    const scan = await facialRecognitionService.scanFace({ image: 'base64', id_unidade: 'u1', skipAuth: true });
    const created = await facialRecognitionService.registerFace({ image: 'base64', cpf: '52998224725', nome: 'Maria', parentesco: 'self', id_unidade: 'u1' });

    expect(postMock).toHaveBeenNthCalledWith(1, '/facial/scan', { image: 'base64', id_unidade: 'u1' }, { skipAuth: true });
    expect(postMock).toHaveBeenNthCalledWith(2, '/facial/scan/create', {
      image: 'base64',
      cpf: '52998224725',
      nome: 'Maria',
      parentesco: 'self',
      id_unidade: 'u1',
    });
    expect(scan.trust).toBe(98);
    expect(created.id).toBe('f1');
  });

  it('converts image file to base64, captures webcam and stops stream tracks', async () => {
    const readAsDataURLMock = vi.fn(function (this: any) {
      this.result = 'data:image/png;base64,abc';
      this.onload?.();
    });

    class MockFileReader {
      result: string | null = null;
      onload: null | (() => void) = null;
      onerror: null | (() => void) = null;
      readAsDataURL = readAsDataURLMock;
    }

    vi.stubGlobal('FileReader', MockFileReader as any);

    const base64 = await facialRecognitionService.imageToBase64(new File(['x'], 'face.png', { type: 'image/png' }));
    expect(base64).toBe('data:image/png;base64,abc');

    const drawImageMock = vi.fn();
    const toDataUrlMock = vi.fn(() => 'data:image/jpeg;base64,captured');
    const createElementSpy = vi.spyOn(document, 'createElement').mockImplementation((tagName: any) => {
      if (tagName === 'canvas') {
        return {
          width: 0,
          height: 0,
          getContext: () => ({ drawImage: drawImageMock }),
          toDataURL: toDataUrlMock,
        } as any;
      }
      return document.createElement(tagName);
    });

    const dataUrl = await facialRecognitionService.captureFromWebcam({ videoWidth: 640, videoHeight: 480 } as HTMLVideoElement);
    expect(drawImageMock).toHaveBeenCalled();
    expect(dataUrl).toBe('data:image/jpeg;base64,captured');
    createElementSpy.mockRestore();

    const stopMock = vi.fn();
    facialRecognitionService.stopWebcam({ getTracks: () => [{ stop: stopMock }, { stop: stopMock }] } as any);
    expect(stopMock).toHaveBeenCalledTimes(2);
  });

  it('starts webcam and throws friendly error when media access fails', async () => {
    const getUserMediaMock = vi.fn()
      .mockResolvedValueOnce({ id: 'stream-1' })
      .mockRejectedValueOnce(new Error('denied'));

    Object.defineProperty(navigator, 'mediaDevices', {
      value: { getUserMedia: getUserMediaMock },
      configurable: true,
    });

    const stream = await facialRecognitionService.startWebcam();
    expect(stream).toEqual({ id: 'stream-1' });

    await expect(facialRecognitionService.startWebcam()).rejects.toThrow(
      'Não foi possível acessar a webcam. Verifique as permissões.',
    );
  });
});
