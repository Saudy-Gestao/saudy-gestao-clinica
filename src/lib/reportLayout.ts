import type { ReportLayoutConfig } from '../services/reportConfigService';

export const DEFAULT_REPORT_LAYOUT: ReportLayoutConfig = {
  clinicName: 'Saudy',
  title: 'Laudo Médico',
  subtitle: '',
  headerText: '',
  footerText: '',
  paperSize: 'A4',
  orientation: 'portrait',
  marginTopMm: 18,
  marginRightMm: 16,
  marginBottomMm: 18,
  marginLeftMm: 16,
  fontFamily: 'Inter, Arial, sans-serif',
  fontSizePx: 13,
  primaryColor: '#0f172a',
  showLogo: false,
  logoUrl: '',
  logoImageDataUrl: '',
  showPatientInfo: true,
  showSignatures: true,
};

export const normalizeReportLayout = (value: Partial<ReportLayoutConfig> | null | undefined): ReportLayoutConfig => {
  const source = value && typeof value === 'object' ? value : {};
  const numberValue = (key: keyof ReportLayoutConfig, fallback: number) => {
    const next = Number(source[key]);
    return Number.isFinite(next) ? next : fallback;
  };

  return {
    ...DEFAULT_REPORT_LAYOUT,
    ...source,
    paperSize: source.paperSize === 'Letter' ? 'Letter' : 'A4',
    orientation: source.orientation === 'landscape' ? 'landscape' : 'portrait',
    marginTopMm: numberValue('marginTopMm', DEFAULT_REPORT_LAYOUT.marginTopMm),
    marginRightMm: numberValue('marginRightMm', DEFAULT_REPORT_LAYOUT.marginRightMm),
    marginBottomMm: numberValue('marginBottomMm', DEFAULT_REPORT_LAYOUT.marginBottomMm),
    marginLeftMm: numberValue('marginLeftMm', DEFAULT_REPORT_LAYOUT.marginLeftMm),
    fontSizePx: numberValue('fontSizePx', DEFAULT_REPORT_LAYOUT.fontSizePx),
    showLogo: Boolean(source.showLogo),
    showPatientInfo: source.showPatientInfo !== false,
    showSignatures: source.showSignatures !== false,
  };
};

export const escapeHtml = (value: unknown) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');
