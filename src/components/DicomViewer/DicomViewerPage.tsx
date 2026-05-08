import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { ActionIcon, Box, Button, Flex, Group, Loader, Skeleton, Text, Tooltip } from '@mantine/core';
import { showNotification } from '@mantine/notifications';
import { ArrowLeft, FileText, ScanLine, Trash2 } from 'lucide-react';
import cornerstone from 'cornerstone-core';
import { DicomViewer } from './DicomViewer';
import reportWorklistService, { type DicomSeriesSummaryItem } from '../../services/reportWorklistService';
import reportService from '../../services/reportService';
import { resolveApiErrorMessage } from '../../lib/apiError';
import styles from './DicomViewerPage.module.css';

const SERIES_SIDEBAR_WIDTH = 192;

type StudySource = 'archive' | 'dicomweb';

interface SeriesThumbnailProps {
  imageUrl: string;
  active: boolean;
  loading: boolean;
  label: string;
  count: number;
  onClick: () => void;
}

function SeriesThumbnail({ imageUrl, active, loading, label, count, onClick }: SeriesThumbnailProps) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [thumbError, setThumbError] = useState(false);

  useEffect(() => {
    if (!imageUrl) return;
    let cancelled = false;

    const div = document.createElement('div');
    div.style.cssText = 'position:fixed;left:-9999px;top:-9999px;width:120px;height:120px;';
    document.body.appendChild(div);
    cornerstone.enable(div);

    const base = ((import.meta.env.VITE_API_URL as string) ?? '').replace(/\/$/, '');
    const path = imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`;
    const wadoId = imageUrl.startsWith('wadors:') || imageUrl.startsWith('wadouri:')
      ? imageUrl
      : `wadouri:${base}${path}`;

    cornerstone
      .loadAndCacheImage(wadoId)
      .then((image: any) => {
        if (cancelled) return;
        cornerstone.displayImage(div, image);
        requestAnimationFrame(() => {
          if (cancelled) return;
          const canvas = div.querySelector('canvas') as HTMLCanvasElement | null;
          if (canvas) setDataUrl(canvas.toDataURL('image/jpeg', 0.75));
          try { cornerstone.disable(div); } catch { /* no-op */ }
          div.remove();
        });
      })
      .catch(() => {
        if (!cancelled) setThumbError(true);
        try { cornerstone.disable(div); } catch { /* no-op */ }
        div.remove();
      });

    return () => {
      cancelled = true;
      try { cornerstone.disable(div); } catch { /* no-op */ }
      if (div.parentNode) div.remove();
    };
  }, [imageUrl]);

  return (
    <Box
      onClick={onClick}
      className={`${styles.card} ${active ? styles.cardActive : ''}`}
      style={{
        cursor: 'pointer',
        padding: '10px 10px 12px',
        borderRadius: 10,
        border: active ? '2px solid #339af0' : '1px solid rgba(95,123,255,0.15)',
        background: active ? 'rgba(51,154,240,0.12)' : 'rgba(14,20,34,0.9)',
        position: 'relative',
      }}
    >
      {active && (
        <Box
          style={{
            position: 'absolute',
            left: 0,
            top: 12,
            bottom: 12,
            width: 3,
            borderRadius: '0 3px 3px 0',
            background: 'linear-gradient(180deg, #74c0fc, #339af0)',
          }}
        />
      )}

      <Box
        className={styles.thumbnail}
        style={{
          width: '100%',
          aspectRatio: '1',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {dataUrl ? (
          <img src={dataUrl} alt={label} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        ) : thumbError ? (
          <Text size="xs" c="dimmed">-</Text>
        ) : (
          <Loader size="sm" color="gray" />
        )}
      </Box>

      <Box mt={8}>
        <Text size="sm" fw={700} c={active ? 'blue.2' : 'gray.2'} lh={1.3}>
          {label}
        </Text>
        <Text size="xs" c={active ? 'blue.3' : 'dimmed'} lh={1.3}>
          {count} imagens
        </Text>
      </Box>

      {loading && active && (
        <Box
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: 10,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backdropFilter: 'blur(2px)',
          }}
        >
          <Loader size="sm" color="blue" />
        </Box>
      )}
    </Box>
  );
}

interface StudyPaneProps {
  studyKey: string;
  source: StudySource;
  title?: string;
}

function StudyPane({ studyKey, source, title }: StudyPaneProps) {
  const navigate = useNavigate();
  const [seriesList, setSeriesList] = useState<DicomSeriesSummaryItem[]>([]);
  const [activeSeriesUid, setActiveSeriesUid] = useState<string | null>(null);
  const [seriesImageIds, setSeriesImageIds] = useState<string[]>([]);
  const [loadingStudy, setLoadingStudy] = useState(true);
  const [loadingSeries, setLoadingSeries] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);
  const isDicomWebSource = source === 'dicomweb';

  const loadSeries = useCallback(
    async (currentStudyKey: string, seriesUid: string | null) => {
      const requestId = ++requestIdRef.current;
      setLoadingSeries(true);

      try {
        const imageIds = isDicomWebSource
          ? await reportWorklistService.fetchDicomWebSeriesImageIds(currentStudyKey, seriesUid)
          : await reportWorklistService.fetchDicomSeriesImageIds(currentStudyKey, seriesUid);
        if (requestIdRef.current !== requestId) return;
        setSeriesImageIds(imageIds);
        setActiveSeriesUid(seriesUid);
      } finally {
        if (requestIdRef.current === requestId) {
          setLoadingSeries(false);
        }
      }
    },
    [isDicomWebSource],
  );

  useEffect(() => {
    if (!studyKey) return;

    const requestId = ++requestIdRef.current;
    setLoadingStudy(true);
    setLoadingSeries(false);
    setError(null);
    setSeriesList([]);
    setSeriesImageIds([]);
    setActiveSeriesUid(null);

    const summaryPromise = isDicomWebSource
      ? reportWorklistService.fetchDicomWebSeriesSummary(studyKey)
      : reportWorklistService.fetchDicomSeriesSummary(studyKey);

    summaryPromise
      .then(async (summary) => {
        if (requestIdRef.current !== requestId) return;
        setSeriesList(summary);
        setLoadingStudy(false);
        if (!summary.length) return;
        await loadSeries(studyKey, summary[0].seriesUid);
      })
      .catch((err) => {
        if (requestIdRef.current !== requestId) return;
        const message = isDicomWebSource && Number(err?.response?.status || 0) === 401
          ? 'Nao foi possivel autenticar no Orthanc pelo proxy DICOMweb. Reinicie o backend e tente novamente.'
          : resolveApiErrorMessage(err, 'Nao foi possivel carregar o DICOM');
        setError(message);
        setLoadingStudy(false);
      });
  }, [isDicomWebSource, loadSeries, studyKey]);

  const handleSelectSeries = useCallback(
    async (seriesUid: string | null) => {
      if (!studyKey || seriesUid === activeSeriesUid) return;
      setError(null);
      try {
        await loadSeries(studyKey, seriesUid);
      } catch (err: any) {
        setError(resolveApiErrorMessage(err, 'Nao foi possivel carregar a serie'));
      }
    },
    [activeSeriesUid, loadSeries, studyKey],
  );

  return (
    <Box
      style={{
        flex: 1,
        width: '100%',
        height: '100%',
        minWidth: 0,
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#000',
      }}
    >
      {title ? (
        <Box style={{ padding: '8px 12px', borderBottom: '1px solid rgba(44,46,51,0.8)', background: '#101318' }}>
          <Text size="sm" fw={700} c="gray.1">{title}</Text>
        </Box>
      ) : null}
      <Box style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>
        {!loadingStudy && seriesList.length > 0 && (
          <Box
            className={styles.sidebar}
            style={{
              width: SERIES_SIDEBAR_WIDTH,
              flexShrink: 0,
              background: 'linear-gradient(180deg, #090d14 0%, #080b12 100%)',
              borderRight: '1px solid rgba(44, 46, 51, 0.8)',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              padding: '12px 10px 16px',
            }}
          >
            <Box
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 4,
                paddingBottom: 8,
                borderBottom: '1px solid rgba(95,123,255,0.15)',
              }}
            >
              <Text size="xs" c="gray.5" fw={700} style={{ letterSpacing: '1px', textTransform: 'uppercase' }}>
                Series
              </Text>
              <Box
                style={{
                  background: 'rgba(51,154,240,0.18)',
                  border: '1px solid rgba(51,154,240,0.3)',
                  borderRadius: 99,
                  padding: '1px 7px',
                }}
              >
                <Text size="xs" c="blue.3" fw={600}>
                  {seriesList.length}
                </Text>
              </Box>
            </Box>

            {seriesList.map((series, index) => (
              <SeriesThumbnail
                key={series.seriesUid || `series-${index}`}
                imageUrl={series.url}
                active={series.seriesUid === activeSeriesUid}
                loading={loadingSeries}
                label={`Serie ${index + 1}`}
                count={series.instancesCount}
                onClick={() => handleSelectSeries(series.seriesUid)}
              />
            ))}
          </Box>
        )}

        <Box style={{ flex: 1, position: 'relative', overflow: 'hidden', backgroundColor: '#000' }}>
          {loadingStudy ? (
            <Box p="lg">
              <Skeleton height={28} width="30%" radius="sm" mb="md" />
              <Skeleton height="calc(100vh - 210px)" radius="md" />
            </Box>
          ) : error ? (
            <Flex h="100%" align="center" justify="center" direction="column" gap="md">
              <Text c="red" size="lg" ta="center">
                {error}
              </Text>
              <Button variant="outline" color="gray" onClick={() => navigate('/laudo-exames')}>
                Voltar
              </Button>
            </Flex>
          ) : seriesList.length === 0 ? (
            <Flex h="100%" align="center" justify="center" direction="column" gap="md">
              <Text c="dimmed" size="lg">
                Nenhum DICOM encontrado para este exame.
              </Text>
              <Button variant="outline" color="gray" onClick={() => navigate('/laudo-exames')}>
                Voltar
              </Button>
            </Flex>
          ) : loadingSeries || seriesImageIds.length === 0 ? (
            <Flex h="100%" align="center" justify="center" direction="column" gap="md">
              <Loader size="lg" color="blue" />
              <Text c="dimmed" size="sm">
                Carregando imagens da série...
              </Text>
            </Flex>
          ) : (
            <DicomViewer
              key={`${source}:${studyKey}:${activeSeriesUid || 'no-series'}:${seriesImageIds.length}`}
              style={{ height: '100%', width: '100%' }}
              initialImageIds={seriesImageIds}
            />
          )}
        </Box>
      </Box>
    </Box>
  );
}

export function DicomViewerPage() {
  const { key } = useParams<{ key: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const returnTo = searchParams.get('returnTo');
  const reportItemId = searchParams.get('itemId') || key || '';
  const isDicomWebSource = searchParams.get('source') === 'dicomweb';
  const isCompareMode = searchParams.get('compare') === '1';
  const currentKey = searchParams.get('currentKey') || '';
  const temporaryStudyId = searchParams.get('tempStudyId') || '';
  const reportId = searchParams.get('reportId') || '';
  const [removingTemporaryStudy, setRemovingTemporaryStudy] = useState(false);

  const handleRemoveTemporaryStudy = async () => {
    if (!reportId || !temporaryStudyId) return;
    setRemovingTemporaryStudy(true);
    try {
      await reportService.deleteTemporaryPriorStudy(reportId, temporaryStudyId);
      showNotification({
        title: 'Exame temporario removido',
        message: 'O estudo anterior foi removido do visualizador temporario.',
        color: 'green',
      });
      navigate(returnTo || '/laudo-exames');
    } catch (err: any) {
      showNotification({
        title: 'Erro ao remover exame temporario',
        message: resolveApiErrorMessage(err, 'Nao foi possivel remover o estudo temporario.'),
        color: 'red',
      });
    } finally {
      setRemovingTemporaryStudy(false);
    }
  };

  const source: StudySource = isDicomWebSource ? 'dicomweb' : 'archive';

  return (
    <Box style={{ height: '100vh', width: '100vw', display: 'flex', flexDirection: 'column', backgroundColor: '#000' }}>
      <Box
        style={{
          padding: '12px 24px',
          backgroundColor: '#1A1B1E',
          borderBottom: '1px solid #2C2E33',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}
      >
        <Group>
          <Tooltip label="Voltar para a lista">
            <ActionIcon variant="light" color="gray" size="lg" onClick={() => navigate(returnTo || '/laudo-exames')}>
              <ArrowLeft size={20} />
            </ActionIcon>
          </Tooltip>
          <Group gap={8} ml="md">
            <ScanLine size={24} color="#0ab5ff" />
            <Box>
              <Text size="sm" c="white" fw={600} lh={1.2}>
                Visualizador Diagnostico
              </Text>
              <Text size="xs" c="dimmed" lh={1.2}>
                {isCompareMode ? 'Comparacao' : isDicomWebSource ? 'Estudo temporario' : 'Exame ID'}: {key}
              </Text>
            </Box>
          </Group>
        </Group>

        <Group>
          {isDicomWebSource && temporaryStudyId && reportId ? (
            <Button
              variant="light"
              color="red"
              leftSection={<Trash2 size={16} />}
              loading={removingTemporaryStudy}
              onClick={handleRemoveTemporaryStudy}
            >
              Remover temporário
            </Button>
          ) : null}
          <Button
            variant="filled"
            color="blue"
            leftSection={<FileText size={16} />}
            onClick={() =>
              navigate(`/laudo-exames?itemId=${encodeURIComponent(reportItemId)}&returnTo=${encodeURIComponent(location.pathname)}`)
            }
            radius="md"
          >
            Abrir Laudo
          </Button>
        </Group>
      </Box>

      <Box style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>
        {isCompareMode && currentKey ? (
          <>
            <Box style={{ flex: 1, minWidth: 0, borderRight: '1px solid #2C2E33' }}>
              <StudyPane studyKey={currentKey} source="archive" title="Exame atual" />
            </Box>
            <Box style={{ flex: 1, minWidth: 0 }}>
              <StudyPane studyKey={key || ''} source={source} title="Exame anterior" />
            </Box>
          </>
        ) : (
          <StudyPane studyKey={key || ''} source={source} />
        )}
      </Box>
    </Box>
  );
}
