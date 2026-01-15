import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Group, Text, TextInput, Button, Table, Modal, Stack, ActionIcon } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { Search, Plus, ChevronLeft, Lock, Eye } from 'lucide-react';
import { DARK_BLUE } from '../../themes/theme';
import { Header } from '../Header/Header';

interface PatientRow {
  id: number;
  nomeCompleto: string;
  status: string;
  agendadoPara: string;
  medicoResponsavel: string;
  exame: string;
  observacao: string;
}

const SAMPLE_ROWS: PatientRow[] = [
  {
    id: 1,
    nomeCompleto: 'Maria Silva Santos',
    status: 'Em análise',
    agendadoPara: '-',
    medicoResponsavel: '-',
    exame: 'Raio-X Tórax',
    observacao: '-',
  },
  {
    id: 2,
    nomeCompleto: 'João Pedro Oliveira',
    status: 'Laudado',
    agendadoPara: '12/12/2025 | 12:00:00',
    medicoResponsavel: 'Ana Clara',
    exame: 'Ecocardiograma',
    observacao: 'Dentro da normalidade',
  },
];

const PATIENT_INFO: Record<number, { cpf?: string; dataNascimento?: string; medicoResponsavel?: string; exame?: string; observacao?: string }> = {
  1: { cpf: '987.654.321-00', dataNascimento: '01/01/1990', medicoResponsavel: '', exame: 'Raio-X Tórax', observacao: '-' },
  2: { cpf: '123.087.234-09', dataNascimento: '18/12/2000', medicoResponsavel: 'Ana Clara', exame: 'Ecocardiograma', observacao: 'Dentro da normalidade' },
};

