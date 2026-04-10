import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Group,
  Table,
  Text,
  Stack,
} from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { showNotification } from '@mantine/notifications';
import { CheckCircle2, ChevronLeft, FileText, PhoneCall, Play, Search } from 'lucide-react';
import { Header } from '../Header/Header';
import { DARK_BLUE } from '../../themes/theme';
import { FloatingInput } from '../common/FloatingInput';
import consultationService from '../../services/consultationService';
import teleconsultationLinkService from '../../services/teleconsultationLinkService';
import { useClinicalQueueQuery } from '../../hooks/useClinicalQueueQuery';
import { useAppointmentsQuery } from '../../hooks/useAppointmentsQuery';
import { queryKeys } from '../../lib/queryKeys';
import { resolveApiErrorMessage } from '../../lib/apiError';
import { formatCPF } from '../../utils/formatters';

interface ConsultationRow {
  id: string;
  appointmentId?: string;
  nomeCompleto: string;
  cpf?: string;
  convenio?: string;
  agendadoPara: string;
  agenda: string;
  statusFluxo: string;
  appointmentType: string;
  isTeleconsultation: boolean;
  triageRequired: boolean;
}

const WAITING_STATUS = 'Aguardando atendimento';
const CALLED_STATUS = 'Chamado para atendimento';
const IN_PROGRESS_STATUS = 'Em atendimento';
const DONE_STATUS = 'Atendimento concluído';
const CLINICAL_QUEUE_TYPE = 'Fila clínica';
const ACTIVE_STATUSES = [WAITING_STATUS, CALLED_STATUS, IN_PROGRESS_STATUS];

const statusBadge = (status: string) => {
  if (status === WAITING_STATUS) return { color: 'yellow', label: 'Aguardando' };
  if (status === CALLED_STATUS) return { color: 'blue', label: 'Chamado' };
  if (status === IN_PROGRESS_STATUS) return { color: 'green', label: 'Em atendimento' };
  return { color: 'gray', label: status || '-' };
};

const getAppointmentTypeLabel = (value?: string | null) => {
  const normalized = String(value || '').trim().toUpperCase();
  if (normalized === 'EXAME' || normalized === 'EXAM') return 'Exame';
  return 'Consulta';
};

const getClinicalActionConfig = (row: ConsultationRow) => {
  if (row.isTeleconsultation) {
    return {
      label: 'Iniciar teleconsulta',
      color: 'green',
      variant: 'filled' as const,
      icon: <Play size={14} />,
      nextStatus: null as string | null,
      isTeleconsultationAction: true,
    };
  }

  const status = row.statusFluxo;
  if (status === WAITING_STATUS) {
    return {
      label: 'Chamar',
      color: 'blue',
      variant: 'filled' as const,
      icon: <PhoneCall size={14} />,
      nextStatus: CALLED_STATUS,
      openClinicalPage: false,
      isTeleconsultationAction: false,
    };
  }

  if (status === CALLED_STATUS) {
    return {
      label: 'Iniciar atendimento',
      color: 'green',
      variant: 'filled' as const,
      icon: <Play size={14} />,
      nextStatus: IN_PROGRESS_STATUS,
      openClinicalPage: true,
      isTeleconsultationAction: false,
    };
  }

  if (status === IN_PROGRESS_STATUS) {
    return {
      label: 'Abrir prontuário',
      color: 'indigo',
      variant: 'light' as const,
      icon: <FileText size={14} />,
      nextStatus: IN_PROGRESS_STATUS,
      openClinicalPage: true,
      isTeleconsultationAction: false,
    };
  }

  return null;
};

