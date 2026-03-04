import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Group,
  Text,
  TextInput,
  Button,
  Table,
  Modal,
  Stack,
  Textarea,
  Select,
  ActionIcon,
  Tabs,
} from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { Search, Plus, Edit2, ChevronLeft, Lock } from 'lucide-react';
import { showNotification } from '@mantine/notifications';
import { DARK_BLUE } from '../../themes/theme';
import { Header } from '../Header/Header';
import { FloatingInput } from '../common/FloatingInput';
import preAttendanceService from '../../services/preAttendanceService';
import patientService from '../../services/patientService';
import insuranceService from '../../services/insuranceService';
import { formatCPF, formatDateInput, formatPhone, onlyDigits } from '../../utils/formatters';

interface Patient extends NovoPatiente {
  id: string;
  patientId?: string;
  totem?: number;
  status?: string;
  fila?: string;
  tipoFila?: string;
  agenda?: string;
}

interface NovoPatiente {
  nomeCompleto: string;
  cpf: string;
  dataNascimento: string;
  sexo: string;
  telefone: string;
  email: string;
  endereco: string;
  convenio: string;
  tipoConvenio: string;
  validadeConvenio: string;
  numCarteira: string;
  statusAutorizacao: string;
  observacoesConvenio: string;
  pressaoArterial: string;
  frequenciaCardiaca: string;
  temperatura: string;
  saturacao: string;
  peso: string;
  altura: string;
  glicemia: string;
  imc: string;
  queixaPrincipal: string;
  historiaDoenca: string;
  alergias: string;
  medicamentos: string;
  antecedentes: string;
  observacoesTriagem: string;
  observacoes: string;
}

const INITIAL_NOVO_PACIENTE: NovoPatiente = {
  nomeCompleto: '',
  cpf: '',
  dataNascimento: '',
  sexo: '',
  telefone: '',
  email: '',
  endereco: '',
  convenio: '',
  tipoConvenio: '',
  validadeConvenio: '',
  numCarteira: '',
  statusAutorizacao: '',
  observacoesConvenio: '',
  pressaoArterial: '',
  frequenciaCardiaca: '',
  temperatura: '',
  saturacao: '',
  peso: '',
  altura: '',
  glicemia: '',
  imc: '',
  queixaPrincipal: '',
  historiaDoenca: '',
  alergias: '',
  medicamentos: '',
  antecedentes: '',
  observacoesTriagem: '',
  observacoes: '',
};

