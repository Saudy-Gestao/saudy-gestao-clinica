import { useMemo, useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Box, Group, Text, Button, Table, Modal, Stack, Popover, ActionIcon, Paper, Menu, Switch, Skeleton, Badge } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { Plus, ChevronLeft, Calendar as CalendarIcon, MoreVertical, Settings } from 'lucide-react';
import { showNotification } from '@mantine/notifications';
import { DARK_BLUE } from '../../themes/theme';
import { Header } from '../Header/Header';
import { DatePicker } from '@mantine/dates';
import deliveryService from '../../services/deliveryService';
import facialRecognitionService from '../../services/facialRecognitionService';
import { FacialCapture } from '../common/FacialCapture';
import { formatDateInput, isValidCPF } from '../../utils/formatters';
import { useDeliveriesQuery } from '../../hooks/useDeliveriesQuery';
import { usePatientsAdminQuery } from '../../hooks/usePatientsAdminQuery';
import { queryKeys } from '../../lib/queryKeys';
import { resolveApiErrorMessage } from '../../lib/apiError';
import { FloatingInput } from '../common/FloatingInput';
import { FloatingSelect } from '../common/FloatingSelect';
import { FloatingTextarea } from '../common/FloatingTextarea';
import { PaginatedGrid } from '../common/PaginatedGrid';

interface DeliveryRow {
  id: string;
  nomeCompleto: string;
  dataHora: string;
  responsavel: string;
  status: string;
  tipo: string;
  entreguePara?: string;
  dataHoraEntrega?: string;
}

const EMPTY_DELIVERIES: any[] = [];
const EMPTY_PATIENTS: any[] = [];

const normalizePatientsData = (data: any): any[] => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.patients)) return data.patients;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.data?.patients)) return data.data.patients;
  if (Array.isArray(data?.data?.items)) return data.data.items;
  if (Array.isArray(data?.data)) return data.data;
  return EMPTY_PATIENTS;
};

