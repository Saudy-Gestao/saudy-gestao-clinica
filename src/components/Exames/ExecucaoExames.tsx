import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Checkbox,
  Group,
  Modal,
  Paper,
  Select,
  Skeleton,
  SimpleGrid,
  Stack,
  Table,
  Text,
  TextInput,
  Textarea,
} from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { showNotification } from '@mantine/notifications';
import { ChevronLeft, ClipboardCheck, PhoneCall, Play, CheckCircle2, Search } from 'lucide-react';
import { Header } from '../Header/Header';
import { DARK_BLUE } from '../../themes/theme';
import { FloatingInput } from '../common/FloatingInput';
import consultationService from '../../services/consultationService';
import { useAppointmentsQuery } from '../../hooks/useAppointmentsQuery';
import { useClinicalQueueQuery } from '../../hooks/useClinicalQueueQuery';
import { queryKeys } from '../../lib/queryKeys';
import { formatCPF } from '../../utils/formatters';

interface NursingTemplateQuestionOption {
  label: string;
  value: string;
}

interface NursingTemplateQuestion {
  id: string;
  label: string;
  helpText?: string | null;
  responseType: string;
  placeholder?: string | null;
  isRequired: boolean;
  orderIndex: number;
  options: NursingTemplateQuestionOption[];
}

interface NursingTemplateSummary {
  id: string;
  name: string;
  description?: string | null;
  collectHeight?: boolean;
  collectWeight?: boolean;
  collectBloodPressure?: boolean;
  collectTemperature?: boolean;
  collectHeartRate?: boolean;
  collectOxygenSaturation?: boolean;
  collectGlucose?: boolean;
  collectPregnancyCheck?: boolean;
  questions: NursingTemplateQuestion[];
}

interface ConsultationRow {
  id: string;
  appointmentId?: string;
  nomeCompleto: string;
  cpf?: string;
  convenio?: string;
  statusConvenio: string;
  agendadoPara: string;
  agenda: string;
  statusFluxo: string;
  appointmentType: string;
  triageRequired: boolean;
  nursingTemplate: NursingTemplateSummary | null;
}

type TriageAnswerForm = {
  questionId: string;
  questionLabel: string;
  responseType: string;
  answerText: string;
  answerValues: string[];
  answerBoolean: boolean | null;
  answerNumber: string;
  orderIndex: number;
};

const CLINICAL_QUEUE_TYPE = 'Fila clínica';
const TRIAGE_WAITING_STATUS = 'Aguardando triagem';
const TRIAGE_IN_PROGRESS_STATUS = 'Em triagem';
const EXAM_WAITING_STATUS = 'Aguardando exame';
const EXAM_CALLED_STATUS = 'Chamado para exame';
const EXAM_IN_PROGRESS_STATUS = 'Em exame';
const EXAM_DONE_STATUS = 'Exame concluído';

const EXAM_FLOW_STATUSES = new Set([
  TRIAGE_WAITING_STATUS,
  TRIAGE_IN_PROGRESS_STATUS,
  EXAM_WAITING_STATUS,
  EXAM_CALLED_STATUS,
  EXAM_IN_PROGRESS_STATUS,
  EXAM_DONE_STATUS,
]);

const EXAM_STATUS_SECTIONS = [
  { key: TRIAGE_WAITING_STATUS, title: 'Aguardando triagem', description: 'Pacientes prontos para triagem de enfermagem.' },
  { key: TRIAGE_IN_PROGRESS_STATUS, title: 'Em triagem', description: 'Triagens iniciadas e ainda não concluídas.' },
  { key: EXAM_WAITING_STATUS, title: 'Aguardando exame', description: 'Pacientes liberados para a execução do exame.' },
  { key: EXAM_CALLED_STATUS, title: 'Chamado para exame', description: 'Pacientes chamados e aguardando início do exame.' },
  { key: EXAM_IN_PROGRESS_STATUS, title: 'Em exame', description: 'Exames em execução no momento.' },
  { key: EXAM_DONE_STATUS, title: 'Exame concluído', description: 'Exames já finalizados nesta fila.' },
] as const;

