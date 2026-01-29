import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Group, Text, TextInput, Button, Table, Modal, Stack, Popover, ActionIcon, Select, Textarea } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { Search, Plus, ChevronLeft, Calendar as CalendarIcon } from 'lucide-react';
import { showNotification } from '@mantine/notifications';
import { DARK_BLUE } from '../../themes/theme';
import { Header } from '../Header/Header';
import { DatePicker } from '@mantine/dates';

interface DeliveryRow {
  id: number;
  nomeCompleto: string;
  dataHora: string;
  responsavel: string;
  status: string;
  tipo: string;
  entreguePara?: string;
  dataHoraEntrega?: string;
}

const SAMPLE_ROWS: DeliveryRow[] = [
  {
    id: 1,
    nomeCompleto: 'Maria Silva Santos',
    dataHora: '28/12/2025 | 15:30:09',
    responsavel: 'Dr(a) Fernanda Maciel',
    status: 'Disponível',
    tipo: 'Laudo',
    entreguePara: '-',
    dataHoraEntrega: '-',
  },
  {
    id: 2,
    nomeCompleto: 'João Pedro Oliveira',
    dataHora: '30/12/2025 | 16:50:04',
    responsavel: 'Dr. Luciano Farias',
    status: 'Entregue',
    tipo: 'Exame',
    entreguePara: 'João Pedro Oliveira',
    dataHoraEntrega: '12/12/2025 14:30',
  },
];

