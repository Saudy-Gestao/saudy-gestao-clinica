import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Stack, Text, Button, Progress, Group } from '@mantine/core';
import { ArrowLeft, FileDown, ScanLine } from 'lucide-react';
import { showNotification } from '@mantine/notifications';
import { jsPDF } from 'jspdf';
import patientPortalService from '../../services/patientPortalService';
import { parseDicomFile, buildDisplayPixels } from '../DicomViewer/dicomUtils';

type Phase = 'idle' | 'fetching-series' | 'downloading' | 'rendering' | 'done' | 'error';

function dicomBufferToDataUrl(buffer: ArrayBuffer): string | null {
  try {
    const image = parseDicomFile(buffer);
    const { rows, columns } = image.metadata;
    if (!rows || !columns) return null;

    const ww = image.maxPixelValue - image.minPixelValue || 1;
    const wc = image.minPixelValue + ww / 2;
    const pixels = buildDisplayPixels(image, wc, ww, false);
    // Ensure an ArrayBuffer-backed view to satisfy ImageData typing across runtimes.
    const imageBuffer = pixels.buffer.slice(pixels.byteOffset, pixels.byteOffset + pixels.byteLength) as ArrayBuffer;
    const imagePixels = new Uint8ClampedArray(imageBuffer);

    const canvas = document.createElement('canvas');
    canvas.width = columns;
    canvas.height = rows;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.putImageData(new ImageData(imagePixels, columns, rows), 0, 0);
    return canvas.toDataURL('image/jpeg', 0.92);
  } catch {
    return null;
  }
}

export function PatientPortalDicomViewer() {
  const { reportId } = useParams<{ reportId: string }>();
  const navigate = useNavigate();

  const [phase, setPhase] = useState<Phase>('idle');
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState('');

  useEffect(() => {
    if (!reportId) return;
    void generatePdf(reportId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportId]);

  async function generatePdf(id: string) {
    try {
      setPhase('fetching-series');
      setProgressLabel('Buscando séries de imagens...');
      setProgress(5);

      const seriesData = await patientPortalService.getReportDicomSeries(id);
      if (!seriesData.series.length) {
        showNotification({ title: 'Sem imagens', message: 'Nenhuma imagem DICOM disponível para este laudo.', color: 'yellow' });
        navigate('/portal');
        return;
      }

      // collect all file IDs across series
      setPhase('downloading');
      setProgressLabel('Carregando lista de arquivos...');
      setProgress(10);

      const allFileIds: string[] = [];
      for (const serie of seriesData.series) {
        const { files } = await patientPortalService.getReportDicomFiles(id, serie.seriesUid ?? undefined);
        allFileIds.push(...files.map((f) => f.id));
      }

      if (!allFileIds.length) {
        showNotification({ title: 'Sem arquivos', message: 'Não foram encontrados arquivos de imagem.', color: 'yellow' });
        navigate('/portal');
        return;
      }

      // download buffers
      const buffers: ArrayBuffer[] = [];
      for (let i = 0; i < allFileIds.length; i++) {
        setProgressLabel(`Baixando imagem ${i + 1} de ${allFileIds.length}...`);
        setProgress(10 + Math.round(((i + 1) / allFileIds.length) * 50));
        const buf = await patientPortalService.downloadDicomFile(id, allFileIds[i]);
        buffers.push(buf);
      }

      // render to data URLs
      setPhase('rendering');
      setProgressLabel('Gerando PDF...');
      setProgress(62);

      const dataUrls: string[] = [];
      for (let i = 0; i < buffers.length; i++) {
        setProgress(62 + Math.round(((i + 1) / buffers.length) * 33));
        const url = dicomBufferToDataUrl(buffers[i]);
        if (url) dataUrls.push(url);
      }

      if (!dataUrls.length) {
        showNotification({ title: 'Erro', message: 'Não foi possível processar as imagens DICOM.', color: 'red' });
        setPhase('error');
        return;
      }

      // build PDF
      setProgressLabel('Finalizando PDF...');
      setProgress(96);

      // detect dimensions from first image
      const firstImg = new Image();
      await new Promise<void>((res) => { firstImg.onload = () => res(); firstImg.src = dataUrls[0]; });
      const imgW = firstImg.naturalWidth;
      const imgH = firstImg.naturalHeight;
      const orientation = imgW >= imgH ? 'landscape' : 'portrait';

      const pdf = new jsPDF({ orientation, unit: 'px', format: [imgW, imgH] });

      for (let i = 0; i < dataUrls.length; i++) {
        if (i > 0) pdf.addPage([imgW, imgH], orientation);
        pdf.addImage(dataUrls[i], 'JPEG', 0, 0, imgW, imgH);
      }

      setProgress(100);
      setPhase('done');

      pdf.save(`imagens-laudo-${id.slice(0, 8)}.pdf`);
    } catch (err: any) {
      showNotification({
        title: 'Erro ao gerar PDF',
        message: err?.response?.data?.error || err?.message || 'Não foi possível gerar o PDF das imagens.',
        color: 'red',
      });
      setPhase('error');
    }
  }

  const isDone = phase === 'done';
  const isError = phase === 'error';

  return (
    <Box
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--mantine-color-body)',
        padding: 24,
      }}
    >
      <Stack align="center" gap="lg" style={{ maxWidth: 400, width: '100%' }}>
        <ScanLine size={48} color={isError ? '#fa5252' : 'var(--mantine-color-blue-6)'} />

        <Text fw={600} size="lg" ta="center">
          {isDone ? 'PDF gerado com sucesso!' : isError ? 'Erro ao gerar PDF' : 'Preparando imagens do exame...'}
        </Text>

        {!isDone && !isError && (
          <>
            <Progress value={progress} w="100%" size="md" radius="xl" animated />
            <Text size="sm" c="dimmed" ta="center">{progressLabel}</Text>
          </>
        )}

        {isDone && (
          <Text size="sm" c="dimmed" ta="center">
            O download do PDF foi iniciado automaticamente.
          </Text>
        )}

        {isError && (
          <Button
            variant="light"
            leftSection={<FileDown size={14} />}
            onClick={() => { setPhase('idle'); setProgress(0); void generatePdf(reportId!); }}
          >
            Tentar novamente
          </Button>
        )}

        <Group>
          <Button variant="subtle" leftSection={<ArrowLeft size={14} />} onClick={() => navigate('/portal')}>
            Voltar ao portal
          </Button>
        </Group>
      </Stack>
    </Box>
  );
}
