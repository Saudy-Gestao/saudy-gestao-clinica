import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Group,
  Text,
  Title,
  ActionIcon,
  Paper,
  Stack,
  Button,
  Switch,
  SimpleGrid,
  Table,
  Badge,
  Skeleton,
  Menu,
  useComputedColorScheme,
} from '@mantine/core';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Power, Pencil, UserPlus, Users, MoreVertical } from 'lucide-react';
import { useMediaQuery } from '@mantine/hooks';
import { showNotification } from '@mantine/notifications';
import { Header } from '../Header/Header';
import { DARK_BLUE } from '../../themes/theme';
import procedureService from '../../services/procedureService';
import ResultModal from '../common/ResultModal';
import { FloatingInput } from '../common/FloatingInput';
import { FloatingMultiSelect } from '../common/FloatingMultiSelect';
import { FloatingNumberInput } from '../common/FloatingNumberInput';
import { FloatingSelect } from '../common/FloatingSelect';
import { FloatingTextarea } from '../common/FloatingTextarea';
import { useProceduresAdminQuery } from '../../hooks/useProceduresAdminQuery';
import { useEspecialidadesAdminQuery } from '../../hooks/useEspecialidadesAdminQuery';
import { useCbosQuery } from '../../hooks/useCbosQuery';
import { useSettingsBranchesQuery } from '../../hooks/useSettingsBranchesQuery';
import { queryKeys } from '../../lib/queryKeys';
import { resolveApiErrorMessage } from '../../lib/apiError';
import { PaginatedGrid } from '../common/PaginatedGrid';

interface ProcedureForm {
  name: string;
  description: string;
  appointmentType: 'CONSULTA_CLINICA' | 'CONSULTA_TERAPIAS' | 'EXAME' | null;
  durationMinutes?: number | null;
  supportsTeleconsultation: boolean;
  modalities: string[];
  especialidadeId: string | null;
  cboId: string | null;
  branchIds: string[];
}

interface ProcedureItem {
  id: string;
  name: string;
  appointmentType: 'CONSULTA_CLINICA' | 'CONSULTA_TERAPIAS' | 'EXAME';
  supportsTeleconsultation: boolean;
  modalities: string[];
  especialidadeId: string | null;
  especialidadeName: string | null;
  cboId: string | null;
  cbo?: { code?: string; title?: string } | null;
  modalidadeName: string | null;
  branchIds: string[];
  isActive: boolean;
}

const INITIAL_FORM: ProcedureForm = {
  name: '',
  description: '',
  appointmentType: null,
  durationMinutes: null,
  supportsTeleconsultation: false,
  modalities: [],
  especialidadeId: null,
  cboId: null,
  branchIds: [],
};

const TELECONSULT_MODALITY = 'Telemedicina';
const normalizeAppointmentType = (value: unknown): ProcedureForm['appointmentType'] => {
  const normalized = String(value || '').toUpperCase();
  if (normalized === 'EXAME') return 'EXAME';
  if (normalized === 'CONSULTA_TERAPIAS' || normalized === 'CONSULTA TERAPIAS') return 'CONSULTA_TERAPIAS';
  return 'CONSULTA_CLINICA';
};
const appointmentTypeLabel = (value: ProcedureItem['appointmentType']) => value === 'EXAME' ? 'Exame' : value === 'CONSULTA_TERAPIAS' ? 'Consulta terapias' : 'Consulta clínica';

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <Title order={5} fw={600} c="var(--mantine-color-text)" mb="sm" mt="md">
      {children}
    </Title>
  );
}

