import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Group,
  Text,
  Title,
  ActionIcon,
  Paper,
  Stack,
  Button,
  TextInput,
  Textarea,
  Switch,
  MultiSelect,
  Select,
  SimpleGrid,
  Loader,
  Table,
  Center,
  Tabs,
  Badge,
  Modal,
  NumberInput
} from '@mantine/core';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Power, Pencil } from 'lucide-react';
import { useMediaQuery } from '@mantine/hooks';
import { showNotification } from '@mantine/notifications';
import { Header } from '../Header/Header';
import { DARK_BLUE } from '../../themes/theme';
import doctorService from '../../services/doctorService';
import procedureService from '../../services/procedureService';
import ResultModal from '../common/ResultModal';

interface ProcedureForm {
  name: string;
  description: string;
  acceptsInsurance: boolean;
  acceptedInsurances: string[];
  acceptedSubInsurances: Record<string, string[]>;
  durationMinutes?: number | null;
  modalities: string[];
  doctorId: string | null;
}

interface ProcedureItem {
  id: string;
  name: string;
  acceptsInsurance: boolean;
  acceptedInsurances: string[];
  modalities: string[];
  doctorIds: string[];
  doctorsCount: number;
  isActive: boolean;
}

const INITIAL_FORM: ProcedureForm = {
  name: '',
  description: '',
  acceptsInsurance: false,
  acceptedInsurances: [],
  acceptedSubInsurances: {},
  durationMinutes: null,
  modalities: [],
  doctorId: null,
};

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <Title order={5} fw={600} c="var(--mantine-color-text)" mb="sm" mt="md">
      {children}
    </Title>
  );
}

