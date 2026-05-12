import api from './api';

export interface ReportLayoutConfig {
  clinicName: string;
  title: string;
  subtitle: string;
  headerText: string;
  footerText: string;
  paperSize: 'A4' | 'Letter';
  orientation: 'portrait' | 'landscape';
  marginTopMm: number;
  marginRightMm: number;
  marginBottomMm: number;
  marginLeftMm: number;
  fontFamily: string;
  fontSizePx: number;
  primaryColor: string;
  showLogo: boolean;
  logoUrl: string;
  logoImageDataUrl: string;
  showPatientInfo: boolean;
  showSignatures: boolean;
}

export interface ReportConfigPayload {
  requiresReviewer?: boolean;
  reportLayout?: ReportLayoutConfig;
}

export default {
  async get() {
    const res = await api.get('/care/report-config/');
    return res.data;
  },

  async update(payload: ReportConfigPayload) {
    const res = await api.put('/care/report-config/', payload);
    return res.data;
  },
};
