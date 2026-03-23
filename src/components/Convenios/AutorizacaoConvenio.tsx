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
  Modal,
  useMantineColorScheme,
} from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { showNotification } from '@mantine/notifications';
import { ChevronLeft, RefreshCcw, ShieldCheck, Upload, X } from 'lucide-react';
import dayjs from 'dayjs';
import { Header } from '../Header/Header';
import { DARK_BLUE } from '../../themes/theme';
import convenioAuthorizationService, {
  type ConvenioAuthorizationSourceType,
  type ConvenioAuthorizationStatus,
} from '../../services/convenioAuthorizationService';

type AuthorizationItem = {
  id: string;
  sourceType: ConvenioAuthorizationSourceType;
  sourceLabel: string;
  patientName: string;
  patientCpf?: string;
  insuranceType?: 'CONVENIO' | 'PARTICULAR';
  procedureName?: string;
  doctorName?: string;
  roomName?: string | null;
  date?: string;
  time?: string;
  status: ConvenioAuthorizationStatus;
  notes?: string | null;
  updatedAt?: string;
  sessionsCount?: number;
};

type InsuranceType = 'CONVENIO' | 'PARTICULAR';

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

const sanitizeAuthorizationNotes = (value?: string | null) => (
  String(value || '')
    .replace(/\[AUTH_DENIED\]\s*/g, '')
    .trim()
);

const resolveInsuranceType = (item: AuthorizationItem): InsuranceType => (
  item.insuranceType || (item.sourceType === 'TEA' ? 'CONVENIO' : 'PARTICULAR')
);

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
  const [insuranceTypeFilter, setInsuranceTypeFilter] = useState<InsuranceType[]>([]);
  const [updatingKey, setUpdatingKey] = useState<string | null>(null);
  const [attachmentByRowKey, setAttachmentByRowKey] = useState<Record<string, string>>({});
  const [, setAttachmentFileByRowKey] = useState<Record<string, File | null>>({});
  const [uploadPreview, setUploadPreview] = useState<{
    rowKey: string;
    file: File;
    objectUrl: string | null;
  } | null>(null);

  const filteredItems = useMemo(() => {
    if (insuranceTypeFilter.length === 0) return items;
    return items.filter((item) => insuranceTypeFilter.includes(resolveInsuranceType(item)));
  }, [items, insuranceTypeFilter]);

  const summary = useMemo(() => {
    return filteredItems.reduce((acc, item) => {
      if (item.status === 'PENDING') acc.pending += 1;
      if (item.status === 'AUTHORIZED') acc.authorized += 1;
      if (item.status === 'DENIED') acc.denied += 1;
      return acc;
    }, { pending: 0, authorized: 0, denied: 0 });
  }, [filteredItems]);

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

  useEffect(() => {
    setAttachmentByRowKey((prev) => {
      const next = { ...prev };
      items.forEach((item) => {
        const rowKey = `${item.sourceType}-${item.id}`;
        if (next[rowKey] === undefined) {
          next[rowKey] = sanitizeAuthorizationNotes(item.notes);
        }
      });
      return next;
    });
  }, [items]);

  const handleUpdateStatus = async (
    item: AuthorizationItem,
    status: ConvenioAuthorizationStatus,
  ) => {
    const rowKey = `${item.sourceType}-${item.id}`;
    const attachment = String(attachmentByRowKey[rowKey] || '').trim();
    setUpdatingKey(rowKey);
    try {
      await convenioAuthorizationService.updateStatus(item.sourceType, item.id, {
        status,
        notes: attachment || undefined,
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

  const handleAttachmentSelect = (rowKey: string, file: File | null) => {
    setAttachmentFileByRowKey((prev) => ({ ...prev, [rowKey]: file }));
    setAttachmentByRowKey((prev) => ({ ...prev, [rowKey]: file ? file.name : '' }));
  };

  const closeUploadPreview = () => {
    setUploadPreview((prev) => {
      if (prev?.objectUrl) {
        URL.revokeObjectURL(prev.objectUrl);
      }
      return null;
    });
  };

  const openUploadPreview = (rowKey: string, file: File | null) => {
    if (!file) return;
    const previewable = file.type.startsWith('image/') || file.type === 'application/pdf';
    const objectUrl = previewable ? URL.createObjectURL(file) : null;
    setUploadPreview({ rowKey, file, objectUrl });
  };

  const confirmUploadPreview = () => {
    if (!uploadPreview) return;
    handleAttachmentSelect(uploadPreview.rowKey, uploadPreview.file);
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
              <MultiSelect
                label="Tipo de Atendimento"
                placeholder="Filtrar tipo"
                data={[
                  { value: 'CONVENIO', label: 'Convênio' },
                  { value: 'PARTICULAR', label: 'Particular' },
                ]}
                value={insuranceTypeFilter}
                onChange={(value) => setInsuranceTypeFilter(value as InsuranceType[])}
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
                      <Table.Th>Tipo de Atendimento</Table.Th>
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
                    {filteredItems.length === 0 ? (
                      <Table.Tr>
                        <Table.Td colSpan={11}>
                          <Text size="sm" c="dimmed" ta="center" py="md">Nenhuma autorização encontrada</Text>
                        </Table.Td>
                      </Table.Tr>
                    ) : (
                      filteredItems.map((item) => {
                        const rowKey = `${item.sourceType}-${item.id}`;
                        const resolvedInsuranceType = resolveInsuranceType(item);
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
                            <Table.Td>
                              <Badge
                                variant="light"
                                color={resolvedInsuranceType === 'CONVENIO' ? 'blue' : 'gray'}
                              >
                                {resolvedInsuranceType === 'CONVENIO' ? 'Convênio' : 'Particular'}
                              </Badge>
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
                                      openUploadPreview(rowKey, file);
                                      e.currentTarget.value = '';
                                    }}
                                  />
                                </Button>
                                {attachmentByRowKey[rowKey] && (
                                  <Group gap={4} wrap="nowrap">
                                    <Text size="xs" c="dimmed" lineClamp={1}>{attachmentByRowKey[rowKey]}</Text>
                                    <ActionIcon
                                      size="xs"
                                      variant="subtle"
                                      color="gray"
                                      onClick={() => handleAttachmentSelect(rowKey, null)}
                                      disabled={updatingKey === rowKey}
                                      title="Remover anexo"
                                    >
                                      <X size={12} />
                                    </ActionIcon>
                                  </Group>
                                )}
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
