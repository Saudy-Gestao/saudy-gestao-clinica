import { beforeEach, describe, expect, it, vi } from 'vitest';
import reportWorklistService from '../reportWorklistService';
import api from '../api';

vi.mock('../api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('reportWorklistService', () => {
  beforeEach(() => {
    vi.mocked(api.get).mockReset();
    vi.mocked(api.post).mockReset();
    vi.mocked(api.put).mockReset();
    vi.mocked(api.delete).mockReset();
  });

  it('lists, creates, updates and removes worklist items', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { items: [{ id: 'w1' }] } } as any);
    vi.mocked(api.post).mockResolvedValue({ data: { id: 'w2' } } as any);
    vi.mocked(api.put).mockResolvedValue({ data: { id: 'w2', status: 'DONE' } } as any);
    vi.mocked(api.delete).mockResolvedValue({ data: { success: true } } as any);

    await expect(reportWorklistService.list({ status: 'PENDING', limit: 5, offset: 0 })).resolves.toEqual({ items: [{ id: 'w1' }] });
    await expect(reportWorklistService.create({ patientName: 'Maria' })).resolves.toEqual({ id: 'w2' });
    await expect(reportWorklistService.update('w2', { status: 'DONE' })).resolves.toEqual({ id: 'w2', status: 'DONE' });
    await expect(reportWorklistService.remove('w2')).resolves.toEqual({ success: true });

    expect(api.get).toHaveBeenCalledWith('/care/report-worklist/', { params: { status: 'PENDING', limit: 5, offset: 0 } });
    expect(api.post).toHaveBeenCalledWith('/care/report-worklist/', { patientName: 'Maria' });
    expect(api.put).toHaveBeenCalledWith('/care/report-worklist/w2', { status: 'DONE' });
    expect(api.delete).toHaveBeenCalledWith('/care/report-worklist/w2');
  });

  it('downloads dicom data, exposes series helpers and builds image ids', async () => {
    const progress = vi.fn();
    vi.stubEnv('VITE_API_URL', 'https://api.saudy.test/');

    vi.mocked(api.get)
      .mockResolvedValueOnce({ data: new ArrayBuffer(4) } as any)
      .mockResolvedValueOnce({ data: new ArrayBuffer(2) } as any)
      .mockResolvedValueOnce({ data: { files: [{ url: '/dicom/f1', id: 'f1', seriesUid: 's1' }, { url: '/dicom/f2', id: 'f2', seriesUid: 's1' }] } } as any)
      .mockResolvedValueOnce({ data: new ArrayBuffer(1) } as any)
      .mockResolvedValueOnce({ data: new ArrayBuffer(1) } as any)
      .mockResolvedValueOnce({ data: { series: [{ id: 's1', seriesUid: 's1', instancesCount: 2, url: '/dicom/s1' }] } } as any)
      .mockResolvedValueOnce({ data: { instances: [{ id: 'f3', seriesUid: null, url: '/dicom/f3' }] } } as any)
      .mockResolvedValueOnce({ data: { files: [{ id: 'f4', seriesUid: null, url: '/dicom/f4' }] } } as any);

    const one = await reportWorklistService.fetchDicom('study-1');
    const two = await reportWorklistService.fetchDicomUrl('https://remote/dicom');
    const buffers = await reportWorklistService.fetchDicomSeries('study-1');
    const summary = await reportWorklistService.fetchDicomSeriesSummary('study-1');
    const files = await reportWorklistService.fetchDicomSeriesFiles('study-1', null);
    const downloaded = await reportWorklistService.downloadDicomFiles([{ id: 'f4', seriesUid: null, url: '/dicom/f4' }], progress);
    const imageId = reportWorklistService.buildSeriesImageId('/dicom/f4');

    vi.mocked(api.get).mockResolvedValueOnce({ data: { instances: [{ id: 'f9', seriesUid: 's9', url: '/dicom/f9' }] } } as any);
    const imageIds = await reportWorklistService.fetchDicomSeriesImageIds('study-9', 's9');

    expect(one).toBeInstanceOf(ArrayBuffer);
    expect(two).toBeInstanceOf(ArrayBuffer);
    expect(buffers).toHaveLength(2);
    expect(summary).toEqual([{ id: 's1', seriesUid: 's1', instancesCount: 2, url: '/dicom/s1' }]);
    expect(files).toEqual([{ id: 'f3', seriesUid: null, url: '/dicom/f3' }]);
    expect(downloaded).toHaveLength(1);
    expect(progress).toHaveBeenCalledWith(1, 1);
    expect(imageId).toBe('wadouri:https://api.saudy.test/dicom/f4');
    expect(imageIds).toEqual(['wadouri:https://api.saudy.test/dicom/f9']);
  });
});