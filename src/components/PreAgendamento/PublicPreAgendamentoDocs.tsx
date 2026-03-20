import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Badge,
  Box,
  Button,
  Group,
  Loader,
  Paper,
  Select,
  Stepper,
  Stack,
  Text,
  TextInput,
} from '@mantine/core';
import { showNotification } from '@mantine/notifications';
import dayjs from 'dayjs';
import { FacialCapture } from '../common/FacialCapture';
import preSchedulingService, { type PublicPreSchedulingMeta } from '../../services/preSchedulingService';
import facialRecognitionService from '../../services/facialRecognitionService';

const DOCUMENT_TYPES = [
  { value: 'DOCUMENTO_IDENTIDADE', label: 'Documento de identidade' },
  { value: 'PEDIDO_MEDICO', label: 'Pedido médico' },
  { value: 'CARTEIRINHA_CONVENIO', label: 'Carteirinha do convênio' },
  { value: 'OUTRO', label: 'Outro anexo' },
];

const toBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result || ''));
  reader.onerror = reject;
  reader.readAsDataURL(file);
});

export function PublicPreAgendamentoDocs() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState<PublicPreSchedulingMeta | null>(null);
  const [verified, setVerified] = useState(false);
  const [facialOpen, setFacialOpen] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const [docType, setDocType] = useState<string | null>('DOCUMENTO_IDENTIDADE');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [finalizing, setFinalizing] = useState(false);

  const loadMeta = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await preSchedulingService.getPublicMeta(token);
      setMeta(data);
      setVerified(Boolean(data.verified));
    } catch (err: any) {
      showNotification({
        title: 'Link inválido',
        message: err?.response?.data?.error || err?.message || 'Não foi possível abrir esse link.',
        color: 'red',
      });
      setMeta(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMeta();
  }, [token]);

  const scheduleSummary = useMemo(() => {
    if (!meta?.appointment) return '-';
    const date = meta.appointment.date ? dayjs(meta.appointment.date).format('DD/MM/YYYY') : '-';
    const time = meta.appointment.time || '--:--';
    const specialty = meta.appointment.specialty || 'Procedimento';
    return `${date} • ${time} • ${specialty}`;
  }, [meta?.appointment]);

  const handleVerifyCapture = async (imageBase64: string) => {
    if (!token || !meta) return;
    setVerifying(true);
    try {
      const scan = await facialRecognitionService.scanFace({
        image: imageBase64,
        id_unidade: String(meta.branchId || ''),
        skipAuth: true,
      });

      const recognizedCpf = String(scan?.patient?.cpf || '').replace(/\D/g, '');
      if (!recognizedCpf) {
        throw new Error('Nenhum CPF reconhecido pela biometria facial.');
      }

      await preSchedulingService.verifyPublic(token, {
        recognizedCpf,
        recognizedName: scan?.patient?.name || undefined,
        recognizedTrust: Number.isFinite(Number(scan?.trust)) ? Number(scan?.trust) : undefined,
        facialImageBase64: imageBase64,
      });
      setVerified(true);
      showNotification({
        title: 'Identidade validada',
        message: 'Você já pode enviar os documentos.',
        color: 'green',
      });
      await loadMeta();
    } catch (err: any) {
      showNotification({
        title: 'Falha na validação',
        message: err?.response?.data?.error || err?.message || 'Não foi possível validar sua identidade.',
        color: 'red',
      });
    } finally {
      setVerifying(false);
    }
  };

  const handleUpload = async () => {
    if (!token || !selectedFile || !docType) return;
    setUploading(true);
    try {
      const base64 = await toBase64(selectedFile);
      await preSchedulingService.uploadPublicDocument(token, {
        documentType: docType,
        fileName: selectedFile.name,
        mimeType: selectedFile.type,
        fileBase64: base64,
      });
      showNotification({
        title: 'Documento enviado',
        message: 'Seu anexo foi enviado com sucesso.',
        color: 'green',
      });
      setSelectedFile(null);
      await loadMeta();
    } catch (err: any) {
      showNotification({
        title: 'Erro no envio',
        message: err?.response?.data?.error || err?.message || 'Não foi possível enviar esse arquivo.',
        color: 'red',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleFinalize = async () => {
    if (!token) return;
    if ((meta?.documentsCount || 0) <= 0) {
      showNotification({
        title: 'Sem anexos',
        message: 'Envie ao menos um documento antes de finalizar.',
        color: 'yellow',
      });
      return;
    }
    setFinalizing(true);
    try {
      await preSchedulingService.finalizePublicDocuments(token);
      showNotification({
        title: 'Envio finalizado',
        message: 'Documentos enviados e liberados para revisão da clínica.',
        color: 'green',
      });
      await loadMeta();
    } catch (err: any) {
      showNotification({
        title: 'Erro ao finalizar',
        message: err?.response?.data?.error || err?.message || 'Não foi possível finalizar o envio.',
        color: 'red',
      });
    } finally {
      setFinalizing(false);
    }
  };

  return (
    <Box bg="#0A1128" style={{ minHeight: '100vh' }} p={{ base: 'md', md: 'xl' }}>
      <Stack maw={920} mx="auto" gap="md">
        <Paper p={{ base: 'md', md: 'lg' }} withBorder bg="#001F54">
          <Stack gap={4}>
            <Text size="xl" fw={700} c="white">Pré-agendamento • Envio de documentos</Text>
            <Text c="rgba(255,255,255,0.8)" size="sm">
              Faça a validação facial e anexe os documentos para agilizar seu atendimento.
            </Text>
          </Stack>
        </Paper>

        {loading ? (
          <Paper p="xl" bg="#001F54" withBorder>
            <Group justify="center"><Loader size="sm" color="white" /></Group>
          </Paper>
        ) : !meta ? (
          <Paper p="xl" bg="#001F54" withBorder>
            <Text c="white">Link inválido ou expirado.</Text>
          </Paper>
        ) : (
          <>
            <Paper p="md" bg="#001F54" withBorder>
              <Stepper
                active={verified ? 1 : 0}
                color="green"
                size="sm"
                styles={{
                  stepLabel: { color: 'white' },
                  stepDescription: { color: 'rgba(255,255,255,0.7)' },
                }}
              >
                <Stepper.Step label="Validar identidade" description="CPF + reconhecimento facial" />
                <Stepper.Step label="Enviar anexos" description="Documentos do atendimento" />
              </Stepper>
            </Paper>

            <Paper p="lg" bg="#001F54" withBorder>
              <Stack gap={8}>
                <Group justify="space-between" align="start">
                  <Stack gap={0}>
                    <Text c="white" fw={700}>{meta.patientName}</Text>
                    <Text c="rgba(255,255,255,0.8)" size="sm">{scheduleSummary}</Text>
                  </Stack>
                  <Badge color={verified ? 'green' : 'yellow'} variant="light">
                    {verified ? 'Identidade validada' : 'Validação pendente'}
                  </Badge>
                </Group>

                <Group justify="space-between">
                  <Text size="sm" c="rgba(255,255,255,0.8)">
                    Para seguir, confirme sua identidade por reconhecimento facial.
                  </Text>
                  <Button
                    color="darkBlue"
                    onClick={() => setFacialOpen(true)}
                    loading={verifying}
                  >
                    Validar identidade
                  </Button>
                </Group>
              </Stack>
            </Paper>

            {verified && (
              <Paper p="lg" bg="#001F54" withBorder>
                <Stack gap="sm">
                  <Text fw={700} c="white">Anexar documentos</Text>
                  <Text size="sm" c="rgba(255,255,255,0.8)">
                    Documento de identidade, pedido médico e outros anexos relevantes.
                  </Text>

                  <Group grow align="end">
                    <Select
                      label="Tipo de documento"
                      data={DOCUMENT_TYPES}
                      value={docType}
                      onChange={setDocType}
                      c="white"
                      styles={{
                        label: { color: 'white' },
                        input: { background: '#0A1128', color: 'white', borderColor: '#3559A8' },
                        dropdown: { background: '#0A1128', borderColor: '#3559A8' },
                        option: { color: 'white' },
                      }}
                    />
                    <TextInput
                      label="Arquivo selecionado"
                      value={selectedFile?.name || ''}
                      placeholder="Nenhum arquivo"
                      readOnly
                      c="white"
                      styles={{
                        label: { color: 'white' },
                        input: { background: '#0A1128', color: '#9fb6ea', borderColor: '#3559A8' },
                      }}
                    />
                  </Group>

                  <Group justify="space-between">
                    <Button
                      variant="default"
                      component="label"
                      styles={{ root: { background: '#0A1128', color: 'white', borderColor: '#3559A8' } }}
                    >
                      Selecionar arquivo
                      <input
                        type="file"
                        hidden
                        onChange={(e) => {
                          const file = e.currentTarget.files?.[0] || null;
                          setSelectedFile(file);
                        }}
                      />
                    </Button>
                    <Button
                      color="darkBlue"
                      disabled={!selectedFile || !docType}
                      onClick={handleUpload}
                      loading={uploading}
                    >
                      Enviar documento
                    </Button>
                  </Group>

                  <Text size="sm" c="rgba(255,255,255,0.85)">
                    Documentos já enviados: {meta.documentsCount}
                  </Text>
                  <Stack gap={6}>
                    {meta.documents.map((doc) => (
                      <Paper key={doc.id} p="xs" bg="#0A1128" withBorder>
                        <Text size="sm" c="white">{doc.documentType} • {doc.fileName}</Text>
                        <Text size="xs" c="rgba(255,255,255,0.7)">
                          Enviado em {dayjs(doc.uploadedAt).format('DD/MM/YYYY HH:mm')}
                        </Text>
                      </Paper>
                    ))}
                    {meta.documents.length === 0 && (
                      <Text size="sm" c="rgba(255,255,255,0.7)">Nenhum documento enviado ainda.</Text>
                    )}
                  </Stack>

                  <Group justify="flex-end" mt="sm">
                    <Button
                      color="green"
                      variant="filled"
                      onClick={handleFinalize}
                      loading={finalizing}
                      disabled={(meta.documentsCount || 0) <= 0 || meta.status === 'DOCUMENTS_RECEIVED' || meta.status === 'COMPLETED'}
                    >
                      {meta.status === 'DOCUMENTS_RECEIVED' || meta.status === 'COMPLETED'
                        ? 'Envio já finalizado'
                        : 'Finalizar envio'}
                    </Button>
                  </Group>
                </Stack>
              </Paper>
            )}
          </>
        )}
      </Stack>

      <FacialCapture
        opened={facialOpen}
        onClose={() => setFacialOpen(false)}
        onCapture={handleVerifyCapture}
        title="Validação facial"
        description="Posicione o rosto no centro para validar sua identidade."
      />
    </Box>
  );
}

export default PublicPreAgendamentoDocs;
