import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ActionIcon, Box, Button, Group, Loader, Stack, Text } from '@mantine/core';
import { showNotification } from '@mantine/notifications';
import { ArrowLeft } from 'lucide-react';
import patientPortalService from '../../services/patientPortalService';
import { DicomViewer } from '../DicomViewer/DicomViewer';
import { SeriesThumbnail } from '../DicomViewer/SeriesThumbnail';

type SeriesItem = {
  seriesUid: string | null;
  instancesCount: number;
};

const apiBase = String((import.meta.env.VITE_API_URL as string) || '').replace(/\/$/, '');

export function PatientPortalDicomViewer() {
  const { reportId } = useParams<{ reportId: string }>();
  const navigate = useNavigate();
  const [loadingSeries, setLoadingSeries] = useState(true);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [series, setSeries] = useState<SeriesItem[]>([]);
  const [seriesPreviewByUid, setSeriesPreviewByUid] = useState<Record<string, string>>({});
  const [activeSeriesUid, setActiveSeriesUid] = useState<string | null>(null);
  const [imageIds, setImageIds] = useState<string[]>([]);

  const title = useMemo(() => {
    if (!series.length) return 'Visualizador de imagens';
    const index = series.findIndex((item) => item.seriesUid === activeSeriesUid);
    return `Série ${index >= 0 ? index + 1 : 1} de ${series.length}`;
  }, [series, activeSeriesUid]);

  const loadSeriesFiles = async (nextSeriesUid: string | null) => {
    if (!reportId) return;
    setLoadingFiles(true);
    try {
      const response = await patientPortalService.getReportDicomFiles(reportId, nextSeriesUid ?? undefined);
      const ids = (response.files || []).map((file) => `wadouri:${apiBase}/auth/patient-portal/me/reports/${reportId}/dicom/images/${file.id}`);
      setImageIds(ids);
      setActiveSeriesUid(nextSeriesUid);
    } finally {
      setLoadingFiles(false);
    }
  };

  useEffect(() => {
    if (!reportId) return;
    const load = async () => {
      setLoadingSeries(true);
      try {
        const data = await patientPortalService.getReportDicomSeries(reportId);
        const list = data.series || [];
        setSeries(list);
        const previews: Record<string, string> = {};
        for (const item of list) {
          const filesRes = await patientPortalService.getReportDicomFiles(reportId, item.seriesUid ?? undefined);
          const firstId = filesRes?.files?.[0]?.id;
          const key = item.seriesUid ?? '__NO_SERIES__';
          if (firstId) previews[key] = `wadouri:${apiBase}/auth/patient-portal/me/reports/${reportId}/dicom/images/${firstId}`;
        }
        setSeriesPreviewByUid(previews);
        if (!list.length) {
          showNotification({ title: 'Sem imagens', message: 'Nenhuma imagem DICOM disponível para este laudo.', color: 'yellow' });
          navigate('/portal');
          return;
        }
        await loadSeriesFiles(list[0].seriesUid ?? null);
      } catch (err: any) {
        showNotification({
          title: 'Erro ao abrir imagens',
          message: err?.response?.data?.error || err?.message || 'Não foi possível abrir as imagens deste laudo.',
          color: 'red',
        });
        navigate('/portal');
      } finally {
        setLoadingSeries(false);
      }
    };
    void load();
  }, [reportId]);

  return (
    <Box style={{ height: '100vh', width: '100vw', display: 'flex', flexDirection: 'column', backgroundColor: '#000' }}>
      <Box
        style={{
          padding: '12px 20px',
          backgroundColor: '#121826',
          borderBottom: '1px solid rgba(148, 163, 184, 0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Group gap="sm">
          <ActionIcon variant="light" color="gray" size="lg" onClick={() => navigate('/portal')}>
            <ArrowLeft size={18} />
          </ActionIcon>
          <Stack gap={0}>
            <Text c="white" fw={700}>Visualizador de imagens</Text>
            <Text size="xs" c="dimmed">{title}</Text>
          </Stack>
        </Group>
        <Button variant="light" onClick={() => navigate('/portal')}>
          Voltar ao portal
        </Button>
      </Box>

      <Box style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        <Box
          style={{
            width: 210,
            flexShrink: 0,
            borderRight: '1px solid rgba(148, 163, 184, 0.2)',
            padding: 12,
            overflowY: 'auto',
            background: '#0b1220',
          }}
        >
          <Stack gap={8}>
            {series.map((item, index) => {
              const active = item.seriesUid === activeSeriesUid;
              const previewImage = seriesPreviewByUid[item.seriesUid ?? '__NO_SERIES__'] || '';
              return (
                <SeriesThumbnail
                  key={item.seriesUid || `series-${index}`}
                  imageUrl={previewImage}
                  onClick={() => void loadSeriesFiles(item.seriesUid ?? null)}
                  disabled={loadingSeries || loadingFiles}
                  active={active}
                  label={`Série ${index + 1}`}
                  count={item.instancesCount}
                />
              );
            })}
          </Stack>
        </Box>

        <Box style={{ flex: 1, minWidth: 0, minHeight: 0, position: 'relative' }}>
          {loadingSeries || loadingFiles ? (
            <Box style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Stack align="center" gap="xs">
                <Loader color="blue" />
                <Text size="sm" c="dimmed">Carregando imagens...</Text>
              </Stack>
            </Box>
          ) : (
            <DicomViewer initialImageIds={imageIds} style={{ width: '100%', height: '100%' }} />
          )}
        </Box>
      </Box>
    </Box>
  );
}
