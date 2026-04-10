import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Group,
  Menu,
  Modal,
  Paper,
  SegmentedControl,
  Skeleton,
  Stack,
  Table,
  Text,
  TextInput,
  Textarea,
} from '@mantine/core';
import { showNotification } from '@mantine/notifications';
import { CheckCircle2, ChevronLeft, Copy, ExternalLink, FileSearch, Link as LinkIcon, MoreVertical, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { Header } from '../Header/Header';
import { FloatingInput } from '../common/FloatingInput';
import { FloatingSelect } from '../common/FloatingSelect';
import preSchedulingService, { type PreSchedulingItem, type PreSchedulingStatus } from '../../services/preSchedulingService';
import teleconsultationLinkService from '../../services/teleconsultationLinkService';
import { formatCPF } from '../../utils/formatters';
import { usePreSchedulingsQuery } from '../../hooks/usePreSchedulingsQuery';
import { queryKeys } from '../../lib/queryKeys';
import { resolveApiErrorMessage } from '../../lib/apiError';

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

function PreSchedulingTableSkeleton() {
  return (
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
          {Array.from({ length: 4 }).map((_, index) => (
            <Table.Tr key={index}>
              <Table.Td>
                <Stack gap={6}>
                  <Skeleton height={14} width={140} radius="xl" />
                  <Skeleton height={10} width={90} radius="xl" />
                </Stack>
              </Table.Td>
              <Table.Td><Skeleton height={14} width={180} radius="xl" /></Table.Td>
              <Table.Td><Skeleton height={14} width={110} radius="xl" /></Table.Td>
              <Table.Td><Skeleton height={14} width={90} radius="xl" /></Table.Td>
              <Table.Td><Skeleton height={24} width={110} radius="xl" /></Table.Td>
              <Table.Td><Skeleton height={24} width={84} radius="xl" /></Table.Td>
              <Table.Td>
                <Group gap="xs" wrap="nowrap">
                  <Skeleton height={30} width={104} radius="md" />
                  <Skeleton height={30} width={96} radius="md" />
                  <Skeleton height={30} width={96} radius="md" />
                </Group>
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Box>
  );
}

function ReviewModalSkeleton() {
  return (
    <Stack gap="xs">
      <Paper p="sm" withBorder>
        <Stack gap={8}>
          <Skeleton height={18} width={120} radius="xl" />
          {Array.from({ length: 2 }).map((_, index) => (
            <Paper key={index} p="xs" withBorder>
              <Stack gap={6}>
                <Skeleton height={14} width={110} radius="xl" />
                <Skeleton height={12} width="70%" radius="xl" />
                <Skeleton height={10} width={100} radius="xl" />
              </Stack>
            </Paper>
          ))}
        </Stack>
      </Paper>
      <Paper p="sm" withBorder>
        <Stack gap={8}>
          <Group justify="space-between">
            <Skeleton height={18} width={90} radius="xl" />
            <Skeleton height={24} width={90} radius="xl" />
          </Group>
          <Skeleton height={12} width={160} radius="xl" />
          {Array.from({ length: 2 }).map((_, index) => (
            <Paper key={index} p="xs" withBorder>
              <Stack gap={6}>
                <Skeleton height={14} width="55%" radius="xl" />
                <Skeleton height={12} width="80%" radius="xl" />
              </Stack>
            </Paper>
          ))}
        </Stack>
      </Paper>
    </Stack>
  );
}

export function PreAgendamento() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
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
  const [linkMode, setLinkMode] = useState<'DOCS' | 'TELECONSULTA'>('DOCS');
  const [linkResult, setLinkResult] = useState<{
    publicUrl: string;
    message: string;
    to?: string;
  } | null>(null);
  const [sendingLink, setSendingLink] = useState(false);
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
  const [reviewAnamnesis, setReviewAnamnesis] = useState<{
    templateId: string;
    templateName: string;
    answered: boolean;
    answeredAt?: string | null;
    answers: Array<{
      id: string;
      questionLabel: string;
      responseType: string;
      answerText?: string | null;
      answerValues?: string[];
      answerBoolean?: boolean | null;
      answerNumber?: number | null;
      orderIndex: number;
    }>;
  } | null>(null);
  const [savingReview, setSavingReview] = useState(false);
  const [openingDocumentId, setOpeningDocumentId] = useState<string | null>(null);
  const [manualFinalizingId, setManualFinalizingId] = useState<string | null>(null);
  const preSchedulingsQuery = usePreSchedulingsQuery({
    search,
    status: statusFilter,
    resolvedOnly: viewMode === 'history',
  });

  useEffect(() => {
    setLoading(preSchedulingsQuery.isLoading && items.length === 0);
  }, [items.length, preSchedulingsQuery.isLoading]);

  useEffect(() => {
    setItems(Array.isArray(preSchedulingsQuery.data) ? preSchedulingsQuery.data : []);
  }, [preSchedulingsQuery.data]);

  useEffect(() => {
    if (preSchedulingsQuery.error) {
      const err: any = preSchedulingsQuery.error;
      showNotification({
        title: 'Erro',
        message: resolveApiErrorMessage(err, 'Erro ao carregar pré-agendamentos'),
        color: 'red',
      });
    }
  }, [preSchedulingsQuery.error]);

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
      await queryClient.invalidateQueries({ queryKey: queryKeys.preSchedulings });
    } catch (err: any) {
      showNotification({
        title: 'Erro ao pré-autorizar',
        message: resolveApiErrorMessage(err, 'Não foi possível pré-autorizar.'),
        color: 'red',
      });
    } finally {
      setSavingPreAuth(false);
    }
  };

  const openSendLink = (item: PreSchedulingItem, mode: 'DOCS' | 'TELECONSULTA' = 'DOCS') => {
    setSelectedItem(item);
    setLinkMode(mode);
    setLinkResult(null);
    setLinkOpen(true);
  };

  const handleSendLink = async (mode: 'DOCS' | 'TELECONSULTA' = linkMode) => {
    if (!selectedItem) return;
    setSendingLink(true);
    try {
      const data: any = mode === 'TELECONSULTA'
        ? await teleconsultationLinkService.sendWhatsAppLinkByAppointment(selectedItem.appointmentId)
        : await preSchedulingService.sendLink(selectedItem.appointmentId);
      const whatsappData = data.whatsapp || data.whatsappMock || null;
      setLinkResult({
        publicUrl: data.publicUrl || data.links?.patientUrl,
        message: whatsappData?.message || '',
        to: whatsappData?.to,
      });
      showNotification({
        title: 'Link enviado',
        message: mode === 'TELECONSULTA'
          ? 'Link de teleconsulta gerado com sucesso.'
          : (data.hasAnamnesis ? 'Link de documentos e anamnese gerado com sucesso.' : 'Link de documentos gerado com sucesso.'),
        color: 'green',
      });
      await queryClient.invalidateQueries({ queryKey: queryKeys.preSchedulings });
      if (mode === 'TELECONSULTA') {
        await queryClient.invalidateQueries({ queryKey: queryKeys.clinicalQueue });
      }
    } catch (err: any) {
      showNotification({
        title: 'Erro ao enviar link',
        message: resolveApiErrorMessage(err, 'Não foi possível enviar o link.'),
        color: 'red',
      });
    } finally {
      setSendingLink(false);
    }
  };

  const copyToClipboard = async (value: string) => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      showNotification({
        title: 'Copiado',
        message: 'Link copiado para a área de transferência.',
        color: 'green',
      });
    } catch {
      showNotification({
        title: 'Falha ao copiar',
        message: 'Não foi possível copiar o link.',
        color: 'red',
      });
    }
  };

  const openReview = async (item: PreSchedulingItem) => {
    setSelectedItem(item);
    setReviewOpen(true);
    setReviewLoading(true);
    try {
      const data = await preSchedulingService.getDocuments(item.appointmentId);
      setReviewDocuments(Array.isArray(data?.items) ? data.items : []);
      setReviewAnamnesis(data?.anamnesis || null);
    } catch (err: any) {
      showNotification({
        title: 'Erro ao carregar anexos',
        message: resolveApiErrorMessage(err, 'Não foi possível carregar os documentos.'),
        color: 'red',
      });
      setReviewDocuments([]);
      setReviewAnamnesis(null);
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
      await queryClient.invalidateQueries({ queryKey: queryKeys.preSchedulings });
    } catch (err: any) {
      showNotification({
        title: 'Erro na revisão',
        message: resolveApiErrorMessage(err, 'Não foi possível concluir a revisão.'),
        color: 'red',
      });
    } finally {
      setSavingReview(false);
    }
  };

  const handleManualFinalize = async (item: PreSchedulingItem) => {
    setManualFinalizingId(item.appointmentId);
    try {
      const data = await preSchedulingService.manualFinalize(item.appointmentId);
      showNotification({
        title: 'Finalização concluída',
        message: data?.message || 'Fluxo finalizado manualmente com sucesso.',
        color: 'green',
      });
      await queryClient.invalidateQueries({ queryKey: queryKeys.preSchedulings });
    } catch (err: any) {
      showNotification({
        title: 'Erro ao finalizar',
        message: err?.response?.data?.error || err?.message || 'Não foi possível finalizar manualmente.',
        color: 'red',
      });
    } finally {
      setManualFinalizingId(null);
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
        message: resolveApiErrorMessage(err, 'Não foi possível visualizar o anexo.'),
        color: 'red',
      });
    } finally {
      setOpeningDocumentId(null);
    }
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

            <Group grow align="flex-end">
              <FloatingInput
                label="Buscar"
                alwaysFloatLabel
                placeholder="Buscar por paciente, CPF, médico, procedimento ou convênio"
                value={search}
                onChange={(e) => setSearch(e.currentTarget.value)}
                containerProps={{ style: { minHeight: 64 } }}
              />
              <FloatingSelect
                label="Status"
                alwaysFloatLabel
                data={statusOptions}
                clearable
                value={statusFilter}
                onChange={setStatusFilter}
                containerProps={{ style: { minHeight: 64 } }}
              />
            </Group>

            {loading && items.length === 0 ? (
              <PreSchedulingTableSkeleton />
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
                            <Stack gap={4}>
                              <Group gap="xs">
                                <Text fw={600}>{item.patientName || '-'}</Text>
                                <Badge
                                  size="xs"
                                  variant="light"
                                  color={item.source === 'BOT' ? 'blue' : 'gray'}
                                >
                                  {item.source === 'BOT' ? 'BOT' : 'COMUM'}
                                </Badge>
                                {item.isTeleconsultation && (
                                  <Badge size="xs" variant="light" color="cyan">
                                    TELECONSULTA
                                  </Badge>
                                )}
                              </Group>
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
                            <Menu shadow="md" width={220} position="bottom-end" withArrow>
                              <Menu.Target>
                                <ActionIcon variant="light" size="sm" aria-label="Ações">
                                  <MoreVertical size={16} />
                                </ActionIcon>
                              </Menu.Target>
                              <Menu.Dropdown>
                                {(() => {
                                  const isPreAuthorized = Boolean(item.preAuthorizedAt);
                                  const status = item.preSchedulingStatus;
                                  const canReviewDocs = Boolean(item.docsCount);
                                  const isCanceled = status === 'CANCELED';
                                  const isCompleted = status === 'COMPLETED';
                                  const canManualFinalize = Boolean(item.isTeleconsultation) && isPreAuthorized && !isCanceled && !item.isResolved;

                                  return (
                                    <>
                                <Menu.Item
                                  leftSection={<ShieldCheck size={14} />}
                                  disabled={item.isResolved || viewMode === 'history' || isPreAuthorized || isCanceled}
                                  onClick={() => openPreAuthorize(item)}
                                >
                                  Pré-autorizar
                                </Menu.Item>
                                <Menu.Item
                                  leftSection={<LinkIcon size={14} />}
                                  disabled={
                                    viewMode === 'history'
                                    || isCanceled
                                    || isCompleted
                                  }
                                  onClick={() => openSendLink(item, 'DOCS')}
                                >
                                  Enviar link docs
                                </Menu.Item>
                                {item.isTeleconsultation && (
                                  <Menu.Item
                                    leftSection={<LinkIcon size={14} />}
                                    disabled={
                                      viewMode === 'history'
                                      || !isPreAuthorized
                                      || isCanceled
                                      || Boolean(item.teleconsultationLinkSent)
                                    }
                                    onClick={() => openSendLink(item, 'TELECONSULTA')}
                                  >
                                    Enviar link teleconsulta
                                  </Menu.Item>
                                )}
                                <Menu.Item
                                  leftSection={<FileSearch size={14} />}
                                  disabled={!canReviewDocs}
                                  onClick={() => openReview(item)}
                                >
                                  Revisar docs
                                </Menu.Item>
                                {item.isTeleconsultation && (
                                  <Menu.Item
                                    leftSection={<CheckCircle2 size={14} />}
                                    disabled={!canManualFinalize || manualFinalizingId === item.appointmentId}
                                    onClick={() => handleManualFinalize(item)}
                                  >
                                    Finalizar manualmente
                                  </Menu.Item>
                                )}
                                    </>
                                  );
                                })()}
                              </Menu.Dropdown>
                            </Menu>
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

      <Modal
        opened={linkOpen}
        onClose={() => setLinkOpen(false)}
        title={linkMode === 'TELECONSULTA' ? 'Envio de link de teleconsulta (WhatsApp)' : 'Envio de link de documentos (WhatsApp mock)'}
        centered
        size="lg"
      >
        <Stack>
          <Text size="sm" c="dimmed">
            {selectedItem?.patientName || 'Paciente'} • {selectedItem?.specialty || 'Procedimento'}
          </Text>

          {!linkResult ? (
            <Group justify="flex-end">
              <Button variant="default" onClick={() => setLinkOpen(false)}>Cancelar</Button>
              <Button
                color="darkBlue"
                onClick={() => handleSendLink(linkMode)}
                loading={sendingLink}
              >
                Gerar e enviar link
              </Button>
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
      <Modal opened={reviewOpen} onClose={() => setReviewOpen(false)} title="Revisar envio do paciente" centered size="lg">
        <Stack>
          <Text size="sm" c="dimmed">
            {selectedItem?.patientName || 'Paciente'} • {selectedItem?.specialty || 'Procedimento'}
          </Text>

          {reviewLoading ? (
            <ReviewModalSkeleton />
          ) : (
            <Stack gap="xs">
              <Paper p="sm" withBorder>
                <Stack gap={6}>
                  <Text fw={700}>Documentos</Text>
                  {reviewDocuments.length === 0 ? (
                    <Text size="sm" c="dimmed">Nenhum documento enviado.</Text>
                  ) : (
                    reviewDocuments.map((doc) => (
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
                    ))
                  )}
                </Stack>
              </Paper>

              {reviewAnamnesis && (
                <Paper p="sm" withBorder>
                  <Stack gap={6}>
                    <Group justify="space-between">
                      <Text fw={700}>Anamnese</Text>
                      <Badge color={reviewAnamnesis.answered ? 'green' : 'yellow'} variant="light">
                        {reviewAnamnesis.answered ? 'Respondida' : 'Pendente'}
                      </Badge>
                    </Group>
                    <Text size="sm" c="dimmed">{reviewAnamnesis.templateName}</Text>
                    {reviewAnamnesis.answeredAt && (
                      <Text size="xs" c="dimmed">
                        Respondida em {dayjs(reviewAnamnesis.answeredAt).format('DD/MM/YYYY HH:mm')}
                      </Text>
                    )}
                    {(reviewAnamnesis.answers || []).length === 0 ? (
                      <Text size="sm" c="dimmed">Nenhuma resposta registrada.</Text>
                    ) : (
                      reviewAnamnesis.answers.map((answer) => (
                        <Paper key={answer.id} p="xs" withBorder>
                          <Text size="sm" fw={600}>{answer.questionLabel}</Text>
                          <Text size="sm">
                            {answer.answerValues && answer.answerValues.length > 0
                              ? answer.answerValues.join(', ')
                              : answer.answerBoolean !== null && answer.answerBoolean !== undefined
                                ? (answer.answerBoolean ? 'Sim' : 'Não')
                                : answer.answerNumber !== null && answer.answerNumber !== undefined
                                  ? String(answer.answerNumber)
                                  : answer.answerText || 'Sem resposta'}
                          </Text>
                        </Paper>
                      ))
                    )}
                  </Stack>
                </Paper>
              )}
            </Stack>
          )}

          <Group justify="space-between" mt="sm">
            <Button
              variant="default"
              color="yellow"
              disabled={reviewLoading || (reviewDocuments.length === 0 && !reviewAnamnesis?.answered)}
              loading={savingReview}
              onClick={() => handleReviewAction('REQUEST_RESUBMISSION')}
            >
              Solicitar reenvio
            </Button>
            <Button
              color="green"
              disabled={reviewLoading || (reviewDocuments.length === 0 && !reviewAnamnesis?.answered)}
              loading={savingReview}
              onClick={() => handleReviewAction('APPROVE')}
            >
              Aprovar envio
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Box>
  );
}

export default PreAgendamento;
