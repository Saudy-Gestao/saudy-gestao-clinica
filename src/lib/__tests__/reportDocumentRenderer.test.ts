import { describe, expect, it } from 'vitest';
import { buildReportDocumentHtml } from '../reportDocumentRenderer';

const basePatient = { name: 'Ana Silva', exam: 'Raio-X', cpf: '123.456.789-00', insurance: 'Unimed', dateLabel: '01/01/2024' };

describe('buildReportDocumentHtml', () => {
  it('renders a print document with default layout', () => {
    const html = buildReportDocumentHtml({
      layout: null,
      reportId: 'r1',
      contentHtml: '<p>Conteudo</p>',
      patient: basePatient,
    });
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('Ana Silva');
    expect(html).toContain('Conteudo');
  });

  it('renders a preview document in dark mode with Letter landscape layout', () => {
    const html = buildReportDocumentHtml({
      mode: 'preview',
      isDark: true,
      layout: { paperSize: 'Letter', orientation: 'landscape', showLogo: true, logoUrl: 'https://x/logo.png' },
      reportId: 'r2',
      contentHtml: '<p>Conteudo</p>',
      patient: basePatient,
      signatures: {
        show: true,
        requiresReviewer: true,
        issuerName: 'Dr. João',
        issuerSignedAt: '2024-01-01',
      },
      notice: { show: true, title: 'Aviso', text: 'Texto', versionLabel: 'v2' },
    });
    expect(html).toContain('color-scheme: dark');
    expect(html).toContain('279mm');
    expect(html).toContain('Dr. João');
    expect(html).toContain('Aviso');
  });

  it('omits patient info, notice and signatures when disabled', () => {
    const html = buildReportDocumentHtml({
      layout: { showPatientInfo: false },
      reportId: 'r3',
      contentHtml: '<p>Conteudo</p>',
      patient: basePatient,
      signatures: { show: false },
      notice: { show: false },
    });
    expect(html).not.toContain('class="meta"');
    expect(html).not.toContain('class="notice"');
    expect(html).not.toContain('class="signatures"');
  });

  it('handles pending signatures without requiring a reviewer', () => {
    const html = buildReportDocumentHtml({
      layout: null,
      reportId: 'r4',
      contentHtml: '<p>Conteudo</p>',
      patient: basePatient,
      signatures: { show: true, requiresReviewer: false },
    });
    expect(html).toContain('Nao obrigatorio');
    expect(html).toContain('Pendente');
  });

  it('renders a preview document in light mode with A4 portrait and footer', () => {
    const html = buildReportDocumentHtml({
      mode: 'preview',
      isDark: false,
      layout: {
        paperSize: 'A4',
        orientation: 'portrait',
        footerText: 'Rodape do laudo',
        subtitle: 'Subtitulo',
        headerText: 'Texto de cabecalho',
        logoImageDataUrl: 'data:image/png;base64,xyz',
        logoUrl: 'https://x/should-be-ignored.png',
        showLogo: true,
      },
      reportId: 'r5',
      contentHtml: '<p>Conteudo</p>',
      patient: { name: 'Bruno', exam: 'Tomografia' },
    });
    expect(html).toContain('color-scheme: light');
    expect(html).toContain('210mm');
    expect(html).toContain('Rodape do laudo');
    expect(html).toContain('Subtitulo');
    expect(html).toContain('Texto de cabecalho');
    expect(html).toContain('data:image/png;base64,xyz');
    expect(html).toContain('Nao informado');
  });

  it('renders both signatures fully signed with default titles and no notice version label', () => {
    const html = buildReportDocumentHtml({
      layout: null,
      reportId: 'r6',
      contentHtml: '<p>Conteudo</p>',
      patient: basePatient,
      signatures: {
        show: true,
        requiresReviewer: true,
        issuerSignedAt: '2024-01-01',
        reviewerName: 'Dra. Maria',
        reviewerSignedAt: '2024-01-02',
      },
      notice: { show: true },
    });
    expect(html).toContain('Emissor nao identificado');
    expect(html).toContain('Dra. Maria');
    expect(html).toContain('Assinado');
    expect(html).toContain('Laudo em revisao pela clinica');
  });
});