export function Entrega() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [rows, setRows] = useState<DeliveryRow[]>([]);
  const [savingDelivery, setSavingDelivery] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deliverModalOpen, setDeliverModalOpen] = useState(false);
  const [deliverTarget, setDeliverTarget] = useState<DeliveryRow | null>(null);
  const [deliverToName, setDeliverToName] = useState('');
  const [deliverToCpf, setDeliverToCpf] = useState('');
  const [delivering, setDelivering] = useState(false);
  const {
    data: deliveriesData,
    isLoading: rowsLoading,
    error: deliveriesError,
  } = useDeliveriesQuery();
  const {
    data: patientsData,
    isLoading: patientsLoading,
    error: patientsError,
  } = usePatientsAdminQuery();
  const deliveries = Array.isArray(deliveriesData) ? deliveriesData : EMPTY_DELIVERIES;
  const patients = normalizePatientsData(patientsData);
  const isMobile = useMediaQuery('(max-width: 799px)');
  const isTablet = useMediaQuery('(max-width: 1279px)');

  // Estados para reconhecimento facial na entrega
  const [requireFacialRecognition, setRequireFacialRecognition] = useState(() => {
    const saved = localStorage.getItem('delivery:requireFacialRecognition');
    return saved ? JSON.parse(saved) : false;
  });
  const [facialCaptureOpen, setFacialCaptureOpen] = useState(false);
  const [facialVerified, setFacialVerified] = useState(false);
  const [verifyingFace, setVerifyingFace] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);

  const filtered = rows.filter((r) => r.nomeCompleto.toLowerCase().includes(query.toLowerCase()));
  const paginatedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);
  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(filtered.length / pageSize)),
    [filtered.length, pageSize],
  );

  const [form, setForm] = useState({
    paciente: '',
    tipoDocumento: '',
    dataDisponivel: null as Date | null,
    descricao: '',
  });

  const [fieldErrors, setFieldErrors] = useState<Record<string,string>>({});

  const [popoverOpened, setPopoverOpened] = useState(false);
  const [dateInput, setDateInput] = useState('');

  useEffect(() => {
    const mapped: DeliveryRow[] = deliveries.map((it: any, idx: number) => {
      const id = String(it.id ?? it.deliveryId ?? idx + 1);
      const availableAt = it.availableAt || it.available_at;
      const deliveredAt = it.deliveredAt || it.delivered_at;
      return {
        id,
        nomeCompleto: it.patientName || it.patient_name || '- ',
        dataHora: availableAt ? new Date(availableAt).toLocaleString('pt-BR') : '-',
        responsavel: it.responsible || '-',
        status: it.status ? String(it.status).toUpperCase() : 'AVAILABLE',
        tipo: it.documentType || it.document_type || '-',
        entreguePara: it.deliveredTo || it.delivered_to || '-',
        dataHoraEntrega: deliveredAt ? new Date(deliveredAt).toLocaleString('pt-BR') : '-',
      };
    });
    setRows(mapped);
  }, [deliveries]);

  useEffect(() => {
    const err: any = deliveriesError || patientsError;
    if (!err) return;
    showNotification({
      title: 'Erro',
      message: resolveApiErrorMessage(err, 'Erro ao carregar dados da entrega'),
      color: 'red',
    });
  }, [deliveriesError, patientsError]);

  useEffect(() => {
    setPage(1);
  }, [query, pageSize, rows.length]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const patientsList = useMemo<any[]>(() => normalizePatientsData(patients), [patients]);

  const patientOptions = useMemo(() => patientsList.map((p: any) => {
    const id = String(p.id ?? p.patientId ?? p._id ?? p.uuid ?? '');
    const name = (p.name || p.nome || p.fullName || p.patientName || p.email || p.cpf || '').toString().trim();
    const label = name || 'Paciente';
    return { value: id || label, label };
  }), [patientsList]);

  const patientById = useMemo<Record<string, any>>(() => {
    const byId: Record<string, any> = {};
    patientsList.forEach((p: any) => {
      const id = String(p.id ?? p.patientId ?? p._id ?? p.uuid ?? '');
      if (id) byId[id] = p;
    });
    return byId;
  }, [patientsList]);

  const formatDate = (d: Date | null) => {
    if (!d) return '';
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const parseDate = (s: string) => {
    if (!s) return null;
    const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (!m) return null;
    const day = Number(m[1]);
    const month = Number(m[2]) - 1;
    const year = Number(m[3]);
    const date = new Date(year, month, day);
    if (date.getFullYear() !== year || date.getMonth() !== month || date.getDate() !== day) return null;
    return date;
  };

  const humanize = (s?: string) => {
    if (!s) return '-';
    return String(s)
      .replace(/_/g, ' ')
      .toLowerCase()
      .split(' ')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  };

  const formatStatus = (s?: string) => {
    if (!s) return '-';
    const key = String(s).toUpperCase();
    const map: Record<string, string> = {
      AVAILABLE: 'Disponivel',
      AVALIABLE: 'Disponivel',
      DISPONIVEL: 'Disponivel',
      LOW: 'Baixo',
      OUT_OF_STOCK: 'Esgotado',
      EXPIRED: 'Vencido',
      UNAVAILABLE: 'Indisponivel',
      RESERVED: 'Reservado',
      DAMAGED: 'Danificado',
      ENTREGUE: 'Entregue',
    };
    return map[key] || humanize(s);
  };

  const openRegistrar = (r?: DeliveryRow) => {
    if (r) {
      setEditingId(r.id);
      // Keep patient name in form when editing, we use id only for new records
      setForm({ paciente: r.nomeCompleto, tipoDocumento: r.tipo, dataDisponivel: null, descricao: '' });
    } else {
      setEditingId(null);
      setForm({ paciente: '', tipoDocumento: '', dataDisponivel: null, descricao: '' });
    }
    setModalOpen(true);
  };

  const openDeliver = (row: DeliveryRow) => {
    setDeliverTarget(row);
    if (row.entreguePara && row.entreguePara !== '-') {
      const parts = row.entreguePara.split(' - ');
      setDeliverToName(parts[0] || '');
      setDeliverToCpf(parts[1] || '');
    } else {
      setDeliverToName('');
      setDeliverToCpf('');
    }
    setFacialVerified(false); // Reset verificação facial
    setDeliverModalOpen(true);
  };

  const handleFacialVerification = async (imageBase64: string) => {
    if (!deliverTarget) return;

    setVerifyingFace(true);
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const unitId = user?.branchId || user?.branch?.id || '';

      const result = await facialRecognitionService.scanFace({
        image: imageBase64,
        id_unidade: unitId,
      });

      // Verificar se o CPF reconhecido corresponde ao informado
      const recognizedCpf = result.patient.cpf.replace(/\D/g, '');
      const inputCpf = deliverToCpf.replace(/\D/g, '');

      if (recognizedCpf === inputCpf) {
        setFacialVerified(true);
        showNotification({
          title: 'Identidade verificada',
          message: `${result.patient.name} identificado com sucesso! (Confiança: ${(result.trust * 100).toFixed(1)}%)`,
          color: 'green',
        });
      } else {
        showNotification({
          title: 'Identidade não correspondente',
          message: 'O CPF informado não corresponde à pessoa reconhecida.',
          color: 'red',
        });
      }
    } catch (error: any) {
      console.error('Erro na verificação facial:', error);
      showNotification({
        title: 'Erro na verificação',
        message: error?.response?.data?.detail || 'Não foi possível verificar a identidade. Tente novamente.',
        color: 'red',
      });
    } finally {
      setVerifyingFace(false);
    }
  };

  const handleDeliver = async () => {
    if (!deliverTarget) return;
    if (!deliverToName.trim() || !deliverToCpf.trim()) {
      showNotification({ title: 'Erro', message: 'Informe nome e CPF de quem recebeu', color: 'red' });
      return;
    }
    if (!isValidCPF(deliverToCpf)) {
      showNotification({ title: 'Erro', message: 'CPF inválido de quem recebeu', color: 'red' });
      return;
    }

    // Verificar se reconhecimento facial é obrigatório e se foi validado
    if (requireFacialRecognition && !facialVerified) {
      showNotification({ 
        title: 'Verificação facial obrigatória', 
        message: 'É necessário verificar a identidade através do reconhecimento facial antes de realizar a entrega.', 
        color: 'orange' 
      });
      return;
    }

    setDelivering(true);
    try {
      const payload = {
        status: 'ENTREGUE',
        deliveredTo: `${deliverToName.trim()} - ${deliverToCpf.trim()}`,
        deliveredAt: new Date().toISOString(),
      };

      const updated: any = await deliveryService.updateDelivery(deliverTarget.id, payload);
      const deliveredAt = updated.deliveredAt || updated.delivered_at || payload.deliveredAt;

      setRows((prev) => prev.map((r) => {
        if (r.id !== deliverTarget.id) return r;
        return {
          ...r,
          status: updated.status ? String(updated.status).toUpperCase() : 'ENTREGUE',
          entreguePara: updated.deliveredTo || payload.deliveredTo,
          dataHoraEntrega: deliveredAt ? new Date(deliveredAt).toLocaleString('pt-BR') : r.dataHoraEntrega,
        };
      }));

      showNotification({ title: 'Entrega realizada', message: 'Registro atualizado', color: 'green' });
      setDeliverModalOpen(false);
      setDeliverTarget(null);
      await queryClient.invalidateQueries({ queryKey: queryKeys.deliveries });
    } catch (err: any) {
      showNotification({
        title: 'Erro',
        message: resolveApiErrorMessage(err, 'Erro ao registrar entrega'),
        color: 'red',
      });
    } finally {
      setDelivering(false);
    }
  };

  const validateFields = (data: typeof form) => {
    const errors: Record<string,string> = {};
    if (!data.paciente || !String(data.paciente).trim()) errors.paciente = 'Paciente é obrigatório';
    if (!data.tipoDocumento || !String(data.tipoDocumento).trim()) errors.tipoDocumento = 'Tipo de documento é obrigatório';
    return errors;
  };

  const handleRegister = async () => {
    // clear previous errors
    setFieldErrors({});

    // client-side validation
    const fErrors = validateFields(form);
    if (Object.keys(fErrors).length) {
      setFieldErrors(fErrors);
      showNotification({ title: 'Erro', message: Object.values(fErrors)[0], color: 'red' });
      return;
    }

    if (dateInput && !form.dataDisponivel) {
      setFieldErrors((p) => ({ ...p, dataDisponivel: 'Data disponível inválida' }));
      showNotification({ title: 'Erro', message: 'Data disponível inválida', color: 'red' });
      return;
    }

    if (editingId) {
      setRows((prev) => prev.map((p) => p.id === editingId ? { ...p, nomeCompleto: form.paciente, tipo: form.tipoDocumento || p.tipo } : p));
      showNotification({ title: 'Atualizado', message: 'Registro atualizado', color: 'green' });
      setModalOpen(false);
      return;
    }

    setSavingDelivery(true);
    try {
      const selectedPatient = patientById[form.paciente];
      const payload = {
        patientId: selectedPatient?.id,
        patientName: selectedPatient?.name || form.paciente,
        documentType: form.tipoDocumento || undefined,
        availableAt: form.dataDisponivel ? form.dataDisponivel.toISOString() : undefined,
        description: form.descricao || undefined,
        responsible: undefined,
        status: 'AVAILABLE',
        deliveredTo: undefined,
        deliveredAt: undefined,
      };

      const created: any = await deliveryService.createDelivery(payload);
      const availableAt = created.availableAt || created.available_at || payload.availableAt;
      const deliveredAt = created.deliveredAt || created.delivered_at;
      const newRow: DeliveryRow = {
        id: String(created.id ?? rows.length + 1),
        nomeCompleto: created.patientName || created.patient_name || selectedPatient?.name || form.paciente,
        dataHora: availableAt ? new Date(availableAt).toLocaleString('pt-BR') : '-',
        responsavel: created.responsible || '-',
        status: created.status ? String(created.status).toUpperCase() : 'AVAILABLE',
        tipo: created.documentType || created.document_type || form.tipoDocumento || '-',
        entreguePara: created.deliveredTo || created.delivered_to || '-',
        dataHoraEntrega: deliveredAt ? new Date(deliveredAt).toLocaleString('pt-BR') : '-',
      };

      setRows((prev) => [newRow, ...prev]);
      showNotification({ title: 'Adicionado', message: 'Entrega registrada', color: 'green' });
      setModalOpen(false);
      setForm({ paciente: '', tipoDocumento: '', dataDisponivel: null, descricao: '' });
      setDateInput('');
      await queryClient.invalidateQueries({ queryKey: queryKeys.deliveries });
    } catch (err: any) {
      // map server field errors to front fields (patientName -> paciente, documentType -> tipoDocumento)
      const serverFields: Record<string,string> | undefined = err?.response?.data?.fields;
      if (serverFields && typeof serverFields === 'object') {
        const mapped: Record<string,string> = {};
        for (const [k, v] of Object.entries(serverFields)) {
          if (k === 'patientName') mapped['paciente'] = v as string;
          else if (k === 'documentType') mapped['tipoDocumento'] = v as string;
          else mapped[k] = v as string;
        }
        setFieldErrors(mapped);
        showNotification({ title: 'Erro', message: Object.values(mapped)[0], color: 'red' });
      } else {
        showNotification({
          title: 'Erro',
          message: resolveApiErrorMessage(err, 'Erro ao registrar entrega'),
          color: 'red',
        });
      }
    } finally {
      setSavingDelivery(false);
    }
  };


  return (
    <Box bg="var(--mantine-color-body)" style={{ minHeight: '100vh' }}>
      <Header />

      <Box p={isMobile ? 'sm' : isTablet ? 'md' : 'xl'} maw={isMobile ? '100%' : 1400} mx="auto">
        <Group mb={isMobile ? 20 : 30} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Group align="center">
            <ActionIcon variant="default" color="black" size="xl" onClick={() => navigate('/dashboard')}>
              <ChevronLeft size={28} />
            </ActionIcon>
            <Box>
              <Text fw={600} size={isMobile ? 'md' : 'lg'} c="var(--mantine-color-text)">
                Entrega
              </Text>
              <Text size="sm" c="dimmed">
                Controle de entregas
              </Text>
            </Box>
          </Group>
          <ActionIcon 
            variant="default" 
            size="lg" 
            onClick={() => setSettingsModalOpen(true)}
            title="Configurações"
          >
            <Settings size={20} />
          </ActionIcon>
        </Group>

        {/* Search and Button Section */}
        <Box mb={isMobile ? 20 : 30}>
          <Group gap="md" align="flex-end">
            <FloatingInput
              label="Buscar entregas"
              placeholder={isMobile ? 'Buscar...' : 'Buscar paciente...'}
              value={query}
              onChange={(e) => setQuery(e.currentTarget.value)}
              containerProps={{ style: { flex: 1 } }}
            />
            <Button
              bg={DARK_BLUE}
              c="white"
              leftSection={isMobile ? undefined : <Plus size={18} />}
              onClick={() => openRegistrar()}
              size={isMobile ? 'sm' : 'md'}
              fw={600}
              px={isMobile ? 'sm' : 'xl'}
            >
              {isMobile ? <Plus size={16} /> : 'Novo entrega'}
            </Button>
          </Group>
        </Box>

        <Box>
          {rowsLoading ? (
            <Stack p="md" gap="sm">
              {Array.from({ length: 4 }).map((_, index) => (
                <Paper key={index} withBorder radius="md" p="md">
                  <Stack gap="sm">
                    <Skeleton height={20} width="35%" radius="xl" />
                    <Skeleton height={16} width="20%" radius="xl" />
                  </Stack>
                </Paper>
              ))}
            </Stack>
          ) : (
            <PaginatedGrid
              totalItems={filtered.length}
              page={page}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
              isMobile={isMobile}
              maxHeight={isMobile ? 500 : 620}
              showFooter
            >
            <Table horizontalSpacing={isMobile ? 'sm' : 'md'} verticalSpacing={isMobile ? 'sm' : 'md'}>
              <Table.Thead>
                <Table.Tr style={{ borderBottom: 'none' }}>
                  <Table.Th style={{ color: '#868e96', fontSize: isMobile ? '0.7rem' : '0.8rem', fontWeight: 500 }}>Nome</Table.Th>
                  <Table.Th style={{ color: '#868e96', fontSize: isMobile ? '0.7rem' : '0.8rem', fontWeight: 500 }}>Data/Hora</Table.Th>
                  {!isTablet && <Table.Th style={{ color: '#868e96', fontSize: '0.8rem', fontWeight: 500 }}>Responsável</Table.Th>}
                  <Table.Th style={{ color: '#868e96', fontSize: isMobile ? '0.7rem' : '0.8rem', fontWeight: 500 }}>Status</Table.Th>
                  {!isTablet && <Table.Th style={{ color: '#868e96', fontSize: '0.8rem', fontWeight: 500 }}>Tipo</Table.Th>}
                  {!isTablet && <Table.Th style={{ color: '#868e96', fontSize: '0.8rem', fontWeight: 500 }}>Entregue para</Table.Th>}
                  {!isTablet && <Table.Th style={{ color: '#868e96', fontSize: '0.8rem', fontWeight: 500 }}>Data/Hora da entrega</Table.Th>}
                  <Table.Th style={{ color: '#868e96', fontSize: isMobile ? '0.7rem' : '0.8rem', fontWeight: 500 }}>Ações</Table.Th>

                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {filtered.length > 0 ? paginatedRows.map((r) => (
                  <Table.Tr key={r.id} style={{ borderBottom: '1px solid #e9ecef' }}>
                    <Table.Td>
                      <Group gap={isMobile ? 'xs' : 'sm'}>
                        {!isMobile && (
                          <Box
                            bg={DARK_BLUE}
                            w={32}
                            h={32}
                            style={{ borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                          >
                            <Text c="white" fw={600} size="sm">{r.nomeCompleto.charAt(0).toUpperCase()}</Text>
                          </Box>
                        )}
                        <Box>
                          <Text fw={500} size="xs" style={{ fontSize: isMobile ? '0.8rem' : '0.85rem' }}>{r.nomeCompleto}</Text>
                          {isMobile && <Text size="xs" c="dimmed">Responsável: {r.responsavel}</Text>}
                        </Box>
                      </Group>
                    </Table.Td>

                    <Table.Td>
                      <Text size="xs" style={{ fontSize: isMobile ? '0.75rem' : '0.82rem' }}>{r.dataHora}</Text>
                    </Table.Td>

                    {!isTablet && (
                      <Table.Td>
                        <Text size="xs" style={{ fontSize: isMobile ? '0.75rem' : '0.82rem' }}>{r.responsavel}</Text>
                      </Table.Td>
                    )}

                    <Table.Td>
                      <Badge variant="light" color={String(r.status).toUpperCase().includes('ENTREGUE') ? 'green' : 'blue'} radius="xl">
                        {formatStatus(r.status)}
                      </Badge>
                    </Table.Td>

                    {!isTablet && (
                      <Table.Td>
                        <Text size="xs" style={{ fontSize: isMobile ? '0.75rem' : '0.82rem' }}>{r.tipo}</Text>
                      </Table.Td>
                    )}

                    {!isTablet && (
                      <Table.Td>
                        <Text size="xs" style={{ fontSize: isMobile ? '0.75rem' : '0.82rem' }}>{r.entreguePara || '-'}</Text>
                      </Table.Td>
                    )}

                    {!isTablet && (
                      <Table.Td>
                        <Text size="xs" style={{ fontSize: isMobile ? '0.75rem' : '0.82rem' }}>{r.dataHoraEntrega || '-'}</Text>
                      </Table.Td>
                    )}

                    <Table.Td>
                      <Menu withinPortal position="bottom-end" shadow="sm">
                        <Menu.Target>
                          <ActionIcon variant="subtle" color="gray">
                            <MoreVertical size={18} />
                          </ActionIcon>
                        </Menu.Target>
                        <Menu.Dropdown>
                          <Menu.Item
                            onClick={() => openDeliver(r)}
                            disabled={String(r.status || '').toUpperCase().includes('ENTREGUE')}
                          >
                            Entregar
                          </Menu.Item>
                        </Menu.Dropdown>
                      </Menu>
                    </Table.Td>
                  </Table.Tr>
                )) : (
                  <Table.Tr>
                    <Table.Td colSpan={isTablet ? 4 : 8}>
                      <Stack align="center" py="xl" gap={6}>
                        <Text fw={600}>Nenhuma entrega encontrada</Text>
                        <Text c="dimmed" size="sm" ta="center">
                          Registre uma nova entrega ou ajuste a busca para localizar um item.
                        </Text>
                      </Stack>
                    </Table.Td>
                  </Table.Tr>
                )}
              </Table.Tbody>
            </Table>
            </PaginatedGrid>
          )}
        </Box>
      </Box>

      <Modal
        opened={modalOpen}
        onClose={() => setModalOpen(false)}
        title={'Registrar entrega'}
        size={isMobile ? '100%' : 520}
        centered={false}
        fullScreen={isMobile}
        styles={{
          content: { left: 48, bottom: 96, top: 'auto', transform: 'none', width: isMobile ? '100%' : 520 },
          body: { overflowY: 'auto' },
        }}
      >
        <Stack gap={10}>
          <Box style={{ padding: 8 }}>

            <Box style={{ marginBottom: 8 }}>
              <FloatingSelect
                label="Paciente"
                data={patientOptions}
                placeholder={patientsLoading ? 'Carregando pacientes...' : 'Paciente'}
                value={form.paciente}
                onChange={(val) => { setForm({ ...form, paciente: val || '' }); setFieldErrors((p) => { const { paciente, ...rest } = p; return rest; }); }}
                searchable
                clearable
                nothingFoundMessage="Nenhum paciente encontrado"
                disabled={patientsLoading}
                error={fieldErrors.paciente}
                required
              />
            </Box>

            <Box style={{ marginBottom: 8 }}>
              <FloatingSelect
                label="Tipo de documento"
                data={[{ value: 'laudo', label: 'Laudo' }, { value: 'exame', label: 'Exame' }, { value: 'relatorio', label: 'Relatório' }, { value: 'outro', label: 'Outro' }]}
                placeholder="Tipo de documento"
                value={form.tipoDocumento}
                onChange={(val) => { setForm({ ...form, tipoDocumento: val || '' }); setFieldErrors((p) => { const { tipoDocumento, ...rest } = p; return rest; }); }}
                error={fieldErrors.tipoDocumento}
                required
              />
            </Box>

            <Box style={{ marginBottom: 8 }}>
              <Text size="sm" mb={6}>Data disponível</Text>
              <Popover opened={popoverOpened} onClose={() => setPopoverOpened(false)} position="bottom" withArrow>
                <Popover.Target>
                  <FloatingInput
                    label="Data disponível"
                    placeholder="dd/mm/yyyy"
                    value={dateInput}
                    onChange={(e) => {
                      const v = formatDateInput(e.currentTarget.value);
                      setDateInput(v);
                      const parsed = parseDate(v);
                      setForm({ ...form, dataDisponivel: parsed });
                      setFieldErrors((p) => { const { dataDisponivel, ...rest } = p; return rest; });
                    }}
                    rightSection={
                      <ActionIcon size="sm" variant="subtle" onClick={() => setPopoverOpened((s) => !s)} title="Abrir calendário">
                        <CalendarIcon size={16} />
                      </ActionIcon>
                    }
                    error={fieldErrors.dataDisponivel}
                    alwaysFloatLabel
                  />
                </Popover.Target>
                <Popover.Dropdown style={{ padding: 8 }}>
                  <DatePicker value={form.dataDisponivel} onChange={(d) => { setForm({ ...form, dataDisponivel: d }); setDateInput(formatDate(d)); setPopoverOpened(false); }} />
                </Popover.Dropdown>
              </Popover>
            </Box>

            <Box style={{ marginBottom: 8 }}>
              <FloatingTextarea label="Descrição" placeholder="Descrição/Conteúdo" value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.currentTarget.value })} minRows={3} />
            </Box>

            <Group justify="flex-end" mt={8}>
              <Button variant="default" onClick={() => setModalOpen(false)} size="sm">Cancelar</Button>
              <Button bg={DARK_BLUE} onClick={handleRegister} size="sm" loading={savingDelivery} disabled={savingDelivery}>Registrar</Button>
            </Group>
          </Box>
        </Stack>
      </Modal>

      <Modal
        opened={deliverModalOpen}
        onClose={() => setDeliverModalOpen(false)}
        title={'Registrar entrega'}
        size={isMobile ? '100%' : 520}
        centered={false}
        fullScreen={isMobile}
        styles={{
          content: { left: 48, bottom: 96, top: 'auto', transform: 'none', width: isMobile ? '100%' : 520 },
          body: { overflowY: 'auto' },
        }}
      >
        <Stack gap={10}>
          <Box style={{ padding: 8 }}>
            <Text size="sm" mb={4}>Paciente</Text>
            <Text fw={600} mb={8}>{deliverTarget?.nomeCompleto || '-'}</Text>

            <Box style={{ marginBottom: 8 }}>
              <FloatingInput
                label="Nome de quem recebeu"
                placeholder="Nome de quem recebeu"
                value={deliverToName}
                onChange={(e) => setDeliverToName(e.currentTarget.value)}
              />
            </Box>

            <Box style={{ marginBottom: 8 }}>
              <FloatingInput
                label="CPF de quem recebeu"
                placeholder="CPF de quem recebeu"
                value={deliverToCpf}
                onChange={(e) => setDeliverToCpf(e.currentTarget.value)}
              />
            </Box>

            {requireFacialRecognition && (
              <Box style={{ marginBottom: 8 }}>
                <Paper p="sm" withBorder style={{ backgroundColor: facialVerified ? '#e7f5ff' : '#fff' }}>
                  <Group justify="space-between" align="center">
                    <Text size="sm" fw={500}>
                      {facialVerified ? '✓ Identidade verificada' : 'Verificação facial obrigatória'}
                    </Text>
                    {!facialVerified && (
                      <Button
                        size="xs"
                        variant="light"
                        onClick={() => {
                          if (!deliverToCpf.trim()) {
                            showNotification({
                              title: 'CPF obrigatório',
                              message: 'Informe o CPF antes de fazer a verificação facial.',
                              color: 'orange',
                            });
                            return;
                          }
                          setFacialCaptureOpen(true);
                        }}
                        loading={verifyingFace}
                      >
                        Verificar Identidade
                      </Button>
                    )}
                  </Group>
                </Paper>
              </Box>
            )}

            <Group justify="flex-end" mt={8}>
              <Button variant="default" onClick={() => setDeliverModalOpen(false)} size="sm">Cancelar</Button>
              <Button 
                bg={DARK_BLUE} 
                onClick={handleDeliver} 
                size="sm" 
                loading={delivering} 
                disabled={delivering || (requireFacialRecognition && !facialVerified)}
              >
                Entregar
              </Button>
            </Group>
          </Box>
        </Stack>
      </Modal>

      {/* Modal de Configurações */}
      <Modal
        opened={settingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
        title="Configurações de Entrega"
        size="md"
        centered
      >
        <Stack gap="md">
          <Paper p="md" withBorder>
            <Switch
              label="Exigir reconhecimento facial na entrega"
              description="Quando ativado, será necessário verificar a identidade do paciente através do reconhecimento facial antes de realizar a entrega de exames/laudos."
              checked={requireFacialRecognition}
              onChange={(e) => {
                const newValue = e.currentTarget.checked;
                setRequireFacialRecognition(newValue);
                localStorage.setItem('delivery:requireFacialRecognition', JSON.stringify(newValue));
                showNotification({
                  title: 'Configuração atualizada',
                  message: newValue 
                    ? 'Reconhecimento facial agora é obrigatório para entregas' 
                    : 'Reconhecimento facial desativado para entregas',
                  color: 'blue',
                });
              }}
            />
          </Paper>

          <Group justify="flex-end">
            <Button onClick={() => setSettingsModalOpen(false)}>Fechar</Button>
          </Group>
        </Stack>
      </Modal>

      {/* Modal de Captura Facial */}
      <FacialCapture
        opened={facialCaptureOpen}
        onClose={() => setFacialCaptureOpen(false)}
        onCapture={handleFacialVerification}
        title="Verificação de Identidade"
        description="Posicione o rosto da pessoa que está recebendo o documento"
      />
    </Box>
  );
}