export function Entrega() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [rows, setRows] = useState(SAMPLE_ROWS);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const isMobile = useMediaQuery('(max-width: 799px)');
  const isTablet = useMediaQuery('(max-width: 1279px)');

  const filtered = rows.filter((r) => r.nomeCompleto.toLowerCase().includes(query.toLowerCase()));

  const [form, setForm] = useState({
    paciente: '',
    tipoDocumento: '',
    dataDisponivel: null as Date | null,
    descricao: '',
  });

  const [popoverOpened, setPopoverOpened] = useState(false);
  const [dateInput, setDateInput] = useState('');

  const formatDate = (d: Date | null) => {
    if (!d) return '';
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const parseDate = (s: string) => {
    if (!s) return null;
    const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (!m) return null;
    const day = Number(m[1]);
    const month = Number(m[2]) - 1;
    const year = Number(m[3]);
    const date = new Date(year, month, day);
    if (date.getFullYear() !== year || date.getMonth() !== month || date.getDate() !== day) return null;
    return date;
  };

  const openRegistrar = (r?: DeliveryRow) => {
    if (r) {
      setEditingId(r.id);
      setForm({ paciente: r.nomeCompleto, tipoDocumento: r.tipo, dataDisponivel: null, descricao: '' });
    } else {
      setEditingId(null);
      setForm({ paciente: '', tipoDocumento: '', dataDisponivel: null, descricao: '' });
    }
    setModalOpen(true);
  };

  const handleRegister = () => {
    if (!form.paciente.trim()) {
      showNotification({ title: 'Erro', message: 'Paciente é obrigatório', color: 'red' });
      return;
    }

    if (dateInput && !form.dataDisponivel) {
      showNotification({ title: 'Erro', message: 'Data disponível inválida', color: 'red' });
      return;
    }

    if (editingId) {
      setRows((prev) => prev.map((p) => p.id === editingId ? { ...p, nomeCompleto: form.paciente, tipo: form.tipoDocumento || p.tipo } : p));
      showNotification({ title: 'Atualizado', message: 'Registro atualizado', color: 'green' });
    } else {
      const id = rows.length ? Math.max(...rows.map((r) => r.id)) + 1 : 1;
      const now = new Date();
      const dataHora = `${now.toLocaleDateString()} | ${now.toLocaleTimeString()}`;
      const newRow: DeliveryRow = {
        id,
        nomeCompleto: form.paciente,
        dataHora,
        responsavel: '-',
        status: 'Disponível',
        tipo: form.tipoDocumento || '-',
        entreguePara: '-',
        dataHoraEntrega: '-',
      };
      setRows((prev) => [newRow, ...prev]);
      showNotification({ title: 'Adicionado', message: 'Entrega registrada', color: 'green' });
    }

    setModalOpen(false);
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
                Entrega
              </Text>
              <Text size="sm" c="blue" style={{ color: DARK_BLUE, opacity: 0.7 }}>
                Controle de entregas
              </Text>
            </Box>
          </Group>
        </Group>

        {/* Search and Button Section */}
        <Box mb={isMobile ? 20 : 30}>
          <Group gap="md" align="flex-end">
            <TextInput
              placeholder={isMobile ? 'Buscar...' : 'Buscar paciente..'}
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
              onClick={() => openRegistrar()}
              size={isMobile ? 'sm' : 'md'}
              fw={600}
              px={isMobile ? 'sm' : 'xl'}
            >
              {isMobile ? <Plus size={16} /> : 'Novo entrega'}
            </Button>
          </Group>
        </Box>

        <Box style={{ overflowX: 'auto', border: '1px solid #e9ecef', borderRadius: 6 }}>
          <Table horizontalSpacing={isMobile ? 'sm' : 'md'} verticalSpacing={isMobile ? 'sm' : 'md'}>
            <Table.Thead>
              <Table.Tr style={{ borderBottom: 'none' }}>
                <Table.Th style={{ color: '#868e96', fontSize: isMobile ? '0.7rem' : '0.8rem', fontWeight: 500 }}>Nome</Table.Th>
                <Table.Th style={{ color: '#868e96', fontSize: isMobile ? '0.7rem' : '0.8rem', fontWeight: 500 }}>Data/Hora</Table.Th>
                {!isTablet && <Table.Th style={{ color: '#868e96', fontSize: '0.8rem', fontWeight: 500 }}>Responsável</Table.Th>}
                <Table.Th style={{ color: '#868e96', fontSize: isMobile ? '0.7rem' : '0.8rem', fontWeight: 500 }}>Status</Table.Th>
                {!isTablet && <Table.Th style={{ color: '#868e96', fontSize: '0.8rem', fontWeight: 500 }}>Tipo</Table.Th>}
                {!isTablet && <Table.Th style={{ color: '#868e96', fontSize: '0.8rem', fontWeight: 500 }}>Entregue para</Table.Th>}
                {!isTablet && <Table.Th style={{ color: '#868e96', fontSize: '0.8rem', fontWeight: 500 }}>Data/Hora da entrega</Table.Th>}

              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {filtered.map((r) => (
                <Table.Tr key={r.id} style={{ borderBottom: '1px solid #e9ecef' }}>
                  <Table.Td>
                    <Group gap={isMobile ? 'xs' : 'sm'}>
                      {!isMobile && (
                        <Box
                          bg={DARK_BLUE}
                          w={32}
                          h={32}
                          style={{ borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                        >
                          <Text c="white" fw={600} size="sm">{r.nomeCompleto.charAt(0).toUpperCase()}</Text>
                        </Box>
                      )}
                      <Box>
                        <Text fw={500} size="xs" style={{ fontSize: isMobile ? '0.8rem' : '0.85rem' }}>{r.nomeCompleto}</Text>
                        {isMobile && <Text size="xs" c="dimmed">Responsável: {r.responsavel}</Text>}
                      </Box>
                    </Group>
                  </Table.Td>

                  <Table.Td>
                    <Text size="xs" style={{ fontSize: isMobile ? '0.75rem' : '0.82rem' }}>{r.dataHora}</Text>
                  </Table.Td>

                  {!isTablet && (
                    <Table.Td>
                      <Text size="xs" style={{ fontSize: isMobile ? '0.75rem' : '0.82rem' }}>{r.responsavel}</Text>
                    </Table.Td>
                  )}

                  <Table.Td>
                    <Text size="xs" style={{ fontSize: isMobile ? '0.75rem' : '0.82rem' }}>{r.status}</Text>
                  </Table.Td>

                  {!isTablet && (
                    <Table.Td>
                      <Text size="xs" style={{ fontSize: isMobile ? '0.75rem' : '0.82rem' }}>{r.tipo}</Text>
                    </Table.Td>
                  )}

                  {!isTablet && (
                    <Table.Td>
                      <Text size="xs" style={{ fontSize: isMobile ? '0.75rem' : '0.82rem' }}>{r.entreguePara || '-'}</Text>
                    </Table.Td>
                  )}

                  {!isTablet && (
                    <Table.Td>
                      <Text size="xs" style={{ fontSize: isMobile ? '0.75rem' : '0.82rem' }}>{r.dataHoraEntrega || '-'}</Text>
                    </Table.Td>
                  )}
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Box>
      </Box>

      <Modal
        opened={modalOpen}
        onClose={() => setModalOpen(false)}
        title={'Registrar entrega'}
        size={isMobile ? '100%' : 520}
        centered={false}
        fullScreen={isMobile}
        styles={{
          content: { left: 48, bottom: 96, top: 'auto', transform: 'none', width: isMobile ? '100%' : 520 },
          body: { overflowY: 'auto' },
        }}
      >
        <Stack gap={10}>
          <Box style={{ padding: 8 }}>

            <Box className="floating-field" style={{ marginBottom: 8 }}>
              <input type="text" value={form.paciente} onChange={(e) => setForm({ ...form, paciente: e.currentTarget.value })} placeholder=" " />
              <label>Paciente</label>
            </Box>

            <Box style={{ marginBottom: 8 }}>
              <Select
                data={[{ value: 'laudo', label: 'Laudo' }, { value: 'exame', label: 'Exame' }, { value: 'relatorio', label: 'Relatório' }, { value: 'outro', label: 'Outro' }]}
                placeholder="Tipo de documento"
                value={form.tipoDocumento}
                onChange={(val) => setForm({ ...form, tipoDocumento: val || '' })}
              />
            </Box>

            <Box style={{ marginBottom: 8 }}>
              <Text size="sm" mb={6}>Data disponível</Text>
              <Popover opened={popoverOpened} onClose={() => setPopoverOpened(false)} position="bottom" withArrow>
                <Popover.Target>
                  <TextInput
                    placeholder="dd/mm/yyyy"
                    value={dateInput}
                    onChange={(e) => {
                      const v = e.currentTarget.value;
                      setDateInput(v);
                      const parsed = parseDate(v);
                      setForm({ ...form, dataDisponivel: parsed });
                    }}
                    rightSection={
                      <ActionIcon size="sm" variant="subtle" onClick={() => setPopoverOpened((s) => !s)} title="Abrir calendário">
                        <CalendarIcon size={16} />
                      </ActionIcon>
                    }
                  />
                </Popover.Target>
                <Popover.Dropdown style={{ padding: 8 }}>
                  <DatePicker value={form.dataDisponivel} onChange={(d) => { setForm({ ...form, dataDisponivel: d }); setDateInput(formatDate(d)); setPopoverOpened(false); }} />
                </Popover.Dropdown>
              </Popover>
            </Box>

            <Box style={{ marginBottom: 8 }}>
              <Textarea placeholder="Descrição/Conteúdo" value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.currentTarget.value })} minRows={3} />
            </Box>

            <Group justify="flex-end" mt={8}>
              <Button variant="default" onClick={() => setModalOpen(false)} size="sm">Cancelar</Button>
              <Button bg={DARK_BLUE} onClick={handleRegister} size="sm">Registrar</Button>
            </Group>
          </Box>
        </Stack>
      </Modal>
    </Box>
  );
}