export function Laudo() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [rows] = useState(SAMPLE_ROWS);
  const [modalOpen, setModalOpen] = useState(false);
  const isMobile = useMediaQuery('(max-width: 799px)');
  const isTablet = useMediaQuery('(max-width: 1279px)');

  const filtered = rows.filter((r) => r.nomeCompleto.toLowerCase().includes(query.toLowerCase()));



  const [laudoData, setLaudoData] = useState({
    nome: '',
    cpf: '',
    dataNascimento: '',
    medicoSolicitante: '',
    medicoLaudante: '',
    medicoRevisor: '',
    descricao: '',
    conclusao: '',
    observacoes: '',
    status: '',
    exame: '',
  });

  // When creating a new laudo, basic patient fields should be editable
  const [isNewPatient, setIsNewPatient] = useState(false);







  const openNovoLaudo = (r?: PatientRow) => {
    if (r) {
      const info = PATIENT_INFO[r.id] || {};
      setLaudoData({
        nome: r.nomeCompleto,
        cpf: info.cpf || '',
        dataNascimento: info.dataNascimento || '',
        medicoSolicitante: '',
        medicoLaudante: '',
        medicoRevisor: '',
        descricao: '',
        conclusao: '',
        observacoes: '',
        status: '',
        exame: info.exame || '',
      });
      setIsNewPatient(false);
    } else {
      setLaudoData({
        nome: '',
        cpf: '',
        dataNascimento: '',
        medicoSolicitante: '',
        medicoLaudante: '',
        medicoRevisor: '',
        descricao: '',
        conclusao: '',
        observacoes: '',
        status: '',
        exame: '',
      });
      setIsNewPatient(true);
    }
    setModalOpen(true);
  };  

  return (
    <Box bg="#f8f9fa" style={{ minHeight: '100vh' }}>
      <Header />

      <Box p={isMobile ? 'sm' : isTablet ? 'md' : 'xl'} maw={isMobile ? '100%' : 1400} mx="auto">
        <Group mb={isMobile ? 20 : 30} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Group align="center">
            <ActionIcon variant="default" color="black" size="xl" onClick={() => navigate('/dashboard')}>
              <ChevronLeft size={28} />
            </ActionIcon>
            <Box>
              <Text fw={600} size={isMobile ? 'md' : 'lg'} style={{ color: DARK_BLUE }}>
                Laudo
              </Text>
              <Text size="sm" c="blue" style={{ color: DARK_BLUE, opacity: 0.7 }}>
                Emissão de laudos
              </Text>
            </Box>
          </Group>
        </Group>

        {/* Search and Button Section */}
        <Box mb={isMobile ? 20 : 30}>
          <Group gap="md" align="flex-end">
            <TextInput
              placeholder={isMobile ? 'Buscar...' : 'Buscar paciente por nome ou CPF..'}
              leftSection={<Search size={16} color="#999" />}
              value={query}
              onChange={(e) => setQuery(e.currentTarget.value)}
              radius="md"
              size={isMobile ? 'sm' : 'md'}
              style={{ flex: 1 }}
            />
            <Button
              bg={DARK_BLUE}
              c="white"
              leftSection={isMobile ? undefined : <Plus size={18} />}
              onClick={() => openNovoLaudo()}
              size={isMobile ? 'sm' : 'md'}
              fw={600}
              px={isMobile ? 'sm' : 'xl'}
            >
              {isMobile ? <Plus size={16} /> : 'Novo laudo'}
            </Button>
          </Group>
        </Box>

        <Box style={{ overflowX: 'auto', border: '1px solid #e9ecef', borderRadius: 6 }}>
          <Table horizontalSpacing={isMobile ? 'sm' : 'md'} verticalSpacing={isMobile ? 'sm' : 'md'}>
            <Table.Thead>
              <Table.Tr style={{ borderBottom: 'none' }}>
                <Table.Th style={{ color: '#868e96', fontSize: isMobile ? '0.7rem' : '0.8rem', fontWeight: 500 }}>Nome</Table.Th>
                <Table.Th style={{ color: '#868e96', fontSize: isMobile ? '0.7rem' : '0.8rem', fontWeight: 500 }}>Status</Table.Th>
                <Table.Th style={{ color: '#868e96', fontSize: isMobile ? '0.7rem' : '0.8rem', fontWeight: 500 }}>Agendado para</Table.Th>
                {!isTablet && <Table.Th style={{ color: '#868e96', fontSize: '0.8rem', fontWeight: 500 }}>Médico responsável</Table.Th>}
                {!isTablet && <Table.Th style={{ color: '#868e96', fontSize: '0.8rem', fontWeight: 500 }}>Exame</Table.Th>}
                {!isTablet && <Table.Th style={{ color: '#868e96', fontSize: '0.8rem', fontWeight: 500 }}>Observação</Table.Th>}
                <Table.Th style={{ color: '#868e96', fontSize: isMobile ? '0.7rem' : '0.8rem', fontWeight: 500, textAlign: 'center', verticalAlign: 'middle' }}>Ações</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {filtered.map((r) => (
                <Table.Tr key={r.id} style={{ borderBottom: '1px solid #e9ecef' }}>
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
                            {r.nomeCompleto.charAt(0).toUpperCase()}
                          </Text>
                        </Box>
                      )}
                      <Box>
                        <Text fw={500} size="xs" style={{ fontSize: isMobile ? '0.8rem' : '0.85rem' }}>{r.nomeCompleto}</Text>
                        {isMobile && (
                          <Text size="xs" c="dimmed">Exame: {r.exame}</Text>
                        )}
                      </Box>
                    </Group>
                  </Table.Td>

                  <Table.Td>
                    <Text size="xs" style={{ fontSize: isMobile ? '0.75rem' : '0.82rem' }}>{r.status}</Text>
                  </Table.Td>

                  <Table.Td>
                    <Text size="xs" style={{ fontSize: isMobile ? '0.75rem' : '0.82rem' }}>{r.agendadoPara}</Text>
                  </Table.Td>

                  {!isTablet && (
                    <Table.Td>
                      <Text size="xs" style={{ fontSize: isMobile ? '0.75rem' : '0.82rem' }}>{r.medicoResponsavel}</Text>
                    </Table.Td>
                  )}

                  {!isTablet && (
                    <Table.Td>
                      <Text size="xs" style={{ fontSize: isMobile ? '0.75rem' : '0.82rem' }}>{r.exame}</Text>
                    </Table.Td>
                  )}

                  {!isTablet && (
                    <Table.Td>
                      <Text size="xs" style={{ fontSize: isMobile ? '0.75rem' : '0.82rem' }}>{r.observacao}</Text>
                    </Table.Td>
                  )}

                  <Table.Td>
                    <Group gap={4} justify="center" align="center">
                      <Text c="dimmed" style={{ padding: '0 6px' }}>|</Text>
                      <ActionIcon size="sm" variant="subtle" style={{ color: '#001F54' }} onClick={() => openNovoLaudo(r as PatientRow)}>
                        <Eye size={18} />
                      </ActionIcon>
                      <Text c="dimmed" style={{ padding: '0 6px' }}>|</Text>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Box>
      </Box>

      <Modal
        opened={modalOpen}
        onClose={() => setModalOpen(false)}
        title={'Novo Laudo'}
        size={isMobile ? '100%' : 420}
        centered={false}
        fullScreen={isMobile}
        styles={{
          content: { left: 48, bottom: 96, top: 'auto', transform: 'none', width: isMobile ? '100%' : 420 },
          body: { overflowY: 'auto' },
        }}
      >
        <Stack gap={10}>
          <Box style={{ padding: 6 }}>
            <Box className="floating-field" style={{ marginBottom: 8 }}>
              <input
                type="text"
                value={laudoData.nome}
                onChange={(e) => setLaudoData({ ...laudoData, nome: e.currentTarget.value })}
                placeholder=" "
                readOnly={!isNewPatient}
                disabled={!isNewPatient}
                style={{ color: !isNewPatient ? '#adb5bd' : undefined }}
              />
              <label>Nome completo</label>
              {!isNewPatient && (
                <Lock size={16} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: '#adb5bd' }} />
              )}
            </Box>

            <Group grow gap="xs" style={{ marginBottom: 8 }}>
              <Box style={{ flex: 1 }} className="floating-field">
                <input
                  type="text"
                  value={laudoData.cpf}
                  onChange={(e) => setLaudoData({ ...laudoData, cpf: e.currentTarget.value })}
                  placeholder=" "
                  readOnly={!isNewPatient}
                  disabled={!isNewPatient}
                  style={{ color: !isNewPatient ? '#adb5bd' : undefined }}
                />
                <label>CPF</label>
                {!isNewPatient && (
                  <Lock size={14} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: '#adb5bd' }} />
                )}
              </Box>

              <Box style={{ flex: 1 }} className="floating-field">
                <input
                  type="text"
                  value={laudoData.dataNascimento}
                  onChange={(e) => setLaudoData({ ...laudoData, dataNascimento: e.currentTarget.value })}
                  placeholder=" "
                  readOnly={!isNewPatient}
                  disabled={!isNewPatient}
                  style={{ color: !isNewPatient ? '#adb5bd' : undefined }}
                />
                <label>Data de nascimento</label>
                {!isNewPatient && (
                  <Lock size={14} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: '#adb5bd' }} />
                )}
              </Box>
            </Group>

            <Group grow gap="xs" style={{ marginBottom: 8 }}>
              <Box style={{ flex: 1 }} className="floating-field">
                <input type="text" value={laudoData.medicoSolicitante} onChange={(e) => setLaudoData({ ...laudoData, medicoSolicitante: e.currentTarget.value })} placeholder=" " />
                <label>Médico Sol.</label>
              </Box>

              <Box style={{ flex: 1 }} className="floating-field">
                <input type="text" value={laudoData.medicoLaudante} onChange={(e) => setLaudoData({ ...laudoData, medicoLaudante: e.currentTarget.value })} placeholder=" " />
                <label>Médico Laud.</label>
              </Box>
            </Group>

            <Box className="floating-field" style={{ marginBottom: 8 }}>
              <input type="text" value={laudoData.medicoRevisor} onChange={(e) => setLaudoData({ ...laudoData, medicoRevisor: e.currentTarget.value })} placeholder=" " />
              <label>Médico Rev.</label>
            </Box>

            <Box className="floating-field" style={{ marginBottom: 8 }}>
              <input type="text" value={laudoData.descricao} onChange={(e) => setLaudoData({ ...laudoData, descricao: e.currentTarget.value })} placeholder=" " />
              <label>Descrição</label>
            </Box>

            <Box className="floating-field" style={{ marginBottom: 8 }}>
              <input type="text" value={laudoData.conclusao} onChange={(e) => setLaudoData({ ...laudoData, conclusao: e.currentTarget.value })} placeholder=" " />
              <label>Conclusão</label>
            </Box>

            <Box className="floating-field" style={{ marginBottom: 8 }}>
              <input type="text" value={laudoData.observacoes} onChange={(e) => setLaudoData({ ...laudoData, observacoes: e.currentTarget.value })} placeholder=" " />
              <label>Observações</label>
            </Box>

            <Group justify="flex-end" mt={70}>
              <Button variant="default" onClick={() => setModalOpen(false)} size="sm">Cancelar</Button>
              <Button bg={DARK_BLUE} onClick={() => { /* TODO: salvar laudo */ setModalOpen(false); }} size="sm">Salvar</Button>
            </Group>
          </Box>
        </Stack>
      </Modal>
    </Box>
  );
}
