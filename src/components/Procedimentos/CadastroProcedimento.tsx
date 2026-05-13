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
  Loader,
  Table,
  Badge,
  Modal,
  Skeleton,
  Menu,
  UnstyledButton,
  useComputedColorScheme,
} from '@mantine/core';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Power, Pencil, X, UserPlus, Users, MoreVertical } from 'lucide-react';
import { useMediaQuery } from '@mantine/hooks';
import { showNotification } from '@mantine/notifications';
import { Header } from '../Header/Header';
import { DARK_BLUE } from '../../themes/theme';
import procedureService from '../../services/procedureService';
import inventoryService from '../../services/inventoryService';
import ResultModal from '../common/ResultModal';
import { FloatingInput } from '../common/FloatingInput';
import { FloatingMultiSelect } from '../common/FloatingMultiSelect';
import { FloatingNumberInput } from '../common/FloatingNumberInput';
import { FloatingSelect } from '../common/FloatingSelect';
import { FloatingTextarea } from '../common/FloatingTextarea';
import { useProceduresAdminQuery } from '../../hooks/useProceduresAdminQuery';
import { useDoctorsAdminQuery } from '../../hooks/useDoctorsAdminQuery';
import { useInventoryItemsQuery } from '../../hooks/useInventoryItemsQuery';
import { queryKeys } from '../../lib/queryKeys';
import { resolveApiErrorMessage } from '../../lib/apiError';
import { PaginatedGrid } from '../common/PaginatedGrid';

interface ProcedureForm {
  name: string;
  description: string;
  appointmentType: 'CONSULTA' | 'EXAME';
  tussCode: string;
  tussTableCode: string;
  durationMinutes?: number | null;
  supportsTeleconsultation: boolean;
  modalities: string[];
  doctorIds: string[];
  procedureMaterials: { inventoryItemId: string; quantity: number }[];
  procedureKitBindings: ProcedureKitBindingForm[];
}

interface ProcedureKitBindingForm {
  id: string;
  inventoryKitId: string;
  inventoryKitName: string;
  insuranceName?: string | null;
  isActive: boolean;
}

interface ProcedureItem {
  id: string;
  name: string;
  appointmentType: 'CONSULTA' | 'EXAME';
  tussCode?: string;
  tussTableCode?: string;
  supportsTeleconsultation: boolean;
  modalities: string[];
  doctorIds: string[];
  doctorsCount: number;
  materialsCount: number;
  isActive: boolean;
}

const INITIAL_FORM: ProcedureForm = {
  name: '',
  description: '',
  appointmentType: 'CONSULTA',
  tussCode: '',
  tussTableCode: '',
  durationMinutes: null,
  supportsTeleconsultation: false,
  modalities: [],
  doctorIds: [],
  procedureMaterials: [],
  procedureKitBindings: [],
};

