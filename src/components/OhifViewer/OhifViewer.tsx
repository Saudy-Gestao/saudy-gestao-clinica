import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import reportWorklistService from '../../services/reportWorklistService';

// Reuse the same backend origin already configured via VITE_API_URL.
// In dev VITE_API_URL is empty → '/dicom-web' goes through the Vite proxy.
// In production VITE_API_URL='https://saudy-backend.onrender.com' → absolute URL.
const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
const DICOMWEB_URL = import.meta.env.VITE_DICOMWEB_URL || (API_BASE ? `${API_BASE}/dicom-web` : '/dicom-web');

console.log('[OhifViewer] import.meta.env.VITE_API_URL', import.meta.env.VITE_API_URL);
console.log('[OhifViewer] import.meta.env.VITE_DICOMWEB_URL', import.meta.env.VITE_DICOMWEB_URL);
console.log('[OhifViewer] API_BASE', API_BASE);
console.log('[OhifViewer] resolved DICOMWEB_URL', DICOMWEB_URL);

export function OhifViewer() {
  const { key } = useParams<{ key: string }>();
  const [statusMessage, setStatusMessage] = useState('Preparando visualizador...');
  const [error, setError] = useState<string | null>(null);
  const [studyUid, setStudyUid] = useState<string | null>(null);

  const src = useMemo(() => {
    const study = encodeURIComponent(studyUid || key || '');
    const server = encodeURIComponent(DICOMWEB_URL);

    // Self-hosted OHIF within this app (uses /ohif/index.html).
    // The OHIF build is shipped under public/ohif/ and uses query string + hash routing.
    return `/ohif/index.html?dicomWebUrl=${server}&studyUID=${study}`;
  }, [key, studyUid]);

  useEffect(() => {
    let cancelled = false;

    const prepareAndRedirect = async () => {
      if (!key) {
        if (!cancelled) setError('Exame inválido para abertura no OHIF.');
        return;
      }

      try {
        if (!cancelled) setStatusMessage('Verificando cache DICOM no Orthanc...');
        const result = await reportWorklistService.ensureOrthancStudy(key);

        if (cancelled) return;

        setStudyUid(result.studyInstanceUid);

        if (result.status === 'cache_miss_rehydrated') {
          setStatusMessage('Exame restaurado do arquivo em nuvem. Abrindo OHIF...');
        } else {
          setStatusMessage('Cache pronto. Abrindo OHIF...');
        }

        const study = encodeURIComponent(result.studyInstanceUid || key);
        const server = encodeURIComponent(DICOMWEB_URL);
        window.location.assign(`/ohif/index.html?dicomWebUrl=${server}&studyUID=${study}`);
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.response?.data?.error || err?.response?.data?.details || err?.message || 'Falha ao preparar exame no Orthanc.');
        }
      }
    };

    prepareAndRedirect();

    return () => {
      cancelled = true;
    };
  }, [key, src]);

  return (
    <div style={{ padding: 24 }}>
      <p>{error || statusMessage}</p>
      <a href={src} target="_self" rel="noreferrer">
        Abrir OHIF agora
      </a>
    </div>
  );
}
