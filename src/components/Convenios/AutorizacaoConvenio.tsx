import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Group,
  Loader,
  MultiSelect,
  Paper,
  Select,
  Stack,
  Table,
  Text,
  TextInput,
  useMantineColorScheme,
} from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { showNotification } from '@mantine/notifications';
import { ChevronLeft, RefreshCcw, ShieldCheck, Upload } from 'lucide-react';
import dayjs from 'dayjs';
import { Header } from '../Header/Header';
import { DARK_BLUE } from '../../themes/theme';
import convenioAuthorizationService, {
  type ConvenioAuthorizationAttachment,
  type ConvenioAuthorizationSourceType,
  type ConvenioAuthorizationStatus,
} from '../../services/convenioAuthorizationService';

type AuthorizationItem = {
  id: string;
  sourceType: ConvenioAuthorizationSourceType;
  sourceLabel: string;
  patientName: string;
  patientCpf?: string;
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

export function AutorizacaoConvenio() {
  const navigate = useNavigate();
  const isMobile = useMediaQuery('(max-width: 799px)');
  const { colorScheme } = useMantineColorScheme();
  const titleColor = colorScheme === 'dark' ? 'var(--mantine-color-text)' : DARK_BLUE;

  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<AuthorizationItem[]>([]);
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState<ConvenioAuthorizationSourceType[]>([]);
  const [statusFilter, setStatusFilter] = useState<ConvenioAuthorizationStatus[]>([]);
  const [updatingKey, setUpdatingKey] = useState<string | null>(null);
  const [openingAttachmentId, setOpeningAttachmentId] = useState<string | null>(null);

  const summary = useMemo(() => {
    return items.reduce((acc, item) => {
      if (item.status === 'PENDING') acc.pending += 1;
      if (item.status === 'AUTHORIZED') acc.authorized += 1;
      if (item.status === 'DENIED') acc.denied += 1;
      return acc;
    }, { pending: 0, authorized: 0, denied: 0 });
  }, [items]);

  const loadItems = async () => {
    setLoading(true);
    try {
      const data: any = await convenioAuthorizationService.list({
        search,
        statuses: statusFilter,
        sourceTypes: sourceFilter,
        limit: 5000,
        offset: 0,
      });

      const mapped = Array.isArray(data?.items) ? data.items : [];
      setItems(mapped);
    } catch (err: any) {
      showNotification({
        title: 'Erro',
        message: err?.response?.data?.message || err?.message || 'Erro ao carregar autorizações',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
  }, [search, JSON.stringify(sourceFilter), JSON.stringify(statusFilter)]);

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
      await loadItems();
    } catch (err: any) {
      showNotification({
        title: 'Erro',
        message: err?.response?.data?.message || err?.message || 'Falha ao atualizar autorização',
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
      await loadItems();
    } catch (err: any) {
      showNotification({
        title: 'Erro ao anexar',
        message: err?.response?.data?.message || err?.response?.data?.error || err?.message || 'Falha ao anexar documento',
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
        message: err?.response?.data?.message || err?.response?.data?.error || err?.message || 'Não foi possível abrir o anexo.',
        color: 'red',
      });
    } finally {
      setOpeningAttachmentId(null);
    }
  };

  return (
    <Box bg="var(--mantine-color-body)" style={{ minHeight: '100vh' }}>
      <Header />

      <Box p={isMobile ? 'sm' : 'xl'} w="100%">
        <Group justify="space-between" align="center" mb="md" wrap="wrap">
          <Group>
            <ActionIcon variant="default" size="lg" onClick={() => navigate('/dashboard')}>
              <ChevronLeft size={18} />
            </ActionIcon>
            <Box>
              <Text fw={700} size="lg" c={titleColor}>Autorização de Convênio</Text>
              <Text size="sm" c="dimmed">Central de autorização de Agendamentos e TEA</Text>
            </Box>
          </Group>

          <Button
            variant="light"
            color="indigo"
            leftSection={<RefreshCcw size={16} />}
            onClick={loadItems}
            loading={loading}
          >
            Atualizar
          </Button>
        </Group>

        <Paper p="md" withBorder style={{ borderColor: 'var(--mantine-color-default-border)' }}>
          <Stack gap="md">
            <Group wrap="wrap" gap="xs">
              <Badge color="yellow" variant="light">Pendentes: {summary.pending}</Badge>
              <Badge color="teal" variant="light">Autorizados: {summary.authorized}</Badge>
              <Badge color="red" variant="light">Negados: {summary.denied}</Badge>
            </Group>

            <TextInput
              placeholder="Buscar por paciente, CPF, procedimento, médico ou sala"
              value={search}
              onChange={(e) => setSearch(e.currentTarget.value)}
            />

            <Group grow>
              <MultiSelect
                label="Origem"
                placeholder="Filtrar origem"
                data={[
                  { value: 'APPOINTMENT', label: 'Agendamento' },
                  { value: 'TEA', label: 'Pré-reserva TEA' },
                ]}
                value={sourceFilter}
                onChange={(value) => setSourceFilter(value as ConvenioAuthorizationSourceType[])}
                clearable
              />
              <MultiSelect
                label="Status"
                placeholder="Filtrar status"
                data={STATUS_OPTIONS}
                value={statusFilter}
                onChange={(value) => setStatusFilter(value as ConvenioAuthorizationStatus[])}
                clearable
              />
            </Group>

            {loading ? (
              <Group justify="center" py="lg"><Loader size="sm" /></Group>
            ) : (
              <Box style={{ overflowX: 'auto', border: '1px solid var(--mantine-color-default-border)', borderRadius: 6 }}>
                <Table verticalSpacing="sm" horizontalSpacing="md">
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Origem</Table.Th>
                      <Table.Th>Paciente</Table.Th>
                      <Table.Th>Procedimento</Table.Th>
                      <Table.Th>Médico</Table.Th>
                      <Table.Th>Sala</Table.Th>
                      <Table.Th>Lote TEA</Table.Th>
                      <Table.Th>Data/Hora</Table.Th>
                      <Table.Th>Status</Table.Th>
                      <Table.Th>Ação</Table.Th>
                      <Table.Th>Anexo</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {items.length === 0 ? (
                      <Table.Tr>
                        <Table.Td colSpan={10}>
                          <Text size="sm" c="dimmed" ta="center" py="md">Nenhuma autorização encontrada</Text>
                        </Table.Td>
                      </Table.Tr>
                    ) : (
                      items.map((item) => {
                        const rowKey = `${item.sourceType}-${item.id}`;
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
                            <Table.Td><Text size="sm">{item.procedureName || '-'}</Text></Table.Td>
                            <Table.Td><Text size="sm">{item.doctorName || '-'}</Text></Table.Td>
                            <Table.Td><Text size="sm">{item.roomName || '-'}</Text></Table.Td>
                            <Table.Td>
                              {item.sourceType === 'TEA' && (
                                <Text size="xs" c="dimmed">
                                  {item.sessionsCount || 0} sessão(ões) no lote
                                </Text>
                              )}
                            </Table.Td>
                            <Table.Td>
                              {item.sourceType === 'TEA' ? (
                                <Text size="sm" c="dimmed">Recorrência semanal (lote)</Text>
                              ) : (
                                <Text size="sm">
                                  {item.date ? dayjs(item.date).format('DD/MM/YYYY') : '-'}
                                  {item.time ? ` • ${item.time}` : ''}
                                </Text>
                              )}
                            </Table.Td>
                            <Table.Td>
                              <Badge color={STATUS_COLOR[item.status]} variant="light">
                                {STATUS_OPTIONS.find((opt) => opt.value === item.status)?.label || item.status}
                              </Badge>
                            </Table.Td>
                            <Table.Td>
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
                              />
                            </Table.Td>
                            <Table.Td>
                              <Stack gap={4}>
                                <Button
                                  component="label"
                                  size="xs"
                                  variant="light"
                                  color="indigo"
                                  leftSection={<Upload size={14} />}
                                  disabled={updatingKey === rowKey}
                                >
                                  Enviar documento
                                  <input
                                    type="file"
                                    hidden
                                    accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                                    onChange={(e) => {
                                      const file = e.currentTarget.files?.[0] || null;
                                      handleAttachmentSelect(item, file);
                                      e.currentTarget.value = '';
                                    }}
                                  />
                                </Button>
                                {(item.attachmentsCount || 0) > 0 && (
                                  <Text size="xs" c="dimmed">{item.attachmentsCount} anexo(s)</Text>
                                )}
                                {(item.attachments || []).slice(0, 3).map((doc) => (
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
            )}
          </Stack>
        </Paper>
      </Box>
    </Box>
  );
}