const TELECONSULT_MODALITY = 'Telemedicina';

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
  const [activeTab, setActiveTab] = useState<'hub' | 'cadastro' | 'lista'>('hub');
  const [loadingMaterials, setLoadingMaterials] = useState(false);
  const [procedurePage, setProcedurePage] = useState(1);
  const [procedurePageSize, setProcedurePageSize] = useState(10);
  const [materialOptions, setMaterialOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [materialDirectory, setMaterialDirectory] = useState<Record<string, { name: string; code?: string; unit?: string }>>({});
  const [selectedMaterialId, setSelectedMaterialId] = useState<string | null>(null);
  const [selectedMaterialQuantity, setSelectedMaterialQuantity] = useState<number | ''>(1);
  const [inventoryKitOptions, setInventoryKitOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [inventoryKitLabelById, setInventoryKitLabelById] = useState<Record<string, string>>({});
  const [selectedBindingKitId, setSelectedBindingKitId] = useState<string | null>(null);
  const [loadingKits, setLoadingKits] = useState(false);
  const proceduresQuery = useProceduresAdminQuery();
  const doctorsQuery = useDoctorsAdminQuery();
  const inventoryItemsQuery = useInventoryItemsQuery();

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
      appointmentType: String(it.appointmentType || 'CONSULTA').toUpperCase() === 'EXAME' ? 'EXAME' : 'CONSULTA',
      tussCode: String(it.tussCode || '').trim() || undefined,
      tussTableCode: String(it.tussTableCode || '').trim() || undefined,
      supportsTeleconsultation: Array.isArray(it.modalities) ? it.modalities.includes(TELECONSULT_MODALITY) : false,
      modalities: Array.isArray(it.modalities)
        ? it.modalities.filter((modality: string) => modality !== TELECONSULT_MODALITY)
        : [],
      doctorsCount: Array.isArray(it.doctors) ? it.doctors.length : 0,
      materialsCount: Array.isArray(it.materials) ? it.materials.length : 0,
      isActive: Boolean(it.isActive ?? true),
      doctorIds: Array.isArray(it.doctors) ? it.doctors.map((doc: any) => String(doc.doctorId ?? doc.id ?? '')) : [],
    })).filter((item) => Boolean(item.id));
    setProcedures(mapped);
  }, [proceduresQuery.data]);

  useEffect(() => {
    setLoadingDoctors(doctorsQuery.isFetching);
  }, [doctorsQuery.isFetching]);

  useEffect(() => {
    if (!doctorsQuery.error) return;
    const err: any = doctorsQuery.error;
    showNotification({
      title: 'Erro',
      message: resolveApiErrorMessage(err, 'Erro ao carregar medicos'),
      color: 'red',
    });
  }, [doctorsQuery.error]);

  useEffect(() => {
    const data: any = doctorsQuery.data;
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
  }, [doctorsQuery.data]);

  useEffect(() => {
    setLoadingMaterials(inventoryItemsQuery.isFetching);
  }, [inventoryItemsQuery.isFetching]);

  useEffect(() => {
    if (!inventoryItemsQuery.error) return;
    const err: any = inventoryItemsQuery.error;
    showNotification({
      title: 'Erro',
      message: resolveApiErrorMessage(err, 'Erro ao carregar materiais do estoque'),
      color: 'red',
    });
  }, [inventoryItemsQuery.error]);

  useEffect(() => {
    const list: any[] = Array.isArray(inventoryItemsQuery.data) ? inventoryItemsQuery.data : [];
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
  }, [inventoryItemsQuery.data]);

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      setLoadingKits(true);
      try {
        const data: any = await inventoryService.getKits({ limit: 500, offset: 0 });
        const list = Array.isArray(data?.items) ? data.items : [];
        if (!mounted) return;
        const options = list
          .filter((item: any) => item?.id && item?.isActive !== false)
          .map((item: any) => ({ value: String(item.id), label: String(item.name || 'Kit') }))
          .sort((a: any, b: any) => a.label.localeCompare(b.label));
        setInventoryKitOptions(options);
        setInventoryKitLabelById(
          options.reduce((acc: Record<string, string>, item: any) => {
            acc[item.value] = item.label;
            return acc;
          }, {}),
        );
      } catch (err: any) {
        showNotification({
          title: 'Erro',
          message: resolveApiErrorMessage(err, 'Erro ao carregar kits de insumos'),
          color: 'red',
        });
      } finally {
        if (mounted) setLoadingKits(false);
      }
    };
    void run();
    return () => {
      mounted = false;
    };
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
        appointmentType: form.appointmentType,
        durationMinutes: form.durationMinutes ?? null,
        tussCode: form.tussCode.trim() || null,
        tussTableCode: form.tussTableCode.trim() || null,
        modalities: [
          ...form.modalities.filter((modality) => modality !== TELECONSULT_MODALITY),
          ...(form.appointmentType === 'CONSULTA' && form.supportsTeleconsultation ? [TELECONSULT_MODALITY] : []),
        ],
        doctors,
        procedureMaterials: form.procedureMaterials,
        procedureKitBindings: form.procedureKitBindings.map((binding) => ({
          inventoryKitId: binding.inventoryKitId,
          insuranceName: binding.insuranceName || null,
          isActive: Boolean(binding.isActive),
        })),
      };

      if (editingProcedureId) {
        await procedureService.updateProcedure(editingProcedureId, payload);
        setLastSaveAction('update');
        setEditingProcedureId(null);
        setForm(INITIAL_FORM);
        setSelectedMaterialId(null);
        setSelectedMaterialQuantity(1);
        setSelectedBindingKitId(null);
        setSelectedBindingInsurance(null);
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
        setSelectedBindingKitId(null);
        setSelectedBindingInsurance(null);
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

  const handleCancel = () => {
    if (editingProcedureId) {
      setEditingProcedureId(null);
      setForm(INITIAL_FORM);
      setSelectedMaterialId(null);
      setSelectedMaterialQuantity(1);
      setSelectedBindingKitId(null);
      setSelectedBindingInsurance(null);
      setActiveTab('lista');
      return;
    }
    setForm(INITIAL_FORM);
    setSelectedMaterialId(null);
    setSelectedMaterialQuantity(1);
    setSelectedBindingKitId(null);
    setSelectedBindingInsurance(null);
    navigate('/dashboard');
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

  const createBindingId = () => `binding-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const handleAddKitBinding = () => {
    if (!selectedBindingKitId) {
      showNotification({
        title: 'Kit obrigatório',
        message: 'Selecione um kit para vincular.',
        color: 'red',
      });
      return;
    }

    const duplicate = form.procedureKitBindings.some((binding) =>
      binding.inventoryKitId === selectedBindingKitId,
    );
    if (duplicate) {
      showNotification({
        title: 'Vínculo duplicado',
        message: 'Esse kit já está vinculado para este convênio.',
        color: 'red',
      });
      return;
    }

    setForm((prev) => ({
      ...prev,
      procedureKitBindings: [
        ...prev.procedureKitBindings,
        {
          id: createBindingId(),
          inventoryKitId: selectedBindingKitId,
          inventoryKitName: inventoryKitLabelById[selectedBindingKitId] || selectedBindingKitId,
          insuranceName: null,
          isActive: true,
        },
      ],
    }));

    setSelectedBindingKitId(null);
  };

  const handleRemoveKitBinding = (bindingId: string) => {
    setForm((prev) => ({
      ...prev,
      procedureKitBindings: prev.procedureKitBindings.filter((binding) => binding.id !== bindingId),
    }));
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
      
      const doctorIds = Array.isArray(data?.doctors)
        ? data.doctors
            .map((doctor: any) => String(doctor?.doctorId || doctor?.id || '').trim())
            .filter(Boolean)
        : [];

      setForm({
        name: data.name || '',
        description: data.description || '',
        appointmentType: String(data.appointmentType || 'CONSULTA').toUpperCase() === 'EXAME' ? 'EXAME' : 'CONSULTA',
        durationMinutes: data.durationMinutes !== undefined && data.durationMinutes !== null
          ? Number(data.durationMinutes)
          : null,
        tussCode: String(data.tussCode || '').trim(),
        tussTableCode: String(data.tussTableCode || '').trim(),
        supportsTeleconsultation: Array.isArray(data.modalities) ? data.modalities.includes(TELECONSULT_MODALITY) : false,
        modalities: Array.isArray(data.modalities)
          ? data.modalities.filter((modality: string) => modality !== TELECONSULT_MODALITY)
          : [],
        doctorIds,
        procedureMaterials: Array.isArray(data?.materials)
          ? data.materials
              .map((item: any) => ({
                inventoryItemId: String(item?.inventoryItemId || item?.inventoryItem?.id || '').trim(),
                quantity: Number(item?.quantity || 0),
              }))
              .filter((item: { inventoryItemId: string; quantity: number }) => item.inventoryItemId && Number.isFinite(item.quantity) && item.quantity > 0)
          : [],
        procedureKitBindings: Array.isArray(data?.kitBindings)
          ? data.kitBindings
              .map((binding: any, index: number) => {
                const inventoryKitId = String(binding?.inventoryKitId || binding?.inventoryKit?.id || '').trim();
                if (!inventoryKitId) return null;
                return {
                  id: String(binding?.id || `binding-loaded-${index}`),
                  inventoryKitId,
                  inventoryKitName: String(binding?.inventoryKit?.name || inventoryKitLabelById[inventoryKitId] || inventoryKitId),
                  insuranceName: String(binding?.insuranceName || '').trim() || null,
                  isActive: binding?.isActive === undefined ? true : Boolean(binding.isActive),
                };
              })
              .filter(Boolean) as ProcedureKitBindingForm[]
          : [],
      });

      setEditingProcedureId(procedureId);
      setActiveTab('cadastro');
      setSelectedBindingKitId(null);
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
              <ActionIcon variant="default" color="black" size="xl" onClick={() => navigate('/dashboard')}>
                <ChevronLeft size={28} />
              </ActionIcon>
              <Box>
                <Text fw={600} size={isMobile ? 'md' : 'lg'} c="var(--mantine-color-text)">Cadastro de Procedimentos</Text>
                <Text size="sm" c="dimmed">Procedimentos, modalidades, preços e convênios aceitos.</Text>
              </Box>
            </Group>
          </Group>

          {activeTab === 'hub' ? (
            <Box
              style={{
                minHeight: isMobile ? 'auto' : '58vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <SimpleGrid cols={{ base: 1, md: 2 }} spacing="xl" style={{ width: '100%', maxWidth: 900 }}>
                <UnstyledButton
                  onClick={() => setActiveTab('cadastro')}
                  style={{
                    border: '1px solid var(--mantine-color-default-border)',
                    borderRadius: 16,
                    padding: isMobile ? '18px' : '24px',
                    background: isDarkMode ? 'rgba(58, 83, 138, 0.78)' : 'var(--mantine-color-white)',
                    textAlign: 'left',
                    transition: 'all 120ms ease',
                    minHeight: isMobile ? 170 : 260,
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <Stack gap={8}>
                    <Group gap="xs">
                      <Box
                        w={34}
                        h={34}
                        style={{
                          borderRadius: 10,
                          background: isDarkMode ? 'rgba(130, 170, 255, 0.22)' : 'rgba(13, 46, 108, 0.12)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <UserPlus size={16} color={isDarkMode ? '#dbe7ff' : DARK_BLUE} />
                      </Box>
                      <Text fw={700} size="lg" c={isDarkMode ? '#e9f1ff' : undefined}>Cadastrar procedimento</Text>
                    </Group>
                    <Text size="sm" c={isDarkMode ? '#c2d4ff' : 'dimmed'}>
                      Registre procedimentos com regras clínicas, convênios, médicos e materiais vinculados.
                    </Text>
                  </Stack>
                </UnstyledButton>

                <UnstyledButton
                  onClick={() => setActiveTab('lista')}
                  style={{
                    border: '1px solid var(--mantine-color-default-border)',
                    borderRadius: 16,
                    padding: isMobile ? '18px' : '24px',
                    background: isDarkMode ? 'rgba(58, 83, 138, 0.78)' : 'var(--mantine-color-white)',
                    textAlign: 'left',
                    transition: 'all 120ms ease',
                    minHeight: isMobile ? 170 : 260,
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <Stack gap={8}>
                    <Group gap="xs">
                      <Box
                        w={34}
                        h={34}
                        style={{
                          borderRadius: 10,
                          background: isDarkMode ? 'rgba(130, 170, 255, 0.22)' : 'rgba(13, 46, 108, 0.12)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Users size={16} color={isDarkMode ? '#dbe7ff' : DARK_BLUE} />
                      </Box>
                      <Text fw={700} size="lg" c={isDarkMode ? '#e9f1ff' : undefined}>Procedimentos cadastrados</Text>
                    </Group>
                    <Text size="sm" c={isDarkMode ? '#c2d4ff' : 'dimmed'}>
                      Consulte, edite e ative/desative procedimentos já cadastrados.
                    </Text>
                  </Stack>
                </UnstyledButton>
              </SimpleGrid>
            </Box>
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
                <Paper p="lg">
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
                      { value: 'CONSULTA', label: 'Consulta' },
                      { value: 'EXAME', label: 'Exame' },
                    ]}
                    value={form.appointmentType}
                    onChange={(value) => setForm((prev) => ({
                      ...prev,
                      appointmentType: value === 'EXAME' ? 'EXAME' : 'CONSULTA',
                      supportsTeleconsultation: value === 'EXAME' ? false : prev.supportsTeleconsultation,
                    }))}
                    allowDeselect={false}
                  />
                  <FloatingNumberInput
                    label="Duração (minutos)"
                    placeholder="Ex: 50"
                    value={form.durationMinutes ?? undefined}
                    onChange={(value) => setForm((prev) => ({ ...prev, durationMinutes: typeof value === 'number' ? value : null }))}
                    min={1}
                    step={5}
                  />
                </SimpleGrid>

                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md" mt="md">
                  <FloatingInput
                    label="Código TUSS"
                    placeholder="Ex: 40314618"
                    value={form.tussCode}
                    onChange={(e) => setForm((prev) => ({ ...prev, tussCode: e?.currentTarget?.value ?? '' }))}
                  />
                  <FloatingInput
                    label="Tabela de referência"
                    placeholder="Ex: 22"
                    value={form.tussTableCode}
                    onChange={(e) => setForm((prev) => ({ ...prev, tussTableCode: e?.currentTarget?.value ?? '' }))}
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

                <SectionTitle>Modalidades</SectionTitle>
                <Group align="flex-end" gap="md" wrap="wrap">
                  <Switch
                    label="Suporta teleconsulta"
                    checked={form.supportsTeleconsultation}
                    disabled={form.appointmentType !== 'CONSULTA'}
                    onChange={(event) => {
                      const checked = event.currentTarget.checked;
                      setForm((prev) => ({ ...prev, supportsTeleconsultation: checked }));
                    }}
                  />
                </Group>

                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md" mt="md">
                  <FloatingMultiSelect
                    label="Modalidades"
                    data={modalityOptions}
                    value={form.modalities}
                    onChange={(values) => setForm((prev) => ({ ...prev, modalities: values }))}
                    searchable
                    maxDropdownHeight={220}
                  />
                </SimpleGrid>

                <SectionTitle>Medicos vinculados</SectionTitle>
                <FloatingMultiSelect
                  label="Selecione os médicos"
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
                  <FloatingSelect
                    label="Material"
                    data={materialOptions}
                    value={selectedMaterialId}
                    onChange={setSelectedMaterialId}
                    searchable
                    clearable
                    nothingFoundMessage="Nenhum material"
                    rightSection={loadingMaterials ? <Loader size={16} /> : undefined}
                  />
                  <FloatingNumberInput
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

                <SectionTitle>Kits de insumos</SectionTitle>
                <Text size="sm" c="dimmed" mb="sm">
                  O cadastro do kit é feito no módulo Estoque. Aqui você apenas vincula os kits ao procedimento.
                </Text>

                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md" mt="md">
                  <FloatingSelect
                    label="Kit do estoque"
                    placeholder="Selecione o kit"
                    data={inventoryKitOptions}
                    value={selectedBindingKitId}
                    onChange={setSelectedBindingKitId}
                    rightSection={loadingKits ? <Loader size={16} /> : undefined}
                    searchable
                  />
                  <Group align="end">
                    <Button variant="default" fullWidth onClick={handleAddKitBinding}>
                      Vincular kit
                    </Button>
                  </Group>
                </SimpleGrid>

                <Stack gap="md" mt="md">
                  {form.procedureKitBindings.length === 0 ? (
                    <Paper withBorder radius="md" p="md">
                      <Text size="sm" c="dimmed" ta="center">
                        Nenhum kit vinculado ao procedimento.
                      </Text>
                    </Paper>
                  ) : (
                    form.procedureKitBindings.map((binding) => (
                      <Paper key={binding.id} withBorder radius="md" p="md">
                        <Group justify="space-between" align="center" mb="sm" wrap="wrap">
                          <Group gap="xs">
                            <Text fw={600}>{binding.inventoryKitName}</Text>
                            <Badge color={binding.insuranceName ? 'teal' : 'blue'} variant="light">
                              {binding.insuranceName ? `Convênio: ${binding.insuranceName}` : 'Vínculo padrão'}
                            </Badge>
                          </Group>
                          <ActionIcon
                            variant="subtle"
                            color="red"
                            onClick={() => handleRemoveKitBinding(binding.id)}
                            title="Remover vínculo"
                          >
                            <X size={16} />
                          </ActionIcon>
                        </Group>
                      </Paper>
                    ))
                  )}
                </Stack>

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
                            <Table.Th>Médicos</Table.Th>
                            <Table.Th>Materiais</Table.Th>
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
                              <Table.Td><Skeleton height={14} width="24%" radius="sm" /></Table.Td>
                              <Table.Td><Skeleton height={14} width="24%" radius="sm" /></Table.Td>
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
                                {(item.tussCode || item.tussTableCode) && (
                                  <Text size="xs" c="dimmed">
                                    TUSS: {item.tussCode || '-'} • Tabela: {item.tussTableCode || '-'}
                                  </Text>
                                )}
                                <Group gap="xs">
                                  <Badge color={item.appointmentType === 'EXAME' ? 'orange' : 'blue'} variant="light" size="sm">
                                    {item.appointmentType === 'EXAME' ? 'Exame' : 'Consulta'}
                                  </Badge>
                                  {item.supportsTeleconsultation && (
                                    <Badge color="indigo" variant="light" size="sm">
                                      Teleconsulta
                                    </Badge>
                                  )}
                                </Group>
                                <Text size="xs" c="dimmed">
                                  {item.modalities.length ? item.modalities.join(', ') : 'Sem modalidades'} • {item.doctorsCount} médico(s) • {item.materialsCount} material(is)
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
                            {!isTablet && <Table.Th style={{ color: '#868e96', fontSize: '0.8rem', fontWeight: 500 }}>Modalidades</Table.Th>}
                            {!isTablet && <Table.Th style={{ color: '#868e96', fontSize: '0.8rem', fontWeight: 500 }}>Médicos</Table.Th>}
                            {!isTablet && <Table.Th style={{ color: '#868e96', fontSize: '0.8rem', fontWeight: 500 }}>Materiais</Table.Th>}
                            {!isTablet && <Table.Th style={{ color: '#868e96', fontSize: '0.8rem', fontWeight: 500 }}>Status</Table.Th>}
                            <Table.Th style={{ color: '#868e96', fontSize: isMobile ? '0.7rem' : '0.8rem', fontWeight: 500, textAlign: 'center', width: 96 }}>
                              Ações
                            </Table.Th>
                          </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                          {filteredProcedures.length === 0 ? (
                            <Table.Tr>
                              <Table.Td colSpan={isTablet ? 2 : 8}>
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
                                    {(item.tussCode || item.tussTableCode) && (
                                      <Text size="xs" c="dimmed">
                                        TUSS: {item.tussCode || '-'} • Tabela: {item.tussTableCode || '-'}
                                      </Text>
                                    )}
                                    <Text size="xs" c="dimmed">
                                      {item.modalities.length ? item.modalities.join(', ') : 'Sem modalidades'}
                                    </Text>
                                  </Stack>
                                </Table.Td>
                                {!isTablet && (
                                  <Table.Td>
                                    <Group gap={6}>
                                      <Badge color={item.appointmentType === 'EXAME' ? 'orange' : 'blue'} variant="light" size="sm">
                                        {item.appointmentType === 'EXAME' ? 'Exame' : 'Consulta'}
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
                                    <Text size="sm">{item.doctorsCount}</Text>
                                  </Table.Td>
                                )}
                                {!isTablet && (
                                  <Table.Td>
                                    <Text size="sm">{item.materialsCount}</Text>
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
