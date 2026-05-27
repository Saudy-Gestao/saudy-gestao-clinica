import { escapeHtml, normalizeReportLayout } from './reportLayout';
import type { ReportLayoutConfig } from '../services/reportConfigService';

type RenderMode = 'preview' | 'print';

type ReportDocumentParams = {
  mode?: RenderMode;
  isDark?: boolean;
  layout: Partial<ReportLayoutConfig> | null | undefined;
  reportId: string;
  contentHtml: string;
  patient: {
    name: string;
    exam: string;
    cpf?: string | null;
    insurance?: string | null;
    dateLabel?: string | null;
  };
  signatures?: {
    show: boolean;
    requiresReviewer?: boolean;
    issuerName?: string | null;
    issuerSignedAt?: string | null;
    reviewerName?: string | null;
    reviewerSignedAt?: string | null;
  };
  notice?: {
    show: boolean;
    title?: string | null;
    text?: string | null;
    versionLabel?: string | null;
  };
};

export function buildReportDocumentHtml(params: ReportDocumentParams): string {
  const mode = params.mode || 'print';
  const isDark = Boolean(params.isDark);
  const layout = normalizeReportLayout(params.layout || null);
  const pageBg = mode === 'preview' ? (isDark ? '#0f172a' : '#f8fafc') : '#ffffff';
  const border = mode === 'preview' ? (isDark ? '#334155' : '#e2e8f0') : '#e2e8f0';
  const paperWidth = layout.paperSize === 'Letter'
    ? (layout.orientation === 'landscape' ? '279mm' : '216mm')
    : (layout.orientation === 'landscape' ? '297mm' : '210mm');
  const paperHeight = layout.paperSize === 'Letter'
    ? (layout.orientation === 'landscape' ? '216mm' : '279mm')
    : (layout.orientation === 'landscape' ? '210mm' : '297mm');
  const logoSrc = layout.logoImageDataUrl || layout.logoUrl;
  const footer = String(layout.footerText || '').trim();
  const sig = params.signatures;
  const notice = params.notice;
  const issuerSigned = Boolean(sig?.issuerSignedAt);
  const reviewerSigned = Boolean(sig?.reviewerSignedAt);
  const requiresReviewer = sig?.requiresReviewer !== false;

  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Laudo ${escapeHtml(params.reportId)}</title>
  <style>
    :root { color-scheme: ${mode === 'preview' && isDark ? 'dark' : 'light'}; }
    html, body { margin: 0; padding: 0; background: ${pageBg}; color: #0f172a; }
    body { font-family: ${layout.fontFamily}; font-size: ${layout.fontSizePx}px; line-height: 1.42; }
    .sheet { width: ${paperWidth}; min-height: ${paperHeight}; box-sizing: border-box; margin: ${mode === 'preview' ? '18px auto' : '0 auto'}; padding: ${layout.marginTopMm}mm ${layout.marginRightMm}mm ${layout.marginBottomMm}mm ${layout.marginLeftMm}mm; border-radius: ${mode === 'preview' ? '8px' : '0'}; border: ${mode === 'preview' ? `1px solid ${border}` : 'none'}; background: #fff; }
    .header { border-bottom: 2px solid ${layout.primaryColor || '#0f172a'}; padding: 4px 0 14px; margin-bottom: 16px; display: grid; grid-template-columns: auto 1fr; gap: 18px; align-items: center; }
    .logo-wrap { width: 164px; height: 96px; display: flex; align-items: center; justify-content: center; border: 1px solid #d6e0ee; border-radius: 12px; background: linear-gradient(180deg, #ffffff 0%, #f7fbff 100%); box-shadow: inset 0 0 0 1px #eef4fb; padding: 6px; box-sizing: border-box; }
    .logo { width: 100%; height: 100%; object-fit: cover; border-radius: 8px; }
    .clinic { font-size: 10px; color: #475569; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 3px; }
    h1 { font-size: 22px; line-height: 1.12; margin: 0 0 4px; color: ${layout.primaryColor || '#0f172a'}; font-weight: 700; }
    .subtitle, .header-text, .footer-note { font-size: 12px; color: #475569; }
    .subtitle { font-weight: 600; color: #334155; margin-bottom: 1px; }
    .header-text { font-size: 11px; }
    .meta { margin-bottom: 16px; padding: 9px 11px; border: 1px solid #dbe3ee; border-radius: 6px; background: #f8fafc; display: grid; grid-template-columns: 1fr 1fr; gap: 5px 16px; }
    .meta-item { font-size: 12px; color: #1f2937; }
    .meta-item b { color: #0b1324; font-weight: 700; }
    .content { color: #0f172a; font-size: 13px; }
    .content h1, .content h2, .content h3, .content h4 { margin: 14px 0 6px; color: #0b1324; font-size: 16px; line-height: 1.25; font-weight: 800; }
    .content p { margin: 0 0 8px; }
    .content ul, .content ol { margin: 4px 0 10px 22px; }
    .content li { margin: 2px 0; }
    .notice { margin-bottom: 14px; border: 1px solid #f59e0b; background: #fffbeb; color: #7c2d12; border-radius: 8px; padding: 10px 12px; }
    .notice-title { font-weight: 800; font-size: 12px; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.04em; }
    .notice-text { font-size: 12px; line-height: 1.35; }
    .notice-version { margin-top: 4px; font-size: 11px; color: #92400e; font-weight: 700; }
    .signatures { margin-top: 26px; border-top: 1px solid #cbd5e1; padding-top: 10px; display: grid; grid-template-columns: 1fr 1fr; gap: 12px; font-size: 12px; color: #475569; }
    .sign-card { border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px 10px; background: #fafcff; }
    .sign-title { font-weight: 700; color: #334155; margin-bottom: 2px; }
    .sign-person { color: #0b1324; font-weight: 700; margin-bottom: 3px; }
    .sign-status { display: inline-flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 700; }
    .sign-dot { width: 18px; height: 18px; border-radius: 999px; display: inline-flex; align-items: center; justify-content: center; font-size: 12px; line-height: 1; color: #fff; }
    .sign-dot-ok { background: #16a34a; }
    .sign-dot-pending { background: #94a3b8; }
    .sign-time { margin-top: 2px; font-size: 11px; color: #475569; }
    .footer { margin-top: 20px; padding-top: 10px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #475569; }
    .footer-extra { margin-top: 2px; font-size: 11px; color: #475569; }
    @media print { :root { color-scheme: light; } @page { size: ${layout.paperSize} ${layout.orientation}; margin: 0; } html, body { background: #fff !important; color: #111 !important; } .sheet { width: auto; min-height: auto; margin: 0; border: none; border-radius: 0; background: #fff !important; } h1, .meta, .signatures, .footer, .subtitle, .header-text { color: #111 !important; } }
  </style></head><body><div class="sheet">
    <div class="header"><div class="logo-wrap">${layout.showLogo && logoSrc ? `<img class="logo" src="${escapeHtml(logoSrc)}" alt="Logo" />` : ''}</div><div><div class="clinic">${escapeHtml(layout.clinicName)}</div><h1>${escapeHtml(layout.title || 'Laudo Medico')}</h1>${layout.subtitle ? `<div class="subtitle">${escapeHtml(layout.subtitle)}</div>` : ''}${layout.headerText ? `<div class="header-text">${escapeHtml(layout.headerText)}</div>` : ''}</div></div>
    ${layout.showPatientInfo ? `<div class="meta"><div class="meta-item"><b>Paciente:</b> ${escapeHtml(params.patient.name)}</div><div class="meta-item"><b>Exame:</b> ${escapeHtml(params.patient.exam)}</div><div class="meta-item"><b>CPF:</b> ${escapeHtml(params.patient.cpf || 'Nao informado')}</div><div class="meta-item"><b>Convenio/Data:</b> ${escapeHtml(params.patient.insurance || params.patient.dateLabel || 'Nao informado')}</div></div>` : ''}
    ${notice?.show ? `<div class="notice"><div class="notice-title">${escapeHtml(notice.title || 'Laudo em revisao pela clinica')}</div><div class="notice-text">${escapeHtml(notice.text || 'Voce esta visualizando a ultima versao publicada enquanto uma atualizacao esta em andamento.')}</div>${notice.versionLabel ? `<div class="notice-version">${escapeHtml(notice.versionLabel)}</div>` : ''}</div>` : ''}
    <div class="content">${params.contentHtml}</div>
    ${sig?.show ? `<div class="signatures"><div class="sign-card"><div class="sign-title">Emissor</div><div class="sign-person">${escapeHtml(sig.issuerName || 'Emissor nao identificado')}</div><div class="sign-status"><span class="sign-dot ${issuerSigned ? 'sign-dot-ok' : 'sign-dot-pending'}">${issuerSigned ? '&#10003;' : '...'}</span><span>${issuerSigned ? 'Assinado' : 'Pendente'}</span></div><div class="sign-time">${escapeHtml(sig.issuerSignedAt || 'Pendente')}</div></div><div class="sign-card"><div class="sign-title">Revisor</div><div class="sign-person">${escapeHtml(sig.reviewerName || (requiresReviewer ? 'Revisor nao identificado' : 'Revisor nao obrigatorio'))}</div><div class="sign-status"><span class="sign-dot ${reviewerSigned ? 'sign-dot-ok' : 'sign-dot-pending'}">${reviewerSigned ? '&#10003;' : '...'}</span><span>${requiresReviewer ? (reviewerSigned ? 'Assinado' : 'Pendente') : 'Nao obrigatorio'}</span></div><div class="sign-time">${escapeHtml(sig.reviewerSignedAt || (requiresReviewer ? 'Pendente' : 'Nao obrigatorio'))}</div></div></div>` : ''}
    <div class="footer">${footer ? `<div class="footer-extra">${escapeHtml(footer)}</div>` : ''}</div>
  </div></body></html>`;
}
