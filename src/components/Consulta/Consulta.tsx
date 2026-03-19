import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Group, Text, TextInput, Button, Table, ActionIcon, Badge } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { Search, ChevronLeft, PhoneCall, Play, CheckCircle2 } from 'lucide-react';
import { showNotification } from '@mantine/notifications';
import { DARK_BLUE } from '../../themes/theme';
import { Header } from '../Header/Header';
import consultationService from '../../services/consultationService';

interface ConsultationRow {
  id: string;
  nomeCompleto: string;
  convenio?: string;
  statusConvenio: string;
  agendadoPara: string;
  agenda: string;
  statusFluxo: string;
}

const CLINICAL_QUEUE_TYPE = 'Fila clínica';
const WAITING_STATUS = 'Aguardando atendimento';
const CALLED_STATUS = 'Chamado para atendimento';
const IN_PROGRESS_STATUS = 'Em atendimento';
const DONE_STATUS = 'Atendimento concluído';

const ACTIVE_STATUSES = [WAITING_STATUS, CALLED_STATUS, IN_PROGRESS_STATUS];

const statusBadge = (status: string) => {
  if (status === WAITING_STATUS) return { color: 'yellow', label: 'Aguardando' };
  if (status === CALLED_STATUS) return { color: 'blue', label: 'Chamado' };
  if (status === IN_PROGRESS_STATUS) return { color: 'green', label: 'Em atendimento' };
  return { color: 'gray', label: status || '-' };
};

