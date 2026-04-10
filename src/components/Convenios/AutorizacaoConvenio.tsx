import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Group,
  Paper,
  Skeleton,
  Select,
  Stack,
  Table,
  Text,
  Modal,
  useMantineColorScheme,
} from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { showNotification } from '@mantine/notifications';
import { ChevronLeft, ShieldCheck, Upload } from 'lucide-react';
import dayjs from 'dayjs';
import { Header } from '../Header/Header';
import { DARK_BLUE } from '../../themes/theme';
import { FloatingInput } from '../common/FloatingInput';
import { FloatingMultiSelect } from '../common/FloatingMultiSelect';
import convenioAuthorizationService, {
  type ConvenioAuthorizationAttachment,
  type ConvenioAuthorizationSourceType,
  type ConvenioAuthorizationStatus,
} from '../../services/convenioAuthorizationService';
import { useConvenioAuthorizationsQuery } from '../../hooks/useConvenioAuthorizationsQuery';
import { queryKeys } from '../../lib/queryKeys';
import { resolveApiErrorMessage } from '../../lib/apiError';

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
  const { colorScheme } = useMantineColorScheme();
  const titleColor = colorScheme === 'dark' ? 'var(--mantine-color-text)' : DARK_BLUE;

  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState<ConvenioAuthorizationSourceType[]>([]);
  const [statusFilter, setStatusFilter] = useState<ConvenioAuthorizationStatus[]>([]);
  const [insuranceTypeFilter, setInsuranceTypeFilter] = useState<string[]>([]);
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

  const tableLoading = loading && items.length === 0;

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
    <Box bg="var(--mantine-color-body)" style={{ minHeight: '100vh' }}>
      <Header />

      <Modal
        opened={Boolean(uploadPreview)}
        onClose={closeUploadPreview}
        title="Confirmar envio de documento"
        centered
        size="xl"
      >
        <Stack gap="sm">
          <Text size="sm" c="dimmed">
            Confira o documento selecionado antes de confirmar o envio.
          </Text>

          {uploadPreview && (
            <Paper p="xs" withBorder style={{ borderColor: 'var(--mantine-color-default-border)' }}>
              <Stack gap={6}>
                <Text size="sm" fw={600} lineClamp={1}>{uploadPreview.file.name}</Text>
                <Text size="xs" c="dimmed">
                  {(uploadPreview.file.size / 1024).toFixed(1)} KB
                  {uploadPreview.file.type ? ` • ${uploadPreview.file.type}` : ''}
                </Text>

                {uploadPreview.objectUrl && uploadPreview.file.type.startsWith('image/') && (
                  <Box
                    style={{
                      border: '1px solid var(--mantine-color-default-border)',
                      borderRadius: 6,
                      padding: 8,
                      maxHeight: '60vh',
                      overflow: 'auto',
                    }}
                  >
                    <img
                      src={uploadPreview.objectUrl}
                      alt={uploadPreview.file.name}
                      style={{ width: '100%', height: 'auto', display: 'block', borderRadius: 4 }}
                    />
                  </Box>
                )}

                {uploadPreview.objectUrl && uploadPreview.file.type === 'application/pdf' && (
                  <Box
                    style={{
                      border: '1px solid var(--mantine-color-default-border)',
                      borderRadius: 6,
                      overflow: 'hidden',
                      height: '60vh',
                    }}
                  >
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

          <Group justify="flex-end" gap="xs">
            <Button variant="default" onClick={closeUploadPreview}>
              Cancelar envio
            </Button>
            <Button color="indigo" onClick={confirmUploadPreview} leftSection={<Upload size={14} />}>
              Confirmar envio
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Box p={isMobile ? 'sm' : isTablet ? 'md' : 'xl'} maw={isMobile ? '100%' : 1400} mx="auto" w="100%">
        <Group mb={isMobile ? 20 : 30} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Group align="center">
            <ActionIcon variant="default" color="black" size="xl" onClick={() => navigate('/dashboard')}>
              <ChevronLeft size={28} />
            </ActionIcon>
            <Box>
              <Text fw={600} size={isMobile ? 'md' : 'lg'} c="var(--mantine-color-text)">Autorização de Convênio</Text>
              <Text size="sm" c="dimmed">Central de autorização de agendamentos e TEA</Text>
            </Box>
          </Group>
        </Group>

        <Paper p="md" withBorder style={{ borderColor: 'var(--mantine-color-default-border)' }}>
          <Stack gap="md">
            <Group wrap="wrap" gap="xs">
              <Badge color="yellow" variant="light">Pendentes: {summary.pending}</Badge>
              <Badge color="teal" variant="light">Autorizados: {summary.authorized}</Badge>
              <Badge color="red" variant="light">Negados: {summary.denied}</Badge>
            </Group>

            <FloatingInput
              label="Buscar autorizações"
              placeholder="Buscar por paciente, CPF, procedimento, médico ou sala"
              value={search}
              onChange={(e) => setSearch(e.currentTarget.value)}
            />

            <Group grow>
              <FloatingMultiSelect
                label="Origem"
                data={[
                  { value: 'APPOINTMENT', label: 'Agendamento' },
                  { value: 'TEA', label: 'Pré-reserva TEA' },
                ]}
                value={sourceFilter}
                onChange={(value) => setSourceFilter(value as ConvenioAuthorizationSourceType[])}
                clearable
              />
              <FloatingMultiSelect
                label="Status"
                data={STATUS_OPTIONS}
                value={statusFilter}
                onChange={(value) => setStatusFilter(value as ConvenioAuthorizationStatus[])}
                clearable
              />
              <FloatingMultiSelect
                label="Convênio"
                data={insuranceTypeOptions}
                value={insuranceTypeFilter}
                onChange={(value) => setInsuranceTypeFilter(value as string[])}
                clearable
              />
            </Group>

            <Box style={{ overflowX: 'auto', border: '1px solid var(--mantine-color-default-border)', borderRadius: 6 }}>
                <Table verticalSpacing="sm" horizontalSpacing="md">
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Origem</Table.Th>
                      <Table.Th>Paciente</Table.Th>
                      <Table.Th style={{ width: 132 }}>Convênio</Table.Th>
                      <Table.Th>Procedimento</Table.Th>
                      <Table.Th>Médico</Table.Th>
                      <Table.Th>Sala</Table.Th>
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
                          <Table.Td><Skeleton height={24} width={100} radius="xl" /></Table.Td>
                          <Table.Td>
                            <Stack gap={6}>
                              <Skeleton height={16} width="60%" radius="sm" />
                              <Skeleton height={12} width="40%" radius="sm" />
                            </Stack>
                          </Table.Td>
                          <Table.Td><Skeleton height={24} width={90} radius="xl" /></Table.Td>
                          <Table.Td><Skeleton height={16} width="75%" radius="sm" /></Table.Td>
                          <Table.Td><Skeleton height={16} width="70%" radius="sm" /></Table.Td>
                          <Table.Td><Skeleton height={16} width="80%" radius="sm" /></Table.Td>
                          <Table.Td><Skeleton height={16} width="65%" radius="sm" /></Table.Td>
                          <Table.Td><Skeleton height={24} width={95} radius="xl" /></Table.Td>
                          <Table.Td><Skeleton height={30} width={130} radius="sm" /></Table.Td>
                          <Table.Td><Skeleton height={32} width={118} radius="sm" /></Table.Td>
                        </Table.Tr>
                      ))
                    ) : filteredItems.length === 0 ? (
                      <Table.Tr>
                        <Table.Td colSpan={10}>
                          <Stack align="center" py="lg" gap={6}>
                            <Text fw={600} size="sm">Nenhuma autorização encontrada</Text>
                            <Text size="sm" c="dimmed">Ajuste os filtros ou aguarde novos pedidos entrarem na fila de autorização.</Text>
                          </Stack>
                        </Table.Td>
                      </Table.Tr>
                    ) : (
                      filteredItems.map((item: AuthorizationItem) => {
                        const rowKey = `${item.sourceType}-${item.id}`;
                        const resolvedInsuranceName = resolveInsuranceName(item);
                        return (
                          <Table.Tr key={rowKey}>
                            <Table.Td>
                              <Badge variant="outline" color={item.sourceType === 'TEA' ? 'violet' : 'blue'}>
                                {item.sourceType === 'TEA' ? 'Pré-Reserva' : 'Agendamento'}
                              </Badge>
                            </Table.Td>
                            <Table.Td>
                              <Stack gap={0}>
                                <Text size="sm" fw={600}>{item.patientName || '-'}</Text>
                                {item.patientCpf && <Text size="xs" c="dimmed">{item.patientCpf}</Text>}
                              </Stack>
                            </Table.Td>
                            <Table.Td style={{ width: 132 }}>
                              <Badge
                                variant="light"
                                color={resolvedInsuranceName.toLowerCase() === 'particular' ? 'gray' : 'blue'}
                                styles={{
                                  root: { whiteSpace: 'nowrap' },
                                  label: { whiteSpace: 'nowrap' },
                                }}
                              >
                                {resolvedInsuranceName}
                              </Badge>
                            </Table.Td>
                            <Table.Td><Text size="sm">{item.procedureName || '-'}</Text></Table.Td>
                            <Table.Td><Text size="sm">{item.doctorName || '-'}</Text></Table.Td>
                            <Table.Td>
                              <Text size="sm" lineClamp={2}>{item.roomName || '-'}</Text>
                            </Table.Td>
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
                                styles={{
                                  root: { whiteSpace: 'nowrap' },
                                  label: { whiteSpace: 'nowrap' },
                                }}
                              >
                                {STATUS_OPTIONS.find((opt) => opt.value === item.status)?.label || item.status}
                              </Badge>
                            </Table.Td>
                            <Table.Td style={{ width: 148 }}>
                              <Select
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
                                styles={{
                                  input: {
                                    minWidth: 132,
                                    width: 132,
                                  },
                                }}
                              />
                            </Table.Td>
                            <Table.Td style={{ width: 116 }}>
                              <Stack gap={4}>
                                <Button
                                  component="label"
                                  size="xs"
                                  variant="light"
                                  color="indigo"
                                  leftSection={<Upload size={14} />}
                                  disabled={updatingKey === rowKey}
                                  styles={{
                                    root: {
                                      minWidth: 96,
                                      width: 96,
                                      paddingInline: 8,
                                    },
                                    label: {
                                      fontSize: 12,
                                    },
                                  }}
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
                                      <Upload size={12} />
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
              </Box>
          </Stack>
        </Paper>
      </Box>
    </Box>
  );
}
