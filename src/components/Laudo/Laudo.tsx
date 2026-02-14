import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Group, Text, TextInput, Button, Table, Modal, Stack, ActionIcon } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { Search, Plus, ChevronLeft, Lock, Eye, EyeOff } from 'lucide-react';
import { showNotification } from '@mantine/notifications';
import { DARK_BLUE } from '../../themes/theme';
import { Header } from '../Header/Header';
import reportService from '../../services/reportService';

interface PatientRow {
  id: string;
  nomeCompleto: string;
  cpf?: string;
  dataNascimento?: string;
  status: string;
  agendadoPara: string;
  medicoResponsavel: string;
  exame: string;
  observacao: string;
}

export function Laudo() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [rows, setRows] = useState<PatientRow[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const isMobile = useMediaQuery('(max-width: 799px)');
  const isTablet = useMediaQuery('(max-width: 1279px)');

  const filtered = rows.filter((r) => r.nomeCompleto.toLowerCase().includes(query.toLowerCase()));

  const mapApiToRow = (it: any): PatientRow => ({
    id: String(it.id),
    nomeCompleto: it.patientName || '',
    cpf: it.cpf || '',
    dataNascimento: it.birthDate || '',
    status: it.status || '',
    agendadoPara: it.scheduledFor || '-',
    medicoResponsavel: it.responsibleDoctor || '-',
    exame: it.exam || '-',
    observacao: it.observation || '-',
  });

  useEffect(() => {
    const load = async () => {
      try {
        const data: any = await reportService.list();
        const list: any[] = Array.isArray(data)
          ? data
          : (Array.isArray(data?.items)
            ? data.items
            : (Array.isArray(data?.data)
              ? data.data
              : []));
        setRows(list.map(mapApiToRow));
      } catch (err: any) {
        showNotification({
          title: 'Erro',
          message: err?.response?.data?.message || err?.message || 'Erro ao carregar laudos',
          color: 'red',
        });
      }
    };

    load();
  }, []);



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
      setEditingId(r.id);
      setLaudoData({
        nome: r.nomeCompleto,
        cpf: r.cpf || '',
        dataNascimento: r.dataNascimento || '',
        medicoSolicitante: '',
        medicoLaudante: '',
        medicoRevisor: '',
        descricao: '',
        conclusao: '',
        observacoes: '',
        status: r.status || '',
        exame: r.exame || '',
      });
      setIsNewPatient(false);
    } else {
      setEditingId(null);
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
              {filtered.map((r) => {
                const canView = (r.status || '').toLowerCase() === 'laudado';
                return (
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
                        <ActionIcon
                          size="sm"
                          variant="subtle"
                          disabled={!canView}
                          onClick={canView ? () => openNovoLaudo(r as PatientRow) : undefined}
                          style={{ color: canView ? '#001F54' : '#adb5bd', cursor: canView ? 'pointer' : 'not-allowed' }}
                          title={canView ? 'Ver laudo' : 'Laudo não disponível'}
                          aria-label={canView ? 'Ver laudo' : 'Laudo não disponível'}
                        >
                          {canView ? <Eye size={18} /> : <EyeOff size={18} />}
                        </ActionIcon>
                        <Text c="dimmed" style={{ padding: '0 6px' }}>|</Text>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                );
              })}
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
              <Button
                bg={DARK_BLUE}
                onClick={async () => {
                  if (!laudoData.nome.trim()) {
                    showNotification({ title: 'Erro', message: 'Nome e obrigatorio', color: 'red' });
                    return;
                  }

                  const payload = {
                    patientName: laudoData.nome,
                    cpf: laudoData.cpf || undefined,
                    birthDate: laudoData.dataNascimento || undefined,
                    requestingDoctor: laudoData.medicoSolicitante || undefined,
                    reportingDoctor: laudoData.medicoLaudante || undefined,
                    reviewingDoctor: laudoData.medicoRevisor || undefined,
                    description: laudoData.descricao || undefined,
                    conclusion: laudoData.conclusao || undefined,
                    notes: laudoData.observacoes || undefined,
                    status: laudoData.status || undefined,
                    exam: laudoData.exame || undefined,
                  };

                  try {
                    if (editingId) {
                      const current = rows.find((r) => r.id === editingId);
                      const updated = await reportService.update(editingId, {
                        ...payload,
                        scheduledFor: current?.agendadoPara || undefined,
                        responsibleDoctor: current?.medicoResponsavel || undefined,
                        observation: current?.observacao || undefined,
                      });
                      setRows((prev) => prev.map((r) => (r.id === editingId ? mapApiToRow(updated) : r)));
                    } else {
                      const created = await reportService.create(payload);
                      setRows((prev) => [mapApiToRow(created), ...prev]);
                    }

                    setModalOpen(false);
                    setEditingId(null);
                  } catch (err: any) {
                    showNotification({
                      title: 'Erro',
                      message: err?.response?.data?.message || err?.message || 'Erro ao salvar laudo',
                      color: 'red',
                    });
                  }
                }}
                size="sm"
              >
                Salvar
              </Button>
            </Group>
          </Box>
        </Stack>
      </Modal>
    </Box>
  );
}