export function Consulta() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [rows, setRows] = useState<ConsultationRow[]>([]);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [loggedDoctorName, setLoggedDoctorName] = useState('');
  const isMobile = useMediaQuery('(max-width: 799px)');
  const isTablet = useMediaQuery('(max-width: 1279px)');

  const mapApiToRow = (it: any): ConsultationRow => ({
    id: String(it.id),
    nomeCompleto: it.patientName || '',
    convenio: it.convenio || '',
    statusConvenio: it.convenioStatus || '',
    agendadoPara: it.scheduledFor || '-',
    agenda: it.agenda || '-',
    statusFluxo: it.queue || WAITING_STATUS,
  });

  const loadClinicalQueue = async () => {
    try {
      const data: any = await consultationService.list({ queueType: CLINICAL_QUEUE_TYPE, limit: 200 });
      const list: any[] = Array.isArray(data)
        ? data
        : (Array.isArray(data?.items)
          ? data.items
          : (Array.isArray(data?.data)
            ? data.data
            : []));

      setRows(list.map(mapApiToRow).filter((item) => ACTIVE_STATUSES.includes(item.statusFluxo)));
    } catch (err: any) {
      showNotification({
        title: 'Erro',
        message: err?.response?.data?.message || err?.message || 'Erro ao carregar fila clínica',
        color: 'red',
      });
    }
  };

  useEffect(() => {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      setLoggedDoctorName(String(user?.doctor?.name || '').trim());
    } catch {
      setLoggedDoctorName('');
    }

    loadClinicalQueue();
  }, []);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return rows;
    return rows.filter((r) =>
      [r.nomeCompleto, r.convenio, r.agenda, r.agendadoPara, r.statusFluxo]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalized)),
    );
  }, [rows, query]);

  const updateClinicalStatus = async (row: ConsultationRow, nextStatus: string) => {
    try {
      setLoadingId(row.id);
      await consultationService.update(row.id, { queue: nextStatus, queueType: CLINICAL_QUEUE_TYPE });
      await loadClinicalQueue();
      showNotification({
        title: 'Fila clínica atualizada',
        message: `${row.nomeCompleto} agora está em "${nextStatus}".`,
        color: 'green',
      });
    } catch (err: any) {
      showNotification({
        title: 'Erro',
        message: err?.response?.data?.message || err?.message || 'Erro ao atualizar status do atendimento',
        color: 'red',
      });
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <Box bg="var(--mantine-color-body)" style={{ minHeight: '100vh' }}>
      <Header />

      <Box p={isMobile ? 'sm' : isTablet ? 'md' : 'xl'} maw={isMobile ? '100%' : 1400} mx="auto">
        <Group mb={isMobile ? 20 : 30} justify="space-between" align="center">
          <Group align="center">
            <ActionIcon variant="default" color="black" size="xl" onClick={() => navigate('/dashboard')}>
              <ChevronLeft size={28} />
            </ActionIcon>
            <Box>
              <Text fw={600} size={isMobile ? 'md' : 'lg'} c="var(--mantine-color-text)">
                Consulta
              </Text>
              <Text size="sm" c="dimmed">
                {loggedDoctorName ? `Fila clínica do(a) Dr(a). ${loggedDoctorName}` : 'Fila clínica e chamada do atendimento'}
              </Text>
            </Box>
          </Group>
          {loggedDoctorName && (
            <Badge variant="light" color="blue" radius="sm">
              Fila médica ativa
            </Badge>
          )}
        </Group>

        <Box mb={isMobile ? 20 : 30}>
          <Group gap="md" align="flex-end">
            <TextInput
              placeholder={isMobile ? 'Buscar...' : 'Buscar paciente, convênio ou agenda...'}
              leftSection={<Search size={16} color="var(--mantine-color-dimmed)" />}
              value={query}
              onChange={(e) => setQuery(e.currentTarget.value)}
              radius="md"
              size={isMobile ? 'sm' : 'md'}
              style={{ flex: 1 }}
            />
          </Group>
        </Box>

        <Box style={{ overflowX: 'auto', border: '1px solid #e9ecef', borderRadius: 6 }}>
          <Table horizontalSpacing={isMobile ? 'sm' : 'md'} verticalSpacing={isMobile ? 'sm' : 'md'}>
            <Table.Thead>
              <Table.Tr style={{ borderBottom: 'none' }}>
                <Table.Th style={{ color: '#868e96', fontSize: isMobile ? '0.7rem' : '0.8rem', fontWeight: 500 }}>Paciente</Table.Th>
                <Table.Th style={{ color: '#868e96', fontSize: isMobile ? '0.7rem' : '0.8rem', fontWeight: 500 }}>Agendamento</Table.Th>
                {!isTablet && <Table.Th style={{ color: '#868e96', fontSize: '0.8rem', fontWeight: 500 }}>Convênio</Table.Th>}
                <Table.Th style={{ color: '#868e96', fontSize: isMobile ? '0.7rem' : '0.8rem', fontWeight: 500 }}>Status</Table.Th>
                <Table.Th style={{ color: '#868e96', fontSize: isMobile ? '0.7rem' : '0.8rem', fontWeight: 500, textAlign: 'right' }}>Ações</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {filtered.map((row) => {
                const badge = statusBadge(row.statusFluxo);
                return (
                  <Table.Tr key={row.id} style={{ borderBottom: '1px solid #e9ecef' }}>
                    <Table.Td>
                      <Group gap={isMobile ? 'xs' : 'sm'}>
                        {!isMobile && (
                          <Box
                            bg={DARK_BLUE}
                            w={32}
                            h={32}
                            style={{ borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                          >
                            <Text c="white" fw={600} size="sm">
                              {row.nomeCompleto.charAt(0).toUpperCase()}
                            </Text>
                          </Box>
                        )}
                        <Box>
                          <Text fw={500} size="xs" style={{ fontSize: isMobile ? '0.8rem' : '0.85rem' }}>
                            {row.nomeCompleto}
                          </Text>
                          {!isTablet && (
                            <Text size="xs" c="dimmed">
                              {row.agendadoPara || row.agenda || '-'}
                            </Text>
                          )}
                        </Box>
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      <Text size="xs" style={{ fontSize: isMobile ? '0.75rem' : '0.82rem' }}>
                        {row.agenda || row.agendadoPara || '-'}
                      </Text>
                    </Table.Td>
                    {!isTablet && (
                      <Table.Td>
                        <Text size="xs" style={{ fontSize: '0.82rem' }}>
                          {row.convenio || 'Particular'}
                        </Text>
                      </Table.Td>
                    )}
                    <Table.Td>
                      <Badge color={badge.color} variant="light">
                        {badge.label}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Group gap={8} justify="flex-end">
                        {row.statusFluxo === WAITING_STATUS && (
                          <Button
                            size="xs"
                            variant="light"
                            color="blue"
                            leftSection={<PhoneCall size={14} />}
                            onClick={() => updateClinicalStatus(row, CALLED_STATUS)}
                            loading={loadingId === row.id}
                          >
                            Chamar
                          </Button>
                        )}
                        {row.statusFluxo === CALLED_STATUS && (
                          <Button
                            size="xs"
                            variant="light"
                            color="green"
                            leftSection={<Play size={14} />}
                            onClick={() => updateClinicalStatus(row, IN_PROGRESS_STATUS)}
                            loading={loadingId === row.id}
                          >
                            Iniciar atendimento
                          </Button>
                        )}
                        {row.statusFluxo === IN_PROGRESS_STATUS && (
                          <Button
                            size="xs"
                            variant="light"
                            color="teal"
                            leftSection={<CheckCircle2 size={14} />}
                            onClick={() => updateClinicalStatus(row, DONE_STATUS)}
                            loading={loadingId === row.id}
                          >
                            Finalizar
                          </Button>
                        )}
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                );
              })}
            </Table.Tbody>
          </Table>
        </Box>
      </Box>
    </Box>
  );
}
