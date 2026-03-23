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
  NumberInput,
  useMantineColorScheme
} from '@mantine/core';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Power, Pencil, X } from 'lucide-react';
import { useMediaQuery } from '@mantine/hooks';
import { showNotification } from '@mantine/notifications';
import { Header } from '../Header/Header';
import { DARK_BLUE } from '../../themes/theme';
import doctorService from '../../services/doctorService';
import procedureService from '../../services/procedureService';
import insuranceService from '../../services/insuranceService';
import inventoryService from '../../services/inventoryService';
import ResultModal from '../common/ResultModal';

interface ProcedureForm {
  name: string;
  description: string;
  acceptsInsurance: boolean;
  acceptedInsurances: string[];
  acceptedSubInsurances: Record<string, string[]>;
  durationMinutes?: number | null;
  modalities: string[];
  doctorIds: string[];
  procedureMaterials: { inventoryItemId: string; quantity: number }[];
}

interface ProcedureItem {
  id: string;
  name: string;
  acceptsInsurance: boolean;
  acceptedInsurances: string[];
  modalities: string[];
  doctorIds: string[];
  doctorsCount: number;
  materialsCount: number;
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
  doctorIds: [],
  procedureMaterials: [],
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
  const { colorScheme } = useMantineColorScheme();

  const [form, setForm] = useState<ProcedureForm>(INITIAL_FORM);
  const [saving, setSaving] = useState(false);
  const [procedures, setProcedures] = useState<ProcedureItem[]>([]);
  const [proceduresLoading, setProceduresLoading] = useState(false);
  const [procedureQuery, setProcedureQuery] = useState('');
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [doctorOptions, setDoctorOptions] = useState<{ value: string; label: string }[]>([]);
  const [doctorDirectory, setDoctorDirectory] = useState<Record<string, { name?: string }>>({});
  const [loadingInsurances, setLoadingInsurances] = useState(false);
  const [insuranceCatalog, setInsuranceCatalog] = useState<Array<{ value: string; label: string; subInsurances: string[] }>>([]);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastCreatedName, setLastCreatedName] = useState<string | null>(null);
  const [lastSaveAction, setLastSaveAction] = useState<'create' | 'update'>('create');
  const [editingProcedureId, setEditingProcedureId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('cadastro');
  const [customInsuranceInput, setCustomInsuranceInput] = useState('');
  const [showInsuranceModal, setShowInsuranceModal] = useState(false);
  const [loadingMaterials, setLoadingMaterials] = useState(false);
  const [materialOptions, setMaterialOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [materialDirectory, setMaterialDirectory] = useState<Record<string, { name: string; code?: string; unit?: string }>>({});
  const [selectedMaterialId, setSelectedMaterialId] = useState<string | null>(null);
  const [selectedMaterialQuantity, setSelectedMaterialQuantity] = useState<number | ''>(1);

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

  const insuranceOptions = useMemo(() => {
    const merged = insuranceCatalog.map((item) => ({ value: item.value, label: item.label }));
    form.acceptedInsurances.forEach((insurance) => {
      const name = String(insurance || '').trim();
      if (!name) return;
      if (!merged.some((opt) => opt.value === name)) {
        merged.push({ value: name, label: name });
      }
    });
    return merged.sort((a, b) => a.label.localeCompare(b.label));
  }, [insuranceCatalog, form.acceptedInsurances]);

  const subInsuranceOptions = useMemo<Record<string, { value: string; label: string }[]>>(
    () => insuranceCatalog.reduce<Record<string, { value: string; label: string }[]>>((acc, item) => {
      acc[item.value] = (item.subInsurances || []).map((sub) => ({ value: sub, label: sub }));
      return acc;
    }, {}),
    [insuranceCatalog],
  );

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
          materialsCount: Array.isArray(it.materials) ? it.materials.length : 0,
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

  useEffect(() => {
    const loadInsurances = async () => {
      setLoadingInsurances(true);
      try {
        const data: any = await insuranceService.listInsurances({ isActive: true, limit: 300, offset: 0 });
        const list: any[] = Array.isArray(data)
          ? data
          : (Array.isArray(data?.items)
            ? data.items
            : (Array.isArray(data?.data?.items)
              ? data.data.items
              : (Array.isArray(data?.data)
                ? data.data
                : [])));

        const mapped = list
          .map((item: any) => {
            const name = String(item?.name || item?.nome || '').trim();
            if (!name) return null;
            const subInsurances = Array.isArray(item?.subInsurances)
              ? item.subInsurances.map((sub: any) => String(sub?.name || sub || '').trim()).filter(Boolean)
              : [];
            return { value: name, label: name, subInsurances };
          })
          .filter((item: { value: string; label: string; subInsurances: string[] } | null): item is { value: string; label: string; subInsurances: string[] } => Boolean(item))
          .sort((a: { label: string }, b: { label: string }) => a.label.localeCompare(b.label));

        setInsuranceCatalog(mapped);
      } catch (err: any) {
        showNotification({
          title: 'Erro',
          message: err?.response?.data?.message || err?.message || 'Erro ao carregar convênios',
          color: 'red',
        });
      } finally {
        setLoadingInsurances(false);
      }
    };

    loadInsurances();
  }, []);

  useEffect(() => {
    const loadMaterials = async () => {
      setLoadingMaterials(true);
      try {
        const data: any = await inventoryService.getItems();
        const list: any[] = Array.isArray(data)
          ? data
          : (Array.isArray(data?.items)
            ? data.items
            : (Array.isArray(data?.data?.items)
              ? data.data.items
              : (Array.isArray(data?.data)
                ? data.data
                : [])));

        const mapped = list
          .filter((item: any) => item && item.id)
          .map((item: any) => {
            const id = String(item.id);
            const name = String(item.name || '').trim();
            const code = String(item.code || '').trim();
            return {
              id,
              name: name || 'Material',
              code: code || undefined,
              unit: item.unit ? String(item.unit) : undefined,
            };
          });

        setMaterialOptions(mapped.map((item: any) => ({
          value: item.id,
          label: item.code ? `${item.name} (${item.code})` : item.name,
        })));
        setMaterialDirectory(
          mapped.reduce((acc: Record<string, { name: string; code?: string; unit?: string }>, item: any) => {
            acc[item.id] = { name: item.name, code: item.code, unit: item.unit };
            return acc;
          }, {}),
        );
      } catch (err: any) {
        showNotification({
          title: 'Erro',
          message: err?.response?.data?.message || err?.message || 'Erro ao carregar materiais do estoque',
          color: 'red',
        });
      } finally {
        setLoadingMaterials(false);
      }
    };

    loadMaterials();
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
      const doctors = form.doctorIds
        .filter(Boolean)
        .map((doctorId) => ({
          doctorId,
          doctorName: doctorLabelById[doctorId] || doctorDirectory[doctorId]?.name || doctorId,
        }));

      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        durationMinutes: form.durationMinutes ?? null,
        acceptsInsurance: form.acceptsInsurance,
        acceptedInsurances: form.acceptsInsurance ? form.acceptedInsurances : [],
        acceptedSubInsurances: form.acceptsInsurance ? form.acceptedSubInsurances : {},
        modalities: form.modalities,
        doctors,
        procedureMaterials: form.procedureMaterials,
      };

      if (editingProcedureId) {
        await procedureService.updateProcedure(editingProcedureId, payload);
        setLastSaveAction('update');
        setEditingProcedureId(null);
        setForm(INITIAL_FORM);
        setSelectedMaterialId(null);
        setSelectedMaterialQuantity(1);
        setActiveTab('lista');
        showNotification({ title: 'Procedimento atualizado', message: 'Dados atualizados com sucesso.', color: 'green' });
      } else {
        await procedureService.createProcedure(payload);
        setLastSaveAction('create');
        setLastCreatedName(form.name.trim());
        setShowSuccessModal(true);
        setForm(INITIAL_FORM);
        setSelectedMaterialId(null);
        setSelectedMaterialQuantity(1);
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
        materialsCount: Array.isArray(it.materials) ? it.materials.length : 0,
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
      setSelectedMaterialId(null);
      setSelectedMaterialQuantity(1);
      setActiveTab('lista');
      return;
    }
    setForm(INITIAL_FORM);
    setSelectedMaterialId(null);
    setSelectedMaterialQuantity(1);
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

  const handleAddMaterial = () => {
    if (!selectedMaterialId) return;
    const quantity = Number(selectedMaterialQuantity);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      showNotification({
        title: 'Quantidade inválida',
        message: 'Informe uma quantidade maior que zero.',
        color: 'red',
      });
      return;
    }

    setForm((prev) => {
      const existing = prev.procedureMaterials.find((item) => item.inventoryItemId === selectedMaterialId);
      if (existing) {
        return {
          ...prev,
          procedureMaterials: prev.procedureMaterials.map((item) =>
            item.inventoryItemId === selectedMaterialId
              ? { ...item, quantity: item.quantity + Math.floor(quantity) }
              : item,
          ),
        };
      }
      return {
        ...prev,
        procedureMaterials: [
          ...prev.procedureMaterials,
          { inventoryItemId: selectedMaterialId, quantity: Math.floor(quantity) },
        ],
      };
    });

    setSelectedMaterialId(null);
    setSelectedMaterialQuantity(1);
  };

  const handleRemoveMaterial = (inventoryItemId: string) => {
    setForm((prev) => ({
      ...prev,
      procedureMaterials: prev.procedureMaterials.filter((item) => item.inventoryItemId !== inventoryItemId),
    }));
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
      
      const doctorIds = Array.isArray(data?.doctors)
        ? data.doctors
            .map((doctor: any) => String(doctor?.doctorId || doctor?.id || '').trim())
            .filter(Boolean)
        : [];

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
        doctorIds,
        procedureMaterials: Array.isArray(data?.materials)
          ? data.materials
              .map((item: any) => ({
                inventoryItemId: String(item?.inventoryItemId || item?.inventoryItem?.id || '').trim(),
                quantity: Number(item?.quantity || 0),
              }))
              .filter((item: { inventoryItemId: string; quantity: number }) => item.inventoryItemId && Number.isFinite(item.quantity) && item.quantity > 0)
          : [],
      });

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
                <MultiSelect
                  label="Selecione os médicos"
                  placeholder={loadingDoctors ? 'Carregando médicos' : 'Selecione um ou mais médicos'}
                  data={doctorOptions}
                  value={form.doctorIds}
                  onChange={(values) => setForm((prev) => ({ ...prev, doctorIds: values }))}
                  searchable
                  nothingFoundMessage="Nenhum médico"
                  rightSection={loadingDoctors ? <Loader size={16} /> : undefined}
                  clearable
                  maxDropdownHeight={220}
                />

                <SectionTitle>Materiais vinculados</SectionTitle>
                <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md" mt="md">
                  <Select
                    label="Material"
                    placeholder={loadingMaterials ? 'Carregando materiais...' : 'Selecione um material'}
                    data={materialOptions}
                    value={selectedMaterialId}
                    onChange={setSelectedMaterialId}
                    searchable
                    clearable
                    nothingFoundMessage="Nenhum material"
                    rightSection={loadingMaterials ? <Loader size={16} /> : undefined}
                  />
                  <NumberInput
                    label="Quantidade por sessão"
                    placeholder="Ex: 1"
                    min={1}
                    value={selectedMaterialQuantity}
                    onChange={(value) => setSelectedMaterialQuantity(typeof value === 'number' ? value : '')}
                  />
                  <Group align="end">
                    <Button variant="default" onClick={handleAddMaterial} fullWidth>
                      Adicionar material
                    </Button>
                  </Group>
                </SimpleGrid>

                <Box mt="md" style={{ overflowX: 'auto', border: '1px solid #e9ecef', borderRadius: 6 }}>
                  <Table horizontalSpacing="sm" verticalSpacing="sm">
                    <Table.Thead>
                      <Table.Tr style={{ borderBottom: 'none' }}>
                        <Table.Th style={{ color: '#868e96', fontSize: '0.8rem', fontWeight: 500 }}>Material</Table.Th>
                        <Table.Th style={{ color: '#868e96', fontSize: '0.8rem', fontWeight: 500 }}>Quantidade</Table.Th>
                        <Table.Th style={{ color: '#868e96', fontSize: '0.8rem', fontWeight: 500, width: 90 }}>Ações</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {form.procedureMaterials.length === 0 ? (
                        <Table.Tr>
                          <Table.Td colSpan={3}>
                            <Text size="sm" c="dimmed" ta="center">Nenhum material vinculado</Text>
                          </Table.Td>
                        </Table.Tr>
                      ) : (
                        form.procedureMaterials.map((material) => {
                          const meta = materialDirectory[material.inventoryItemId];
                          const label = meta?.code ? `${meta.name} (${meta.code})` : (meta?.name || material.inventoryItemId);
                          return (
                            <Table.Tr key={material.inventoryItemId}>
                              <Table.Td>
                                <Text size="sm">{label}</Text>
                              </Table.Td>
                              <Table.Td>
                                <Text size="sm">{material.quantity}</Text>
                              </Table.Td>
                              <Table.Td>
                                <ActionIcon
                                  variant="subtle"
                                  color="red"
                                  onClick={() => handleRemoveMaterial(material.inventoryItemId)}
                                  title="Remover material"
                                >
                                  <X size={16} />
                                </ActionIcon>
                              </Table.Td>
                            </Table.Tr>
                          );
                        })
                      )}
                    </Table.Tbody>
                  </Table>
                </Box>

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
                          {!isTablet && <Table.Th style={{ color: '#868e96', fontSize: '0.8rem', fontWeight: 500 }}>Materiais</Table.Th>}
                          {!isTablet && <Table.Th style={{ color: '#868e96', fontSize: '0.8rem', fontWeight: 500 }}>Status</Table.Th>}
                          <Table.Th style={{ color: '#868e96', fontSize: isMobile ? '0.7rem' : '0.8rem', fontWeight: 500 }}>Ações</Table.Th>
                        </Table.Tr>
                      </Table.Thead>
                      <Table.Tbody>
                        {filteredProcedures.length === 0 ? (
                            <Table.Tr>
                            <Table.Td colSpan={8}>
                              <Text size="sm" c="dimmed" ta="center">Nenhum procedimento encontrado</Text>
                            </Table.Td>
                          </Table.Tr>
                        ) : (
                          filteredProcedures.map((item) => (
                            <Table.Tr 
                              key={item.id} 
                              style={{ 
                                borderBottom: '1px solid #e9ecef',
                                  backgroundColor: item.isActive
                                    ? 'transparent'
                                    : (colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : '#f1f3f5')
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
                                  <Text size="xs" style={{ fontSize: isMobile ? '0.75rem' : '0.82rem' }}>{item.materialsCount}</Text>
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
            placeholder={loadingInsurances ? 'Carregando convênios...' : 'Selecione os convênios'}
            data={insuranceOptions}
            value={form.acceptedInsurances}
            onChange={(values) => {
              setForm((prev) => ({ ...prev, acceptedInsurances: values }));
            }}
            searchable
            maxDropdownHeight={220}
            nothingFoundMessage="Nenhum convênio encontrado"
            disabled={loadingInsurances}
          />

          {form.acceptedInsurances.filter((insurance) => Array.isArray(subInsuranceOptions[insurance]) && subInsuranceOptions[insurance].length > 0).map((insurance) => (
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
                      style={{
                        borderRadius: 8,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        backgroundColor: 'var(--mantine-color-default)',
                        border: '1px solid var(--mantine-color-default-border)',
                      }}
                    >
                      <Text size="sm" c="var(--mantine-color-text)">{insurance}</Text>
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
                            style={{
                              borderRadius: 6,
                              border: '1px solid var(--mantine-color-blue-6)',
                              backgroundColor: 'rgba(0, 31, 84, 0.22)',
                            }}
                          >
                            <Text size="xs" c="var(--mantine-color-blue-1)">{sub}</Text>
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
