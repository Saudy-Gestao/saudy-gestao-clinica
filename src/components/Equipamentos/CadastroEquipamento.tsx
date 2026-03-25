import { useEffect, useMemo, useState } from 'react';
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Center,
  Group,
  Loader,
  Modal,
  MultiSelect,
  NumberInput,
  Paper,
  Select,
  SimpleGrid,
  Stack,
  Switch,
  Table,
  Tabs,
  Text,
  TextInput,
  Textarea,
  Title,
  Tooltip,
  useMantineColorScheme,
} from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { showNotification } from '@mantine/notifications';
import { ChevronLeft, CircleHelp, Pencil, Power, ScanLine } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../Header/Header';
import ResultModal from '../common/ResultModal';
import { DARK_BLUE } from '../../themes/theme';
import branchService from '../../services/branchService';
import sectorService from '../../services/sectorService';
import procedureService from '../../services/procedureService';
import medicalEquipmentService, { type MedicalEquipmentItem } from '../../services/medicalEquipmentService';
import { isRoomSector } from '../../utils/sectorClassification';

interface EquipmentForm {
  name: string;
  manufacturer: string;
  model: string;
  modality: string;
  integrationType: string;
  bridgeIdentifier: string;
  aeTitle: string;
  mwlRemoteAeTitle: string;
  storeRemoteAeTitle: string;
  stationName: string;
  serialNumber: string;
  patrimonyCode: string;
  branchId: string;
  roomId: string;
  mwlHost: string;
  mwlPort: number | null;
  storeHost: string;
  storePort: number | null;
  dicomWebPath: string;
  supportsWorklist: boolean;
  supportsStore: boolean;
  supportsPrint: boolean;
  procedureIds: string[];
  status: string;
  observations: string;
  isActive: boolean;
}

interface BranchOption {
  value: string;
  label: string;
}

interface RoomOption {
  value: string;
  label: string;
  branchId: string;
}

interface ProcedureOption {
  value: string;
  label: string;
  modalities: string[];
}

const INITIAL_FORM: EquipmentForm = {
  name: '',
  manufacturer: '',
  model: '',
  modality: '',
  integrationType: 'MWL_BRIDGE',
  bridgeIdentifier: '',
  aeTitle: '',
  mwlRemoteAeTitle: '',
  storeRemoteAeTitle: '',
  stationName: '',
  serialNumber: '',
  patrimonyCode: '',
  branchId: '',
  roomId: '',
  mwlHost: '',
  mwlPort: 104,
  storeHost: '',
  storePort: 104,
  dicomWebPath: '',
  supportsWorklist: true,
  supportsStore: true,
  supportsPrint: false,
  procedureIds: [],
  status: 'Ativo',
  observations: '',
  isActive: true,
};

const modalityOptions = [
  { value: 'CR', label: 'CR - Radiografia Computadorizada' },
  { value: 'CT', label: 'CT - Tomografia' },
  { value: 'DG', label: 'DG - Diwan?' },
  { value: 'DX', label: 'DX - Radiografia Digital' },
  { value: 'ECG', label: 'ECG - Eletrocardiograma' },
  { value: 'ES', label: 'ES - Endoscopia' },
  { value: 'MG', label: 'MG - Mamografia' },
  { value: 'MR', label: 'MR - Ressonância' },
  { value: 'NM', label: 'NM - Medicina Nuclear' },
  { value: 'OT', label: 'OT - Outros' },
  { value: 'RF', label: 'RF - Radioscopia' },
  { value: 'US', label: 'US - Ultrassom' },
  { value: 'XA', label: 'XA - Angiografia' },
];

const statusOptions = [
  { value: 'Ativo', label: 'Ativo' },
  { value: 'Manutenção', label: 'Manutenção' },
  { value: 'Inativo', label: 'Inativo' },
];

const integrationTypeOptions = [
  { value: 'MWL_BRIDGE', label: 'MWL Bridge' },
  { value: 'DICOM_DIRECT', label: 'DICOM Direto' },
  { value: 'MANUAL', label: 'Manual / Sem integração' },
];

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <Title order={5} fw={600} c="var(--mantine-color-text)" mb="sm" mt="md">
      {children}
    </Title>
  );
}

