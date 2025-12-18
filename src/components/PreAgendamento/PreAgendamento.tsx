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
} from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { Search, Plus, Eye, Trash2, Edit2, ChevronLeft } from 'lucide-react';
import { DARK_BLUE } from '../../themes/theme';
import { Header } from '../Header/Header';

interface Patient {
  id: number;
  nome: string;
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
  numCarteira: string;
  observacoes: string;
}

const INITIAL_PATIENTS: Patient[] = [
  {
    id: 1,
    nome: 'Maria Silva Santos',
    totem: 23,
    status: 'Em atendimento',
    fila: 'Recepção 01',
    tipoFila: 'Exames',
    agenda: 'Mamografia',
  },
  {
    id: 2,
    nome: 'João Pedro Oliveira',
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
  numCarteira: '',
  observacoes: '',
};

export function PreAgendamento() {
  const navigate = useNavigate();
  const [patients, setPatients] = useState<Patient[]>(INITIAL_PATIENTS);
  const [searchValue, setSearchValue] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [novoPaciente, setNovoPaciente] = useState<NovoPatiente>(INITIAL_NOVO_PACIENTE);
  const isMobile = useMediaQuery('(max-width: 799px)');
  const isTablet = useMediaQuery('(max-width: 1279px)');

  const filteredPatients = patients.filter(
    (patient) =>
      patient.nome.toLowerCase().includes(searchValue.toLowerCase()) ||
      patient.totem.toString().includes(searchValue)
  );

  const handleAddPatient = () => {
    if (!novoPaciente.nomeCompleto || !novoPaciente.cpf) {
      alert('Por favor, preencha os campos obrigatórios');
      return;
    }

    const newPatient: Patient = {
      id: Math.max(...patients.map((p) => p.id), 0) + 1,
      nome: novoPaciente.nomeCompleto,
      totem: Math.floor(Math.random() * 100) + 1,
      status: 'Em atendimento',
      fila: 'Recepção 01',
      tipoFila: 'Exames',
      agenda: 'Mamografia',
    };

    setPatients([...patients, newPatient]);
    setNovoPaciente(INITIAL_NOVO_PACIENTE);
    setModalOpen(false);
  };

  const handleDeletePatient = (id: number) => {
    setPatients(patients.filter((p) => p.id !== id));
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
                {patient.nome.charAt(0).toUpperCase()}
              </Text>
            </Box>
          )}
          <Box>
            <Text fw={500} size="sm">
              {patient.nome}
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
          <Text size="sm">{patient.totem}</Text>
        </Table.Td>
      )}
      {!isMobile && (
        <Table.Td>
          <Text size="sm" c="#495057">{patient.status}</Text>
        </Table.Td>
      )}
      {!isTablet && (
        <Table.Td>
          <Text size="sm">{patient.fila}</Text>
        </Table.Td>
      )}
      {!isTablet && (
        <Table.Td>
          <Text size="sm">{patient.tipoFila}</Text>
        </Table.Td>
      )}
      {!isTablet && (
        <Table.Td>
          <Text size="sm">{patient.agenda}</Text>
        </Table.Td>
      )}
      <Table.Td>
        <Group gap={4} justify={isMobile ? "flex-end" : "flex-start"}>
          <ActionIcon size="sm" variant="subtle" color="blue">
            <Eye size={16} />
          </ActionIcon>
          <ActionIcon size="sm" variant="subtle" color="blue">
            <Edit2 size={16} />
          </ActionIcon>
          <ActionIcon
            size="sm"
            variant="subtle"
            color="red"
            onClick={() => handleDeletePatient(patient.id)}
          >
            <Trash2 size={16} />
          </ActionIcon>
        </Group>
      </Table.Td>
    </Table.Tr>
  ));

  return (
    <Box bg="#f8f9fa" style={{ minHeight: '100vh' }}>
      <Header />

      <Box p={isMobile ? 'md' : 'xl'} maw={1400} mx="auto">
        {/* Breadcrumb/Back Button */}
        <Group mb={30} onClick={() => navigate('/dashboard')} style={{ cursor: 'pointer' }}>
          <ActionIcon variant="transparent" color="blue" size="lg">
            <ChevronLeft size={24} />
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
        <Box mb={30}>
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
        <Box bg="#f8f9fa" style={{ overflowX: 'auto' }}>
          <Table horizontalSpacing={isMobile ? "sm" : "md"} verticalSpacing={isMobile ? "sm" : "md"}>
            <Table.Thead>
              <Table.Tr style={{ borderBottom: '2px solid #e9ecef' }}>
                <Table.Th style={{ color: '#868e96', fontSize: '0.875rem', fontWeight: 500 }}>Nome</Table.Th>
                {!isMobile && <Table.Th style={{ color: '#868e96', fontSize: '0.875rem', fontWeight: 500 }}>Totem</Table.Th>}
                {!isMobile && <Table.Th style={{ color: '#868e96', fontSize: '0.875rem', fontWeight: 500 }}>Status</Table.Th>}
                {!isTablet && <Table.Th style={{ color: '#868e96', fontSize: '0.875rem', fontWeight: 500 }}>Fila</Table.Th>}
                {!isTablet && <Table.Th style={{ color: '#868e96', fontSize: '0.875rem', fontWeight: 500 }}>Tipo Fila</Table.Th>}
                {!isTablet && <Table.Th style={{ color: '#868e96', fontSize: '0.875rem', fontWeight: 500 }}>Agenda</Table.Th>}
                <Table.Th style={{ color: '#868e96', fontSize: '0.875rem', fontWeight: 500, textAlign: 'right' }}>Ações</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>{rows.length > 0 ? rows : <Table.Tr><Table.Td colSpan={7}><Text ta="center" c="dimmed">Nenhum paciente encontrado</Text></Table.Td></Table.Tr>}</Table.Tbody>
          </Table>
        </Box>
      </Box>

      {/* Modal - Novo Paciente */}
      <Modal
        opened={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Novo Paciente"
        size="lg"
        centered
      >
        <Stack gap="md">
          <Box className="floating-field">
            <input
              type="text"
              value={novoPaciente.nomeCompleto}
              onChange={(e) =>
                setNovoPaciente({ ...novoPaciente, nomeCompleto: e.currentTarget.value })
              }
              placeholder=" "
            />
            <label>Nome completo</label>
          </Box>

          <Group grow>
            <Box className="floating-field">
              <input
                type="text"
                value={novoPaciente.cpf}
                onChange={(e) => setNovoPaciente({ ...novoPaciente, cpf: e.currentTarget.value })}
                placeholder=" "
              />
              <label>CPF</label>
            </Box>
            <Box className="floating-field">
              <input
                type="text"
                value={novoPaciente.dataNascimento}
                onChange={(e) =>
                  setNovoPaciente({ ...novoPaciente, dataNascimento: e.currentTarget.value })
                }
                placeholder=" "
              />
              <label>Data de nascimento</label>
            </Box>
          </Group>

          <Group grow>
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

          <Group grow>
            <Box className="floating-field">
              <input
                type="text"
                value={novoPaciente.convenio}
                onChange={(e) =>
                  setNovoPaciente({ ...novoPaciente, convenio: e.currentTarget.value })
                }
                placeholder=" "
              />
              <label>Convênio</label>
            </Box>
            <Box className="floating-field">
              <input
                type="text"
                value={novoPaciente.numCarteira}
                onChange={(e) =>
                  setNovoPaciente({ ...novoPaciente, numCarteira: e.currentTarget.value })
                }
                placeholder=" "
              />
              <label>Nº da carteirinha</label>
            </Box>
          </Group>

          <Textarea
            label="Observações"
            placeholder="Observações"
            rows={3}
            value={novoPaciente.observacoes}
            onChange={(e) =>
              setNovoPaciente({ ...novoPaciente, observacoes: e.currentTarget.value })
            }
          />

          <Group justify="flex-end" gap="md">
            <Button variant="default" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button bg={DARK_BLUE} onClick={handleAddPatient}>
              Cadastrar
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Box>
  );
}
