import api from './api';

export interface ReportWorklistPayload {
  appointmentId?: string;
  externalStudyId?: string;
  accessionNumber?: string;
  patientName?: string;
  patientCpf?: string;
  patientBirthDate?: string;
  examType?: string;
  scheduledAt?: string;
  convenio?: string;
  requestingDoctor?: string;
  assignedTo?: string;
  priority?: string;
  status?: string;
  reportText?: string;
  issuerSignedAt?: string;
  reviewerSignedAt?: string;
  dicomStudyUid?: string;
  dicomSeriesUid?: string;
  dicomPath?: string;
  dicomUrl?: string;
  dicomReceivedAt?: string;
  metadata?: Record<string, unknown>;
}

export interface DicomSeriesFileItem {
  id: string;
  seriesUid: string | null;
  instanceId?: string | null;
  url: string;
}

export interface DicomSeriesSummaryItem {
  id: string;
  seriesUid: string | null;
  instancesCount: number;
  url: string;
}

const getDicomWebTagValue = (item: any, tag: string): string | null => {
  const value = item?.[tag]?.Value;
  if (Array.isArray(value) && value.length > 0) return String(value[0]);
  return null;
};

export default {
  async list(params?: { search?: string; status?: string; examType?: string; appointmentId?: string; limit?: number; offset?: number }) {
    const res = await api.get('/care/report-worklist/', { params });
    return res.data;
  },

  async create(payload: ReportWorklistPayload) {
    const res = await api.post('/care/report-worklist/', payload);
    return res.data;
  },

  async update(id: string, payload: Partial<ReportWorklistPayload>) {
    const res = await api.put(`/care/report-worklist/${id}`, payload);
    return res.data;
  },

  async remove(id: string) {
    const res = await api.delete(`/care/report-worklist/${id}`);
    return res.data;
  },

  /**
   * Download raw DICOM blob for an item (worklist id or study UID)
   */
  async fetchDicom(key: string) {
    const res = await api.get(`/dicom/${key}/file`, { responseType: 'arraybuffer' });
    return res.data as ArrayBuffer;
  },

  /**
   * Fetch a DICOM using a full url (returned as dicomUrl field)
   */
  async fetchDicomUrl(url: string) {
    const res = await api.get(url, { responseType: 'arraybuffer' });
    return res.data as ArrayBuffer;
  },

  /**
   * Return all DICOM buffers attached to a worklist item (or study UID)
   */
  async fetchDicomSeries(key: string) {
    const res = await api.get(`/dicom/${key}/files`, { params: { view: 'instances' } });
    const files: DicomSeriesFileItem[] = res.data?.files || [];
    return this.downloadDicomFiles(files);
  },

  async fetchDicomSeriesSummary(key: string) {
    const res = await api.get(`/dicom/${key}/files`, {
      params: { view: 'series', includeInstances: 'false' },
    });
    const series: DicomSeriesSummaryItem[] = res.data?.series || res.data?.files || [];
    return series;
  },

  async fetchDicomSeriesFiles(key: string, seriesUid: string | null) {
    const safeSeriesUid = seriesUid ?? '__NO_SERIES__';
    const res = await api.get(`/dicom/${key}/files`, {
      params: { seriesUid: safeSeriesUid },
    });
    const files: DicomSeriesFileItem[] = res.data?.instances || res.data?.files || [];
    return files;
  },

  async downloadDicomFiles(files: DicomSeriesFileItem[], onProgress?: (loaded: number, total: number) => void) {
    const total = files.length;
    let loaded = 0;
    const promises = files.map(async (f) => {
      const r = await api.get(f.url, { responseType: 'arraybuffer' });
      loaded += 1;
      if (onProgress) onProgress(loaded, total);
      return r.data as ArrayBuffer;
    });
    return Promise.all(promises);
  },

  /**
   * Build a WADO imageId string for a given file URL (relative path from backend).
   */
  buildSeriesImageId(fileUrl: string): string {
    const base = ((import.meta.env.VITE_API_URL as string) ?? '').replace(/\/$/, '');
    const path = fileUrl.startsWith('/') ? fileUrl : `/${fileUrl}`;
    return `wadouri:${base}${path}`;
  },

  /**
   * Get WADO imageIds for all instances of a series without downloading the files.
   * Cornerstone will fetch them on demand (with auth) as images are requested.
   */
  async fetchDicomSeriesImageIds(key: string, seriesUid: string | null): Promise<string[]> {
    const files = await this.fetchDicomSeriesFiles(key, seriesUid);
    return files.map((f) => this.buildSeriesImageId(f.url));
  },

  buildDicomWebImageId(studyInstanceUid: string, seriesInstanceUid: string, sopInstanceUid: string): string {
    const base = ((import.meta.env.VITE_API_URL as string) ?? '').replace(/\/$/, '');
    return `wadouri:${base}/dicom/orthanc/studies/${encodeURIComponent(studyInstanceUid)}/series/${encodeURIComponent(seriesInstanceUid)}/instances/${encodeURIComponent(sopInstanceUid)}/file`;
  },

  async fetchDicomWebSeriesSummary(studyInstanceUid: string): Promise<DicomSeriesSummaryItem[]> {
    const seriesRes = await api.get(`/dicom-web/studies/${encodeURIComponent(studyInstanceUid)}/series`, {
      headers: { Accept: 'application/dicom+json, application/json' },
    });
    const seriesItems: any[] = Array.isArray(seriesRes.data) ? seriesRes.data : [];

    const summaries = await Promise.all(seriesItems.map(async (series, index) => {
      const seriesUid = getDicomWebTagValue(series, '0020000E');
      if (!seriesUid) return null;

      const instancesRes = await api.get(
        `/dicom-web/studies/${encodeURIComponent(studyInstanceUid)}/series/${encodeURIComponent(seriesUid)}/instances`,
        { headers: { Accept: 'application/dicom+json, application/json' } },
      );
      const instances: any[] = Array.isArray(instancesRes.data) ? instancesRes.data : [];
      const firstSopUid = instances.map((item) => getDicomWebTagValue(item, '00080018')).find(Boolean);

      return {
        id: seriesUid,
        seriesUid,
        instancesCount: instances.length,
        url: firstSopUid ? this.buildDicomWebImageId(studyInstanceUid, seriesUid, firstSopUid) : '',
        sortIndex: index,
      };
    }));

    return summaries
      .filter(Boolean)
      .map((item: any) => ({
        id: item.id,
        seriesUid: item.seriesUid,
        instancesCount: item.instancesCount,
        url: item.url,
      }));
  },

  async fetchDicomWebSeriesImageIds(studyInstanceUid: string, seriesInstanceUid: string | null): Promise<string[]> {
    if (!seriesInstanceUid) return [];
    const res = await api.get(
      `/dicom-web/studies/${encodeURIComponent(studyInstanceUid)}/series/${encodeURIComponent(seriesInstanceUid)}/instances`,
      { headers: { Accept: 'application/dicom+json, application/json' } },
    );
    const instances: any[] = Array.isArray(res.data) ? res.data : [];
    return instances
      .map((item) => getDicomWebTagValue(item, '00080018'))
      .filter(Boolean)
      .map((sopInstanceUid) => this.buildDicomWebImageId(studyInstanceUid, seriesInstanceUid, sopInstanceUid as string));
  },
};