const getAppointmentTypeLabel = (value?: string | null) => {
  const normalized = String(value || '').trim().toUpperCase();
  if (normalized === 'EXAME' || normalized === 'EXAM') return 'Exame';
  return 'Consulta';
};

const statusBadge = (status: string) => {
  if (status === TRIAGE_WAITING_STATUS) return { color: 'orange', label: 'Aguardando triagem' };
  if (status === TRIAGE_IN_PROGRESS_STATUS) return { color: 'grape', label: 'Em triagem' };
  if (status === EXAM_WAITING_STATUS) return { color: 'cyan', label: 'Aguardando exame' };
  if (status === EXAM_CALLED_STATUS) return { color: 'indigo', label: 'Chamado para exame' };
  if (status === EXAM_IN_PROGRESS_STATUS) return { color: 'teal', label: 'Em exame' };
  if (status === EXAM_DONE_STATUS) return { color: 'green', label: 'Exame concluído' };
  return { color: 'gray', label: status || '-' };
};

const getExamActionConfig = (row: ConsultationRow) => {
  if (row.triageRequired && row.statusFluxo === TRIAGE_WAITING_STATUS) {
    return {
      label: 'Iniciar triagem',
      color: 'orange',
      variant: 'filled' as const,
      icon: <ClipboardCheck size={14} />,
      onClick: 'start-triage' as const,
    };
  }

  if (row.triageRequired && row.statusFluxo === TRIAGE_IN_PROGRESS_STATUS) {
    return {
      label: 'Continuar triagem',
      color: 'grape',
      variant: 'filled' as const,
      icon: <ClipboardCheck size={14} />,
      onClick: 'continue-triage' as const,
    };
  }

  if (row.statusFluxo === EXAM_WAITING_STATUS) {
    return {
      label: 'Chamar exame',
      color: 'cyan',
      variant: 'filled' as const,
      icon: <PhoneCall size={14} />,
      onClick: 'call-exam' as const,
    };
  }

  if (row.statusFluxo === EXAM_CALLED_STATUS) {
    return {
      label: 'Iniciar exame',
      color: 'teal',
      variant: 'filled' as const,
      icon: <Play size={14} />,
      onClick: 'start-exam' as const,
    };
  }

  if (row.statusFluxo === EXAM_IN_PROGRESS_STATUS) {
    return {
      label: 'Finalizar exame',
      color: 'green',
      variant: 'light' as const,
      icon: <CheckCircle2 size={14} />,
      onClick: 'finish-exam' as const,
    };
  }

  return null;
};

const buildInitialAnswers = (template: NursingTemplateSummary | null): TriageAnswerForm[] => (
  (template?.questions || []).map((question, index) => ({
    questionId: question.id,
    questionLabel: question.label,
    responseType: question.responseType,
    answerText: '',
    answerValues: [],
    answerBoolean: null,
    answerNumber: '',
    orderIndex: Number(question.orderIndex ?? index),
  }))
);

const requiresOptionList = (responseType?: string) => (
  responseType === 'SINGLE_CHOICE' || responseType === 'MULTIPLE_CHOICE'
);

