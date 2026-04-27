import { beforeEach, describe, expect, it, vi } from 'vitest';

const { requestUseMock, getMock, postMock, getTokenMock } = vi.hoisted(() => ({
  requestUseMock: vi.fn(),
  getMock: vi.fn(),
  postMock: vi.fn(),
  getTokenMock: vi.fn(),
}));

vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => ({
      interceptors: { request: { use: requestUseMock } },
      get: getMock,
      post: postMock,
    })),
  },
}));

vi.mock('../publicCheckInSessionService', () => ({
  default: {
    getToken: getTokenMock,
  },
}));

vi.mock('../getApiBaseUrl', () => ({
  getApiBaseUrl: vi.fn(() => 'https://api.test'),
}));

import publicCheckInService from '../publicCheckInService';

describe('publicCheckInService', () => {
  beforeEach(() => {
    getMock.mockReset();
    postMock.mockReset();
    getTokenMock.mockReset();
  });

  it('adds auth token in interceptor when available', async () => {
    getTokenMock.mockReturnValue('totem-token');
    const onFulfilled = requestUseMock.mock.calls[0][0];

    const config = await onFulfilled({ headers: {} });
    expect(config.headers.Authorization).toBe('Bearer totem-token');
  });

  it('gets branch info and performs facial check-in', async () => {
    getMock.mockResolvedValue({ data: { id: 'b1' } });
    postMock.mockResolvedValue({ data: { status: 'QUEUED' } });

    const branch = await publicCheckInService.getBranchInfo('b1');
    const response = await publicCheckInService.facialCheckIn({ branchId: 'b1', patientCpf: '52998224725' });

    expect(getMock).toHaveBeenCalledWith('/care/public-check-in/branch/b1');
    expect(postMock).toHaveBeenCalledWith('/care/public-check-in/facial', {
      branchId: 'b1',
      patientCpf: '52998224725',
    });
    expect(branch.id).toBe('b1');
    expect(response.status).toBe('QUEUED');
  });
});
