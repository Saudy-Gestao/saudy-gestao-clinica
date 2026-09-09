import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Group,
  MultiSelect,
  Paper,
  Skeleton,
  Select,
  Stack,
  Table,
  Text,
  TextInput,
  Modal,
} from '@/components/ui';
import { useMediaQuery } from '@/components/ui';
import { showNotification } from '@/components/ui';
import { Eye, Search, ShieldCheck, Upload } from 'lucide-react';
import dayjs from 'dayjs';
import { Header } from '../Header/Header';
import { PaginatedGrid } from '../common/PaginatedGrid';
import convenioAuthorizationService, {
  type ConvenioAuthorizationAttachment,
  type ConvenioAuthorizationSourceType,
  type ConvenioAuthorizationStatus,
} from '../../services/convenioAuthorizationService';
import { useConvenioAuthorizationsQuery } from '../../hooks/useConvenioAuthorizationsQuery';
import { queryKeys } from '../../lib/queryKeys';
import { resolveApiErrorMessage } from '../../lib/apiError';
import { formatCPF } from '../../utils/formatters';
import './AutorizacaoConvenio.css';

type AuthorizationItem = {
  id: string;
  sourceType: ConvenioAuthorizationSourceType;
  sourceLabel: string;
  patientName: string;
  patientCpf?: string;
  insuranceType?: 'CONVENIO' | 'PARTICULAR';
  insuranceName?: string;
  procedureName?: string;
  doctorName?: string;
  roomName?: string | null;
  date?: string;
  time?: string;
  status: ConvenioAuthorizationStatus;
  notes?: string | null;
  updatedAt?: string;
  sessionsCount?: number;
  attachmentsCount?: number;
  attachments?: ConvenioAuthorizationAttachment[];
};

const STATUS_OPTIONS: Array<{ value: ConvenioAuthorizationStatus; label: string }> = [
  { value: 'PENDING', label: 'Pendente' },
  { value: 'AUTHORIZED', label: 'Autorizado' },
  { value: 'DENIED', label: 'Negado' },
];

const STATUS_COLOR: Record<ConvenioAuthorizationStatus, string> = {
  PENDING: 'yellow',
  AUTHORIZED: 'teal',
  DENIED: 'red',
};

const resolveInsuranceName = (item: AuthorizationItem): string => (
  String(item.insuranceName || '').trim()
  || (item.insuranceType === 'CONVENIO' ? 'Convênio' : 'Particular')
  || 'Particular'
);