export function CadastroProcedimento() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isMobile = useMediaQuery('(max-width: 799px)');
  const isTablet = useMediaQuery('(max-width: 1279px)');
  const isDarkMode = useComputedColorScheme('light') === 'dark';

  const [form, setForm] = useState<ProcedureForm>(INITIAL_FORM);
  const [formResetKey, setFormResetKey] = useState(0);
  const [saving, setSaving] = useState(false);
  const [procedures, setProcedures] = useState<ProcedureItem[]>([]);
  const [proceduresLoading, setProceduresLoading] = useState(false);
  const [procedureQuery, setProcedureQuery] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastCreatedName, setLastCreatedName] = useState<string | null>(null);
  const [lastSaveAction, setLastSaveAction] = useState<'create' | 'update'>('create');
  const [editingProcedureId, setEditingProcedureId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'hub' | 'cadastro' | 'lista'>('hub');
  const [procedurePage, setProcedurePage] = useState(1);
  const [procedurePageSize, setProcedurePageSize] = useState(10);
  const proceduresQuery = useProceduresAdminQuery();
  const especialidadesQuery = useEspecialidadesAdminQuery();
  const cbosQuery = useCbosQuery();
  const branchesQuery = useSettingsBranchesQuery();

  const especialidadeOptions = useMemo(() => {
    const data: any = especialidadesQuery.data;
    const list: any[] = Array.isArray(data?.items) ? data.items : (Array.isArray(data) ? data : []);
    return list
      .filter((m: any) => m?.id && m.isActive)
      .map((item: any) => ({
        value: String(item.id),
        label: item.modalidade?.name ? `${item.name} — ${item.modalidade.name}` : item.name,
      }));
  }, [especialidadesQuery.data]);

  const branchOptions = useMemo(() => {
    const data: any = branchesQuery.data;
    const list: any[] = Array.isArray(data)
      ? data
      : (Array.isArray(data?.items) ? data.items : (Array.isArray(data?.data) ? data.data : []));
    return list
      .filter((b: any) => b?.id)
      .map((b: any) => ({ value: String(b.id), label: b.tradeName || b.socialName || 'Filial sem nome' }));
  }, [branchesQuery.data]);

  const cboOptions = useMemo(() => {
    const data: any = cbosQuery.data;
    const list: any[] = Array.isArray(data?.items) ? data.items : (Array.isArray(data) ? data : []);
    return list
      .filter((c: any) => c?.id && c.isActive !== false)
      .map((c: any) => ({ value: String(c.id), label: `${c.code} — ${c.title}` }));
  }, [cbosQuery.data]);

  const branchLabelById = useMemo(() => {
    return branchOptions.reduce<Record<string, string>>((acc, option) => {
      acc[option.value] = option.label;
      return acc;
    }, {});
  }, [branchOptions]);

  const filteredProcedures = useMemo(() => {
    const q = procedureQuery.trim().toLowerCase();
    if (!q) return procedures;
    return procedures.filter((item) => item.name.toLowerCase().includes(q));
  }, [procedures, procedureQuery]);

  const paginatedProcedures = useMemo(() => {
    const start = (procedurePage - 1) * procedurePageSize;
    return filteredProcedures.slice(start, start + procedurePageSize);
  }, [filteredProcedures, procedurePage, procedurePageSize]);

  const procedureTotalPages = useMemo(
    () => Math.max(1, Math.ceil(filteredProcedures.length / procedurePageSize)),
    [filteredProcedures.length, procedurePageSize],
  );

  const modalityOptions = [
    { value: 'Presencial', label: 'Presencial' },
    { value: 'Domiciliar', label: 'Domiciliar' },
    { value: 'Emergencial', label: 'Emergencial' },
  ];

  useEffect(() => {
    setProcedurePage(1);
  }, [procedureQuery, procedurePageSize, procedures.length]);

  useEffect(() => {
    if (procedurePage > procedureTotalPages) {
      setProcedurePage(procedureTotalPages);
    }
  }, [procedurePage, procedureTotalPages]);

  useEffect(() => {
    setProceduresLoading(proceduresQuery.isLoading && procedures.length === 0);
  }, [procedures.length, proceduresQuery.isLoading]);

  useEffect(() => {
    if (proceduresQuery.error) {
      const err: any = proceduresQuery.error;
      showNotification({
        title: 'Erro',
        message: resolveApiErrorMessage(err, 'Erro ao carregar procedimentos'),
        color: 'red',
      });
    }
  }, [proceduresQuery.error]);

  useEffect(() => {
    const list = Array.isArray(proceduresQuery.data) ? proceduresQuery.data : [];
    const mapped: ProcedureItem[] = list.map((it: any): ProcedureItem => ({
      id: String(it.id ?? it.procedureId ?? ''),
      name: it.name || 'Procedimento',
      appointmentType: normalizeAppointmentType(it.appointmentType) as ProcedureItem['appointmentType'],
      supportsTeleconsultation: Array.isArray(it.modalities) ? it.modalities.includes(TELECONSULT_MODALITY) : false,
      modalities: Array.isArray(it.modalities)
        ? it.modalities.filter((modality: string) => modality !== TELECONSULT_MODALITY)
        : [],
      especialidadeId: it.especialidadeId || it.especialidade?.id || null,
      especialidadeName: it.especialidade?.name || null,
      cboId: it.cboId || it.cbo?.id || null,
      cbo: it.cbo || null,
      modalidadeName: it.modalidade?.name || null,
      branchIds: Array.isArray(it.branchIds) ? it.branchIds.map((id: any) => String(id)) : [],
      isActive: Boolean(it.isActive ?? true),
    })).filter((item) => Boolean(item.id));
    setProcedures(mapped);
  }, [proceduresQuery.data]);

  const handleSave = async () => {
    if (!form.name.trim()) {
      showNotification({
        title: 'Campo obrigatorio',
        message: 'Informe o nome do procedimento.',
        color: 'red',
      });
      return;
    }

    if (!form.appointmentType) {
      showNotification({
        title: 'Campo obrigatorio',
        message: 'Informe o tipo do procedimento.',
        color: 'red',
      });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        appointmentType: form.appointmentType,
        durationMinutes: form.durationMinutes ?? null,
        modalities: [
          ...form.modalities.filter((modality) => modality !== TELECONSULT_MODALITY),
          ...((form.appointmentType === 'CONSULTA_CLINICA' || form.appointmentType === 'CONSULTA_TERAPIAS') && form.supportsTeleconsultation ? [TELECONSULT_MODALITY] : []),
        ],
        especialidadeId: form.especialidadeId || null,
        cboId: form.cboId || null,
        branchIds: form.branchIds,
      };

      if (editingProcedureId) {
        await procedureService.updateProcedure(editingProcedureId, payload);
        setLastSaveAction('update');
        setEditingProcedureId(null);
        resetForm();

        setActiveTab('lista');
        showNotification({ title: 'Procedimento atualizado', message: 'Dados atualizados com sucesso.', color: 'green' });
      } else {
        await procedureService.createProcedure(payload);
        setLastSaveAction('create');
        setLastCreatedName(form.name.trim());
        setShowSuccessModal(true);
        resetForm();

        setProcedureQuery('');
      }
      await queryClient.invalidateQueries({ queryKey: queryKeys.proceduresAdmin });
    } catch (err: any) {
      const message = resolveApiErrorMessage(err, 'Erro ao salvar procedimento');
      setErrorMessage(message);
      setShowErrorModal(true);
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setForm({ ...INITIAL_FORM });
    setFormResetKey((current) => current + 1);
  };

  const handleCancel = () => {
    if (editingProcedureId) {
      setEditingProcedureId(null);
      resetForm();
      setActiveTab('lista');
      return;
    }
    resetForm();
    navigate('/dashboard');
  };

  const handleNameChange = (value: string) => {
    setForm((prev) => ({ ...prev, name: value }));
  };

  const handleDescriptionChange = (value: string) => {
    setForm((prev) => ({ ...prev, description: value }));
  };

  const handleToggleActive = async (item: ProcedureItem) => {
    try {
      await procedureService.updateProcedure(item.id, {
        isActive: !item.isActive,
      });
      await queryClient.invalidateQueries({ queryKey: queryKeys.proceduresAdmin });

      showNotification({
        title: 'Status atualizado',
        message: `Procedimento ${!item.isActive ? 'ativado' : 'desativado'} com sucesso.`,
        color: 'green',
      });
    } catch (err: any) {
      const msg = resolveApiErrorMessage(err, 'Erro ao atualizar status');
      showNotification({ title: 'Erro', message: msg, color: 'red' });
    }
  };

  const handleEditProcedure = async (procedureId: string) => {
    try {
      const data: any = await procedureService.getProcedure(procedureId);

      setForm({
        name: data.name || '',
        description: data.description || '',
        appointmentType: normalizeAppointmentType(data.appointmentType),
        durationMinutes: data.durationMinutes !== undefined && data.durationMinutes !== null
          ? Number(data.durationMinutes)
          : null,
        supportsTeleconsultation: Array.isArray(data.modalities) ? data.modalities.includes(TELECONSULT_MODALITY) : false,
        modalities: Array.isArray(data.modalities)
          ? data.modalities.filter((modality: string) => modality !== TELECONSULT_MODALITY)
          : [],
        especialidadeId: data.especialidadeId || data.especialidade?.id || null,
        cboId: data.cboId || data.cbo?.id || null,
        branchIds: Array.isArray(data.branchIds) ? data.branchIds.map((id: any) => String(id)) : [],
      });

      setEditingProcedureId(procedureId);
      setActiveTab('cadastro');
    } catch (err: any) {
      showNotification({
        title: 'Erro',
        message: resolveApiErrorMessage(err, 'Erro ao carregar procedimento'),
        color: 'red',
      });
    }
  };

  return (
    <Box bg="var(--mantine-color-body)" style={{ minHeight: '100vh' }}>
      <Header />
      <Box p={isMobile ? 'sm' : isTablet ? 'md' : 'xl'} maw={isMobile ? '100%' : 1400} mx="auto">
        <Stack gap="md">
          <Group mb={isMobile ? 20 : 30} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Group align="center">
              <ActionIcon variant="default" color="black" size="xl" onClick={() => navigate(-1)}>
                <ChevronLeft size={28} />
              </ActionIcon>
              <Box>
                <Text fw={600} size={isMobile ? 'md' : 'lg'} c="var(--mantine-color-text)">Cadastro de Procedimentos</Text>
                <Text size="sm" c="dimmed">Procedimentos, modalidades, preços e convênios aceitos.</Text>
              </Box>
            </Group>
          </Group>

          {activeTab === 'hub' ? (
            <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
              {[
                {
                  key: 'cadastro',
                  icon: UserPlus,
                  title: 'Cadastrar procedimento',
                  desc: 'Registre procedimentos com regras clínicas, modalidade, unidades e convênios aceitos.',
                  onClick: () => setActiveTab('cadastro'),
                },
                {
                  key: 'lista',
                  icon: Users,
                  title: 'Procedimentos cadastrados',
                  desc: 'Consulte, edite e ative/desative procedimentos já cadastrados.',
                  onClick: () => setActiveTab('lista'),
                },
              ].map((card) => (
                <Paper
                  key={card.key}
                  p="lg"
                  withBorder
                  onClick={card.onClick}
                  style={{ cursor: 'pointer', borderColor: 'var(--mantine-color-default-border)', minHeight: 96 }}
                >
                  <Group justify="space-between" align="center" wrap="nowrap">
                    <Group gap="md" wrap="nowrap" style={{ minWidth: 0, flex: 1 }}>
                      <Box
                        w={44}
                        h={44}
                        style={{
                          borderRadius: 10,
                          border: `1px solid ${isDarkMode ? '#dbe7ff' : DARK_BLUE}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <card.icon size={22} color={isDarkMode ? '#dbe7ff' : DARK_BLUE} />
                      </Box>
                      <Box style={{ minWidth: 0 }}>
                        <Text fw={600} size="md" lineClamp={1}>{card.title}</Text>
                        <Text size="sm" c="dimmed" lineClamp={2}>{card.desc}</Text>
                      </Box>
                    </Group>
                    <ChevronRight size={18} color="var(--mantine-color-dimmed)" style={{ flexShrink: 0 }} />
                  </Group>
                </Paper>
              ))}
            </SimpleGrid>
          ) : (
            <>
              <Group justify="space-between" align="center" mb="lg" wrap="wrap">
                <Group gap="xs">
                  <Button
                    variant="default"
                    leftSection={<ChevronLeft size={16} />}
                    onClick={() => setActiveTab('hub')}
                  >
                    Voltar
                  </Button>
                  <Text fw={600}>
                    {activeTab === 'cadastro' ? 'Cadastrar procedimento' : 'Procedimentos cadastrados'}
                  </Text>
                </Group>
              </Group>

              {activeTab === 'cadastro' ? (
                <Paper key={formResetKey} p="lg">
                {editingProcedureId && (
                  <Text size="sm" c="dimmed" mb="md">
                    Editando procedimento. Ajuste os dados e salve as alterações.
                  </Text>
                )}
                <SectionTitle>Procedimento</SectionTitle>
                <Box mb="md">
                  <FloatingInput
                    label="Nome do procedimento"
                    placeholder="Ex: Consulta cardiologica"
                    value={form.name}
                    onChange={(e) => handleNameChange(e?.currentTarget?.value ?? '')}
                    required
                  />
                </Box>

                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md" mt="md">
                  <FloatingSelect
                    label="Tipo do procedimento"
                    data={[
                      { value: 'CONSULTA_CLINICA', label: 'Consulta clínica' },
                      { value: 'CONSULTA_TERAPIAS', label: 'Consulta terapias' },
                      { value: 'EXAME', label: 'Exame' },
                    ]}
                    value={form.appointmentType}
                    onChange={(value) => setForm((prev) => ({
                      ...prev,
                      appointmentType: normalizeAppointmentType(value),
                      supportsTeleconsultation: value === 'EXAME' ? false : prev.supportsTeleconsultation,
                    }))}
                    allowDeselect={false}
                  />
                  <FloatingNumberInput
                    label="Duração (minutos)"
                    placeholder="Ex: 50"
                    value={form.durationMinutes}
                    onChange={(value) => setForm((prev) => ({ ...prev, durationMinutes: typeof value === 'number' ? value : null }))}
                    min={1}
                    step={5}
                  />
                </SimpleGrid>

                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md" mt="md">
                  <FloatingSelect
                    label="Especialidade"
                    placeholder="Selecione a especialidade"
                    data={especialidadeOptions}
                    value={form.especialidadeId}
                    searchable
                    clearable
                    nothingFoundMessage="Nenhuma especialidade encontrada"
                    onChange={(value) => setForm((prev) => ({ ...prev, especialidadeId: value }))}
                  />
                  <FloatingSelect
                    label="CBO"
                    placeholder="Selecione o CBO (opcional)"
                    data={cboOptions}
                    value={form.cboId}
                    searchable
                    clearable
                    nothingFoundMessage="Nenhum CBO encontrado"
                    onChange={(value) => setForm((prev) => ({ ...prev, cboId: value }))}
                  />
                </SimpleGrid>

                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md" mt="md">
                  <FloatingMultiSelect
                    label="Unidades atendidas"
                    placeholder="Selecione as unidades"
                    data={branchOptions}
                    value={form.branchIds}
                    searchable
                    clearable
                    nothingFoundMessage="Nenhuma unidade encontrada"
                    onChange={(values) => setForm((prev) => ({ ...prev, branchIds: values }))}
                  />
                </SimpleGrid>

                <FloatingTextarea
                  mt="md"
                  label="Descrição"
                  placeholder="Descreva o procedimento"
                  minRows={3}
                  value={form.description}
                  onChange={(e) => handleDescriptionChange(e?.currentTarget?.value ?? '')}
                />

                <SectionTitle>Forma de Atendimento</SectionTitle>
                <Group align="flex-end" gap="md" wrap="wrap">
                  <Switch
                    label="Suporta teleconsulta"
                    checked={form.supportsTeleconsultation}
                    disabled={form.appointmentType === 'EXAME'}
                    onChange={(event) => {
                      const checked = event.currentTarget.checked;
                      setForm((prev) => ({ ...prev, supportsTeleconsultation: checked }));
                    }}
                  />
                </Group>

                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md" mt="md">
                  <FloatingMultiSelect
                    label="Forma de Atendimento"
                    data={modalityOptions}
                    value={form.modalities}
                    onChange={(values) => setForm((prev) => ({ ...prev, modalities: values }))}
                    searchable
                    maxDropdownHeight={220}
                  />
                </SimpleGrid>

                <Group justify="space-between" mt="xl" wrap="wrap">
                  <Button variant="default" onClick={handleCancel} fullWidth={isMobile}>
                    Cancelar
                  </Button>
                  <Button
                    bg={DARK_BLUE}
                    c="white"
                    onClick={handleSave}
                    loading={saving}
                    fullWidth={isMobile}
                    style={{ minWidth: isTablet ? undefined : 220 }}
                  >
                    {editingProcedureId ? 'Salvar alterações' : 'Salvar procedimento'}
                  </Button>
                </Group>
              </Paper>
              ) : (
              <Paper p="lg">
                <Group justify="space-between" mb="md" wrap="wrap">
                  <SectionTitle>Procedimentos cadastrados</SectionTitle>
                  <FloatingInput
                    label="Buscar procedimentos"
                    value={procedureQuery}
                    onChange={(e) => setProcedureQuery(e.currentTarget.value)}
                    containerProps={{ w: isMobile ? '100%' : 320 }}
                  />
                </Group>

                {proceduresLoading ? (
                  isMobile ? (
                    <Stack gap="sm">
                      {Array.from({ length: 4 }).map((_, idx) => (
                        <Paper key={idx} withBorder radius="md" p="md">
                          <Group justify="space-between" align="flex-start" wrap="nowrap">
                            <Stack gap={8} style={{ flex: 1 }}>
                              <Skeleton height={18} width="56%" radius="sm" />
                              <Skeleton height={14} width="34%" radius="sm" />
                              <Skeleton height={14} width="42%" radius="sm" />
                            </Stack>
                            <Stack gap={8} align="flex-end">
                              <Skeleton height={24} width={84} radius="xl" />
                              <Group gap={8}>
                                <Skeleton height={28} width={28} radius="xl" />
                                <Skeleton height={28} width={28} radius="xl" />
                              </Group>
                            </Stack>
                          </Group>
                        </Paper>
                      ))}
                    </Stack>
                  ) : (
                    <Box style={{ overflowX: 'auto', border: '1px solid #e9ecef', borderRadius: 6 }}>
                      <Table horizontalSpacing="md" verticalSpacing="md">
                        <Table.Thead>
                          <Table.Tr>
                            <Table.Th>Nome</Table.Th>
                            <Table.Th>Tipo</Table.Th>
                            <Table.Th>Convênio</Table.Th>
                            <Table.Th>Modalidades</Table.Th>
                            <Table.Th>Status</Table.Th>
                            <Table.Th>Ações</Table.Th>
                          </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                          {Array.from({ length: 5 }).map((_, idx) => (
                            <Table.Tr key={idx}>
                              <Table.Td><Skeleton height={16} width="72%" radius="sm" /></Table.Td>
                              <Table.Td><Skeleton height={24} width={82} radius="xl" /></Table.Td>
                              <Table.Td><Skeleton height={14} width="45%" radius="sm" /></Table.Td>
                              <Table.Td><Skeleton height={14} width="70%" radius="sm" /></Table.Td>
                              <Table.Td><Skeleton height={24} width={78} radius="xl" /></Table.Td>
                              <Table.Td>
                                <Group gap={6} wrap="nowrap">
                                  <Skeleton height={28} width={28} radius="xl" />
                                  <Skeleton height={28} width={28} radius="xl" />
                                </Group>
                              </Table.Td>
                            </Table.Tr>
                          ))}
                        </Table.Tbody>
                      </Table>
                    </Box>
                  )
                ) : (
                  isMobile ? (
                    filteredProcedures.length === 0 ? (
                      <Paper withBorder radius="md" p="xl">
                        <Text size="sm" c="dimmed" ta="center">
                          Nenhum procedimento encontrado. Ajuste a busca ou cadastre um novo procedimento.
                        </Text>
                      </Paper>
                    ) : (
                      <Stack gap="sm">
                        {filteredProcedures.map((item) => (
                          <Paper
                            key={item.id}
                            withBorder
                            radius="md"
                            p="md"
                            style={{
                              backgroundColor: item.isActive
                                ? 'transparent'
                                : (isDarkMode ? 'rgba(255, 255, 255, 0.08)' : '#f1f3f5'),
                            }}
                          >
                            <Group justify="space-between" align="flex-start" wrap="nowrap">
                              <Stack gap={4} style={{ flex: 1 }}>
                                <Text fw={600} size="sm">{item.name}</Text>
                                {item.especialidadeName && (
                                  <Text size="xs" c="dimmed">
                                    Especialidade: {item.especialidadeName}
                                  </Text>
                                )}
                                {item.cbo && (
                                  <Text size="xs" c="dimmed">
                                    CBO: {item.cbo.code} — {item.cbo.title}
                                  </Text>
                                )}
                                <Group gap="xs">
                                  <Badge color={item.appointmentType === 'EXAME' ? 'orange' : 'blue'} variant="light" size="sm">
                                    {appointmentTypeLabel(item.appointmentType)}
                                  </Badge>
                                  {item.supportsTeleconsultation && (
                                    <Badge color="indigo" variant="light" size="sm">
                                      Teleconsulta
                                    </Badge>
                                  )}
                                </Group>
                                <Text size="xs" c="dimmed">
                                  {item.modalities.length ? item.modalities.join(', ') : 'Sem forma de atendimento'}
                                </Text>
                                <Text size="xs" c="dimmed">
                                  Unidades: {item.branchIds.length ? item.branchIds.map((id) => branchLabelById[id] || id).join(', ') : 'Todas'}
                                </Text>
                              </Stack>
                              <Badge color={item.isActive ? 'green' : 'red'} variant="light" size="sm">
                                {item.isActive ? 'Ativo' : 'Inativo'}
                              </Badge>
                            </Group>
                            <Group gap={8} mt="md" wrap="nowrap">
                              <ActionIcon
                                variant="light"
                                color="blue"
                                style={{ color: item.isActive ? undefined : '#adb5bd' }}
                                onClick={() => item.isActive && handleEditProcedure(item.id)}
                                title={item.isActive ? 'Editar' : 'Ative o procedimento para editar'}
                                disabled={!item.isActive}
                              >
                                <Pencil size={16} />
                              </ActionIcon>
                              <ActionIcon
                                variant="light"
                                color={item.isActive ? 'orange' : 'green'}
                                onClick={() => handleToggleActive(item)}
                                title={item.isActive ? 'Desativar' : 'Ativar'}
                              >
                                <Power size={16} />
                              </ActionIcon>
                            </Group>
                          </Paper>
                        ))}
                      </Stack>
                    )
                  ) : (
                    <PaginatedGrid
                      totalItems={filteredProcedures.length}
                      page={procedurePage}
                      pageSize={procedurePageSize}
                      onPageChange={setProcedurePage}
                      onPageSizeChange={setProcedurePageSize}
                      isMobile={isMobile}
                      maxHeight={isMobile ? 500 : 620}
                      showFooter
                    >
                      <Table horizontalSpacing={isMobile ? 'sm' : 'md'} verticalSpacing={isMobile ? 'sm' : 'md'}>
                        <Table.Thead>
                          <Table.Tr style={{ borderBottom: 'none' }}>
                            <Table.Th style={{ color: '#868e96', fontSize: isMobile ? '0.7rem' : '0.8rem', fontWeight: 500 }}>Nome</Table.Th>
                            {!isTablet && <Table.Th style={{ color: '#868e96', fontSize: '0.8rem', fontWeight: 500 }}>Tipo</Table.Th>}
                            {!isTablet && <Table.Th style={{ color: '#868e96', fontSize: '0.8rem', fontWeight: 500 }}>Convênio</Table.Th>}
                            {!isTablet && <Table.Th style={{ color: '#868e96', fontSize: '0.8rem', fontWeight: 500 }}>Forma de Atendimento</Table.Th>}
                            {!isTablet && <Table.Th style={{ color: '#868e96', fontSize: '0.8rem', fontWeight: 500 }}>Status</Table.Th>}
                            <Table.Th style={{ color: '#868e96', fontSize: isMobile ? '0.7rem' : '0.8rem', fontWeight: 500, textAlign: 'center', width: 96 }}>
                              Ações
                            </Table.Th>
                          </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                          {filteredProcedures.length === 0 ? (
                            <Table.Tr>
                              <Table.Td colSpan={isTablet ? 2 : 6}>
                                <Text size="sm" c="dimmed" ta="center">
                                  Nenhum procedimento encontrado. Ajuste a busca ou cadastre um novo procedimento.
                                </Text>
                              </Table.Td>
                            </Table.Tr>
                          ) : (
                            paginatedProcedures.map((item) => (
                              <Table.Tr
                                key={item.id}
                                style={{
                                  borderBottom: '1px solid #e9ecef',
                                  backgroundColor: item.isActive
                                    ? 'transparent'
                                    : (isDarkMode ? 'rgba(255, 255, 255, 0.08)' : '#f1f3f5'),
                                }}
                              >
                                <Table.Td>
                                  <Stack gap={2}>
                                    <Text fw={600} size="sm">{item.name}</Text>
                                    {item.especialidadeName && (
                                      <Text size="xs" c="dimmed">
                                        Especialidade: {item.especialidadeName}
                                      </Text>
                                    )}
                                    {item.cbo && (
                                      <Text size="xs" c="dimmed">
                                        CBO: {item.cbo.code} — {item.cbo.title}
                                      </Text>
                                    )}
                                    <Text size="xs" c="dimmed">
                                      Unidades: {item.branchIds.length ? item.branchIds.map((id) => branchLabelById[id] || id).join(', ') : 'Todas'}
                                    </Text>
                                  </Stack>
                                </Table.Td>
                                {!isTablet && (
                                  <Table.Td>
                                    <Group gap={6}>
                                  <Badge color={item.appointmentType === 'EXAME' ? 'orange' : 'blue'} variant="light" size="sm">
                                    {appointmentTypeLabel(item.appointmentType)}
                                      </Badge>
                                      {item.supportsTeleconsultation && (
                                        <Badge color="indigo" variant="light" size="sm">
                                          Teleconsulta
                                        </Badge>
                                      )}
                                    </Group>
                                  </Table.Td>
                                )}
                                {!isTablet && (
                                  <Table.Td>
                                    <Text size="sm">{item.modalities.length ? item.modalities.join(', ') : '-'}</Text>
                                  </Table.Td>
                                )}
                                {!isTablet && (
                                  <Table.Td>
                                    <Badge
                                      color={item.isActive ? 'green' : 'red'}
                                      variant="light"
                                      size="sm"
                                    >
                                      {item.isActive ? 'Ativo' : 'Inativo'}
                                    </Badge>
                                  </Table.Td>
                                )}
                                <Table.Td style={{ textAlign: 'center' }}>
                                  <Group justify="center">
                                    <Menu shadow="md" width={210} position="bottom" withArrow>
                                      <Menu.Target>
                                        <ActionIcon variant="light" size="sm" aria-label="Ações do procedimento">
                                          <MoreVertical size={16} />
                                        </ActionIcon>
                                      </Menu.Target>
                                      <Menu.Dropdown>
                                        <Menu.Item
                                          leftSection={<Pencil size={14} />}
                                          onClick={() => handleEditProcedure(item.id)}
                                          disabled={!item.isActive}
                                        >
                                          Editar
                                        </Menu.Item>
                                        <Menu.Item
                                          leftSection={<Power size={14} />}
                                          color={item.isActive ? 'orange' : 'green'}
                                          onClick={() => handleToggleActive(item)}
                                        >
                                          {item.isActive ? 'Desativar' : 'Ativar'}
                                        </Menu.Item>
                                      </Menu.Dropdown>
                                    </Menu>
                                  </Group>
                                </Table.Td>
                              </Table.Tr>
                            ))
                          )}
                        </Table.Tbody>
                      </Table>
                    </PaginatedGrid>
                  )
                )}
              </Paper>
              )}
            </>
          )}
        </Stack>
      </Box>

      <ResultModal
        opened={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        variant="success"
        title={lastSaveAction === 'update' ? 'Procedimento atualizado' : 'Procedimento salvo'}
        message={
          lastCreatedName
            ? (lastSaveAction === 'update'
              ? `Procedimento ${lastCreatedName} atualizado com sucesso.`
              : `Procedimento ${lastCreatedName} cadastrado com sucesso.`)
            : (lastSaveAction === 'update'
              ? 'Procedimento atualizado com sucesso.'
              : 'Procedimento cadastrado com sucesso.')
        }
        primary={{
          label: 'Cadastrar outro',
          onClick: () => setShowSuccessModal(false),
        }}
        secondary={{
          label: 'Voltar para Cadastros Clínicos',
          onClick: () => {
            setShowSuccessModal(false);
            navigate('/dashboard?secao=cadastros-clinicos');
          },
        }}
      />

      <ResultModal
        opened={showErrorModal}
        onClose={() => setShowErrorModal(false)}
        variant="error"
        title="Erro ao salvar"
        message={errorMessage || 'Ocorreu um erro ao salvar o procedimento.'}
        primary={{
          label: 'Tentar novamente',
          onClick: () => {
            setShowErrorModal(false);
            handleSave();
          },
        }}
        secondary={{
          label: 'Fechar',
          onClick: () => setShowErrorModal(false),
        }}
      />
    </Box>
  );
}
