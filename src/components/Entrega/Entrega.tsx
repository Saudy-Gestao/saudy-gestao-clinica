import { useMemo, useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Box, Group, Text, Button, Table, Modal, Stack, ActionIcon, Paper, Menu, Switch, Skeleton, Badge, TextInput, Select, Textarea, DateInput } from '@/components/ui';
import { useMediaQuery } from '@/components/ui';
import { Plus, MoreVertical, Settings } from 'lucide-react';
import { showNotification } from '@/components/ui';
import { Header } from '../Header/Header';
import deliveryService from '../../services/deliveryService';
import facialRecognitionService from '../../services/facialRecognitionService';
import { FacialCapture } from '../common/FacialCapture';
import { isValidCPF } from '../../utils/formatters';
import { useDeliveriesQuery } from '../../hooks/useDeliveriesQuery';
import { usePatientsAdminQuery } from '../../hooks/usePatientsAdminQuery';
import { queryKeys } from '../../lib/queryKeys';
import { resolveApiErrorMessage } from '../../lib/apiError';
import { PaginatedGrid } from '../common/PaginatedGrid';
import './Entrega.css';

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
    <Box bg="var(--ui-background)" style={{ minHeight: '100vh' }}>
      <Header back={{ label: 'Voltar', onClick: () => navigate('/dashboard?secao=gestao-e-apoio') }} />

      <Box p={isMobile ? 'sm' : isTablet ? 'md' : 'xl'} maw={isMobile ? '100%' : 1400} mx="auto">
        <Group justify="space-between" align="flex-start" wrap="wrap" mb="md">
          <Box className="entrega-hero ui-page-intro">
            <Text className="entrega-eyebrow">GESTÃO E APOIO</Text>
            <Text className="entrega-title" fw={700} size="2xl">Entrega</Text>
            <Text className="entrega-subtitle" size="sm">Controle de entregas de exames, laudos e documentos aos pacientes.</Text>
          </Box>
          <ActionIcon
            variant="default"
            size="lg"
            onClick={() => setSettingsModalOpen(true)}
            aria-label="Configurações de entrega"
            title="Configurações"
          >
            <Settings size={20} />
          </ActionIcon>
        </Group>

        <Group justify="space-between" align="end" wrap="wrap" gap="sm" mb="md">
          <TextInput
            label="Buscar entregas"
            placeholder={isMobile ? 'Buscar...' : 'Buscar paciente...'}
            value={query}
            onChange={(e) => setQuery(e.currentTarget.value)}
            style={{ flex: '1 1 220px', maxWidth: isMobile ? '100%' : 420 }}
          />
          <Button leftSection={<Plus size={16} />} onClick={() => openRegistrar()} fullWidth={isMobile}>
            Nova entrega
          </Button>
        </Group>

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
                <Table.Tr>
                  <Table.Th>Paciente</Table.Th>
                  <Table.Th>Disponível desde</Table.Th>
                  <Table.Th>Status</Table.Th>
                  {!isTablet && <Table.Th>Tipo</Table.Th>}
                  {!isTablet && <Table.Th>Entrega</Table.Th>}
                  <Table.Th style={{ width: 56, textAlign: 'center' }}>Ações</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {filtered.length > 0 ? paginatedRows.map((r) => (
                  <Table.Tr key={r.id}>
                    <Table.Td>
                      <Stack gap={2}>
                        <Text fw={600} size="sm">{r.nomeCompleto}</Text>
                        <Text size="xs" c="dimmed">Responsável: {r.responsavel}</Text>
                      </Stack>
                    </Table.Td>

                    <Table.Td>
                      <Text size="sm">{r.dataHora}</Text>
                    </Table.Td>

                    <Table.Td>
                      <Badge variant="light" color={String(r.status).toUpperCase().includes('ENTREGUE') ? 'green' : 'blue'} radius="xl">
                        {formatStatus(r.status)}
                      </Badge>
                    </Table.Td>

                    {!isTablet && (
                      <Table.Td>
                        <Text size="sm">{r.tipo}</Text>
                      </Table.Td>
                    )}

                    {!isTablet && (
                      <Table.Td>
                        {r.entreguePara && r.entreguePara !== '-' ? (
                          <Stack gap={2}>
                            <Text size="sm">{r.entreguePara}</Text>
                            <Text size="xs" c="dimmed">{r.dataHoraEntrega || '-'}</Text>
                          </Stack>
                        ) : (
                          <Text size="sm" c="dimmed">-</Text>
                        )}
                      </Table.Td>
                    )}

                    <Table.Td style={{ textAlign: 'center' }}>
                      <Menu withinPortal position="bottom-end" shadow="sm">
                        <Menu.Target>
                          <ActionIcon variant="subtle" color="gray" aria-label={`Ações de ${r.nomeCompleto}`}>
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
                    <Table.Td colSpan={isTablet ? 4 : 6}>
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
        title="Registrar entrega"
        size={isMobile ? '100%' : 520}
        centered
        fullScreen={isMobile}
      >
        <Stack gap="md">
          <Select
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
            withAsterisk
          />

          <Select
            label="Tipo de documento"
            data={[{ value: 'laudo', label: 'Laudo' }, { value: 'exame', label: 'Exame' }, { value: 'relatorio', label: 'Relatório' }, { value: 'outro', label: 'Outro' }]}
            placeholder="Tipo de documento"
            value={form.tipoDocumento}
            onChange={(val) => { setForm({ ...form, tipoDocumento: val || '' }); setFieldErrors((p) => { const { tipoDocumento, ...rest } = p; return rest; }); }}
            error={fieldErrors.tipoDocumento}
            withAsterisk
          />

          <DateInput
            label="Data disponível"
            value={form.dataDisponivel}
            onChange={(d) => {
              setForm({ ...form, dataDisponivel: d ?? null });
              setFieldErrors((p) => { const { dataDisponivel, ...rest } = p; return rest; });
            }}
            error={fieldErrors.dataDisponivel}
          />

          <Textarea label="Descrição" placeholder="Descrição/Conteúdo" value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.currentTarget.value })} minRows={3} />

          <Group justify="flex-end" mt="xs">
            <Button variant="default" onClick={() => setModalOpen(false)} size="sm">Cancelar</Button>
            <Button onClick={handleRegister} size="sm" loading={savingDelivery} disabled={savingDelivery}>Registrar</Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={deliverModalOpen}
        onClose={() => setDeliverModalOpen(false)}
        title="Registrar entrega"
        size={isMobile ? '100%' : 520}
        centered
        fullScreen={isMobile}
      >
        <Stack gap="md">
          <Box>
            <Text size="sm" c="dimmed">Paciente</Text>
            <Text fw={600}>{deliverTarget?.nomeCompleto || '-'}</Text>
          </Box>

          <TextInput
            label="Nome de quem recebeu"
            placeholder="Nome de quem recebeu"
            value={deliverToName}
            onChange={(e) => setDeliverToName(e.currentTarget.value)}
          />

          <TextInput
            label="CPF de quem recebeu"
            placeholder="CPF de quem recebeu"
            value={deliverToCpf}
            onChange={(e) => setDeliverToCpf(e.currentTarget.value)}
          />

          {requireFacialRecognition && (
            <Paper p="sm" withBorder className={facialVerified ? 'entrega-facial-check entrega-facial-check--verified' : 'entrega-facial-check'}>
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
          )}

          <Group justify="flex-end" mt="xs">
            <Button variant="default" onClick={() => setDeliverModalOpen(false)} size="sm">Cancelar</Button>
            <Button
              onClick={handleDeliver}
              size="sm"
              loading={delivering}
              disabled={delivering || (requireFacialRecognition && !facialVerified)}
            >
              Entregar
            </Button>
          </Group>
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
          <Box p="md" className="ui-toggle-card">
            <Group justify="space-between" align="center" wrap="wrap" gap="sm">
              <Box>
                <Text fw={600} size="sm">Exigir reconhecimento facial na entrega</Text>
                <Text size="xs" c="dimmed">Quando ativado, será necessário verificar a identidade do paciente através do reconhecimento facial antes de realizar a entrega de exames/laudos.</Text>
              </Box>
              <Switch
                label={requireFacialRecognition ? 'Ativo' : 'Inativo'}
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
            </Group>
          </Box>

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
