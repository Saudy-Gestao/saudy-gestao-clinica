import { useState } from 'react';
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
import { DARK_BLUE } from '../../themes/theme';
import { Header } from '../Header/Header';

interface Patient extends NovoPatiente {
  id: number;
  totem: number;
  status: string;
  fila: string;
  tipoFila: string;
  agenda: string;
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

const INITIAL_PATIENTS: Patient[] = [
  {
    id: 1,
    nomeCompleto: 'Maria Silva Santos',
    cpf: '123.456.789-00',
    dataNascimento: '1985-05-15',
    sexo: 'F',
    telefone: '(11) 99999-9999',
    email: 'maria.silva@email.com',
    endereco: 'Rua das Flores, 123',
    convenio: 'Unimed',
    tipoConvenio: 'Plano Básico',
    validadeConvenio: '2025-12-31',
    numCarteira: '123456789',
    statusAutorizacao: 'autorizado',
    observacoesConvenio: '',
    pressaoArterial: '120/80',
    frequenciaCardiaca: '70',
    temperatura: '36.5',
    saturacao: '98',
    peso: '65',
    altura: '165',
    glicemia: '90',
    imc: '23.9',
    queixaPrincipal: 'Dor de cabeça',
    historiaDoenca: 'História da doença',
    alergias: 'Nenhuma',
    medicamentos: 'Paracetamol',
    antecedentes: 'Nenhum',
    observacoesTriagem: '',
    observacoes: '',
    totem: 23,
    status: 'Em atendimento',
    fila: 'Recepção 01',
    tipoFila: 'Exames',
    agenda: 'Mamografia',
  },
  {
    id: 2,
    nomeCompleto: 'João Pedro Oliveira',
    cpf: '987.654.321-00',
    dataNascimento: '1990-08-20',
    sexo: 'M',
    telefone: '(11) 88888-8888',
    email: 'joao.oliveira@email.com',
    endereco: 'Av. Brasil, 456',
    convenio: 'Sulamerica',
    tipoConvenio: 'Plano Premium',
    validadeConvenio: '2024-10-15',
    numCarteira: '987654321',
    statusAutorizacao: 'aguardando',
    observacoesConvenio: '',
    pressaoArterial: '130/85',
    frequenciaCardiaca: '75',
    temperatura: '37.0',
    saturacao: '97',
    peso: '80',
    altura: '180',
    glicemia: '95',
    imc: '24.7',
    queixaPrincipal: 'Dor nas costas',
    historiaDoenca: 'História da doença',
    alergias: 'Penicilina',
    medicamentos: 'Ibuprofeno',
    antecedentes: 'Cirurgia anterior',
    observacoesTriagem: '',
    observacoes: '',
    totem: 24,
    status: 'Aguardando',
    fila: 'Recepção 02',
    tipoFila: 'Exames',
    agenda: 'Clínica',
  },
];

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
  const [patients, setPatients] = useState<Patient[]>(INITIAL_PATIENTS);
  const [searchValue, setSearchValue] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [novoPaciente, setNovoPaciente] = useState<NovoPatiente>(INITIAL_NOVO_PACIENTE);
  const [isEditing, setIsEditing] = useState(false);
  const [editingPatientId, setEditingPatientId] = useState<number | null>(null);
  const isMobile = useMediaQuery('(max-width: 799px)');
  const isTablet = useMediaQuery('(max-width: 1279px)');

  const filteredPatients = patients.filter(
    (patient) =>
      patient.nomeCompleto.toLowerCase().includes(searchValue.toLowerCase()) ||
      patient.totem.toString().includes(searchValue)
  );

  const handleAddPatient = () => {
    if (!novoPaciente.nomeCompleto || !novoPaciente.cpf) {
      alert('Por favor, preencha os campos obrigatórios');
      return;
    }

    if (isEditing && editingPatientId !== null) {
      // Edit existing patient
      setPatients(patients.map(p => 
        p.id === editingPatientId 
          ? { ...p, ...novoPaciente }
          : p
      ));
    } else {
      // Add new patient
      const newPatient: Patient = {
        ...novoPaciente,
        id: Math.max(...patients.map((p) => p.id), 0) + 1,
        totem: Math.floor(Math.random() * 100) + 1,
        status: 'Em atendimento',
        fila: 'Recepção 01',
        tipoFila: 'Exames',
        agenda: 'Mamografia',
      };
      setPatients([...patients, newPatient]);
    }

    setNovoPaciente(INITIAL_NOVO_PACIENTE);
    setModalOpen(false);
    setIsEditing(false);
    setEditingPatientId(null);
  };

