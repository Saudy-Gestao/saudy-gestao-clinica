import { describe, expect, it } from 'vitest';
import { DEFAULT_REPORT_LAYOUT, escapeHtml, normalizeReportLayout } from '../reportLayout';

describe('reportLayout utilities', () => {
  it('returns defaults for empty input', () => {
    expect(normalizeReportLayout(null)).toEqual(DEFAULT_REPORT_LAYOUT);
    expect(normalizeReportLayout(undefined)).toEqual(DEFAULT_REPORT_LAYOUT);
  });

  it('normalizes enum, number and boolean values', () => {
    expect(normalizeReportLayout({
      clinicName: 'Clinica Norte',
      paperSize: 'Letter',
      orientation: 'landscape',
      marginTopMm: '24' as any,
      marginRightMm: 'invalid' as any,
      fontSizePx: 16,
      showLogo: 1 as any,
      showPatientInfo: false,
      showSignatures: false,
    })).toEqual(expect.objectContaining({
      clinicName: 'Clinica Norte',
      paperSize: 'Letter',
      orientation: 'landscape',
      marginTopMm: 24,
      marginRightMm: DEFAULT_REPORT_LAYOUT.marginRightMm,
      fontSizePx: 16,
      showLogo: true,
      showPatientInfo: false,
      showSignatures: false,
    }));
  });

  it('falls back invalid layout variants to supported values', () => {
    expect(normalizeReportLayout({
      paperSize: 'A3' as any,
      orientation: 'sideways' as any,
      showLogo: false,
    })).toEqual(expect.objectContaining({
      paperSize: 'A4',
      orientation: 'portrait',
      showLogo: false,
      showPatientInfo: true,
      showSignatures: true,
    }));
  });

  it('escapes HTML special characters and nullable values', () => {
    expect(escapeHtml(`Tom & "Ana" <tag>'`)).toBe('Tom &amp; &quot;Ana&quot; &lt;tag&gt;&#39;');
    expect(escapeHtml(null)).toBe('');
    expect(escapeHtml(undefined)).toBe('');
  });
});
