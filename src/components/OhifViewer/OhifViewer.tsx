import { useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';

// Change this to your Orthanc/DICOMweb base URL (must support WADO/QIDO)
const DEFAULT_DICOMWEB_URL = import.meta.env.VITE_DICOMWEB_URL || 'http://localhost:8042';

export function OhifViewer() {
  const { key } = useParams<{ key: string }>();

  const src = useMemo(() => {
    const study = encodeURIComponent(key || '');
    const server = encodeURIComponent(DEFAULT_DICOMWEB_URL);

    // OHIF viewer hosted demo; it accepts `server` and `studyUID` query params.
    // If you run your own OHIF build, point to it instead.
    return `https://viewer.ohif.org/?server=${server}&studyUID=${study}`;
  }, [key]);

  useEffect(() => {
    // viewer.ohif.org blocks iframe embedding via X-Frame-Options=deny,
    // so we must navigate at top-level.
    window.location.assign(src);
  }, [src]);

  return (
    <div style={{ padding: 24 }}>
      <p>Redirecionando para o OHIF Viewer...</p>
      <a href={src} target="_self" rel="noreferrer">Abrir OHIF agora</a>
    </div>
  );
}