export function ExecucaoExames() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [query, setQuery] = useState('');
  const [rows, setRows] = useState<ConsultationRow[]>([]);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [triageOpen, setTriageOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState<ConsultationRow | null>(null);
  const [triageSaving, setTriageSaving] = useState(false);
  const [triageNotes, setTriageNotes] = useState('');
  const [bloodPressure, setBloodPressure] = useState('');
  const [heartRate, setHeartRate] = useState('');
  const [temperature, setTemperature] = useState('');
  const [oxygenSaturation, setOxygenSaturation] = useState('');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [glucose, setGlucose] = useState('');
  const [pregnant, setPregnant] = useState('');
  const [answers, setAnswers] = useState<TriageAnswerForm[]>([]);
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
    statusConvenio: it.convenioStatus || '',
    agendadoPara: it.scheduledFor || '-',
    agenda: it.agenda || '-',
    statusFluxo: it.queue || EXAM_WAITING_STATUS,
    appointmentType: String(it.appointmentType || it.appointment?.type || ''),
    triageRequired: Boolean(it.triageRequired),
    nursingTemplate: it.nursingTemplate || null,
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

  const isExamRow = (row: ConsultationRow) => (
    getAppointmentTypeLabel(row.appointmentType) === 'Exame'
    || row.triageRequired
    || EXAM_FLOW_STATUSES.has(row.statusFluxo)
  );

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
        .filter((item) => EXAM_FLOW_STATUSES.has(item.statusFluxo) || isExamRow(item))),
    );
  }, [appointmentCpfById, clinicalQueueQuery.data]);

  const filteredRows = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return rows;
    return rows.filter((row) =>
      [row.nomeCompleto, row.convenio, row.agenda, row.agendadoPara, row.statusFluxo]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalized)),
    );
  }, [rows, query]);

  const examQueueLoading = clinicalQueueQuery.isLoading && rows.length === 0;
  const groupedRows = useMemo(
    () => EXAM_STATUS_SECTIONS.map((section) => ({
      ...section,
      items: filteredRows.filter((row) => row.statusFluxo === section.key),
    })),
    [filteredRows],
  );

  const updateExamStatus = async (row: ConsultationRow, nextStatus: string) => {
    try {
      setLoadingId(row.id);
      await consultationService.update(row.id, { queue: nextStatus, queueType: CLINICAL_QUEUE_TYPE });
      await queryClient.invalidateQueries({ queryKey: queryKeys.clinicalQueue });
      showNotification({
        title: 'Fluxo do exame atualizado',
        message: `${row.nomeCompleto} agora está em "${nextStatus}".`,
        color: 'green',
      });
    } catch (err: any) {
      showNotification({
        title: 'Erro',
        message: err?.response?.data?.message || err?.message || 'Erro ao atualizar status do exame',
        color: 'red',
      });
    } finally {
      setLoadingId(null);
    }
  };

  const openTriageModal = async (row: ConsultationRow, markInProgress = true) => {
    try {
      setLoadingId(row.id);
      if (markInProgress) {
        await consultationService.update(row.id, { queue: TRIAGE_IN_PROGRESS_STATUS, queueType: CLINICAL_QUEUE_TYPE });
      }
      setSelectedRow({ ...row, statusFluxo: TRIAGE_IN_PROGRESS_STATUS });
      setTriageNotes('');
      setBloodPressure('');
      setHeartRate('');
      setTemperature('');
      setOxygenSaturation('');
      setWeight('');
      setHeight('');
      setGlucose('');
      setPregnant('');
      setAnswers(buildInitialAnswers(row.nursingTemplate));
      setTriageOpen(true);
      await queryClient.invalidateQueries({ queryKey: queryKeys.clinicalQueue });
    } catch (err: any) {
      showNotification({
        title: 'Erro',
        message: err?.response?.data?.message || err?.message || 'Erro ao iniciar triagem',
        color: 'red',
      });
    } finally {
      setLoadingId(null);
    }
  };

  const updateAnswer = (questionId: string, patch: Partial<TriageAnswerForm>) => {
    setAnswers((prev) => prev.map((answer) => (
      answer.questionId === questionId
        ? { ...answer, ...patch }
        : answer
    )));
  };

  const handleSubmitTriage = async () => {
    if (!selectedRow?.nursingTemplate) return;
    try {
      setTriageSaving(true);
      await consultationService.submitNursingTriage(selectedRow.id, {
        bloodPressure,
        heartRate,
        temperature,
        oxygenSaturation,
        weight,
        height,
        glucose,
        pregnant,
        triageNotes,
        answers: answers.map((answer) => ({
          questionId: answer.questionId,
          questionLabel: answer.questionLabel,
          responseType: answer.responseType,
          answerText: answer.answerText || undefined,
          answerValues: answer.answerValues,
          answerBoolean: answer.answerBoolean,
          answerNumber: answer.answerNumber ? Number(answer.answerNumber) : undefined,
          orderIndex: answer.orderIndex,
        })),
      });
      showNotification({
        title: 'Triagem concluída',
        message: `${selectedRow.nomeCompleto} foi liberado(a) para execução do exame.`,
        color: 'green',
      });
      setTriageOpen(false);
      setSelectedRow(null);
      await queryClient.invalidateQueries({ queryKey: queryKeys.clinicalQueue });
    } catch (err: any) {
      showNotification({
        title: 'Erro',
        message: err?.response?.data?.error || err?.response?.data?.message || err?.message || 'Erro ao concluir triagem',
        color: 'red',
      });
    } finally {
      setTriageSaving(false);
    }
  };

  const renderExamAction = (row: ConsultationRow) => {
    const action = getExamActionConfig(row);
    if (!action) return null;

    if (action.onClick === 'start-triage') {
      return (
        <Button
          size="xs"
          variant={action.variant}
          color={action.color}
          leftSection={action.icon}
          onClick={() => openTriageModal(row)}
          loading={loadingId === row.id}
        >
          {action.label}
        </Button>
      );
    }

    if (action.onClick === 'continue-triage') {
      return (
        <Button
          size="xs"
          variant={action.variant}
          color={action.color}
          leftSection={action.icon}
          onClick={() => openTriageModal(row, false)}
          loading={loadingId === row.id}
        >
          {action.label}
        </Button>
      );
    }

    if (action.onClick === 'call-exam') {
      return (
        <Button
          size="xs"
          variant={action.variant}
          color={action.color}
          leftSection={action.icon}
          onClick={() => updateExamStatus(row, EXAM_CALLED_STATUS)}
          loading={loadingId === row.id}
        >
          {action.label}
        </Button>
      );
    }

    if (action.onClick === 'start-exam') {
      return (
        <Button
          size="xs"
          variant={action.variant}
          color={action.color}
          leftSection={action.icon}
          onClick={() => updateExamStatus(row, EXAM_IN_PROGRESS_STATUS)}
          loading={loadingId === row.id}
        >
          {action.label}
        </Button>
      );
    }

    return (
      <Button
        size="xs"
        variant={action.variant}
        color={action.color}
        leftSection={action.icon}
        onClick={() => updateExamStatus(row, EXAM_DONE_STATUS)}
        loading={loadingId === row.id}
      >
        {action.label}
      </Button>
    );
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
                Execução de Exames
              </Text>
              <Text size="sm" c="dimmed">
                Triagem, chamada e andamento operacional dos exames.
              </Text>
            </Box>
          </Group>
          <Badge variant="light" color="cyan" radius="sm">
            Fila de exames
          </Badge>
        </Group>

        <Box mb={isMobile ? 20 : 30}>
          <FloatingInput
            label="Buscar"
            alwaysFloatLabel
            placeholder={isMobile ? 'Buscar...' : 'Buscar paciente, convênio ou agenda...'}
            value={query}
            onChange={(event) => setQuery(event.currentTarget.value)}
            rightSection={<Search size={16} color="var(--mantine-color-dimmed)" style={{ pointerEvents: 'none' }} />}
            containerProps={{ style: { minHeight: 64 } }}
          />
        </Box>

        {examQueueLoading ? (
          isMobile ? (
            <Stack gap="sm">
              {Array.from({ length: 4 }).map((_, index) => (
                <Paper key={index} p="md" withBorder radius="md" style={{ borderColor: 'var(--mantine-color-default-border)' }}>
                  <Stack gap="sm">
                    <Group justify="space-between" align="flex-start">
                      <Group gap="sm" align="flex-start">
                        <Skeleton height={36} width={36} radius="xl" />
                        <Stack gap={6}>
                          <Skeleton height={14} width={140} radius="xl" />
                          <Skeleton height={10} width={110} radius="xl" />
                        </Stack>
                      </Group>
                      <Skeleton height={24} width={140} radius="xl" />
                    </Group>
                    <Skeleton height={12} width="75%" radius="xl" />
                    <Group justify="space-between">
                      <Skeleton height={24} width={96} radius="xl" />
                      <Skeleton height={32} width={142} radius="md" />
                    </Group>
                  </Stack>
                </Paper>
              ))}
            </Stack>
          ) : (
            <Stack gap="md">
              {EXAM_STATUS_SECTIONS.slice(0, 3).map((section) => (
                <Paper key={section.key} withBorder p="md" radius="md" style={{ borderColor: 'var(--mantine-color-default-border)' }}>
                  <Stack gap="sm">
                    <Skeleton height={18} width={180} radius="xl" />
                    <Skeleton height={12} width={260} radius="xl" />
                    <Box style={{ overflowX: 'auto' }}>
                      <Table horizontalSpacing="md" verticalSpacing="md">
                        <Table.Tbody>
                          {Array.from({ length: 2 }).map((_, index) => (
                            <Table.Tr key={index}>
                              <Table.Td><Skeleton height={14} width={140} radius="xl" /></Table.Td>
                              <Table.Td><Skeleton height={14} width={200} radius="xl" /></Table.Td>
                              <Table.Td><Skeleton height={24} width={90} radius="xl" /></Table.Td>
                              <Table.Td><Skeleton height={24} width={140} radius="xl" /></Table.Td>
                              <Table.Td><Skeleton height={30} width={132} radius="md" /></Table.Td>
                            </Table.Tr>
                          ))}
                        </Table.Tbody>
                      </Table>
                    </Box>
                  </Stack>
                </Paper>
              ))}
            </Stack>
          )
        ) : groupedRows.some((section) => section.items.length > 0) ? (
          <Stack gap="md">
            {groupedRows.filter((section) => section.items.length > 0).map((section) => (
              <Paper key={section.key} withBorder p="md" radius="md" style={{ borderColor: 'var(--mantine-color-default-border)' }}>
                <Stack gap="md">
                  <Group justify="space-between" align="flex-start">
                    <Box>
                      <Text fw={700}>{section.title}</Text>
                      <Text size="sm" c="dimmed">{section.description}</Text>
                    </Box>
                    <Badge variant="light" radius="xl">{section.items.length}</Badge>
                  </Group>

                  {isMobile ? (
                    <Stack gap="sm">
                      {section.items.map((row) => {
                        const badge = statusBadge(row.statusFluxo);
                        return (
                          <Paper key={row.id} p="md" withBorder radius="md" style={{ borderColor: 'var(--mantine-color-default-border)' }}>
                            <Stack gap="sm">
                              <Group justify="space-between" align="flex-start">
                                <Group gap="sm" align="flex-start">
                                  <Box
                                    bg={DARK_BLUE}
                                    w={36}
                                    h={36}
                                    style={{ borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                                  >
                                    <Text c="white" fw={600} size="sm">
                                      {row.nomeCompleto.charAt(0).toUpperCase()}
                                    </Text>
                                  </Box>
                                    <Box>
                                      <Text fw={600} size="sm">{row.nomeCompleto}</Text>
                                      <Text size="xs" c="dimmed">
                                        CPF: {row.cpf ? formatCPF(row.cpf) : 'Não informado'}
                                      </Text>
                                    </Box>
                                  </Group>
                                  <Badge color={badge.color} variant="light">{badge.label}</Badge>
                              </Group>

                              <Box>
                                <Text size="xs" c="dimmed" fw={600}>Agendamento</Text>
                                <Text size="sm" fw={500}>{row.agenda || row.agendadoPara || '-'}</Text>
                                <Text size="xs" c="dimmed">{getAppointmentTypeLabel(row.appointmentType)}</Text>
                              </Box>

                              <Group justify="space-between" align="center">
                                <Badge variant="outline" radius="xl" color={row.convenio ? 'blue' : 'gray'}>
                                  {row.convenio || 'Particular'}
                                </Badge>
                                {renderExamAction(row)}
                              </Group>
                            </Stack>
                          </Paper>
                        );
                      })}
                    </Stack>
                  ) : (
                    <Box style={{ overflowX: 'auto' }}>
                      <Table horizontalSpacing="md" verticalSpacing="md">
                        <Table.Thead>
                          <Table.Tr style={{ borderBottom: 'none' }}>
                            <Table.Th style={{ color: '#868e96', fontSize: '0.8rem', fontWeight: 500 }}>Paciente</Table.Th>
                            <Table.Th style={{ color: '#868e96', fontSize: '0.8rem', fontWeight: 500 }}>Agendamento</Table.Th>
                            {!isTablet && <Table.Th style={{ color: '#868e96', fontSize: '0.8rem', fontWeight: 500 }}>Convênio</Table.Th>}
                            <Table.Th style={{ color: '#868e96', fontSize: '0.8rem', fontWeight: 500 }}>Status</Table.Th>
                            <Table.Th style={{ color: '#868e96', fontSize: '0.8rem', fontWeight: 500, textAlign: 'right' }}>Ações</Table.Th>
                          </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                          {section.items.map((row) => {
                            const badge = statusBadge(row.statusFluxo);
                            return (
                              <Table.Tr key={row.id} style={{ borderBottom: '1px solid #e9ecef' }}>
                                <Table.Td>
                                  <Group gap="sm">
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
                                    <Box>
                                      <Text fw={500} size="xs" style={{ fontSize: '0.85rem' }}>
                                        {row.nomeCompleto}
                                      </Text>
                                      <Text size="xs" c="dimmed">
                                        CPF: {row.cpf ? formatCPF(row.cpf) : 'Não informado'}
                                      </Text>
                                    </Box>
                                  </Group>
                                </Table.Td>
                                <Table.Td>
                                  <Stack gap={2}>
                                    <Text size="xs" fw={600} style={{ fontSize: '0.82rem' }}>
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
                                    {renderExamAction(row)}
                                  </Group>
                                </Table.Td>
                              </Table.Tr>
                            );
                          })}
                        </Table.Tbody>
                      </Table>
                    </Box>
                  )}
                </Stack>
              </Paper>
            ))}
          </Stack>
        ) : (
          <Paper withBorder radius="md" p="xl" style={{ borderColor: 'var(--mantine-color-default-border)' }}>
            <Text ta="center" fw={600}>Nenhum exame na fila no momento</Text>
            <Text ta="center" c="dimmed" size="sm" mt={4}>
              Assim que um exame entrar em triagem ou execução, ele aparecerá aqui na etapa correspondente.
            </Text>
          </Paper>
        )}
      </Box>

      <Modal
        opened={triageOpen}
        onClose={() => {
          setTriageOpen(false);
          setSelectedRow(null);
        }}
        title="Triagem de enfermagem"
        size={isMobile ? '100%' : 'xl'}
        fullScreen={isMobile}
        centered
      >
        <Stack gap="lg">
          <Box>
            <Text fw={700}>{selectedRow?.nomeCompleto}</Text>
            <Text size="sm" c="dimmed">{selectedRow?.nursingTemplate?.name || 'Triagem do procedimento'}</Text>
            {selectedRow?.nursingTemplate?.description && (
              <Text size="sm" c="dimmed" mt={4}>{selectedRow.nursingTemplate.description}</Text>
            )}
          </Box>

          <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
            {selectedRow?.nursingTemplate?.collectBloodPressure && (
              <TextInput label="Pressão arterial" value={bloodPressure} onChange={(event) => setBloodPressure(event.currentTarget.value)} />
            )}
            {selectedRow?.nursingTemplate?.collectHeartRate && (
              <TextInput label="Frequência cardíaca" value={heartRate} onChange={(event) => setHeartRate(event.currentTarget.value)} />
            )}
            {selectedRow?.nursingTemplate?.collectTemperature && (
              <TextInput label="Temperatura" value={temperature} onChange={(event) => setTemperature(event.currentTarget.value)} />
            )}
            {selectedRow?.nursingTemplate?.collectOxygenSaturation && (
              <TextInput label="Saturação" value={oxygenSaturation} onChange={(event) => setOxygenSaturation(event.currentTarget.value)} />
            )}
            {selectedRow?.nursingTemplate?.collectWeight && (
              <TextInput label="Peso" value={weight} onChange={(event) => setWeight(event.currentTarget.value)} />
            )}
            {selectedRow?.nursingTemplate?.collectHeight && (
              <TextInput label="Altura" value={height} onChange={(event) => setHeight(event.currentTarget.value)} />
            )}
            {selectedRow?.nursingTemplate?.collectGlucose && (
              <TextInput label="Glicemia" value={glucose} onChange={(event) => setGlucose(event.currentTarget.value)} />
            )}
            {selectedRow?.nursingTemplate?.collectPregnancyCheck && (
              <Select
                label="Checagem de gestação"
                data={[
                  { value: 'NAO_APLICAVEL', label: 'Não aplicável' },
                  { value: 'NEGATIVO', label: 'Negativo' },
                  { value: 'POSITIVO', label: 'Positivo' },
                ]}
                value={pregnant}
                onChange={(value) => setPregnant(value || '')}
              />
            )}
          </SimpleGrid>

          {(selectedRow?.nursingTemplate?.questions || []).map((question) => {
            const current = answers.find((item) => item.questionId === question.id);
            if (!current) return null;

            return (
              <Box key={question.id}>
                <Text fw={600}>
                  {question.label}
                  {question.isRequired ? ' *' : ''}
                </Text>
                {question.helpText && (
                  <Text size="sm" c="dimmed" mb={6}>{question.helpText}</Text>
                )}

                {question.responseType === 'TEXT' || question.responseType === 'TEXTAREA' ? (
                  <Textarea
                    minRows={question.responseType === 'TEXTAREA' ? 3 : 2}
                    placeholder={question.placeholder || 'Digite a resposta'}
                    value={current.answerText}
                    onChange={(event) => updateAnswer(question.id, { answerText: event.currentTarget.value })}
                  />
                ) : null}

                {question.responseType === 'NUMBER' ? (
                  <TextInput
                    placeholder={question.placeholder || 'Digite o valor'}
                    value={current.answerNumber}
                    onChange={(event) => updateAnswer(question.id, { answerNumber: event.currentTarget.value })}
                  />
                ) : null}

                {question.responseType === 'BOOLEAN' ? (
                  <Select
                    data={[
                      { value: 'true', label: 'Sim' },
                      { value: 'false', label: 'Não' },
                    ]}
                    value={current.answerBoolean === null ? null : String(current.answerBoolean)}
                    onChange={(value) => updateAnswer(question.id, { answerBoolean: value === null ? null : value === 'true' })}
                  />
                ) : null}

                {question.responseType === 'DATE' || question.responseType === 'TIME' || question.responseType === 'DATETIME' ? (
                  <TextInput
                    placeholder={question.placeholder || 'Informe o valor'}
                    value={current.answerText}
                    onChange={(event) => updateAnswer(question.id, { answerText: event.currentTarget.value })}
                  />
                ) : null}

                {requiresOptionList(question.responseType) ? (
                  question.responseType === 'SINGLE_CHOICE' ? (
                    <Select
                      data={(question.options || []).map((option) => ({ value: option.value, label: option.label }))}
                      value={current.answerValues[0] || null}
                      onChange={(value) => updateAnswer(question.id, { answerValues: value ? [value] : [] })}
                    />
                  ) : (
                    <Stack gap={4}>
                      {(question.options || []).map((option) => (
                        <Checkbox
                          key={option.value}
                          label={option.label}
                          checked={current.answerValues.includes(option.value)}
                          onChange={(event) => {
                            const checked = event.currentTarget.checked;
                            const nextValues = checked
                              ? [...current.answerValues, option.value]
                              : current.answerValues.filter((value) => value !== option.value);
                            updateAnswer(question.id, { answerValues: nextValues });
                          }}
                        />
                      ))}
                    </Stack>
                  )
                ) : null}
              </Box>
            );
          })}

          <Textarea
            label="Observações da triagem"
            placeholder="Descreva preparo, contraste, restrições ou orientações adicionais"
            minRows={3}
            value={triageNotes}
            onChange={(event) => setTriageNotes(event.currentTarget.value)}
          />

          <Group justify="space-between">
            <Button variant="default" onClick={() => setTriageOpen(false)}>
              Fechar
            </Button>
            <Button color="teal" onClick={handleSubmitTriage} loading={triageSaving}>
              Concluir triagem
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Box>
  );
}