export function AutorizacaoConvenio() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isMobile = useMediaQuery('(max-width: 799px)');
  const isTablet = useMediaQuery('(max-width: 1279px)');

  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState<ConvenioAuthorizationSourceType[]>([]);
  const [statusFilter, setStatusFilter] = useState<ConvenioAuthorizationStatus[]>([]);
  const [insuranceTypeFilter, setInsuranceTypeFilter] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [updatingKey, setUpdatingKey] = useState<string | null>(null);
  const [uploadPreview, setUploadPreview] = useState<{
    item: AuthorizationItem;
    file: File;
    objectUrl: string | null;
  } | null>(null);
  const {
    data: items = [] as AuthorizationItem[],
    isLoading: loading,
    error,
  } = useConvenioAuthorizationsQuery({
    search,
    sourceFilter,
    statusFilter,
  });

  const filteredItems = useMemo<AuthorizationItem[]>(() => {
    if (insuranceTypeFilter.length === 0) return items;
    return items.filter((item: AuthorizationItem) => insuranceTypeFilter.includes(resolveInsuranceName(item)));
  }, [items, insuranceTypeFilter]);

  const insuranceTypeOptions = useMemo(() => {
    const unique = Array.from(new Set(items.map((item: AuthorizationItem) => resolveInsuranceName(item)).filter(Boolean)));
    const withoutParticular = unique
      .filter((name): name is string => typeof name === 'string' && name.toLowerCase() !== 'particular')
      .sort((a, b) => a.localeCompare(b, 'pt-BR'));
    const hasParticular = unique.some((name) => typeof name === 'string' && name.toLowerCase() === 'particular');
    const ordered = hasParticular ? [...withoutParticular, 'Particular'] : withoutParticular;
    return ordered.map((name): { value: string; label: string } => ({ value: name, label: name }));
  }, [items]);
  const [openingAttachmentId, setOpeningAttachmentId] = useState<string | null>(null);

  const summary = useMemo(() => {
    return filteredItems.reduce((acc: { pending: number; authorized: number; denied: number }, item: AuthorizationItem) => {
      if (item.status === 'PENDING') acc.pending += 1;
      if (item.status === 'AUTHORIZED') acc.authorized += 1;
      if (item.status === 'DENIED') acc.denied += 1;
      return acc;
    }, { pending: 0, authorized: 0, denied: 0 });
  }, [filteredItems]);
  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(filteredItems.length / pageSize)),
    [filteredItems.length, pageSize],
  );
  const paginatedItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, pageSize, page]);

  const tableLoading = loading && items.length === 0;

  useEffect(() => {
    setPage(1);
  }, [search, sourceFilter, statusFilter, insuranceTypeFilter, pageSize]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  useEffect(() => {
    if (!error) return;
    const err: any = error;
    showNotification({
      title: 'Erro',
      message: resolveApiErrorMessage(err, 'Erro ao carregar autorizações'),
      color: 'red',
    });
  }, [error]);

  const handleUpdateStatus = async (
    item: AuthorizationItem,
    status: ConvenioAuthorizationStatus,
  ) => {
    const rowKey = `${item.sourceType}-${item.id}`;
    setUpdatingKey(rowKey);
    try {
      await convenioAuthorizationService.updateStatus(item.sourceType, item.id, {
        status,
        notes: item.notes || undefined,
      });
      showNotification({
        title: 'Status atualizado',
        message: `${item.patientName || 'Item'} atualizado para ${STATUS_OPTIONS.find((it) => it.value === status)?.label || status}.`,
        color: 'green',
      });
      await queryClient.invalidateQueries({ queryKey: queryKeys.convenioAuthorizations });
    } catch (err: any) {
      showNotification({
        title: 'Erro',
        message: resolveApiErrorMessage(err, 'Falha ao atualizar autorização'),
        color: 'red',
      });
    } finally {
      setUpdatingKey(null);
    }
  };

  const fileToBase64 = async (file: File) => new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const handleAttachmentSelect = async (item: AuthorizationItem, file: File | null) => {
    if (!file) return;
    const rowKey = `${item.sourceType}-${item.id}`;
    setUpdatingKey(rowKey);
    try {
      const fileBase64 = await fileToBase64(file);
      await convenioAuthorizationService.uploadAttachment(item.sourceType, item.id, {
        fileName: file.name,
        fileBase64,
        mimeType: file.type || undefined,
      });
      showNotification({
        title: 'Anexo enviado',
        message: `${file.name} anexado com sucesso.`,
        color: 'green',
      });
      await queryClient.invalidateQueries({ queryKey: queryKeys.convenioAuthorizations });
    } catch (err: any) {
      showNotification({
        title: 'Erro ao anexar',
        message: resolveApiErrorMessage(err, 'Falha ao anexar documento'),
        color: 'red',
      });
    } finally {
      setUpdatingKey(null);
    }
  };

  const handleOpenAttachment = async (attachmentId: string) => {
    setOpeningAttachmentId(attachmentId);
    try {
      const blob = await convenioAuthorizationService.viewAttachment(attachmentId);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener,noreferrer');
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (err: any) {
      showNotification({
        title: 'Erro ao abrir anexo',
        message: resolveApiErrorMessage(err, 'Não foi possível abrir o anexo.'),
        color: 'red',
      });
    } finally {
      setOpeningAttachmentId(null);
    }
  };

  const closeUploadPreview = () => {
    setUploadPreview((prev) => {
      if (prev?.objectUrl) {
        URL.revokeObjectURL(prev.objectUrl);
      }
      return null;
    });
  };

  const openUploadPreview = (item: AuthorizationItem, file: File | null) => {
    if (!file) return;
    const previewable = file.type.startsWith('image/') || file.type === 'application/pdf';
    const objectUrl = previewable ? URL.createObjectURL(file) : null;
    setUploadPreview({ item, file, objectUrl });
  };

  const confirmUploadPreview = () => {
    if (!uploadPreview) return;
    handleAttachmentSelect(uploadPreview.item, uploadPreview.file);
    closeUploadPreview();
  };

  return (
    <Box className="autorizacao-convenio-page" bg="var(--mantine-color-body)" style={{ minHeight: '100vh' }}>
      <Header back={{ label: 'Voltar', onClick: () => navigate(-1) }} />

      <Modal
        opened={Boolean(uploadPreview)}
        onClose={closeUploadPreview}
        title="Confirmar envio de documento"
        centered
        size="xl"
        footer={(
          <Group justify="flex-end" gap="xs">
            <Button variant="default" onClick={closeUploadPreview}>
              Cancelar envio
            </Button>
            <Button onClick={confirmUploadPreview} leftSection={<Upload size={14} />}>
              Confirmar envio
            </Button>
          </Group>
        )}
      >
        <Stack gap="sm">
          <Text size="sm" c="dimmed">
            Confira o documento selecionado antes de confirmar o envio.
          </Text>

          {uploadPreview && (
            <Paper className="autorizacao-convenio-preview-box" withBorder p="xs">
              <Stack gap={6}>
                <Text size="sm" fw={600} lineClamp={1}>{uploadPreview.file.name}</Text>
                <Text size="xs" c="dimmed">
                  {(uploadPreview.file.size / 1024).toFixed(1)} KB
                  {uploadPreview.file.type ? ` • ${uploadPreview.file.type}` : ''}
                </Text>

                {uploadPreview.objectUrl && uploadPreview.file.type.startsWith('image/') && (
                  <Box className="autorizacao-convenio-preview-box" style={{ maxHeight: '50vh', overflow: 'auto' }}>
                    <img
                      src={uploadPreview.objectUrl}
                      alt={uploadPreview.file.name}
                      style={{ width: '100%', height: 'auto', display: 'block', borderRadius: 4 }}
                    />
                  </Box>
                )}

                {uploadPreview.objectUrl && uploadPreview.file.type === 'application/pdf' && (
                  <Box className="autorizacao-convenio-preview-box" style={{ overflow: 'hidden', height: '50vh' }}>
                    <iframe
                      src={uploadPreview.objectUrl}
                      title={uploadPreview.file.name}
                      style={{ width: '100%', height: '100%', border: 'none' }}
                    />
                  </Box>
                )}

                {!uploadPreview.objectUrl && (
                  <Text size="sm" c="dimmed">
                    Pré-visualização não disponível para este tipo de arquivo. Você pode confirmar o envio ou cancelar.
                  </Text>
                )}
              </Stack>
            </Paper>
          )}
        </Stack>
      </Modal>

      <Box className="autorizacao-convenio-content" p={isMobile ? 'sm' : isTablet ? 'md' : 'xl'} maw={isMobile ? '100%' : 1400} mx="auto" w="100%">
        <Group className="autorizacao-convenio-hero" justify="space-between" align="flex-end" mb="xl" wrap="wrap">
          <Box>
            <Text className="autorizacao-convenio-eyebrow">OPERAÇÃO CLÍNICA · CONVÊNIOS</Text>
            <Text className="autorizacao-convenio-title" fw={700} size="2xl">Autorização de Convênio</Text>
            <Text className="autorizacao-convenio-subtitle" size="sm">Central de autorização de agendamentos e Terapias</Text>
          </Box>

          <Group className="autorizacao-convenio-hero-meta" gap="xs" wrap="wrap">
            <Badge color="yellow" variant="light">Pendentes: {summary.pending}</Badge>
            <Badge color="teal" variant="light">Autorizados: {summary.authorized}</Badge>
            <Badge color="red" variant="light">Negados: {summary.denied}</Badge>
          </Group>
        </Group>

        <Stack gap="lg">
          <Box className="autorizacao-convenio-search-panel">
            <Text className="autorizacao-convenio-search-kicker">BUSCAR E FILTRAR</Text>
            <Group align="flex-end" gap="md" wrap="wrap">
              <Box className="autorizacao-convenio-search-input">
                <TextInput
                  label="Buscar autorizações"
                  placeholder="Buscar por paciente, CPF, procedimento, médico ou sala"
                  value={search}
                  onChange={(e) => setSearch(e.currentTarget.value)}
                  leftSection={<Search size={17} aria-hidden="true" />}
                />
              </Box>
              <Box className="autorizacao-convenio-filter-field">
                <MultiSelect
                  label="Origem"
                  placeholder="Todas"
                  data={[
                    { value: 'APPOINTMENT', label: 'Agendamento' },
                    { value: 'TEA', label: 'Pré-reserva de Terapias' },
                  ]}
                  value={sourceFilter}
                  onChange={(value) => setSourceFilter(value as ConvenioAuthorizationSourceType[])}
                  clearable
                />
              </Box>
              <Box className="autorizacao-convenio-filter-field">
                <MultiSelect
                  label="Status"
                  placeholder="Todos"
                  data={STATUS_OPTIONS}
                  value={statusFilter}
                  onChange={(value) => setStatusFilter(value as ConvenioAuthorizationStatus[])}
                  clearable
                />
              </Box>
              <Box className="autorizacao-convenio-filter-field">
                <MultiSelect
                  label="Convênio"
                  placeholder="Todos"
                  data={insuranceTypeOptions}
                  value={insuranceTypeFilter}
                  onChange={(value) => setInsuranceTypeFilter(value as string[])}
                  clearable
                />
              </Box>
            </Group>
          </Box>

          <Paper className="autorizacao-convenio-panel" p="md">
            <PaginatedGrid
              totalItems={filteredItems.length}
              page={page}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
              isMobile={isMobile}
              maxHeight={isMobile ? 500 : 620}
              showFooter={!tableLoading}
            >
                <Table className="autorizacao-convenio-table" verticalSpacing="sm" horizontalSpacing="md">
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Paciente</Table.Th>
                      <Table.Th style={{ width: 132 }}>Convênio</Table.Th>
                      <Table.Th>Procedimento</Table.Th>
                      <Table.Th>Médico</Table.Th>
                      <Table.Th>Data/Hora</Table.Th>
                      <Table.Th style={{ width: 124 }}>Status</Table.Th>
                      <Table.Th style={{ width: 148 }}>Ação</Table.Th>
                      <Table.Th style={{ width: 116 }}>Anexo</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {tableLoading ? (
                      Array.from({ length: 5 }).map((_, index) => (
                        <Table.Tr key={`authorization-skeleton-${index}`}>
                          <Table.Td>
                            <Stack gap={6}>
                              <Skeleton height={16} width="60%" radius="sm" />
                              <Skeleton height={12} width="40%" radius="sm" />
                            </Stack>
                          </Table.Td>
                          <Table.Td><Skeleton height={24} width={90} radius="xl" /></Table.Td>
                          <Table.Td><Skeleton height={16} width="75%" radius="sm" /></Table.Td>
                          <Table.Td><Skeleton height={16} width="70%" radius="sm" /></Table.Td>
                          <Table.Td><Skeleton height={16} width="65%" radius="sm" /></Table.Td>
                          <Table.Td><Skeleton height={24} width={95} radius="xl" /></Table.Td>
                          <Table.Td><Skeleton height={30} width={130} radius="sm" /></Table.Td>
                          <Table.Td><Skeleton height={32} width={118} radius="sm" /></Table.Td>
                        </Table.Tr>
                      ))
                    ) : filteredItems.length === 0 ? (
                      <Table.Tr>
                        <Table.Td colSpan={8}>
                          <Stack align="center" py="lg" gap={6}>
                            <Text fw={600} size="sm">Nenhuma autorização encontrada</Text>
                            <Text size="sm" c="dimmed">Ajuste os filtros ou aguarde novos pedidos entrarem na fila de autorização.</Text>
                          </Stack>
                        </Table.Td>
                      </Table.Tr>
                    ) : (
                      paginatedItems.map((item: AuthorizationItem) => {
                        const rowKey = `${item.sourceType}-${item.id}`;
                        const resolvedInsuranceName = resolveInsuranceName(item);
                        return (
                          <Table.Tr key={rowKey}>
                            <Table.Td>
                              <Stack gap={0}>
                                <Text size="sm" fw={600}>{item.patientName || '-'}</Text>
                                {item.patientCpf && <Text size="xs" c="dimmed">{formatCPF(item.patientCpf)}</Text>}
                              </Stack>
                            </Table.Td>
                            <Table.Td style={{ width: 132 }}>
                              <Badge
                                variant="light"
                                color={resolvedInsuranceName.toLowerCase() === 'particular' ? 'gray' : 'blue'}
                                style={{ whiteSpace: 'nowrap' }}
                              >
                                {resolvedInsuranceName}
                              </Badge>
                            </Table.Td>
                            <Table.Td><Text size="sm">{item.procedureName || '-'}</Text></Table.Td>
                            <Table.Td><Text size="sm">{item.doctorName || '-'}</Text></Table.Td>
                            <Table.Td>
                              {item.sourceType === 'TEA' ? (
                                <Stack gap={0}>
                                  <Text size="sm">Recorrência semanal</Text>
                                  <Text size="xs" c="dimmed">{item.sessionsCount || 0} sessão(ões) no lote</Text>
                                </Stack>
                              ) : (
                                <Stack gap={0}>
                                  <Text size="sm">
                                    {item.date ? dayjs(item.date).format('DD/MM/YYYY') : '-'}
                                  </Text>
                                  <Text size="xs" c="dimmed">
                                    {item.time || 'Sem horário'}
                                  </Text>
                                </Stack>
                              )}
                            </Table.Td>
                            <Table.Td style={{ width: 124 }}>
                              <Badge
                                color={STATUS_COLOR[item.status as ConvenioAuthorizationStatus]}
                                variant="light"
                                style={{ whiteSpace: 'nowrap' }}
                              >
                                {STATUS_OPTIONS.find((opt) => opt.value === item.status)?.label || item.status}
                              </Badge>
                            </Table.Td>
                            <Table.Td style={{ width: 148 }}>
                              <Select
                                className="autorizacao-convenio-status-select"
                                size="xs"
                                placeholder="Alterar"
                                data={STATUS_OPTIONS}
                                value={item.status}
                                onChange={(value) => {
                                  if (!value) return;
                                  handleUpdateStatus(item, value as ConvenioAuthorizationStatus);
                                }}
                                disabled={updatingKey === rowKey}
                                leftSection={<ShieldCheck size={14} />}
                              />
                            </Table.Td>
                            <Table.Td style={{ width: 116 }}>
                              <Stack gap={4}>
                                <Button
                                  component="label"
                                  className="autorizacao-convenio-attach-button"
                                  size="xs"
                                  variant="light"
                                  color="indigo"
                                  leftSection={<Upload size={14} />}
                                  disabled={updatingKey === rowKey}
                                >
                                  Anexar
                                  <input
                                    type="file"
                                    hidden
                                    accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                                    onChange={(e) => {
                                      const file = e.currentTarget.files?.[0] || null;
                                      openUploadPreview(item, file);
                                      e.currentTarget.value = '';
                                    }}
                                  />
                                </Button>
                                {(item.attachmentsCount || 0) > 0 && (
                                  <Text size="xs" c="dimmed">{item.attachmentsCount} anexo(s)</Text>
                                )}
                                {(item.attachments || []).slice(0, 3).map((doc: ConvenioAuthorizationAttachment) => (
                                  <Group key={doc.id} gap={4} wrap="nowrap">
                                    <Text size="xs" c="dimmed" lineClamp={1}>{doc.fileName}</Text>
                                    <ActionIcon
                                      size="xs"
                                      variant="subtle"
                                      color="blue"
                                      onClick={() => handleOpenAttachment(doc.id)}
                                      loading={openingAttachmentId === doc.id}
                                      title="Visualizar anexo"
                                    >
                                      <Eye size={12} />
                                    </ActionIcon>
                                  </Group>
                                ))}
                              </Stack>
                            </Table.Td>
                          </Table.Tr>
                        );
                      })
                    )}
                  </Table.Tbody>
                </Table>
            </PaginatedGrid>
          </Paper>
        </Stack>
      </Box>
    </Box>
  );
}