  const handleEditPatient = (patient: Patient) => {
    setIsEditing(true);
    setEditingPatientId(patient.id);
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
                Totem: {patient.totem}
              </Text>
            )}
          </Box>
        </Group>
      </Table.Td>
      {!isMobile && (
        <Table.Td>
          <Text size="xs" style={{ fontSize: isMobile ? '0.75rem' : '0.82rem' }}>{patient.totem}</Text>
        </Table.Td>
      )}
      {!isMobile && (
        <Table.Td>
          <Text size="xs" style={{ fontSize: isMobile ? '0.75rem' : '0.82rem' }} c="#495057">{patient.status}</Text>
        </Table.Td>
      )}
      {!isTablet && (
        <Table.Td>
          <Text size="xs" style={{ fontSize: isMobile ? '0.75rem' : '0.82rem' }}>{patient.fila}</Text>
        </Table.Td>
      )}
      {!isTablet && (
        <Table.Td>
          <Text size="xs" style={{ fontSize: isMobile ? '0.75rem' : '0.82rem' }}>{patient.tipoFila}</Text>
        </Table.Td>
      )}
      {!isTablet && (
        <Table.Td>
          <Text size="xs" style={{ fontSize: isMobile ? '0.75rem' : '0.82rem' }}>{patient.agenda}</Text>
        </Table.Td>
      )}
      <Table.Td>
        <Group gap={4} justify="flex-end" align="center">
          <Text c="dimmed" style={{ padding: '0 6px' }}>|</Text>
          <ActionIcon size="sm" variant="subtle" style={{ color: '#001F54' }} onClick={() => handleEditPatient(patient)}>
            <Edit2 size={18} />
          </ActionIcon>
          <Text c="dimmed" style={{ padding: '0 6px' }}>|</Text>
        </Group>
      </Table.Td>
    </Table.Tr>
  ));

  return (
    <Box bg="#f8f9fa" style={{ minHeight: '100vh' }}>
      <Header />

      <Box p={isMobile ? 'sm' : isTablet ? 'md' : 'xl'} maw={isMobile ? '100%' : 1400} mx="auto">
        {/* Breadcrumb/Back Button */}
        <Group mb={isMobile ? 20 : 30}>
          <ActionIcon variant="default" color="black" size="xl" onClick={() => navigate('/dashboard')}>
            <ChevronLeft size={28} />
          </ActionIcon>
          <Box>
            <Text fw={600} size={isMobile ? 'md' : 'lg'} style={{ color: DARK_BLUE }}>
              Pré-atendimento
            </Text>
            <Text size="sm" c="blue" style={{ color: DARK_BLUE, opacity: 0.7 }}>
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
              leftSection={<Search size={16} color="#999" />}
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
              onClick={() => setModalOpen(true)}
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
              <Box className="floating-field">
                <input
                  type="text"
                  value={novoPaciente.nomeCompleto}
                  onChange={(e) =>
                    setNovoPaciente({ ...novoPaciente, nomeCompleto: e.currentTarget.value })
                  }
                  placeholder=" "
                  disabled={isEditing}
                  style={isEditing ? { color: '#adb5bd' } : {}}
                />
                <label>Nome completo</label>
                {isEditing && <Lock size={16} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: '#adb5bd' }} />}
              </Box>

              <Group grow gap={isMobile ? "xs" : "md"} wrap="wrap">
                <Box className="floating-field">
                  <input
                    type="text"
                    value={novoPaciente.cpf}
                    onChange={(e) => setNovoPaciente({ ...novoPaciente, cpf: e.currentTarget.value })}
                    placeholder=" "
                    disabled={isEditing}
                    style={isEditing ? { color: '#adb5bd' } : {}}
                  />
                  <label>CPF</label>
                  {isEditing && <Lock size={16} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: '#adb5bd' }} />}
                </Box>
                <Box className="floating-field">
                  <input
                    type="text"
                    value={novoPaciente.dataNascimento}
                    onChange={(e) =>
                      setNovoPaciente({ ...novoPaciente, dataNascimento: e.currentTarget.value })
                    }
                    placeholder=" "
                    disabled={isEditing}
                    style={isEditing ? { color: '#adb5bd' } : {}}
                  />
                  <label>Data de nascimento</label>
                  {isEditing && <Lock size={16} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: '#adb5bd' }} />}
                </Box>
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
                <Box className="floating-field">
                  <input
                    type="text"
                    value={novoPaciente.telefone}
                    onChange={(e) =>
                      setNovoPaciente({ ...novoPaciente, telefone: e.currentTarget.value })
                    }
                    placeholder=" "
                  />
                  <label>Telefone</label>
                </Box>
              </Group>

              <Box className="floating-field">
                <input
                  type="email"
                  value={novoPaciente.email}
                  onChange={(e) => setNovoPaciente({ ...novoPaciente, email: e.currentTarget.value })}
                  placeholder=" "
                />
                <label>E-mail</label>
              </Box>

              <Box className="floating-field">
                <input
                  type="text"
                  value={novoPaciente.endereco}
                  onChange={(e) => setNovoPaciente({ ...novoPaciente, endereco: e.currentTarget.value })}
                  placeholder=" "
                />
                <label>Endereço</label>
              </Box>

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
              <Box className="floating-field">
                <input
                  type="text"
                  value={novoPaciente.convenio}
                  onChange={(e) =>
                    setNovoPaciente({ ...novoPaciente, convenio: e.currentTarget.value })
                  }
                  placeholder=" "
                />
                <label>Nome convênio</label>
              </Box>

              <Group grow gap={isMobile ? "xs" : "md"} wrap="wrap">
                <Box className="floating-field">
                  <input
                    type="text"
                    value={novoPaciente.tipoConvenio}
                    onChange={(e) =>
                      setNovoPaciente({ ...novoPaciente, tipoConvenio: e.currentTarget.value })
                    }
                    placeholder=" "
                  />
                  <label>Tipo</label>
                </Box>
                <Box className="floating-field">
                  <input
                    type="text"
                    value={novoPaciente.validadeConvenio}
                    onChange={(e) =>
                      setNovoPaciente({ ...novoPaciente, validadeConvenio: e.currentTarget.value })
                    }
                    placeholder=" "
                  />
                  <label>Validade</label>
                </Box>
              </Group>

              <Box className="floating-field">
                <input
                  type="text"
                  value={novoPaciente.numCarteira}
                  onChange={(e) =>
                    setNovoPaciente({ ...novoPaciente, numCarteira: e.currentTarget.value })
                  }
                  placeholder=" "
                />
                <label>Número (ID beneficiário)</label>
              </Box>

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
                <Box className="floating-field">
                  <input
                    type="text"
                    value={novoPaciente.nomeCompleto}
                    readOnly
                    disabled
                    placeholder=" "
                    style={{ color: '#adb5bd' }}
                  />
                  <label>Nome</label>
                  {isEditing && <Lock size={16} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: '#adb5bd' }} />}
                </Box>
                <Box className="floating-field">
                  <input
                    type="text"
                    value={novoPaciente.convenio}
                    readOnly
                    disabled
                    placeholder=" "
                    style={{ color: '#adb5bd' }}
                  />
                  <label>Convênio</label>
                  {isEditing && <Lock size={16} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: '#adb5bd' }} />}
                </Box>
              </Group>

              <Group grow gap={isMobile ? "xs" : "md"} wrap="wrap">
                <Box className="floating-field">
                  <input
                    type="text"
                    value={novoPaciente.pressaoArterial}
                    onChange={(e) =>
                      setNovoPaciente({ ...novoPaciente, pressaoArterial: e.currentTarget.value })
                    }
                    placeholder=" "
                  />
                  <label>PA (mmHg)</label>
                </Box>
                <Box className="floating-field">
                  <input
                    type="text"
                    value={novoPaciente.frequenciaCardiaca}
                    onChange={(e) =>
                      setNovoPaciente({ ...novoPaciente, frequenciaCardiaca: e.currentTarget.value })
                    }
                    placeholder=" "
                  />
                  <label>FC (bmp)</label>
                </Box>
                <Box className="floating-field">
                  <input
                    type="text"
                    value={novoPaciente.temperatura}
                    onChange={(e) =>
                      setNovoPaciente({ ...novoPaciente, temperatura: e.currentTarget.value })
                    }
                    placeholder=" "
                  />
                  <label>Temp (°C)</label>
                </Box>
              </Group>

              <Group grow gap={isMobile ? "xs" : "md"} wrap="wrap">
                <Box className="floating-field">
                  <input
                    type="text"
                    value={novoPaciente.saturacao}
                    onChange={(e) =>
                      setNovoPaciente({ ...novoPaciente, saturacao: e.currentTarget.value })
                    }
                    placeholder=" "
                  />
                  <label>SpO2 (%)</label>
                </Box>
                <Box className="floating-field">
                  <input
                    type="text"
                    value={novoPaciente.peso}
                    onChange={(e) =>
                      setNovoPaciente({ ...novoPaciente, peso: e.currentTarget.value })
                    }
                    placeholder=" "
                  />
                  <label>Peso (kg)</label>
                </Box>
                <Box className="floating-field">
                  <input
                    type="text"
                    value={novoPaciente.altura}
                    onChange={(e) =>
                      setNovoPaciente({ ...novoPaciente, altura: e.currentTarget.value })
                    }
                    placeholder=" "
                  />
                  <label>Altura (cm)</label>
                </Box>
              </Group>

              <Group grow gap={isMobile ? "xs" : "md"} wrap="wrap">
                <Box className="floating-field">
                  <input
                    type="text"
                    value={novoPaciente.glicemia}
                    onChange={(e) =>
                      setNovoPaciente({ ...novoPaciente, glicemia: e.currentTarget.value })
                    }
                    placeholder=" "
                  />
                  <label>Glicemia</label>
                </Box>
                <Box className="floating-field">
                  <input
                    type="text"
                    value={novoPaciente.imc}
                    onChange={(e) =>
                      setNovoPaciente({ ...novoPaciente, imc: e.currentTarget.value })
                    }
                    placeholder=" "
                  />
                  <label>IMC</label>
                </Box>
              </Group>

              <Box className="floating-field">
                <input
                  type="text"
                  value={novoPaciente.queixaPrincipal}
                  onChange={(e) =>
                    setNovoPaciente({ ...novoPaciente, queixaPrincipal: e.currentTarget.value })
                  }
                  placeholder=" "
                />
                <label>Queixa principal</label>
              </Box>

              <Box className="floating-field">
                <input
                  type="text"
                  value={novoPaciente.historiaDoenca}
                  onChange={(e) =>
                    setNovoPaciente({ ...novoPaciente, historiaDoenca: e.currentTarget.value })
                  }
                  placeholder=" "
                />
                <label>História da Doença</label>
              </Box>

              <Box className="floating-field">
                <input
                  type="text"
                  value={novoPaciente.alergias}
                  onChange={(e) =>
                    setNovoPaciente({ ...novoPaciente, alergias: e.currentTarget.value })
                  }
                  placeholder=" "
                />
                <label>Alergias</label>
              </Box>

              <Box className="floating-field">
                <input
                  type="text"
                  value={novoPaciente.medicamentos}
                  onChange={(e) =>
                    setNovoPaciente({ ...novoPaciente, medicamentos: e.currentTarget.value })
                  }
                  placeholder=" "
                />
                <label>Medicamentos</label>
              </Box>

              <Box className="floating-field">
                <input
                  type="text"
                  value={novoPaciente.antecedentes}
                  onChange={(e) =>
                    setNovoPaciente({ ...novoPaciente, antecedentes: e.currentTarget.value })
                  }
                  placeholder=" "
                />
                <label>Antecedentes</label>
              </Box>

              <Box className="floating-field">
                <input
                  type="text"
                  value={novoPaciente.observacoesTriagem}
                  onChange={(e) =>
                    setNovoPaciente({ ...novoPaciente, observacoesTriagem: e.currentTarget.value })
                  }
                  placeholder=" "
                />
                <label>Observação</label>
              </Box>

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
