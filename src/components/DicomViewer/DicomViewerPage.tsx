import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Box, Button, Group, Loader, Text, Flex, Tooltip, ActionIcon } from '@mantine/core';
import { ArrowLeft, FileText, ScanLine, Layers } from 'lucide-react';
import { DicomViewer } from './DicomViewer';
import reportWorklistService from '../../services/reportWorklistService';

export function DicomViewerPage() {
  const { key } = useParams<{ key: string }>();
  const navigate = useNavigate();
  const [series, setSeries] = useState<ArrayBuffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!key) return;

    setLoading(true);
    setError(null);

    reportWorklistService
      .fetchDicomSeries(key)
      .then((buffers) => setSeries(buffers))
      .catch((err) => {
        setError(err?.response?.data?.message || err?.message || 'Não foi possível carregar o DICOM');
      })
      .finally(() => setLoading(false));
  }, [key]);

  return (
    <Box style={{ height: '100vh', width: '100vw', display: 'flex', flexDirection: 'column', backgroundColor: '#000' }}>
      {/* Top Bar / Header */}
      <Box style={{ 
        padding: '12px 24px', 
        backgroundColor: '#1A1B1E', 
        borderBottom: '1px solid #2C2E33',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <Group>
          <Tooltip label="Voltar para a lista">
            <ActionIcon variant="light" color="gray" size="lg" onClick={() => navigate('/laudo-exames')}>
              <ArrowLeft size={20} />
            </ActionIcon>
          </Tooltip>
          <Group gap={8} ml="md">
            <ScanLine size={24} color="#0ab5ff" />
            <Box>
              <Text size="sm" c="white" fw={600} lh={1.2}>Visualizador Diagnóstico</Text>
              <Text size="xs" c="dimmed" lh={1.2}>Exame ID: {key}</Text>
            </Box>
          </Group>
        </Group>

        <Group>
          <Button
            variant="outline"
            color="gray"
            leftSection={<Layers size={16} />}
            onClick={() => navigate(`/ohif/${encodeURIComponent(key || '')}`)}
            radius="md"
          >
            Abrir OHIF
          </Button>
          <Button
            variant="filled"
            color="blue"
            leftSection={<FileText size={16} />}
            onClick={() => navigate(`/laudo-exames?itemId=${encodeURIComponent(key || '')}`)}
            radius="md"
          >
            Abrir Laudo
          </Button>
        </Group>
      </Box>

      {/* Main Viewer Area */}
      <Box style={{ flex: 1, position: 'relative', overflow: 'hidden', backgroundColor: '#000' }}>
        {loading ? (
          <Flex h="100%" align="center" justify="center" direction="column" gap="md">
            <Loader color="blue" size="lg" />
            <Text c="dimmed">Carregando imagens do exame...</Text>
          </Flex>
        ) : error ? (
          <Flex h="100%" align="center" justify="center" direction="column" gap="md">
            <Text c="red" size="lg">{error}</Text>
            <Button variant="outline" color="gray" onClick={() => navigate('/laudo-exames')}>Voltar</Button>
          </Flex>
        ) : series.length === 0 ? (
          <Flex h="100%" align="center" justify="center" direction="column" gap="md">
            <Text c="dimmed" size="lg">Nenhum DICOM encontrado para este exame.</Text>
            <Button variant="outline" color="gray" onClick={() => navigate('/laudo-exames')}>Voltar</Button>
          </Flex>
        ) : (
          <DicomViewer style={{ height: '100%', width: '100%' }} initialSeries={series} />
        )}
      </Box>
    </Box>
  );
}