export function Consulta() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [query, setQuery] = useState('');
  const [rows, setRows] = useState<ConsultationRow[]>([]);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [loggedDoctorName, setLoggedDoctorName] = useState('');
  const isMobile = useMediaQuery('(max-width: 799px)');
  const isTablet = useMediaQuery('(max-width: 1279px)');
  const clinicalQueueQuery = useClinicalQueueQuery();
  const appointmentsQuery = useAppointmentsQuery();

  const mapApiToRow = (it: any): ConsultationRow => ({
    id: String(it.id),
    appointmentId: String(it.appointmentId || it.appointment_id || it.appointment?.id || ''),
    nomeCompleto: it.patientName || '',
    cpf:
      it.patientCpf
      || it.patient_cpf
      || it.cpf
      || it.patient?.cpf
      || it.patient?.document
      || it.patientDocument
      || it.patient_document
      || '',
    convenio: it.convenio || '',
    agendadoPara: it.scheduledFor || '-',
    agenda: it.agenda || '-',
    statusFluxo: it.queue || WAITING_STATUS,
    appointmentType: String(it.appointmentType || it.appointment?.type || ''),
    isTeleconsultation: Boolean(it.isTeleconsultation),
    triageRequired: Boolean(it.triageRequired),
  });

  const appointmentCpfById = useMemo(() => {
    const items = Array.isArray(appointmentsQuery.data) ? appointmentsQuery.data : [];
    return items.reduce<Record<string, string>>((acc, item: any) => {
      const key = String(item?.id || '').trim();
      const cpf = String(item?.patientCpf || item?.patient_cpf || item?.patient?.cpf || '').trim();
      if (key && cpf) acc[key] = cpf;
      return acc;
    }, {});
  }, [appointmentsQuery.data]);

  useEffect(() => {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      setLoggedDoctorName(String(user?.doctor?.name || '').trim());
    } catch {
      setLoggedDoctorName('');
    }
  }, []);

  useEffect(() => {
    setRows(
      (((clinicalQueueQuery.data as any[]) || [])
        .map((item) => {
          const mapped = mapApiToRow(item);
          return {
            ...mapped,
            cpf: mapped.cpf || appointmentCpfById[mapped.appointmentId || ''] || '',
          };
        })
        .filter((item) => ACTIVE_STATUSES.includes(item.statusFluxo))
        .filter((item) => getAppointmentTypeLabel(item.appointmentType) !== 'Exame' && !item.triageRequired)),
    );
  }, [appointmentCpfById, clinicalQueueQuery.data]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return rows;
    return rows.filter((row) =>
      [row.nomeCompleto, row.convenio, row.agenda, row.agendadoPara, row.statusFluxo]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalized)),
    );
  }, [rows, query]);

  const openClinicalCare = (row: ConsultationRow) => {
    navigate(`/consulta/atendimento/${row.id}`);
  };

  const updateClinicalStatus = async (
    row: ConsultationRow,
    nextStatus: string,
    openClinicalPage = false,
  ) => {
    try {
      setLoadingId(row.id);
      await consultationService.update(row.id, { queue: nextStatus });
      await queryClient.invalidateQueries({ queryKey: queryKeys.clinicalQueue });
      showNotification({
        title: 'Fila clínica atualizada',
        message: `${row.nomeCompleto} agora está em "${nextStatus}".`,
        color: 'green',
      });
      if (openClinicalPage) openClinicalCare(row);
    } catch (err: any) {
      showNotification({
        title: 'Erro',
        message: resolveApiErrorMessage(err, 'Erro ao atualizar status do atendimento'),
        color: 'red',
      });
    } finally {
      setLoadingId(null);
    }
  };

  const startTeleconsultation = async (row: ConsultationRow) => {
    if (!row.appointmentId) {
      showNotification({
        title: 'Não foi possível iniciar',
        message: 'Consulta sem agendamento vinculado.',
        color: 'red',
      });
      return;
    }

    try {
      setLoadingId(row.id);
      await consultationService.update(row.id, { queue: IN_PROGRESS_STATUS, queueType: CLINICAL_QUEUE_TYPE });
      const result = await teleconsultationLinkService.sendWhatsAppLinkByAppointment(row.appointmentId, {
        sendPatientMessage: false,
      });

      const doctorUrlRaw = String(result?.links?.doctorUrl || '').trim();
      if (!doctorUrlRaw) {
        throw new Error('Link do médico não retornado.');
      }

      const doctorUrl = new URL(doctorUrlRaw, window.location.origin);
      const token = doctorUrl.searchParams.get('token');
      if (!token) {
        throw new Error('Token do médico não encontrado no link.');
      }

      await queryClient.invalidateQueries({ queryKey: queryKeys.clinicalQueue });
      window.location.assign(`/teleconsulta/preparacao?token=${encodeURIComponent(token)}`);
    } catch (err: any) {
      showNotification({
        title: 'Erro',
        message: err?.response?.data?.error || err?.response?.data?.message || err?.message || 'Não foi possível iniciar a teleconsulta.',
        color: 'red',
      });
      setLoadingId(null);
    }
  };

  const finalizeTeleconsultation = async (row: ConsultationRow) => {
    try {
      setLoadingId(row.id);

      if (row.statusFluxo !== IN_PROGRESS_STATUS) {
        await consultationService.update(row.id, { queue: IN_PROGRESS_STATUS, queueType: CLINICAL_QUEUE_TYPE });
      }

      await consultationService.update(row.id, { queue: DONE_STATUS, queueType: CLINICAL_QUEUE_TYPE });
      await queryClient.invalidateQueries({ queryKey: queryKeys.clinicalQueue });
      showNotification({
        title: 'Teleconsulta finalizada',
        message: `${row.nomeCompleto} foi marcado como atendimento concluído.`,
        color: 'green',
      });
    } catch (err: any) {
      showNotification({
        title: 'Erro',
        message: err?.response?.data?.message || err?.response?.data?.error || err?.message || 'Erro ao finalizar teleconsulta',
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
                {loggedDoctorName ? `Fila clínica do(a) Dr(a). ${loggedDoctorName}` : 'Fila clínica de atendimento médico'}
              </Text>
            </Box>
          </Group>
          <Badge variant="light" color="blue" radius="sm">
            Fila clínica
          </Badge>
        </Group>

        <Box mb={isMobile ? 20 : 30}>
          <FloatingInput
            label="Buscar"
            alwaysFloatLabel
            placeholder={isMobile ? 'Buscar...' : 'Buscar paciente, convênio ou agenda...'}
            value={query}
            onChange={(e) => setQuery(e.currentTarget.value)}
            rightSection={<Search size={16} color="var(--mantine-color-dimmed)" style={{ pointerEvents: 'none' }} />}
            containerProps={{ style: { minHeight: 64 } }}
          />
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
              {filtered.length > 0 ? filtered.map((row) => {
                const badge = statusBadge(row.statusFluxo);
                const action = getClinicalActionConfig(row);
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
                              CPF: {row.cpf ? formatCPF(row.cpf) : 'Não informado'}
                            </Text>
                          )}
                        </Box>
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      <Stack gap={2}>
                        <Text size="xs" fw={600} style={{ fontSize: isMobile ? '0.75rem' : '0.82rem' }}>
                          {row.agenda || row.agendadoPara || '-'}
                        </Text>
                        <Text size="xs" c="dimmed">
                          {getAppointmentTypeLabel(row.appointmentType)}
                        </Text>
                      </Stack>
                    </Table.Td>
                    {!isTablet && (
                      <Table.Td>
                        <Badge variant="outline" radius="xl" color={row.convenio ? 'blue' : 'gray'}>
                          {row.convenio || 'Particular'}
                        </Badge>
                      </Table.Td>
                    )}
                    <Table.Td>
                      <Badge color={badge.color} variant="light">
                        {badge.label}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Group gap={8} justify="flex-end">
                        {action && (
                          <Button
                            size="xs"
                            variant={action.variant}
                            color={action.color}
                            leftSection={action.icon}
                            onClick={() => {
                              if (action.isTeleconsultationAction) {
                                void startTeleconsultation(row);
                                return;
                              }
                              if (action.openClinicalPage && row.statusFluxo === IN_PROGRESS_STATUS) {
                                openClinicalCare(row);
                                return;
                              }
                              if (action.nextStatus) {
                                void updateClinicalStatus(row, action.nextStatus, action.openClinicalPage);
                              }
                            }}
                            loading={loadingId === row.id}
                          >
                            {action.label}
                          </Button>
                        )}
                        {row.isTeleconsultation && (
                          <Button
                            size="xs"
                            variant="light"
                            color="teal"
                            leftSection={<CheckCircle2 size={14} />}
                            onClick={() => { void finalizeTeleconsultation(row); }}
                            loading={loadingId === row.id}
                          >
                            Finalizar teleconsulta
                          </Button>
                        )}
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                );
              }) : (
                <Table.Tr>
                  <Table.Td colSpan={5}>
                    <Text ta="center" c="dimmed" py="md">Nenhuma consulta na fila no momento.</Text>
                  </Table.Td>
                </Table.Tr>
              )}
            </Table.Tbody>
          </Table>
        </Box>
      </Box>
    </Box>
  );
}
