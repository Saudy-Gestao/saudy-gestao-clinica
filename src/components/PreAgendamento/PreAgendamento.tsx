import { useEffect, useMemo, useState } from 'react';
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Group,
  Loader,
  Modal,
  Paper,
  Select,
  SegmentedControl,
  Stack,
  Table,
  Text,
  TextInput,
  Textarea,
} from '@mantine/core';
import { showNotification } from '@mantine/notifications';
import { ChevronLeft, Copy, ExternalLink, Link as LinkIcon, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { Header } from '../Header/Header';
import preSchedulingService, { type PreSchedulingItem, type PreSchedulingStatus } from '../../services/preSchedulingService';
import { formatCPF } from '../../utils/formatters';

const STATUS_LABEL: Record<PreSchedulingStatus, string> = {
  PENDING: 'Pendente',
  PRE_AUTHORIZED: 'Pré-autorizado',
  LINK_SENT: 'Link enviado',
  WAITING_PATIENT_DOCUMENTS: 'Aguardando documentos',
  DOCUMENTS_RECEIVED: 'Documentos enviados (revisar)',
  COMPLETED: 'Concluído',
  CANCELED: 'Cancelado',
};

const STATUS_COLOR: Record<PreSchedulingStatus, string> = {
  PENDING: 'gray',
  PRE_AUTHORIZED: 'teal',
  LINK_SENT: 'blue',
  WAITING_PATIENT_DOCUMENTS: 'violet',
  DOCUMENTS_RECEIVED: 'green',
  COMPLETED: 'green',
  CANCELED: 'red',
};

const statusOptions = Object.entries(STATUS_LABEL).map(([value, label]) => ({ value, label }));

export function PreAgendamento() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<PreSchedulingItem[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'queue' | 'history'>('queue');

  const [preAuthOpen, setPreAuthOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<PreSchedulingItem | null>(null);
  const [guideNumber, setGuideNumber] = useState('');
  const [preAuthNotes, setPreAuthNotes] = useState('');
  const [savingPreAuth, setSavingPreAuth] = useState(false);

  const [linkOpen, setLinkOpen] = useState(false);
  const [sendingLink, setSendingLink] = useState(false);
  const [linkResult, setLinkResult] = useState<{ publicUrl: string; message: string; to?: string | null } | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewDocuments, setReviewDocuments] = useState<Array<{
    id: string;
    documentType: string;
    fileName: string;
    mimeType?: string | null;
    sizeBytes?: number | null;
    uploadedAt: string;
  }>>([]);
  const [savingReview, setSavingReview] = useState(false);
  const [openingDocumentId, setOpeningDocumentId] = useState<string | null>(null);

  const loadItems = async () => {
    setLoading(true);
    try {
      const data = await preSchedulingService.list({
        search: search || undefined,
        status: statusFilter || undefined,
        resolvedOnly: viewMode === 'history',
        limit: 500,
      });
      setItems(Array.isArray(data?.items) ? data.items : []);
    } catch (err: any) {
      showNotification({
        title: 'Erro',
        message: err?.response?.data?.error || err?.message || 'Erro ao carregar pré-agendamentos',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
  }, [search, statusFilter, viewMode]);

  const counters = useMemo(() => {
    return items.reduce((acc, item) => {
      acc.total += 1;
      acc[item.preSchedulingStatus] = (acc[item.preSchedulingStatus] || 0) + 1;
      return acc;
    }, {
      total: 0,
      PENDING: 0,
      PRE_AUTHORIZED: 0,
      LINK_SENT: 0,
      WAITING_PATIENT_DOCUMENTS: 0,
      DOCUMENTS_RECEIVED: 0,
      COMPLETED: 0,
      CANCELED: 0,
    } as Record<string, number>);
  }, [items]);

  const openPreAuthorize = (item: PreSchedulingItem) => {
    setSelectedItem(item);
    setGuideNumber(item.guideNumber || '');
    setPreAuthNotes('');
    setPreAuthOpen(true);
  };

  const handlePreAuthorize = async () => {
    if (!selectedItem) return;
    setSavingPreAuth(true);
    try {
      await preSchedulingService.preAuthorize(selectedItem.appointmentId, {
        guideNumber: guideNumber || undefined,
        notes: preAuthNotes || undefined,
      });
      showNotification({
        title: 'Pré-autorização registrada',
        message: 'A guia foi vinculada ao agendamento.',
        color: 'green',
      });
      setPreAuthOpen(false);
      await loadItems();
    } catch (err: any) {
      showNotification({
        title: 'Erro ao pré-autorizar',
        message: err?.response?.data?.error || err?.message || 'Não foi possível pré-autorizar.',
        color: 'red',
      });
    } finally {
      setSavingPreAuth(false);
    }
  };

  const openSendLink = (item: PreSchedulingItem) => {
    setSelectedItem(item);
    setLinkResult(null);
    setLinkOpen(true);
  };

  const handleSendLink = async () => {
    if (!selectedItem) return;
    setSendingLink(true);
    try {
      const data = await preSchedulingService.sendLink(selectedItem.appointmentId);
      setLinkResult({
        publicUrl: data.publicUrl,
        message: data.whatsappMock?.message || '',
        to: data.whatsappMock?.to,
      });
      showNotification({
        title: 'Link enviado (mock)',
        message: 'Link de documentos gerado com sucesso.',
        color: 'green',
      });
      await loadItems();
    } catch (err: any) {
      showNotification({
        title: 'Erro ao enviar link',
        message: err?.response?.data?.error || err?.message || 'Não foi possível enviar o link.',
        color: 'red',
      });
    } finally {
      setSendingLink(false);
    }
  };

  const openReview = async (item: PreSchedulingItem) => {
    setSelectedItem(item);
    setReviewOpen(true);
    setReviewLoading(true);
    try {
      const data = await preSchedulingService.getDocuments(item.appointmentId);
      setReviewDocuments(Array.isArray(data?.items) ? data.items : []);
    } catch (err: any) {
      showNotification({
        title: 'Erro ao carregar anexos',
        message: err?.response?.data?.error || err?.message || 'Não foi possível carregar os documentos.',
        color: 'red',
      });
      setReviewDocuments([]);
    } finally {
      setReviewLoading(false);
    }
  };

  const handleReviewAction = async (action: 'APPROVE' | 'REQUEST_RESUBMISSION') => {
    if (!selectedItem) return;
    setSavingReview(true);
    try {
      const data = await preSchedulingService.reviewDocuments(selectedItem.appointmentId, { action });
      showNotification({
        title: action === 'APPROVE' ? 'Documentos aprovados' : 'Reenvio solicitado',
        message: data?.message || 'Ação concluída com sucesso.',
        color: action === 'APPROVE' ? 'green' : 'yellow',
      });
      setReviewOpen(false);
      await loadItems();
    } catch (err: any) {
      showNotification({
        title: 'Erro na revisão',
        message: err?.response?.data?.error || err?.message || 'Não foi possível concluir a revisão.',
        color: 'red',
      });
    } finally {
      setSavingReview(false);
    }
  };

  const handleViewDocument = async (documentId: string) => {
    if (!selectedItem) return;
    setOpeningDocumentId(documentId);
    try {
      const blob = await preSchedulingService.viewDocument(selectedItem.appointmentId, documentId);
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, '_blank', 'noopener,noreferrer');
      setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
    } catch (err: any) {
      showNotification({
        title: 'Erro ao abrir documento',
        message: err?.response?.data?.error || err?.message || 'Não foi possível visualizar o anexo.',
        color: 'red',
      });
    } finally {
      setOpeningDocumentId(null);
    }
  };

  const copyToClipboard = async (value: string) => {
    if (!value) return;
    await navigator.clipboard.writeText(value);
    showNotification({ title: 'Copiado', message: 'Conteúdo copiado para área de transferência.', color: 'blue' });
  };

  return (
    <Box bg="var(--mantine-color-body)" style={{ minHeight: '100vh' }}>
      <Header />

      <Box p="xl">
        <Group justify="space-between" align="center" mb="md" wrap="wrap">
          <Group>
            <ActionIcon variant="default" size="lg" onClick={() => navigate('/dashboard')}>
              <ChevronLeft size={18} />
            </ActionIcon>
            <Box>
              <Text fw={700} size="lg" c="var(--mantine-color-text)">Pré-agendamento</Text>
              <Text size="sm" c="dimmed">Fila de confirmados para pré-autorização e coleta de documentos.</Text>
            </Box>
          </Group>

          <Group gap="xs" wrap="wrap">
            <Badge variant="light">Total: {counters.total}</Badge>
            <Badge color="teal" variant="light">Pré-autorizados: {counters.PRE_AUTHORIZED}</Badge>
            <Badge color="violet" variant="light">Aguardando docs: {counters.WAITING_PATIENT_DOCUMENTS}</Badge>
            <Badge color="green" variant="light">Docs recebidos: {counters.DOCUMENTS_RECEIVED}</Badge>
          </Group>
        </Group>

        <Paper p="md" withBorder style={{ borderColor: 'var(--mantine-color-default-border)' }}>
          <Stack gap="md">
            <Group justify="space-between" wrap="wrap">
              <SegmentedControl
                value={viewMode}
                onChange={(value) => setViewMode(value as 'queue' | 'history')}
                data={[
                  { label: 'Fila de trabalho', value: 'queue' },
                  { label: 'Histórico', value: 'history' },
                ]}
              />
              <Text size="sm" c="dimmed">
                {viewMode === 'queue'
                  ? 'Mostrando somente itens pendentes de ação'
                  : 'Mostrando itens concluídos (auditoria)'}
              </Text>
            </Group>

            <Group grow>
              <TextInput
                placeholder="Buscar por paciente, CPF, médico, procedimento ou convênio"
                value={search}
                onChange={(e) => setSearch(e.currentTarget.value)}
              />
              <Select
                placeholder="Filtrar status"
                data={statusOptions}
                clearable
                value={statusFilter}
                onChange={setStatusFilter}
              />
            </Group>

            {loading ? (
              <Group justify="center" py="lg"><Loader size="sm" /></Group>
            ) : (
              <Box style={{ overflowX: 'auto', border: '1px solid var(--mantine-color-default-border)', borderRadius: 8 }}>
                <Table verticalSpacing="sm" horizontalSpacing="md">
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Paciente</Table.Th>
                      <Table.Th>Agendamento</Table.Th>
                      <Table.Th>Médico</Table.Th>
                      <Table.Th>Convênio</Table.Th>
                      <Table.Th>Status</Table.Th>
                      <Table.Th>Docs</Table.Th>
                      <Table.Th>Ações</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {items.length === 0 ? (
                      <Table.Tr>
                        <Table.Td colSpan={7}>
                          <Text c="dimmed" ta="center" py="md">Nenhum agendamento confirmado encontrado.</Text>
                        </Table.Td>
                      </Table.Tr>
                    ) : (
                      items.map((item) => (
                        <Table.Tr key={item.appointmentId}>
                          <Table.Td>
                            <Stack gap={0}>
                              <Text fw={600}>{item.patientName || '-'}</Text>
                              <Text size="xs" c="dimmed">{formatCPF(item.patientCpf || '') || '-'}</Text>
                            </Stack>
                          </Table.Td>
                          <Table.Td>
                            <Text size="sm">
                              {item.date ? dayjs(item.date).format('DD/MM/YYYY') : '-'}
                              {item.time ? ` • ${item.time}` : ''}
                              {item.specialty ? ` • ${item.specialty}` : ''}
                            </Text>
                          </Table.Td>
                          <Table.Td>{item.doctorName || '-'}</Table.Td>
                          <Table.Td>{item.convenio || 'Particular'}</Table.Td>
                          <Table.Td>
                            <Badge color={STATUS_COLOR[item.preSchedulingStatus]} variant="light">
                              {STATUS_LABEL[item.preSchedulingStatus]}
                            </Badge>
                          </Table.Td>
                          <Table.Td>
                            <Badge variant="outline" color={item.docsCount ? 'green' : 'gray'}>
                              {item.docsCount || 0} anexo(s)
                            </Badge>
                          </Table.Td>
                          <Table.Td>
                            <Group gap="xs" wrap="nowrap">
                              <Button
                                size="xs"
                                variant="light"
                                leftSection={<ShieldCheck size={14} />}
                                disabled={item.isResolved || viewMode === 'history'}
                                onClick={() => openPreAuthorize(item)}
                              >
                                Pré-autorizar
                              </Button>
                              <Button
                                size="xs"
                                variant="outline"
                                leftSection={<LinkIcon size={14} />}
                                disabled={item.isResolved || viewMode === 'history' || item.preSchedulingStatus === 'COMPLETED'}
                                onClick={() => openSendLink(item)}
                              >
                                Enviar link
                              </Button>
                              <Button
                                size="xs"
                                variant="default"
                                disabled={!item.docsCount}
                                onClick={() => openReview(item)}
                              >
                                Revisar docs
                              </Button>
                            </Group>
                          </Table.Td>
                        </Table.Tr>
                      ))
                    )}
                  </Table.Tbody>
                </Table>
              </Box>
            )}
          </Stack>
        </Paper>
      </Box>

      <Modal opened={preAuthOpen} onClose={() => setPreAuthOpen(false)} title="Pré-autorização" centered>
        <Stack>
          <Text size="sm" c="dimmed">
            {selectedItem?.patientName || 'Paciente'} • {selectedItem?.specialty || 'Procedimento'}
          </Text>
          <TextInput
            label="Número da guia"
            placeholder="Ex.: 123456789"
            value={guideNumber}
            onChange={(e) => setGuideNumber(e.currentTarget.value)}
          />
          <Textarea
            label="Observações"
            placeholder="Observações da pré-autorização"
            value={preAuthNotes}
            onChange={(e) => setPreAuthNotes(e.currentTarget.value)}
            minRows={3}
          />
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setPreAuthOpen(false)}>Cancelar</Button>
            <Button color="darkBlue" onClick={handlePreAuthorize} loading={savingPreAuth}>Salvar pré-autorização</Button>
          </Group>
        </Stack>
      </Modal>

      <Modal opened={linkOpen} onClose={() => setLinkOpen(false)} title="Envio de link (WhatsApp mock)" centered size="lg">
        <Stack>
          <Text size="sm" c="dimmed">
            {selectedItem?.patientName || 'Paciente'} • {selectedItem?.specialty || 'Procedimento'}
          </Text>

          {!linkResult ? (
            <Group justify="flex-end">
              <Button variant="default" onClick={() => setLinkOpen(false)}>Cancelar</Button>
              <Button color="darkBlue" onClick={handleSendLink} loading={sendingLink}>Gerar e enviar link</Button>
            </Group>
          ) : (
            <>
              <Paper p="sm" withBorder>
                <Stack gap={6}>
                  <Text size="sm" fw={600}>Link público</Text>
                  <Group wrap="nowrap" justify="space-between">
                    <Text size="sm" style={{ wordBreak: 'break-all' }}>{linkResult.publicUrl}</Text>
                    <Group gap={6}>
                      <ActionIcon variant="light" onClick={() => copyToClipboard(linkResult.publicUrl)}>
                        <Copy size={14} />
                      </ActionIcon>
                      <ActionIcon variant="light" onClick={() => window.open(linkResult.publicUrl, '_blank')}>
                        <ExternalLink size={14} />
                      </ActionIcon>
                    </Group>
                  </Group>
                </Stack>
              </Paper>

              <Paper p="sm" withBorder>
                <Stack gap={6}>
                  <Text size="sm" fw={600}>Mensagem mock enviada</Text>
                  <Text size="xs" c="dimmed">Destino: {linkResult.to || 'não informado'}</Text>
                  <Textarea value={linkResult.message} readOnly minRows={4} autosize />
                </Stack>
              </Paper>

              <Group justify="flex-end">
                <Button variant="default" onClick={() => setLinkOpen(false)}>Fechar</Button>
              </Group>
            </>
          )}
        </Stack>
      </Modal>

      <Modal opened={reviewOpen} onClose={() => setReviewOpen(false)} title="Revisar documentos" centered size="lg">
        <Stack>
          <Text size="sm" c="dimmed">
            {selectedItem?.patientName || 'Paciente'} • {selectedItem?.specialty || 'Procedimento'}
          </Text>

          {reviewLoading ? (
            <Group justify="center" py="md"><Loader size="sm" /></Group>
          ) : reviewDocuments.length === 0 ? (
            <Text size="sm" c="dimmed">Nenhum documento enviado ainda.</Text>
          ) : (
            <Stack gap="xs">
              {reviewDocuments.map((doc) => (
                <Paper key={doc.id} p="xs" withBorder>
                  <Text size="sm" fw={600}>{doc.documentType}</Text>
                  <Text size="sm">{doc.fileName}</Text>
                  <Text size="xs" c="dimmed">
                    {dayjs(doc.uploadedAt).format('DD/MM/YYYY HH:mm')}
                    {typeof doc.sizeBytes === 'number' ? ` • ${Math.round(doc.sizeBytes / 1024)} KB` : ''}
                  </Text>
                  <Group justify="flex-end" mt={6}>
                    <Button
                      size="xs"
                      variant="light"
                      loading={openingDocumentId === doc.id}
                      onClick={() => handleViewDocument(doc.id)}
                    >
                      Visualizar
                    </Button>
                  </Group>
                </Paper>
              ))}
            </Stack>
          )}

          <Group justify="space-between" mt="sm">
            <Button
              variant="default"
              color="yellow"
              disabled={reviewLoading || reviewDocuments.length === 0}
              loading={savingReview}
              onClick={() => handleReviewAction('REQUEST_RESUBMISSION')}
            >
              Solicitar reenvio
            </Button>
            <Button
              color="green"
              disabled={reviewLoading || reviewDocuments.length === 0}
              loading={savingReview}
              onClick={() => handleReviewAction('APPROVE')}
            >
              Aprovar documentos
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Box>
  );
}

export default PreAgendamento;