function FieldLabel({ label, help }: { label: string; help: string }) {
  return (
    <Group gap={6} wrap="nowrap">
      <Text span inherit>{label}</Text>
      <Tooltip label={help} multiline maw={280} withArrow>
        <ActionIcon variant="subtle" color="gray" size="sm" aria-label={`Ajuda sobre ${label}`}>
          <CircleHelp size={15} />
        </ActionIcon>
      </Tooltip>
    </Group>
  );
}

const integrationTypeLabel: Record<string, string> = {
  MWL_BRIDGE: 'Bridge MWL',
  DICOM_DIRECT: 'DICOM Direto',
  MANUAL: 'Manual',
};

const communicationBadgeColor = (status?: string) => {
  if (status === 'SUCCESS') return 'green';
  if (status === 'WARNING' || status === 'SKIPPED') return 'yellow';
  if (status === 'ERROR') return 'red';
  return 'gray';
};

const communicationBadgeLabel = (status?: string) => {
  if (status === 'SUCCESS') return 'OK';
  if (status === 'WARNING') return 'Atenção';
  if (status === 'SKIPPED') return 'Manual';
  if (status === 'ERROR') return 'Erro';
  return 'Sem teste';
};

const mapEquipmentToForm = (item: MedicalEquipmentItem): EquipmentForm => ({
  name: item.name || '',
  manufacturer: item.manufacturer || '',
  model: item.model || '',
  modality: item.modality || '',
  integrationType: item.integrationType || 'MWL_BRIDGE',
  bridgeIdentifier: item.bridgeIdentifier || '',
  aeTitle: item.aeTitle || '',
  mwlRemoteAeTitle: item.mwlRemoteAeTitle || '',
  storeRemoteAeTitle: item.storeRemoteAeTitle || '',
  stationName: item.stationName || '',
  serialNumber: item.serialNumber || '',
  patrimonyCode: item.patrimonyCode || '',
  branchId: item.branchId || '',
  roomId: item.roomId || '',
  mwlHost: item.mwlHost || '',
  mwlPort: item.mwlPort ?? 104,
  storeHost: item.storeHost || '',
  storePort: item.storePort ?? 104,
  dicomWebPath: item.dicomWebPath || '',
  supportsWorklist: Boolean(item.supportsWorklist),
  supportsStore: Boolean(item.supportsStore ?? true),
  supportsPrint: Boolean(item.supportsPrint),
  procedureIds: Array.isArray(item.procedureIds) ? item.procedureIds : [],
  status: item.status || 'Ativo',
  observations: item.observations || '',
  isActive: Boolean(item.isActive ?? true),
});