export function PreAtendimento() {
  const navigate = useNavigate();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [searchValue, setSearchValue] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [novoPaciente, setNovoPaciente] = useState<NovoPatiente>(INITIAL_NOVO_PACIENTE);
  const [isEditing, setIsEditing] = useState(false);
  const [editingPatientId, setEditingPatientId] = useState<string | null>(null);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [patientOptions, setPatientOptions] = useState<{ value: string; label: string }[]>([]);
  const [patientById, setPatientById] = useState<Record<string, any>>({});
  const [insuranceOptions, setInsuranceOptions] = useState<{ value: string; label: string }[]>([]);
  const [insurancesLoading, setInsurancesLoading] = useState(false);
  const [patientsLoading, setPatientsLoading] = useState(false);
  const isMobile = useMediaQuery('(max-width: 799px)');
  const isTablet = useMediaQuery('(max-width: 1279px)');

  const formatDateDisplay = (value?: string) => {
    if (!value) return '';
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(value)) return value;
    if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
      const [y, m, d] = value.split('T')[0].split('-');
      return `${d}/${m}/${y}`;
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const mapApiToPatient = (it: any): Patient => {
    const raw = it?.item || it?.data || it;
    const id = raw?.id || raw?.preAttendanceId || raw?.pre_attendance_id || raw?.patientId || raw?.patient_id || `tmp-${Math.random().toString(36).slice(2)}`;
    const nomeCompleto = (raw?.fullName || raw?.full_name || raw?.name || raw?.patientName || raw?.patient_name || raw?.patient?.name || '').toString().trim();

    return {
      id: String(id),
      patientId: raw?.patientId || raw?.patient_id || raw?.patient?.id || undefined,
      nomeCompleto,
      cpf: raw?.cpf || raw?.patientCpf || raw?.patient_cpf || raw?.patient?.cpf || '',
      dataNascimento: raw?.birthDate || raw?.birth_date || '',
      sexo: raw?.gender || raw?.sexo || '',
      telefone: raw?.phone || raw?.cellphone || '',
      email: raw?.email || '',
      endereco: raw?.address || raw?.endereco || '',
      convenio: raw?.convenio || raw?.insurance || raw?.healthInsuranceName || '',
      tipoConvenio: raw?.convenioType || raw?.convenio_type || '',
      validadeConvenio: raw?.convenioValidUntil || raw?.convenio_valid_until || raw?.healthInsuranceExpiry || raw?.healthInsuranceValidity || '',
      numCarteira: raw?.convenioNumber || raw?.convenio_number || raw?.healthInsuranceNumber || '',
      statusAutorizacao: raw?.convenioStatus || raw?.convenio_status || '',
      observacoesConvenio: raw?.convenioNotes || raw?.convenio_notes || '',
      pressaoArterial: raw?.bloodPressure || raw?.blood_pressure || '',
      frequenciaCardiaca: raw?.heartRate || raw?.heart_rate || '',
      temperatura: raw?.temperature || '',
      saturacao: raw?.oxygenSaturation || raw?.oxygen_saturation || '',
      peso: raw?.weight || '',
      altura: raw?.height || '',
      glicemia: raw?.glucose || '',
      imc: raw?.bmi || '',
      queixaPrincipal: raw?.mainComplaint || raw?.main_complaint || '',
      historiaDoenca: raw?.diseaseHistory || raw?.disease_history || '',
      alergias: raw?.allergies || '',
      medicamentos: raw?.medications || '',
      antecedentes: raw?.antecedentes || '',
      observacoesTriagem: raw?.triageNotes || raw?.triage_notes || '',
      observacoes: raw?.notes || raw?.observacoes || '',
      totem: raw?.totem ?? undefined,
      status: raw?.status || '',
      fila: raw?.queue || raw?.fila || '',
      tipoFila: raw?.queueType || raw?.queue_type || raw?.tipoFila || '',
      agenda: raw?.agenda || '',
    };
  };

  useEffect(() => {
    const load = async () => {
      try {
        const data: any = await preAttendanceService.list();
        const list: any[] = Array.isArray(data)
          ? data
          : (Array.isArray(data?.items)
            ? data.items
            : (Array.isArray(data?.data)
              ? data.data
              : []));
        setPatients(list.map(mapApiToPatient));
      } catch (err: any) {
        showNotification({
          title: 'Erro',
          message: err?.response?.data?.message || err?.message || 'Erro ao carregar pacientes',
          color: 'red',
        });
      }
    };

    load();
  }, []);

  useEffect(() => {
    const loadPatients = async () => {
      setPatientsLoading(true);
      try {
        const data: any = await patientService.listPatients();
        const listRaw = Array.isArray(data)
          ? data
          : (Array.isArray(data?.patients)
            ? data.patients
            : (Array.isArray(data?.data?.patients)
              ? data.data.patients
              : (Array.isArray(data?.data)
                ? data.data
                : (Array.isArray(data?.items) ? data.items : []))));

        const list: any[] = Array.isArray(listRaw) ? listRaw : [];
        const options = list.map((p: any) => {
          const id = String(p.id ?? p.patientId ?? '');
          const name = (p.name || p.fullName || p.patientName || p.email || p.cpf || '').toString().trim();
          const label = name || 'Paciente';
          return { value: id || label, label };
        });

        const byId: Record<string, any> = {};
        list.forEach((p: any) => {
          const id = String(p.id ?? p.patientId ?? '');
          if (id) byId[id] = p;
        });

        setPatientById(byId);
        setPatientOptions(options);
      } catch (err: any) {
        showNotification({
          title: 'Erro',
          message: err?.response?.data?.message || err?.message || 'Erro ao carregar pacientes',
          color: 'red',
        });
      } finally {
        setPatientsLoading(false);
      }
    };

    loadPatients();
  }, []);

  useEffect(() => {
    const loadInsurances = async () => {
      setInsurancesLoading(true);
      try {
        const data: any = await insuranceService.listInsurances({ isActive: true });
        const list: any[] = Array.isArray(data)
          ? data
          : (Array.isArray(data?.items)
            ? data.items
            : (Array.isArray(data?.data?.items)
              ? data.data.items
              : (Array.isArray(data?.data)
                ? data.data
                : [])));

        const options = list
          .map((it: any) => {
            const name = (it.name || it.nome || '').toString().trim();
            return name ? { value: name, label: name } : null;
          })
          .filter(Boolean) as { value: string; label: string }[];

        setInsuranceOptions(options);
      } catch (err: any) {
        showNotification({
          title: 'Erro',
          message: err?.response?.data?.message || err?.message || 'Erro ao carregar convênios',
          color: 'red',
        });
      } finally {
        setInsurancesLoading(false);
      }
    };

    loadInsurances();
  }, []);

  const filteredPatients = patients.filter((patient) => {
    const q = searchValue.toLowerCase();
    const totemValue = patient.totem !== undefined ? String(patient.totem) : '';
    return patient.nomeCompleto.toLowerCase().includes(q) || totemValue.includes(searchValue);
  });

  const handleAddPatient = async () => {
    if (!novoPaciente.nomeCompleto || !novoPaciente.cpf) {
      alert('Por favor, preencha os campos obrigatórios');
      return;
    }

    const payload = {
      patientId: selectedPatientId || undefined,
      fullName: novoPaciente.nomeCompleto,
      cpf: onlyDigits(novoPaciente.cpf),
      birthDate: novoPaciente.dataNascimento || undefined,
      gender: novoPaciente.sexo || undefined,
      phone: onlyDigits(novoPaciente.telefone) || undefined,
      email: novoPaciente.email || undefined,
      address: novoPaciente.endereco || undefined,
      convenio: novoPaciente.convenio || undefined,
      convenioType: novoPaciente.tipoConvenio || undefined,
      convenioValidUntil: novoPaciente.validadeConvenio || undefined,
      convenioNumber: novoPaciente.numCarteira || undefined,
      convenioStatus: novoPaciente.statusAutorizacao || undefined,
      convenioNotes: novoPaciente.observacoesConvenio || undefined,
      bloodPressure: novoPaciente.pressaoArterial || undefined,
      heartRate: novoPaciente.frequenciaCardiaca || undefined,
      temperature: novoPaciente.temperatura || undefined,
      oxygenSaturation: novoPaciente.saturacao || undefined,
      weight: novoPaciente.peso || undefined,
      height: novoPaciente.altura || undefined,
      glucose: novoPaciente.glicemia || undefined,
      bmi: novoPaciente.imc || undefined,
      mainComplaint: novoPaciente.queixaPrincipal || undefined,
      diseaseHistory: novoPaciente.historiaDoenca || undefined,
      allergies: novoPaciente.alergias || undefined,
      medications: novoPaciente.medicamentos || undefined,
      antecedentes: novoPaciente.antecedentes || undefined,
      triageNotes: novoPaciente.observacoesTriagem || undefined,
      notes: novoPaciente.observacoes || undefined,
    };

    if (isEditing && editingPatientId !== null) {
      try {
        const updated = await preAttendanceService.update(editingPatientId, payload);
        setPatients((prev) => prev.map((p) => (p.id === editingPatientId ? mapApiToPatient(updated) : p)));
      } catch (err: any) {
        showNotification({
          title: 'Erro',
          message: err?.response?.data?.message || err?.message || 'Erro ao atualizar paciente',
          color: 'red',
        });
        return;
      }
    } else {
      try {
        let createdPatientId = selectedPatientId;

        if (!createdPatientId) {
          const toIsoDate = (value?: string) => {
            if (!value) return undefined;
            if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
            if (/^\d{4}-\d{2}-\d{2}T/.test(value)) return value.slice(0, 10);
            const m = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
            if (!m) return undefined;
            return `${m[3]}-${m[2]}-${m[1]}`;
          };

          const genderMap: Record<string, string> = { M: 'MALE', F: 'FEMALE', O: 'OTHER' };
          const gender = genderMap[novoPaciente.sexo] || undefined;

          const createdPatient = await patientService.createPatient({
            name: novoPaciente.nomeCompleto,
            cpf: onlyDigits(novoPaciente.cpf),
            birthDate: toIsoDate(novoPaciente.dataNascimento),
            gender,
            phone: onlyDigits(novoPaciente.telefone) || undefined,
            email: novoPaciente.email || undefined,
            address: novoPaciente.endereco || undefined,
            healthInsuranceName: novoPaciente.convenio || undefined,
            healthInsuranceNumber: novoPaciente.numCarteira || undefined,
            healthInsuranceExpiry: toIsoDate(novoPaciente.validadeConvenio),
            observations: novoPaciente.observacoes || undefined,
          } as any);

          createdPatientId = String(createdPatient?.id ?? createdPatient?.patientId ?? '');
        }

        const created = await preAttendanceService.create({
          ...payload,
          patientId: createdPatientId || undefined,
          totem: Math.floor(Math.random() * 100) + 1,
          status: 'Em atendimento',
          queue: 'Recepção 01',
          queueType: 'Exames',
          agenda: 'Mamografia',
        });
        setPatients((prev) => [mapApiToPatient(created), ...prev]);
      } catch (err: any) {
        showNotification({
          title: 'Erro',
          message: err?.response?.data?.message || err?.message || 'Erro ao cadastrar paciente',
          color: 'red',
        });
        return;
      }
    }

    setNovoPaciente(INITIAL_NOVO_PACIENTE);
    setModalOpen(false);
    setIsEditing(false);
    setEditingPatientId(null);
    setSelectedPatientId(null);
  };

  const handleEditPatient = (patient: Patient) => {
    setIsEditing(true);
    setEditingPatientId(patient.id);
    setSelectedPatientId(patient.patientId || null);
    setNovoPaciente({
      nomeCompleto: patient.nomeCompleto,
      cpf: patient.cpf,
      dataNascimento: patient.dataNascimento,
      sexo: patient.sexo,
      telefone: patient.telefone,
      email: patient.email,
      endereco: patient.endereco,
      convenio: patient.convenio,
      tipoConvenio: patient.tipoConvenio,
      validadeConvenio: patient.validadeConvenio,
      numCarteira: patient.numCarteira,
      statusAutorizacao: patient.statusAutorizacao,
      observacoesConvenio: patient.observacoesConvenio,
      pressaoArterial: patient.pressaoArterial,
      frequenciaCardiaca: patient.frequenciaCardiaca,
      temperatura: patient.temperatura,
      saturacao: patient.saturacao,
      peso: patient.peso,
      altura: patient.altura,
      glicemia: patient.glicemia,
      imc: patient.imc,
      queixaPrincipal: patient.queixaPrincipal,
      historiaDoenca: patient.historiaDoenca,
      alergias: patient.alergias,
      medicamentos: patient.medicamentos,
      antecedentes: patient.antecedentes,
      observacoesTriagem: patient.observacoesTriagem,
      observacoes: patient.observacoes,
    });
    setModalOpen(true);
  };

  const handleSelectPatient = (value: string | null) => {
    if (!value) {
      setSelectedPatientId(null);
      setNovoPaciente(INITIAL_NOVO_PACIENTE);
      return;
    }

    setSelectedPatientId(value);
    const p = patientById[value];
    if (!p) return;

    setNovoPaciente((prev) => ({
      ...prev,
      nomeCompleto: p.name || p.fullName || p.patientName || prev.nomeCompleto || '',
      cpf: formatCPF(p.cpf || prev.cpf || ''),
      dataNascimento: formatDateDisplay(p.birthDate || prev.dataNascimento || ''),
      sexo: p.gender ? String(p.gender).charAt(0).toUpperCase() : prev.sexo || '',
      telefone: formatPhone(p.phone || p.cellphone || prev.telefone || ''),
      email: p.email || prev.email || '',
      endereco: p.address || prev.endereco || '',
      convenio: p.healthInsuranceName || prev.convenio || '',
      validadeConvenio: formatDateDisplay(p.healthInsuranceExpiry || prev.validadeConvenio || ''),
      numCarteira: p.healthInsuranceNumber || prev.numCarteira || '',
    }));
  };

  const rows = filteredPatients.map((patient) => (
    <Table.Tr key={patient.id} style={{ borderBottom: '1px solid #e9ecef' }}>
      <Table.Td>
        <Group gap={isMobile ? "xs" : "sm"}>
          {!isMobile && (
            <Box
              bg={DARK_BLUE}
              w={32}
              h={32}
              style={{ borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
            >
              <Text c="white" fw={600} size="sm">
                {patient.nomeCompleto.charAt(0).toUpperCase()}
              </Text>
            </Box>
          )}
          <Box>
            <Text fw={500} size="xs" style={{ fontSize: isMobile ? '0.8rem' : '0.85rem' }}>
              {patient.nomeCompleto}
            </Text>
            {isMobile && (
              <Text size="xs" c="dimmed">
                Totem: {patient.totem ?? '-'}
              </Text>
            )}
          </Box>
        </Group>
      </Table.Td>
      {!isMobile && (
        <Table.Td>
          <Text size="xs" style={{ fontSize: isMobile ? '0.75rem' : '0.82rem' }}>{patient.totem ?? '-'}</Text>
        </Table.Td>
      )}
      {!isMobile && (
        <Table.Td>
          <Text size="xs" style={{ fontSize: isMobile ? '0.75rem' : '0.82rem' }} c="#495057">{patient.status || '-'}</Text>
        </Table.Td>
      )}
      {!isTablet && (
        <Table.Td>
          <Text size="xs" style={{ fontSize: isMobile ? '0.75rem' : '0.82rem' }}>{patient.fila || '-'}</Text>
        </Table.Td>
      )}
      {!isTablet && (
        <Table.Td>
          <Text size="xs" style={{ fontSize: isMobile ? '0.75rem' : '0.82rem' }}>{patient.tipoFila || '-'}</Text>
        </Table.Td>
      )}
      {!isTablet && (
        <Table.Td>
          <Text size="xs" style={{ fontSize: isMobile ? '0.75rem' : '0.82rem' }}>{patient.agenda || '-'}</Text>
        </Table.Td>
      )}
      <Table.Td>
        <Group gap={4} justify="flex-end" align="center">
          <Text c="dimmed" style={{ padding: '0 6px' }}>|</Text>
          <ActionIcon size="sm" variant="subtle" style={{ color: 'var(--mantine-color-text)' }} onClick={() => handleEditPatient(patient)}>
            <Edit2 size={18} />
          </ActionIcon>
          <Text c="dimmed" style={{ padding: '0 6px' }}>|</Text>
        </Group>
      </Table.Td>
    </Table.Tr>
  ));

  return (
    <Box bg="var(--mantine-color-body)" style={{ minHeight: '100vh' }}>
      <Header />

      <Box p={isMobile ? 'sm' : isTablet ? 'md' : 'xl'} maw={isMobile ? '100%' : 1400} mx="auto">
        {/* Breadcrumb/Back Button */}
        <Group mb={isMobile ? 20 : 30}>
          <ActionIcon variant="default" color="black" size="xl" onClick={() => navigate('/dashboard')}>
            <ChevronLeft size={28} />
          </ActionIcon>
          <Box>
            <Text fw={600} size={isMobile ? 'md' : 'lg'} c="var(--mantine-color-text)">
              Pré-atendimento
            </Text>
            <Text size="sm" c="dimmed">
              Recepção e cadastro de pacientes
            </Text>
          </Box>
        </Group>

        {/* Search and Button Section */}
        <Box mb={isMobile ? 20 : 30}>
          <Group gap="md" align="flex-end">
            {/* Search Bar */}
            <TextInput
              placeholder={isMobile ? "Buscar..." : "Buscar paciente por nome ou CPF..."}
              leftSection={<Search size={16} color="var(--mantine-color-dimmed)" />}
              value={searchValue}
              onChange={(e) => setSearchValue(e.currentTarget.value)}
              radius="md"
              size={isMobile ? "sm" : "md"}
              style={{ flex: 1 }}
            />

            {/* Add Patient Button */}
            <Button
              bg={DARK_BLUE}
              c="white"
              leftSection={isMobile ? undefined : <Plus size={18} />}
              onClick={() => {
                setSelectedPatientId(null);
                setNovoPaciente(INITIAL_NOVO_PACIENTE);
                setIsEditing(false);
                setEditingPatientId(null);
                setModalOpen(true);
              }}
              size={isMobile ? "sm" : "md"}
              fw={600}
              px={isMobile ? "sm" : "xl"}
              w={isMobile ? "auto" : "auto"}
            >
              {isMobile ? <Plus size={16} /> : "Novo paciente"}
            </Button>
          </Group>
        </Box>

        {/* Patients Table */}
        <Box style={{ overflowX: 'auto', border: '1px solid #e9ecef', borderRadius: 6 }}>
          <Table horizontalSpacing={isMobile ? "sm" : "md"} verticalSpacing={isMobile ? "sm" : "md"}>
            <Table.Thead>
              <Table.Tr style={{ borderBottom: 'none' }}>
                <Table.Th style={{ color: '#868e96', fontSize: isMobile ? '0.7rem' : '0.8rem', fontWeight: 500 }}>Nome</Table.Th>
                {!isMobile && <Table.Th style={{ color: '#868e96', fontSize: '0.8rem', fontWeight: 500 }}>Totem</Table.Th>}
                {!isMobile && <Table.Th style={{ color: '#868e96', fontSize: '0.8rem', fontWeight: 500 }}>Status</Table.Th>}
                {!isTablet && <Table.Th style={{ color: '#868e96', fontSize: '0.8rem', fontWeight: 500 }}>Fila</Table.Th>}
                {!isTablet && <Table.Th style={{ color: '#868e96', fontSize: '0.8rem', fontWeight: 500 }}>Tipo Fila</Table.Th>}
                {!isTablet && <Table.Th style={{ color: '#868e96', fontSize: '0.8rem', fontWeight: 500 }}>Agenda</Table.Th>}
                <Table.Th style={{ color: '#868e96', fontSize: isMobile ? '0.7rem' : '0.8rem', fontWeight: 500, textAlign: 'right' }}>Ações</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>{rows.length > 0 ? rows : <Table.Tr><Table.Td colSpan={7}><Text ta="center" c="dimmed">Nenhum paciente encontrado</Text></Table.Td></Table.Tr>}</Table.Tbody>
          </Table>
        </Box>
      </Box>

      {/* Modal - Novo Paciente */}
      <Modal
        opened={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setIsEditing(false);
          setEditingPatientId(null);
          setNovoPaciente(INITIAL_NOVO_PACIENTE);
        }}
        title={isEditing ? "Editar Paciente" : "Novo Paciente"}
        size={isMobile ? "100%" : isTablet ? "90%" : "lg"}
        centered
        fullScreen={isMobile}
        styles={{
          content: {
            '::-webkit-scrollbar': { display: 'none' },
            scrollbarWidth: 'none',
            overflow: 'hidden',
          },
          body: {
            '::-webkit-scrollbar': { display: 'none' },
            scrollbarWidth: 'none',
            overflow: 'hidden',
          },
        }}
      >
        <Tabs defaultValue="dados-pessoais" color="darkBlue">
          <Tabs.List mb={isMobile ? "sm" : "md"}>
            <Tabs.Tab value="dados-pessoais">Dados pessoais</Tabs.Tab>
            <Tabs.Tab value="convenio">Convênio</Tabs.Tab>
            <Tabs.Tab value="triagem">Triagem</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="dados-pessoais">
            <Stack gap={isMobile ? "sm" : "md"} mih={isMobile ? undefined : 750}>
              <Box>
                <Select
                  label="Paciente"
                  placeholder={patientsLoading ? 'Carregando pacientes...' : 'Selecione um paciente'}
                  data={patientOptions}
                  value={selectedPatientId}
                  onChange={handleSelectPatient}
                  searchable
                  clearable
                  nothingFoundMessage="Nenhum paciente encontrado"
                  disabled={patientsLoading}
                />
              </Box>

              <FloatingInput
                label="Nome completo"
                value={novoPaciente.nomeCompleto}
                onChange={(e) =>
                  setNovoPaciente({ ...novoPaciente, nomeCompleto: e.currentTarget.value })
                }
                disabled={isEditing}
                style={isEditing ? { color: '#adb5bd' } : {}}
                rightSection={isEditing && <Lock size={16} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: '#adb5bd' }} />}
              />

              <Group grow gap={isMobile ? "xs" : "md"} wrap="wrap">
                <FloatingInput
                  label="CPF"
                  value={novoPaciente.cpf}
                  onChange={(e) => setNovoPaciente({ ...novoPaciente, cpf: formatCPF(e.currentTarget.value) })}
                  disabled={isEditing}
                  style={isEditing ? { color: '#adb5bd' } : {}}
                  rightSection={isEditing && <Lock size={16} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: '#adb5bd' }} />}
                />
                <FloatingInput
                  label="Data de nascimento"
                  value={novoPaciente.dataNascimento}
                  onChange={(e) => setNovoPaciente({ ...novoPaciente, dataNascimento: formatDateInput(e.currentTarget.value) })}
                  disabled={isEditing}
                  style={isEditing ? { color: '#adb5bd' } : {}}
                  rightSection={isEditing && <Lock size={16} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: '#adb5bd' }} />}
                />
              </Group>

              <Group grow gap={isMobile ? "xs" : "md"} wrap="wrap">
                <Box>
                  <Select
                    label="Sexo"
                    placeholder="Selecione"
                    data={[
                      { value: 'M', label: 'Masculino' },
                      { value: 'F', label: 'Feminino' },
                      { value: 'O', label: 'Outro' },
                    ]}
                    value={novoPaciente.sexo}
                    onChange={(value) =>
                      setNovoPaciente({ ...novoPaciente, sexo: value || '' })
                    }
                  />
                </Box>
                <FloatingInput
                  label="Telefone"
                  value={novoPaciente.telefone}
                  onChange={(e) => setNovoPaciente({ ...novoPaciente, telefone: formatPhone(e.currentTarget.value) })}
                />
              </Group>

              <FloatingInput
                type="email"
                label="E-mail"
                value={novoPaciente.email}
                onChange={(e) => setNovoPaciente({ ...novoPaciente, email: e.currentTarget.value })}
              />

              <FloatingInput
                label="Endereço"
                value={novoPaciente.endereco}
                onChange={(e) => setNovoPaciente({ ...novoPaciente, endereco: e.currentTarget.value })}
              />

              <Textarea
                label="Observações"
                placeholder="Observações adicionais"
                rows={3}
                value={novoPaciente.observacoes}
                onChange={(e) =>
                  setNovoPaciente({ ...novoPaciente, observacoes: e.currentTarget.value })
                }
              />
            </Stack>
          </Tabs.Panel>

          <Tabs.Panel value="convenio">
            <Stack gap={isMobile ? "sm" : "md"} mih={isMobile ? undefined : 750}>
              <Box>
                <Select
                  label="Convênio"
                  placeholder={insurancesLoading ? 'Carregando convênios...' : 'Selecione um convênio'}
                  data={insuranceOptions}
                  value={novoPaciente.convenio}
                  onChange={(value) => setNovoPaciente({ ...novoPaciente, convenio: value || '' })}
                  searchable
                  clearable
                  disabled={insurancesLoading}
                  nothingFoundMessage="Nenhum convênio encontrado"
                />
              </Box>

              <Group grow gap={isMobile ? "xs" : "md"} wrap="wrap">
                <FloatingInput
                  label="Tipo"
                  value={novoPaciente.tipoConvenio}
                  onChange={(e) =>
                    setNovoPaciente({ ...novoPaciente, tipoConvenio: e.currentTarget.value })
                  }
                />
                <FloatingInput
                  label="Validade"
                  value={novoPaciente.validadeConvenio}
                  onChange={(e) => setNovoPaciente({ ...novoPaciente, validadeConvenio: formatDateInput(e.currentTarget.value) })}
                />
              </Group>

              <FloatingInput
                label="Número (ID beneficiário)"
                value={novoPaciente.numCarteira}
                onChange={(e) =>
                  setNovoPaciente({ ...novoPaciente, numCarteira: e.currentTarget.value })
                }
              />

              <Box>
                <Select
                  label="Status da Autorização"
                  placeholder="Selecione"
                  data={[
                    { value: 'aguardando', label: 'Aguardando aut.' },
                    { value: 'autorizado', label: 'Autorizado' },
                    { value: 'negado', label: 'Negado' },
                  ]}
                  value={novoPaciente.statusAutorizacao}
                  onChange={(value) =>
                    setNovoPaciente({ ...novoPaciente, statusAutorizacao: value || '' })
                  }
                />
              </Box>

              <Textarea
                label="Observações"
                placeholder="Observações do convênio"
                rows={3}
                value={novoPaciente.observacoesConvenio}
                onChange={(e) =>
                  setNovoPaciente({ ...novoPaciente, observacoesConvenio: e.currentTarget.value })
                }
              />
            </Stack>
          </Tabs.Panel>

          <Tabs.Panel value="triagem">
            <Stack gap="xs" mih={isMobile ? undefined : 750}>
              <Group grow>
                <FloatingInput
                  label="Nome"
                  value={novoPaciente.nomeCompleto}
                  readOnly
                  disabled
                  placeholder=" "
                  style={{ color: '#adb5bd' }}
                  rightSection={isEditing && <Lock size={16} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: '#adb5bd' }} />}
                />
                <FloatingInput
                  label="Convênio"
                  value={novoPaciente.convenio}
                  readOnly
                  disabled
                  placeholder=" "
                  style={{ color: '#adb5bd' }}
                  rightSection={isEditing && <Lock size={16} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: '#adb5bd' }} />}
                />
              </Group>

              <Group grow gap={isMobile ? "xs" : "md"} wrap="wrap">
                <FloatingInput
                  label="PA (mmHg)"
                  value={novoPaciente.pressaoArterial}
                  onChange={(e) =>
                    setNovoPaciente({ ...novoPaciente, pressaoArterial: e.currentTarget.value })
                  }
                />
                <FloatingInput
                  label="FC (bmp)"
                  value={novoPaciente.frequenciaCardiaca}
                  onChange={(e) =>
                    setNovoPaciente({ ...novoPaciente, frequenciaCardiaca: e.currentTarget.value })
                  }
                />
                <FloatingInput
                  label="Temp (°C)"
                  value={novoPaciente.temperatura}
                  onChange={(e) =>
                    setNovoPaciente({ ...novoPaciente, temperatura: e.currentTarget.value })
                  }
                />
              </Group>

              <Group grow gap={isMobile ? "xs" : "md"} wrap="wrap">
                <FloatingInput
                  label="SpO2 (%)"
                  value={novoPaciente.saturacao}
                  onChange={(e) =>
                    setNovoPaciente({ ...novoPaciente, saturacao: e.currentTarget.value })
                  }
                />
                <FloatingInput
                  label="Peso (kg)"
                  value={novoPaciente.peso}
                  onChange={(e) =>
                    setNovoPaciente({ ...novoPaciente, peso: e.currentTarget.value })
                  }
                />
                <FloatingInput
                  label="Altura (cm)"
                  value={novoPaciente.altura}
                  onChange={(e) =>
                    setNovoPaciente({ ...novoPaciente, altura: e.currentTarget.value })
                  }
                />
              </Group>

              <Group grow gap={isMobile ? "xs" : "md"} wrap="wrap">
                <FloatingInput
                  label="Glicemia"
                  value={novoPaciente.glicemia}
                  onChange={(e) =>
                    setNovoPaciente({ ...novoPaciente, glicemia: e.currentTarget.value })
                  }
                />
                <FloatingInput
                  label="IMC"
                  value={novoPaciente.imc}
                  onChange={(e) =>
                    setNovoPaciente({ ...novoPaciente, imc: e.currentTarget.value })
                  }
                />
              </Group>

              <FloatingInput
                label="Queixa principal"
                value={novoPaciente.queixaPrincipal}
                onChange={(e) =>
                  setNovoPaciente({ ...novoPaciente, queixaPrincipal: e.currentTarget.value })
                }
              />

              <FloatingInput
                label="História da Doença"
                value={novoPaciente.historiaDoenca}
                onChange={(e) =>
                  setNovoPaciente({ ...novoPaciente, historiaDoenca: e.currentTarget.value })
                }
              />

              <FloatingInput
                label="Alergias"
                value={novoPaciente.alergias}
                onChange={(e) =>
                  setNovoPaciente({ ...novoPaciente, alergias: e.currentTarget.value })
                }
              />

              <FloatingInput
                label="Medicamentos"
                value={novoPaciente.medicamentos}
                onChange={(e) =>
                  setNovoPaciente({ ...novoPaciente, medicamentos: e.currentTarget.value })
                }
              />

              <FloatingInput
                label="Antecedentes"
                value={novoPaciente.antecedentes}
                onChange={(e) =>
                  setNovoPaciente({ ...novoPaciente, antecedentes: e.currentTarget.value })
                }
              />

              <FloatingInput
                label="Observação"
                value={novoPaciente.observacoesTriagem}
                onChange={(e) =>
                  setNovoPaciente({ ...novoPaciente, observacoesTriagem: e.currentTarget.value })
                }
              />

              <Group justify="flex-end" gap="md" mt={isMobile ? "sm" : "lg"}>
                <Button variant="default" onClick={() => setModalOpen(false)}>
                  Cancelar
                </Button>
                <Button bg={DARK_BLUE} onClick={handleAddPatient}>
                  Salvar
                </Button>
              </Group>
            </Stack>
          </Tabs.Panel>
        </Tabs>
      </Modal>
    </Box>
  );
}