export function CadastroProcedimento() {
  const navigate = useNavigate();
  const isMobile = useMediaQuery('(max-width: 799px)');
  const isTablet = useMediaQuery('(max-width: 1279px)');

  const [form, setForm] = useState<ProcedureForm>(INITIAL_FORM);
  const [saving, setSaving] = useState(false);
  const [procedures, setProcedures] = useState<ProcedureItem[]>([]);
  const [proceduresLoading, setProceduresLoading] = useState(false);
  const [procedureQuery, setProcedureQuery] = useState('');
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [doctorOptions, setDoctorOptions] = useState<{ value: string; label: string }[]>([]);
  const [doctorDirectory, setDoctorDirectory] = useState<Record<string, { name?: string }>>({});
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastCreatedName, setLastCreatedName] = useState<string | null>(null);
  const [lastSaveAction, setLastSaveAction] = useState<'create' | 'update'>('create');
  const [editingProcedureId, setEditingProcedureId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('cadastro');
  const [customInsuranceInput, setCustomInsuranceInput] = useState('');
  const [showInsuranceModal, setShowInsuranceModal] = useState(false);
  const [doctorSearchValue, setDoctorSearchValue] = useState('');

  const doctorLabelById = useMemo(() => {
    return doctorOptions.reduce<Record<string, string>>((acc, option) => {
      acc[option.value] = option.label;
      return acc;
    }, {});
  }, [doctorOptions]);

  const filteredProcedures = useMemo(() => {
    const q = procedureQuery.trim().toLowerCase();
    if (!q) return procedures;
    return procedures.filter((item) => item.name.toLowerCase().includes(q));
  }, [procedures, procedureQuery]);

  const modalityOptions = [
    { value: 'Presencial', label: 'Presencial' },
    { value: 'Telemedicina', label: 'Telemedicina' },
    { value: 'Domiciliar', label: 'Domiciliar' },
    { value: 'Emergencial', label: 'Emergencial' },
  ];

  const insuranceOptions = [
    { value: 'Unimed', label: 'Unimed' },
    { value: 'Bradesco Saúde', label: 'Bradesco Saúde' },
    { value: 'Amil', label: 'Amil' },
    { value: 'Hapvida', label: 'Hapvida' },
    { value: 'Sulamerica', label: 'Sulamerica' },
    { value: 'MediService', label: 'Mediservice' },
  ];

  const subInsuranceOptions: Record<string, { value: string; label: string }[]> = {
    'Unimed': [
      { value: 'Unimed Pacheco', label: 'Unimed Pacheco' },
      { value: 'Unimed Empresarial', label: 'Unimed Empresarial' },
      { value: 'Unimed Odonto', label: 'Unimed Odonto' },
    ],
    'Bradesco Saúde': [
      { value: 'Bradesco Saúde Nacional', label: 'Bradesco Saúde Nacional' },
      { value: 'Bradesco Saúde Hospitalar', label: 'Bradesco Saúde Hospitalar' },
    ],
    'Amil': [
      { value: 'Amil Total', label: 'Amil Total' },
      { value: 'Amil Empresarial', label: 'Amil Empresarial' },
    ],
    'Hapvida': [
      { value: 'Hapvida Standard', label: 'Hapvida Standard' },
      { value: 'Hapvida Plus', label: 'Hapvida Plus' },
    ],
    'Sulamerica': [
      { value: 'SulAmérica Standard', label: 'SulAmérica Standard' },
      { value: 'SulAmérica Executivo', label: 'SulAmérica Executivo' },
    ],
    'MediService': [
      { value: 'MediService Plus', label: 'MediService Plus' },
      { value: 'MediService Basic', label: 'MediService Basic' },
    ],
  };

  useEffect(() => {
    const loadProcedures = async () => {
      setProceduresLoading(true);
      try {
        const data: any = await procedureService.listProcedures({ limit: 200, offset: 0 });
        const list: any[] = Array.isArray(data)
          ? data
          : (Array.isArray(data?.items)
            ? data.items
            : (Array.isArray(data?.data?.items)
              ? data.data.items
              : (Array.isArray(data?.data)
                ? data.data
                : [])));

        const mapped: ProcedureItem[] = list.map((it: any) => ({
          id: String(it.id ?? it.procedureId ?? ''),
          name: it.name || 'Procedimento',
          acceptsInsurance: Boolean(it.acceptsInsurance),
          acceptedInsurances: Array.isArray(it.acceptedInsurances) ? it.acceptedInsurances : [],
          modalities: Array.isArray(it.modalities) ? it.modalities : [],
          doctorsCount: Array.isArray(it.doctors) ? it.doctors.length : 0,
          isActive: Boolean(it.isActive ?? true),
          doctorIds: Array.isArray(it.doctors) ? it.doctors.map((doc: any) => String(doc.doctorId ?? doc.id ?? '')) : [],
        })).filter((item: ProcedureItem) => item.id);

        setProcedures(mapped);
      } catch (err: any) {
        showNotification({
          title: 'Erro',
          message: err?.response?.data?.message || err?.message || 'Erro ao carregar procedimentos',
          color: 'red',
        });
      } finally {
        setProceduresLoading(false);
      }
    };
    loadProcedures();
  }, []);

  useEffect(() => {
    const loadDoctors = async () => {
      setLoadingDoctors(true);
      try {
        const data: any = await doctorService.listDoctors();
        const list: any[] = Array.isArray(data)
          ? data
          : (Array.isArray(data?.items)
            ? data.items
            : (Array.isArray(data?.data?.items)
              ? data.data.items
              : (Array.isArray(data?.data)
                ? data.data
                : [])));

        const options = list.map((doctor: any) => {
          const id = String(doctor.id ?? doctor.doctorId ?? '');
          const name = doctor.name || doctor.nome || doctor.fullName || 'Sem nome';
          return { value: id, label: name };
        }).filter((item: { value: string }) => item.value);

        const directory = list.reduce<Record<string, { name?: string }>>((acc, doctor: any) => {
          const id = String(doctor.id ?? doctor.doctorId ?? '');
          if (!id) return acc;
          acc[id] = { name: doctor.name || doctor.nome || doctor.fullName || undefined };
          return acc;
        }, {});

        setDoctorOptions(options);
        setDoctorDirectory(directory);
      } catch (err: any) {
        showNotification({
          title: 'Erro',
          message: err?.response?.data?.message || err?.message || 'Erro ao carregar medicos',
          color: 'red',
        });
      } finally {
        setLoadingDoctors(false);
      }
    };

    loadDoctors();
  }, []);

  const handleSave = async () => {
    if (!form.name.trim()) {
      showNotification({
        title: 'Campo obrigatorio',
        message: 'Informe o nome do procedimento.',
        color: 'red',
      });
      return;
    }

    setSaving(true);
    try {
      const doctorName = form.doctorId 
        ? (doctorLabelById[form.doctorId] || doctorDirectory[form.doctorId]?.name || form.doctorId)
        : undefined;

      const doctors = form.doctorId
        ? [{
            doctorId: form.doctorId,
            doctorName: doctorName,
          }]
        : [];

      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        durationMinutes: form.durationMinutes ?? null,
        acceptsInsurance: form.acceptsInsurance,
        acceptedInsurances: form.acceptsInsurance ? form.acceptedInsurances : [],
        acceptedSubInsurances: form.acceptsInsurance ? form.acceptedSubInsurances : {},
        modalities: form.modalities,
        doctors,
      };

      if (editingProcedureId) {
        await procedureService.updateProcedure(editingProcedureId, payload);
        setLastSaveAction('update');
        setEditingProcedureId(null);
        setForm(INITIAL_FORM);
        setDoctorSearchValue('');
        setActiveTab('lista');
        showNotification({ title: 'Procedimento atualizado', message: 'Dados atualizados com sucesso.', color: 'green' });
      } else {
        await procedureService.createProcedure(payload);
        setLastSaveAction('create');
        setLastCreatedName(form.name.trim());
        setShowSuccessModal(true);
        setForm(INITIAL_FORM);
        setDoctorSearchValue('');
        setProcedureQuery('');
      }
      const refreshed: any = await procedureService.listProcedures({ limit: 200, offset: 0 });
      const list: any[] = Array.isArray(refreshed)
        ? refreshed
        : (Array.isArray(refreshed?.items)
          ? refreshed.items
          : (Array.isArray(refreshed?.data?.items)
            ? refreshed.data.items
            : (Array.isArray(refreshed?.data)
              ? refreshed.data
              : [])));
      const mapped: ProcedureItem[] = list.map((it: any) => ({
        id: String(it.id ?? it.procedureId ?? ''),
        name: it.name || 'Procedimento',
        acceptsInsurance: Boolean(it.acceptsInsurance),
        acceptedInsurances: Array.isArray(it.acceptedInsurances) ? it.acceptedInsurances : [],
        modalities: Array.isArray(it.modalities) ? it.modalities : [],
        doctorsCount: Array.isArray(it.doctors) ? it.doctors.length : 0,
        isActive: Boolean(it.isActive ?? true),
        doctorIds: Array.isArray(it.doctors) ? it.doctors.map((doc: any) => String(doc.doctorId ?? doc.id ?? '')) : [],
      })).filter((item: ProcedureItem) => item.id);
      setProcedures(mapped);
    } catch (err: any) {
      const message = err?.response?.data?.message || err?.message || 'Erro ao salvar procedimento';
      setErrorMessage(message);
      setShowErrorModal(true);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (editingProcedureId) {
      setEditingProcedureId(null);
      setForm(INITIAL_FORM);
      setActiveTab('lista');
      setDoctorSearchValue('');
      return;
    }
    setForm(INITIAL_FORM);
    setDoctorSearchValue('');
    navigate('/dashboard');
  };

  const handleAcceptsInsuranceChange = (checked: boolean) => {
    setForm((prev) => ({
      ...prev,
      acceptsInsurance: checked,
      acceptedInsurances: checked ? prev.acceptedInsurances : [],
    }));
    setCustomInsuranceInput('');
    if (checked) {
      setShowInsuranceModal(true);
    }
  };

  const handleCloseInsuranceModal = () => {
    // Se não há convênios aceitos, desativa o acceptsInsurance
    if (form.acceptedInsurances.length === 0) {
      setForm((prev) => ({
        ...prev,
        acceptsInsurance: false,
      }));
    }
    setShowInsuranceModal(false);
    setCustomInsuranceInput('');
  };

  const handleAddCustomInsurance = () => {
    if (!customInsuranceInput.trim()) return;
    const trimmed = customInsuranceInput.trim();
    if (!form.acceptedInsurances.includes(trimmed)) {
      setForm((prev) => ({
        ...prev,
        acceptedInsurances: [...prev.acceptedInsurances, trimmed],
      }));
    }
    setCustomInsuranceInput('');
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

      setProcedures((prev) =>
        prev.map((p) =>
          p.id === item.id
            ? { ...p, isActive: !p.isActive }
            : p
        )
      );

      showNotification({
        title: 'Status atualizado',
        message: `Procedimento ${!item.isActive ? 'ativado' : 'desativado'} com sucesso.`,
        color: 'green',
      });
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Erro ao atualizar status';
      showNotification({ title: 'Erro', message: msg, color: 'red' });
    }
  };

  const handleEditProcedure = async (procedureId: string) => {
    try {
      const data: any = await procedureService.getProcedure(procedureId);
      
      const doctorId = Array.isArray(data?.doctors) && data.doctors.length > 0
        ? String(data.doctors[0].doctorId || data.doctors[0].id || '')
        : null;

      setForm({
        name: data.name || '',
        description: data.description || '',
        durationMinutes: data.durationMinutes !== undefined && data.durationMinutes !== null
          ? Number(data.durationMinutes)
          : null,
        acceptsInsurance: Boolean(data.acceptsInsurance),
        acceptedInsurances: Array.isArray(data.acceptedInsurances) ? data.acceptedInsurances : [],
        acceptedSubInsurances: (data.acceptedSubInsurances && typeof data.acceptedSubInsurances === 'object') ? data.acceptedSubInsurances : {},
        modalities: Array.isArray(data.modalities) ? data.modalities : [],
        doctorId,
      });
      setDoctorSearchValue('');

      setEditingProcedureId(procedureId);
      setActiveTab('cadastro');
    } catch (err: any) {
      showNotification({
        title: 'Erro',
        message: err?.response?.data?.message || err?.message || 'Erro ao carregar procedimento',
        color: 'red',
      });
    }
  };

  return (
    <Box bg="var(--mantine-color-body)" style={{ minHeight: '100vh' }}>
      <Header />
      <Box p="xl" maw={1400} mx="auto">
        <Stack gap="md">
          <Group justify="space-between" align="flex-start" wrap="wrap">
            <Group gap="sm">
              <ActionIcon
                variant="default"
                size="xl"
                onClick={() => navigate('/dashboard')}
                style={{ borderColor: DARK_BLUE }}
              >
                <ChevronLeft size={20} />
              </ActionIcon>
              <Box>
                <Title order={2} fw={600}>Cadastro de Procedimentos</Title>
                <Text c="dimmed">Procedimentos, modalidades, precos e convenios aceitos.</Text>
              </Box>
            </Group>
          </Group>

          <Tabs value={activeTab} onChange={(value) => setActiveTab(value || 'cadastro')} keepMounted={false}>
            <Tabs.List>
              <Tabs.Tab value="cadastro">Cadastrar</Tabs.Tab>
              <Tabs.Tab value="lista">Cadastrados</Tabs.Tab>
            </Tabs.List>

            <Tabs.Panel value="cadastro" pt="md">
              <Paper p="lg">
                {editingProcedureId && (
                  <Text size="sm" c="dimmed" mb="md">
                    Editando procedimento. Ajuste os dados e salve as alterações.
                  </Text>
                )}
                <SectionTitle>Procedimento</SectionTitle>
                <TextInput
                  label="Nome do procedimento"
                  placeholder="Ex: Consulta cardiologica"
                  value={form.name}
                  onChange={(e) => handleNameChange(e?.currentTarget?.value ?? '')}
                  required
                  mb="md"
                />

                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md" mt="md">
                  <NumberInput
                    label="Duração (minutos)"
                    placeholder="Ex: 50"
                    value={form.durationMinutes ?? undefined}
                    onChange={(value) => setForm((prev) => ({ ...prev, durationMinutes: typeof value === 'number' ? value : null }))}
                    min={1}
                    step={5}
                  />
                </SimpleGrid>

                <Textarea
                  mt="md"
                  label="Descricao"
                  placeholder="Descreva o procedimento"
                  minRows={3}
                  value={form.description}
                  onChange={(e) => handleDescriptionChange(e?.currentTarget?.value ?? '')}
                />

                <SectionTitle>Convenios e Modalidades</SectionTitle>
                <Group align="flex-end" gap="md" wrap="wrap">
                  <Switch
                    label="Aceita convenio"
                    checked={form.acceptsInsurance}
                    onChange={(e) => handleAcceptsInsuranceChange(e?.currentTarget?.checked ?? !form.acceptsInsurance)}
                  />
                  {form.acceptsInsurance && form.acceptedInsurances.length > 0 && (
                    <Group gap="xs" align="center">
                      <Text size="sm" c="dimmed">
                        {form.acceptedInsurances.length} convênio(s) adicionado(s)
                      </Text>
                      <ActionIcon
                        variant="subtle"
                        size="sm"
                        onClick={() => setShowInsuranceModal(true)}
                      >
                        <Pencil size={16} />
                      </ActionIcon>
                    </Group>
                  )}
                </Group>

                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md" mt="md">
                  <MultiSelect
                    label="Modalidades"
                    placeholder="Selecione as modalidades"
                    data={modalityOptions}
                    value={form.modalities}
                    onChange={(values) => setForm((prev) => ({ ...prev, modalities: values }))}
                    searchable
                    maxDropdownHeight={220}
                  />
                </SimpleGrid>

                <SectionTitle>Medicos vinculados</SectionTitle>
                <Select
                  label="Selecione o médico"
                  placeholder={loadingDoctors ? 'Carregando médicos' : 'Selecione um médico'}
                  data={doctorOptions}
                  value={form.doctorId}
                  onChange={(value) => setForm((prev) => ({ ...prev, doctorId: value }))}
                  searchValue={doctorSearchValue}
                  onSearchChange={(value) => {
                    setDoctorSearchValue(value);
                    if (value === '') {
                      setForm((prev) => ({ ...prev, doctorId: null }));
                    }
                  }}
                  searchable
                  nothingFoundMessage="Nenhum médico"
                  rightSection={loadingDoctors ? <Loader size={16} /> : undefined}
                  clearable
                />

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
            </Tabs.Panel>

            <Tabs.Panel value="lista" pt="md">
              <Paper p="lg">
                <Group justify="space-between" mb="md" wrap="wrap">
                  <SectionTitle>Procedimentos cadastrados</SectionTitle>
                  <TextInput
                    placeholder="Buscar por nome"
                    value={procedureQuery}
                    onChange={(e) => setProcedureQuery(e.currentTarget.value)}
                    w={isMobile ? '100%' : 280}
                  />
                </Group>

                {proceduresLoading ? (
                  <Center style={{ padding: 16, gap: 8 }}>
                    <Loader size={18} />
                    <Text size="sm">Carregando procedimentos...</Text>
                  </Center>
                ) : (
                  <Box style={{ overflowX: 'auto', border: '1px solid #e9ecef', borderRadius: 6 }}>
                    <Table horizontalSpacing={isMobile ? 'sm' : 'md'} verticalSpacing={isMobile ? 'sm' : 'md'}>
                      <Table.Thead>
                        <Table.Tr style={{ borderBottom: 'none' }}>
                          <Table.Th style={{ color: '#868e96', fontSize: isMobile ? '0.7rem' : '0.8rem', fontWeight: 500 }}>Nome</Table.Th>
                          {!isTablet && <Table.Th style={{ color: '#868e96', fontSize: '0.8rem', fontWeight: 500 }}>Convênio</Table.Th>}
                          {!isTablet && <Table.Th style={{ color: '#868e96', fontSize: '0.8rem', fontWeight: 500 }}>Modalidades</Table.Th>}
                          {!isTablet && <Table.Th style={{ color: '#868e96', fontSize: '0.8rem', fontWeight: 500 }}>Médicos</Table.Th>}
                          {!isTablet && <Table.Th style={{ color: '#868e96', fontSize: '0.8rem', fontWeight: 500 }}>Status</Table.Th>}
                          <Table.Th style={{ color: '#868e96', fontSize: isMobile ? '0.7rem' : '0.8rem', fontWeight: 500 }}>Ações</Table.Th>
                        </Table.Tr>
                      </Table.Thead>
                      <Table.Tbody>
                        {filteredProcedures.length === 0 ? (
                          <Table.Tr>
                            <Table.Td colSpan={7}>
                              <Text size="sm" c="dimmed" ta="center">Nenhum procedimento encontrado</Text>
                            </Table.Td>
                          </Table.Tr>
                        ) : (
                          filteredProcedures.map((item) => (
                            <Table.Tr 
                              key={item.id} 
                              style={{ 
                                borderBottom: '1px solid #e9ecef',
                                backgroundColor: item.isActive ? 'transparent' : '#f1f3f5',
                                opacity: item.isActive ? 1 : 0.7
                              }}
                            >
                              <Table.Td>
                                <Text size="xs" style={{ fontSize: isMobile ? '0.75rem' : '0.82rem' }}>{item.name}</Text>
                              </Table.Td>
                              {!isTablet && (
                                <Table.Td>
                                  <Text size="xs" style={{ fontSize: isMobile ? '0.75rem' : '0.82rem' }}>{item.acceptsInsurance ? 'Sim' : 'Não'}</Text>
                                </Table.Td>
                              )}
                              {!isTablet && (
                                <Table.Td>
                                  <Text size="xs" style={{ fontSize: isMobile ? '0.75rem' : '0.82rem' }}>{item.modalities.length ? item.modalities.join(', ') : '-'}</Text>
                                </Table.Td>
                              )}
                              {!isTablet && (
                                <Table.Td>
                                  <Text size="xs" style={{ fontSize: isMobile ? '0.75rem' : '0.82rem' }}>{item.doctorsCount}</Text>
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
                              <Table.Td>
                                <Group gap={6} wrap="nowrap">
                                  <ActionIcon
                                    variant="subtle"
                                    style={{ color: item.isActive ? 'var(--mantine-color-text)' : '#adb5bd' }}
                                    onClick={() => item.isActive && handleEditProcedure(item.id)}
                                    title={item.isActive ? "Editar" : "Ative o procedimento para editar"}
                                    disabled={!item.isActive}
                                  >
                                    <Pencil size={16} />
                                  </ActionIcon>
                                  <ActionIcon
                                    variant="subtle"
                                    color={item.isActive ? 'orange' : 'green'}
                                    onClick={() => handleToggleActive(item)}
                                    title={item.isActive ? 'Desativar' : 'Ativar'}
                                  >
                                    <Power size={16} />
                                  </ActionIcon>
                                </Group>
                              </Table.Td>
                            </Table.Tr>
                          ))
                        )}
                      </Table.Tbody>
                    </Table>
                  </Box>
                )}
              </Paper>
            </Tabs.Panel>
          </Tabs>
        </Stack>
      </Box>

      <Modal
        opened={showInsuranceModal}
        onClose={handleCloseInsuranceModal}
        title="Convênios Aceitos"
        size="md"
        centered
      >
        <Stack gap="md">
          <MultiSelect
            label="Convênios aceitos"
            placeholder="Selecione os convênios"
            data={insuranceOptions}
            value={form.acceptedInsurances.filter((insurance) => insuranceOptions.some((opt) => opt.value === insurance))}
            onChange={(values) => {
              setForm((prev) => ({ ...prev, acceptedInsurances: values }));
            }}
            searchable
            maxDropdownHeight={220}
          />

          {form.acceptedInsurances.filter((insurance) => insuranceOptions.some((opt) => opt.value === insurance)).map((insurance) => (
            <MultiSelect
              key={insurance}
              label={`Sub-convênios de ${insurance}`}
              placeholder={`Selecione os sub-convênios de ${insurance}`}
              data={subInsuranceOptions[insurance] || []}
              value={form.acceptedSubInsurances[insurance] || []}
              onChange={(values) => setForm((prev) => ({
                ...prev,
                acceptedSubInsurances: {
                  ...prev.acceptedSubInsurances,
                  [insurance]: values,
                },
              }))}
              searchable
              maxDropdownHeight={220}
            />
          ))}

          <Group gap="xs" align="flex-end">
            <TextInput
              label="Outro convênio?"
              placeholder="Digite um convênio customizado"
              value={customInsuranceInput}
              onChange={(e) => setCustomInsuranceInput(e.currentTarget.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleAddCustomInsurance();
                }
              }}
              style={{ flex: 1 }}
            />
            <Button
              variant="default"
              size="sm"
              onClick={handleAddCustomInsurance}
            >
              +
            </Button>
          </Group>

          {form.acceptedInsurances.length > 0 && (
            <Stack gap="xs">
              <Text size="sm" fw={500}>Convênios selecionados:</Text>
              <Group gap="xs" wrap="wrap">
                {form.acceptedInsurances.map((insurance) => (
                  <Stack key={insurance} gap={2}>
                    <Paper
                      p="xs"
                      bg="#f1f3f5"
                      style={{ borderRadius: 4, display: 'flex', alignItems: 'center', gap: 8 }}
                    >
                      <Text size="sm">{insurance}</Text>
                      <ActionIcon
                        size="xs"
                        variant="subtle"
                        color="red"
                        onClick={() => setForm((prev) => ({
                          ...prev,
                          acceptedInsurances: prev.acceptedInsurances.filter((v) => v !== insurance),
                          acceptedSubInsurances: Object.fromEntries(
                            Object.entries(prev.acceptedSubInsurances).filter(([key]) => key !== insurance)
                          ),
                        }))}
                      >
                        ×
                      </ActionIcon>
                    </Paper>
                    {form.acceptedSubInsurances[insurance] && form.acceptedSubInsurances[insurance].length > 0 && (
                      <Group gap={4} pl="sm" wrap="wrap">
                        {form.acceptedSubInsurances[insurance].map((sub) => (
                          <Paper
                            key={sub}
                            p={4}
                            bg="#e7f5ff"
                            style={{ borderRadius: 4, border: '1px solid #74c0fc', display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem' }}
                          >
                            <Text size="xs">{sub}</Text>
                            <ActionIcon
                              size="xs"
                              variant="subtle"
                              color="red"
                              radius="xl"
                              onClick={() => setForm((prev) => ({
                                ...prev,
                                acceptedSubInsurances: {
                                  ...prev.acceptedSubInsurances,
                                  [insurance]: prev.acceptedSubInsurances[insurance].filter((v) => v !== sub),
                                },
                              }))}
                              style={{ padding: 0 }}
                            >
                              ×
                            </ActionIcon>
                          </Paper>
                        ))}
                      </Group>
                    )}
                  </Stack>
                ))}
              </Group>
            </Stack>
          )}

          <Group justify="flex-end" gap="md">
            <Button variant="default" onClick={handleCloseInsuranceModal}>
              Fechar
            </Button>
            <Button bg={DARK_BLUE} c="white" onClick={handleCloseInsuranceModal}>
              Salvar
            </Button>
          </Group>
        </Stack>
      </Modal>

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
          label: 'Voltar ao dashboard',
          onClick: () => {
            setShowSuccessModal(false);
            navigate('/dashboard');
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