export function CadastroEquipamento() {
  const navigate = useNavigate();
  const isMobile = useMediaQuery('(max-width: 799px)');
  const { colorScheme } = useMantineColorScheme();

  const [form, setForm] = useState<EquipmentForm>(INITIAL_FORM);
  const [items, setItems] = useState<MedicalEquipmentItem[]>([]);
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [rooms, setRooms] = useState<RoomOption[]>([]);
  const [procedures, setProcedures] = useState<ProcedureOption[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string | null>('cadastro');
  const [successOpen, setSuccessOpen] = useState(false);
  const [errorOpen, setErrorOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [lastSavedName, setLastSavedName] = useState('');
  const [lastSaveAction, setLastSaveAction] = useState<'create' | 'update'>('create');
  const [testingId, setTestingId] = useState<string | null>(null);

  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => {
      return [
        item.name,
        item.manufacturer,
        item.model,
        item.modality,
        item.aeTitle,
        item.serialNumber,
        item.patrimonyCode,
      ].some((field) => String(field || '').toLowerCase().includes(q));
    });
  }, [items, query]);

  const roomOptions = useMemo(() => {
    if (!form.branchId) return [];
    return rooms
      .filter((room) => room.branchId === form.branchId)
      .map((room) => ({ value: room.value, label: room.label }));
  }, [rooms, form.branchId]);

  const procedureOptions = useMemo(() => {
    return procedures.map((procedure) => ({ value: procedure.value, label: procedure.label }));
  }, [procedures]);

  const procedureLabelById = useMemo(() => {
    return procedures.reduce<Record<string, string>>((acc, procedure) => {
      acc[procedure.value] = procedure.label;
      return acc;
    }, {});
  }, [procedures]);

  const branchLabelById = useMemo(() => {
    return branches.reduce<Record<string, string>>((acc, branch) => {
      acc[branch.value] = branch.label;
      return acc;
    }, {});
  }, [branches]);

  const loadItems = async () => {
    setLoading(true);
    try {
      const data = await medicalEquipmentService.list();
      setItems(data);
    } catch (err: any) {
      showNotification({
        title: 'Erro',
        message: err?.response?.data?.message || err?.message || 'Erro ao carregar equipamentos',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
  }, []);

  useEffect(() => {
    const loadBranches = async () => {
      try {
        const data: any = await branchService.listBranches();
        const list: any[] = Array.isArray(data)
          ? data
          : Array.isArray(data?.items)
            ? data.items
            : Array.isArray(data?.data?.items)
              ? data.data.items
              : Array.isArray(data?.data)
                ? data.data
                : [];

        setBranches(
          list
            .map((branch: any) => ({
              value: String(branch.id || ''),
              label: branch.tradeName || branch.socialName || 'Filial sem nome',
            }))
            .filter((branch: BranchOption) => Boolean(branch.value)),
        );
      } catch {
        setBranches([]);
      }
    };

    const loadRooms = async () => {
      try {
        const data: any = await sectorService.listSectors();
        const list: any[] = Array.isArray(data)
          ? data
          : Array.isArray(data?.items)
            ? data.items
            : Array.isArray(data?.data?.items)
              ? data.data.items
              : Array.isArray(data?.data)
                ? data.data
                : [];

        setRooms(
          list
            .filter((sector: any) => isRoomSector(sector))
            .map((sector: any) => ({
              value: String(sector.id || ''),
              label: sector.name || 'Sala sem nome',
              branchId: String(sector.branchId || ''),
            }))
            .filter((room: RoomOption) => Boolean(room.value) && Boolean(room.branchId)),
        );
      } catch {
        setRooms([]);
      }
    };

    const loadProcedures = async () => {
      try {
        const data: any = await procedureService.listProcedures({ limit: 300, offset: 0 });
        const list: any[] = Array.isArray(data)
          ? data
          : Array.isArray(data?.items)
            ? data.items
            : Array.isArray(data?.data?.items)
              ? data.data.items
              : Array.isArray(data?.data)
                ? data.data
                : [];

        setProcedures(
          list
            .map((item: any) => ({
              value: String(item.id || item.procedureId || ''),
              label: String(item.name || 'Procedimento'),
              modalities: Array.isArray(item.modalities) ? item.modalities.map((it: any) => String(it)) : [],
            }))
            .filter((item: ProcedureOption) => Boolean(item.value)),
        );
      } catch {
        setProcedures([]);
      }
    };

    loadBranches();
    loadRooms();
    loadProcedures();
  }, []);

  const resetForm = () => {
    setForm(INITIAL_FORM);
    setEditingId(null);
  };

  const openEdit = (item: MedicalEquipmentItem) => {
    setEditingId(item.id);
    setForm(mapEquipmentToForm(item));
    setActiveTab('cadastro');
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      showNotification({
        title: 'Campo obrigatório',
        message: 'Informe o nome do equipamento.',
        color: 'yellow',
      });
      return;
    }

    if (!form.modality) {
      showNotification({
        title: 'Campo obrigatório',
        message: 'Selecione a modalidade DICOM principal.',
        color: 'yellow',
      });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...form,
        name: form.name.trim(),
        manufacturer: form.manufacturer.trim(),
        model: form.model.trim(),
        integrationType: form.integrationType,
        bridgeIdentifier: form.bridgeIdentifier.trim(),
        aeTitle: form.aeTitle.trim(),
        mwlRemoteAeTitle: form.mwlRemoteAeTitle.trim(),
        storeRemoteAeTitle: form.storeRemoteAeTitle.trim(),
        stationName: form.stationName.trim(),
        serialNumber: form.serialNumber.trim(),
        patrimonyCode: form.patrimonyCode.trim(),
        branchId: form.branchId || null,
        roomId: form.roomId || null,
        mwlHost: form.mwlHost.trim(),
        mwlPort: form.mwlPort,
        storeHost: form.storeHost.trim(),
        storePort: form.storePort,
        dicomWebPath: form.dicomWebPath.trim(),
        observations: form.observations.trim(),
      };

      const saved = editingId
        ? await medicalEquipmentService.update(editingId, payload)
        : await medicalEquipmentService.create(payload);

      setLastSavedName(saved.name);
      setLastSaveAction(editingId ? 'update' : 'create');
      setSuccessOpen(true);
      resetForm();
      setActiveTab('lista');
      loadItems();
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.message || err?.message || 'Não foi possível salvar o equipamento.');
      setErrorOpen(true);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (item: MedicalEquipmentItem) => {
    try {
      await medicalEquipmentService.update(item.id, {
        isActive: !(item.isActive ?? true),
      });
      loadItems();
    } catch (err: any) {
      showNotification({
        title: 'Erro',
        message: err?.response?.data?.message || err?.message || 'Não foi possível atualizar o status.',
        color: 'red',
      });
    }
  };

  const handleTestConnection = async (item: MedicalEquipmentItem) => {
    try {
      setTestingId(item.id);
      const result = await medicalEquipmentService.testConnection(item.id);
      await loadItems();
      showNotification({
        title: result.ok ? 'Teste concluído' : 'Falha no teste',
        message: result.message || 'Teste executado.',
        color: result.ok ? 'green' : 'red',
      });
    } catch (err: any) {
      showNotification({
        title: 'Erro',
        message: err?.response?.data?.message || err?.message || 'Não foi possível testar a comunicação.',
        color: 'red',
      });
    } finally {
      setTestingId(null);
    }
  };

  return (
    <Box bg="var(--mantine-color-body)" style={{ minHeight: '100vh' }}>
      <Header />
      <Box p="xl" maw={1400} mx="auto">
        <Group mb={30} justify="space-between" align="center">
          <Group gap="lg" align="center">
            <ActionIcon
              size={56}
              radius="md"
              variant="light"
              color="blue"
              onClick={() => navigate('/dashboard')}
            >
              <ChevronLeft size={28} />
            </ActionIcon>
            <Stack gap={2}>
              <Title order={1} fw={700} style={{ fontSize: isMobile ? '1.6rem' : '2rem' }}>
                Cadastro de Equipamentos
              </Title>
              <Text c="dimmed" size={isMobile ? 'sm' : 'lg'}>
                Equipamentos de exame com dados operacionais, modalidade e integração DICOM.
              </Text>
            </Stack>
          </Group>
        </Group>

        <Paper withBorder p="lg" radius="md" style={{ borderColor: colorScheme === 'dark' ? '#2c3553' : 'rgba(13, 49, 120, 0.08)' }}>
          <Tabs value={activeTab} onChange={setActiveTab}>
            <Tabs.List mb="md">
              <Tabs.Tab value="cadastro">Cadastro</Tabs.Tab>
              <Tabs.Tab value="lista">Equipamentos</Tabs.Tab>
            </Tabs.List>

            <Tabs.Panel value="cadastro">
              <SectionTitle>Dados do Equipamento</SectionTitle>
              <Text c="dimmed" size="sm" mb="sm">
                Cadastro operacional do aparelho, localização e vínculo com os exames realizados.
              </Text>
              <SimpleGrid cols={{ base: 1, md: 2, xl: 4 }} spacing="md">
                <TextInput
                  label="Nome do Equipamento"
                  placeholder="Ex.: Tomógrafo Philips 128"
                  value={form.name}
                  onChange={(event) => {
                    const value = event.currentTarget.value;
                    setForm((prev) => ({ ...prev, name: value }));
                  }}
                />
                <TextInput
                  label="Fabricante"
                  placeholder="Ex.: Philips"
                  value={form.manufacturer}
                  onChange={(event) => {
                    const value = event.currentTarget.value;
                    setForm((prev) => ({ ...prev, manufacturer: value }));
                  }}
                />
                <TextInput
                  label="Modelo"
                  placeholder="Ex.: Ingenuity CT"
                  value={form.model}
                  onChange={(event) => {
                    const value = event.currentTarget.value;
                    setForm((prev) => ({ ...prev, model: value }));
                  }}
                />
                <Select
                  label="Modalidade"
                  placeholder="Selecione"
                  data={modalityOptions}
                  searchable
                  value={form.modality}
                  onChange={(value) => setForm((prev) => ({ ...prev, modality: value || '' }))}
                />
                <TextInput
                  label="Número de Série"
                  placeholder="Ex.: SN-2026-001"
                  value={form.serialNumber}
                  onChange={(event) => {
                    const value = event.currentTarget.value;
                    setForm((prev) => ({ ...prev, serialNumber: value }));
                  }}
                />
                <TextInput
                  label="Código Patrimonial"
                  placeholder="Ex.: TOM-001"
                  value={form.patrimonyCode}
                  onChange={(event) => {
                    const value = event.currentTarget.value;
                    setForm((prev) => ({ ...prev, patrimonyCode: value }));
                  }}
                />
                <Select
                  label="Status Operacional"
                  data={statusOptions}
                  value={form.status}
                  onChange={(value) => setForm((prev) => ({ ...prev, status: value || 'Ativo' }))}
                />
                <Switch
                  mt={30}
                  label="Equipamento ativo"
                  checked={form.isActive}
                  onChange={(event) => {
                    const checked = event.currentTarget.checked;
                    setForm((prev) => ({ ...prev, isActive: checked }));
                  }}
                />
              </SimpleGrid>

              <SectionTitle>Localização e Fluxo</SectionTitle>
              <SimpleGrid cols={{ base: 1, md: 2, xl: 4 }} spacing="md">
                <Select
                  label="Filial"
                  placeholder="Selecione"
                  data={branches}
                  searchable
                  value={form.branchId}
                  onChange={(value) => setForm((prev) => ({ ...prev, branchId: value || '', roomId: value === prev.branchId ? prev.roomId : '' }))}
                />
                <Select
                  label="Sala"
                  placeholder={form.branchId ? 'Selecione' : 'Escolha a filial antes'}
                  data={roomOptions}
                  searchable
                  disabled={!form.branchId}
                  value={form.roomId}
                  onChange={(value) => setForm((prev) => ({ ...prev, roomId: value || '' }))}
                />
                <MultiSelect
                  label="Procedimentos Relacionados"
                  placeholder="Selecione procedimentos"
                  searchable
                  data={procedureOptions}
                  value={form.procedureIds}
                  onChange={(value) => setForm((prev) => ({ ...prev, procedureIds: value }))}
                />
              </SimpleGrid>

              <SectionTitle>Configuração de Comunicação</SectionTitle>
              <Text c="dimmed" size="sm" mb="sm">
                Dados técnicos do bridge e da comunicação DICOM usados para conectar o equipamento ao ecossistema.
              </Text>
              <SimpleGrid cols={{ base: 1, md: 2, xl: 4 }} spacing="md">
                <Select
                  label={<FieldLabel label="Tipo de Integração" help="Define como o equipamento se conecta: via bridge MWL, integração DICOM direta ou operação manual sem comunicação automática." />}
                  data={integrationTypeOptions}
                  value={form.integrationType}
                  onChange={(value) => setForm((prev) => ({ ...prev, integrationType: value || 'MWL_BRIDGE' }))}
                />
                <TextInput
                  label={<FieldLabel label="Identificador do Bridge" help="Nome interno do conector/bridge que atende este equipamento. Ajuda a identificar qual serviço faz a mediação da comunicação." />}
                  placeholder="Ex.: bridge-tc-01"
                  value={form.bridgeIdentifier}
                  onChange={(event) => {
                    const value = event.currentTarget.value;
                    setForm((prev) => ({ ...prev, bridgeIdentifier: value }));
                  }}
                />
                {form.integrationType !== 'MANUAL' && (
                  <TextInput
                    label={<FieldLabel label="AE Title Local" help="Nome DICOM do próprio equipamento na rede. Funciona como o identificador lógico do aparelho na comunicação DICOM." />}
                    placeholder="Ex.: CT_SAUDY_01"
                    value={form.aeTitle}
                    onChange={(event) => {
                      const value = event.currentTarget.value.toUpperCase();
                      setForm((prev) => ({ ...prev, aeTitle: value }));
                    }}
                  />
                )}
                <TextInput
                  label={<FieldLabel label="Station Name" help="Nome lógico da estação ou console do equipamento. Normalmente representa a sala ou posição de aquisição." />}
                  placeholder="Ex.: Sala TC 01"
                  value={form.stationName}
                  onChange={(event) => {
                    const value = event.currentTarget.value;
                    setForm((prev) => ({ ...prev, stationName: value }));
                  }}
                />
              </SimpleGrid>

              {form.integrationType !== 'MANUAL' && (
                <>
                  <SectionTitle>Configuração MWL</SectionTitle>
                  <Text c="dimmed" size="sm" mb="sm">
                    Destino usado para consulta da worklist. Pode ser o mesmo IP do Store, mas fica cadastrado separadamente.
                  </Text>
                  <SimpleGrid cols={{ base: 1, md: 2, xl: 4 }} spacing="md">
                    <TextInput
                      label={<FieldLabel label="AE Title Remoto MWL" help="Nome DICOM do destino usado para worklist. Normalmente é o AE do bridge ou do servidor MWL." />}
                      placeholder="Ex.: SAUDY_MWL"
                      value={form.mwlRemoteAeTitle}
                      onChange={(event) => {
                        const value = event.currentTarget.value.toUpperCase();
                        setForm((prev) => ({ ...prev, mwlRemoteAeTitle: value }));
                      }}
                    />
                    <TextInput
                      label={<FieldLabel label="Host MWL" help="IP ou hostname do serviço que responde pela worklist. Mesmo que seja a mesma máquina do Orthanc, o cadastro é específico para MWL." />}
                      placeholder="Ex.: 10.0.0.25"
                      value={form.mwlHost}
                      onChange={(event) => {
                        const value = event.currentTarget.value;
                        setForm((prev) => ({ ...prev, mwlHost: value }));
                      }}
                    />
                    <NumberInput
                      label={<FieldLabel label="Porta MWL" help="Porta TCP usada para worklist. Mesmo com o mesmo IP do Store, a porta normalmente muda." />}
                      min={1}
                      max={65535}
                      value={form.mwlPort ?? undefined}
                      onChange={(value) => setForm((prev) => ({ ...prev, mwlPort: typeof value === 'number' ? value : null }))}
                    />
                    <Switch
                      mt={30}
                      label={<FieldLabel label="Habilita Worklist" help="Indica que o equipamento consulta a worklist para buscar exames agendados antes da aquisição." />}
                      checked={form.supportsWorklist}
                      onChange={(event) => {
                        const checked = event.currentTarget.checked;
                        setForm((prev) => ({ ...prev, supportsWorklist: checked }));
                      }}
                    />
                  </SimpleGrid>
                </>
              )}

              {form.integrationType !== 'MANUAL' && (
                <>
                  <SectionTitle>Configuração Store</SectionTitle>
                  <Text c="dimmed" size="sm" mb="sm">
                    Destino que recebe as imagens DICOM enviadas pelo equipamento, como Orthanc ou PACS.
                  </Text>
                  <SimpleGrid cols={{ base: 1, md: 2, xl: 4 }} spacing="md">
                    <TextInput
                      label={<FieldLabel label="AE Title Remoto Store" help="Nome DICOM do destino que recebe as imagens enviadas pelo equipamento." />}
                      placeholder="Ex.: SAUDY_STORE"
                      value={form.storeRemoteAeTitle}
                      onChange={(event) => {
                        const value = event.currentTarget.value.toUpperCase();
                        setForm((prev) => ({ ...prev, storeRemoteAeTitle: value }));
                      }}
                    />
                    <TextInput
                      label={<FieldLabel label="Host Store" help="IP ou hostname do destino que recebe os DICOMs. Pode ser o mesmo IP do MWL, cadastrado separadamente." />}
                      placeholder="Ex.: 10.0.0.25"
                      value={form.storeHost}
                      onChange={(event) => {
                        const value = event.currentTarget.value;
                        setForm((prev) => ({ ...prev, storeHost: value }));
                      }}
                    />
                    <NumberInput
                      label={<FieldLabel label="Porta Store" help="Porta TCP usada para envio das imagens DICOM ao destino configurado." />}
                      min={1}
                      max={65535}
                      value={form.storePort ?? undefined}
                      onChange={(value) => setForm((prev) => ({ ...prev, storePort: typeof value === 'number' ? value : null }))}
                    />
                    <Switch
                      mt={30}
                      label={<FieldLabel label="Habilita Store" help="Indica que o equipamento envia imagens DICOM automaticamente para o destino configurado, como PACS, Orthanc ou bridge." />}
                      checked={form.supportsStore}
                      onChange={(event) => {
                        const checked = event.currentTarget.checked;
                        setForm((prev) => ({ ...prev, supportsStore: checked }));
                      }}
                    />
                    <Switch
                      mt={30}
                      label={<FieldLabel label="Habilita Print" help="Indica uso de impressão DICOM. Só faz sentido em cenários onde o equipamento precisa enviar jobs de impressão." />}
                      checked={form.supportsPrint}
                      onChange={(event) => {
                        const checked = event.currentTarget.checked;
                        setForm((prev) => ({ ...prev, supportsPrint: checked }));
                      }}
                    />
                  </SimpleGrid>
                </>
              )}

              {form.integrationType === 'DICOM_DIRECT' && (
                <>
                  <SectionTitle>Acesso Web</SectionTitle>
                  <SimpleGrid cols={{ base: 1, md: 2, xl: 4 }} spacing="md">
                    <TextInput
                      label={<FieldLabel label="DICOMweb / WADO URL" help="Endpoint HTTP usado quando a integração direta consome DICOMweb/WADO para acesso ou consulta às imagens." />}
                      placeholder="Ex.: https://pacs.exemplo.com/dicom-web"
                      value={form.dicomWebPath}
                      onChange={(event) => {
                        const value = event.currentTarget.value;
                        setForm((prev) => ({ ...prev, dicomWebPath: value }));
                      }}
                    />
                  </SimpleGrid>
                </>
              )}

              {editingId && (
                <Group mt="md" justify="flex-end">
                  <Button
                    variant="light"
                    loading={testingId === editingId}
                    onClick={() => handleTestConnection({ id: editingId, ...form })}
                  >
                    Testar comunicação
                  </Button>
                </Group>
              )}

              <SectionTitle>Observações</SectionTitle>
              <Textarea
                label="Notas técnicas"
                minRows={4}
                placeholder="Informações úteis sobre integração, manutenção, protocolos, etc."
                value={form.observations}
                onChange={(event) => {
                  const value = event.currentTarget.value;
                  setForm((prev) => ({ ...prev, observations: value }));
                }}
              />

              <Group justify="space-between" mt="xl">
                <Button variant="default" onClick={resetForm}>
                  Limpar
                </Button>
                <Group>
                  <Button variant="default" onClick={() => setActiveTab('lista')}>
                    Ver lista
                  </Button>
                  <Button bg={DARK_BLUE} c="white" loading={saving} onClick={handleSubmit}>
                    {editingId ? 'Salvar alterações' : 'Cadastrar equipamento'}
                  </Button>
                </Group>
              </Group>
            </Tabs.Panel>

            <Tabs.Panel value="lista">
              <Group justify="space-between" align="end" mb="md">
                <TextInput
                  label="Buscar"
                  placeholder="Nome, modelo, modalidade, AE Title..."
                  value={query}
                  onChange={(event) => setQuery(event.currentTarget.value)}
                  style={{ flex: 1, maxWidth: 420 }}
                />
                <Button leftSection={<ScanLine size={18} />} onClick={() => setActiveTab('cadastro')}>
                  Novo equipamento
                </Button>
              </Group>

              {loading ? (
                <Center py="xl">
                  <Loader />
                </Center>
              ) : filteredItems.length === 0 ? (
                <Paper withBorder p="xl" ta="center">
                  <Text fw={600}>Nenhum equipamento cadastrado</Text>
                  <Text c="dimmed" size="sm" mt="xs">
                    Cadastre os equipamentos de exame para organizar modalidade, sala e configuração DICOM.
                  </Text>
                </Paper>
              ) : (
                <Table.ScrollContainer minWidth={980}>
                  <Table striped highlightOnHover>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>Equipamento</Table.Th>
                        <Table.Th>Local / Modalidade</Table.Th>
                        <Table.Th>Integração</Table.Th>
                        <Table.Th>Situação</Table.Th>
                        <Table.Th>Ações</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {filteredItems.map((item) => (
                        <Table.Tr key={item.id}>
                          <Table.Td>
                            <Stack gap={6}>
                              <Text fw={600}>{item.name}</Text>
                              <Text size="sm" c="dimmed">
                                {[item.manufacturer, item.model].filter(Boolean).join(' • ') || 'Sem fabricante/modelo'}
                              </Text>
                              <Group gap={6}>
                                {item.serialNumber && <Badge variant="dot" color="gray">{item.serialNumber}</Badge>}
                                {item.patrimonyCode && <Badge variant="dot" color="gray">{item.patrimonyCode}</Badge>}
                              </Group>
                            </Stack>
                          </Table.Td>
                          <Table.Td>
                            <Stack gap={6}>
                              <Group gap={6}>
                                <Badge variant="light">{item.modality || 'N/A'}</Badge>
                                <Badge variant="outline" color="gray">
                                  {branchLabelById[item.branchId || ''] || 'Sem filial'}
                                </Badge>
                              </Group>
                              <Text size="xs" c="dimmed">
                                {rooms.find((room) => room.value === item.roomId)?.label || 'Sem sala'}
                              </Text>
                            </Stack>
                          </Table.Td>
                          <Table.Td>
                            <Stack gap={6}>
                              <Group gap={6}>
                                <Badge color="blue" variant="light">
                                  {integrationTypeLabel[item.integrationType || ''] || item.integrationType || 'Integração'}
                                </Badge>
                                {item.bridgeIdentifier && (
                                  <Badge variant="outline" color="blue">
                                    {item.bridgeIdentifier}
                                  </Badge>
                                )}
                              </Group>
                              <Text size="sm">{item.aeTitle || 'Sem AE local'}</Text>
                              <Text size="xs" c="dimmed" lineClamp={2}>
                                {[
                                  item.mwlRemoteAeTitle && `MWL ${item.mwlRemoteAeTitle}`,
                                  item.mwlHost && item.mwlPort ? `${item.mwlHost}:${item.mwlPort}` : '',
                                  item.storeRemoteAeTitle && `STORE ${item.storeRemoteAeTitle}`,
                                  item.storeHost && item.storePort ? `${item.storeHost}:${item.storePort}` : '',
                                ].filter(Boolean).join(' • ') || item.dicomWebPath || 'Sem configuração técnica'}
                              </Text>
                            </Stack>
                          </Table.Td>
                          <Table.Td>
                            <Stack gap={6}>
                              <Group gap={6}>
                                <Badge color={item.isActive ? 'green' : 'gray'} variant="light">
                                  {item.isActive ? 'Ativo' : 'Inativo'}
                                </Badge>
                                <Badge color={communicationBadgeColor(item.lastTestStatus)} variant="light">
                                  {communicationBadgeLabel(item.lastTestStatus)}
                                </Badge>
                                <Badge variant="outline" color="gray">
                                  {item.procedureIds?.length || 0} proc.
                                </Badge>
                              </Group>
                              <Text size="xs" c="dimmed" lineClamp={2}>
                                {item.lastTestMessage || (item.procedureIds?.length
                                  ? item.procedureIds.map((id) => procedureLabelById[id] || id).join(', ')
                                  : 'Nenhum procedimento vinculado')}
                              </Text>
                              {item.lastTestedAt && (
                                <Text size="xs" c="dimmed">
                                  {new Date(item.lastTestedAt).toLocaleString('pt-BR')}
                                </Text>
                              )}
                            </Stack>
                          </Table.Td>
                          <Table.Td>
                            <Group gap="xs">
                              <ActionIcon variant="light" color="blue" onClick={() => openEdit(item)}>
                                <Pencil size={16} />
                              </ActionIcon>
                              <ActionIcon
                                variant="light"
                                color="teal"
                                loading={testingId === item.id}
                                onClick={() => handleTestConnection(item)}
                              >
                                <ScanLine size={16} />
                              </ActionIcon>
                              <ActionIcon
                                variant="light"
                                color={item.isActive ? 'gray' : 'green'}
                                onClick={() => handleToggleActive(item)}
                              >
                                <Power size={16} />
                              </ActionIcon>
                            </Group>
                          </Table.Td>
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>
                </Table.ScrollContainer>
              )}
            </Tabs.Panel>
          </Tabs>
        </Paper>
      </Box>

      <ResultModal
        opened={successOpen}
        onClose={() => setSuccessOpen(false)}
        title={lastSaveAction === 'update' ? 'Equipamento atualizado' : 'Equipamento cadastrado'}
        message={`${lastSavedName || 'Equipamento'} foi salvo com sucesso.`}
        primary={{
          label: 'Novo cadastro',
          onClick: () => {
            setSuccessOpen(false);
            resetForm();
            setActiveTab('cadastro');
          },
        }}
        secondary={{
          label: 'Ver lista',
          variant: 'default',
          onClick: () => {
            setSuccessOpen(false);
            setActiveTab('lista');
          },
        }}
      />

      <Modal opened={errorOpen} onClose={() => setErrorOpen(false)} title="Erro ao salvar" centered>
        <Text>{errorMessage}</Text>
      </Modal>
    </Box>
  );
}
