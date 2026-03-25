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
  Select,
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
import consultationService from '../../services/consultationService';
import { useClinicalQueueQuery } from '../../hooks/useClinicalQueueQuery';
import { queryKeys } from '../../lib/queryKeys';

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
  nomeCompleto: string;
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

  const mapApiToRow = (it: any): ConsultationRow => ({
    id: String(it.id),
    nomeCompleto: it.patientName || '',
    convenio: it.convenio || '',
    statusConvenio: it.convenioStatus || '',
    agendadoPara: it.scheduledFor || '-',
    agenda: it.agenda || '-',
    statusFluxo: it.queue || EXAM_WAITING_STATUS,
    appointmentType: String(it.appointmentType || it.appointment?.type || ''),
    triageRequired: Boolean(it.triageRequired),
    nursingTemplate: it.nursingTemplate || null,
  });

  const isExamRow = (row: ConsultationRow) => (
    getAppointmentTypeLabel(row.appointmentType) === 'Exame'
    || row.triageRequired
    || EXAM_FLOW_STATUSES.has(row.statusFluxo)
  );

  useEffect(() => {
    setRows(
      (((clinicalQueueQuery.data as any[]) || [])
        .map(mapApiToRow)
        .filter((item) => EXAM_FLOW_STATUSES.has(item.statusFluxo) || isExamRow(item))),
    );
  }, [clinicalQueueQuery.data]);

  const filteredRows = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return rows;
    return rows.filter((row) =>
      [row.nomeCompleto, row.convenio, row.agenda, row.agendadoPara, row.statusFluxo]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalized)),
    );
  }, [rows, query]);

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
          <TextInput
            placeholder={isMobile ? 'Buscar...' : 'Buscar paciente, convênio ou agenda...'}
            leftSection={<Search size={16} color="var(--mantine-color-dimmed)" />}
            value={query}
            onChange={(event) => setQuery(event.currentTarget.value)}
            radius="md"
            size={isMobile ? 'sm' : 'md'}
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
              {filteredRows.length > 0 ? filteredRows.map((row) => {
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
                        {row.triageRequired && row.statusFluxo === TRIAGE_WAITING_STATUS && (
                          <Button
                            size="xs"
                            variant="light"
                            color="orange"
                            leftSection={<ClipboardCheck size={14} />}
                            onClick={() => openTriageModal(row)}
                            loading={loadingId === row.id}
                          >
                            Iniciar triagem
                          </Button>
                        )}
                        {row.triageRequired && row.statusFluxo === TRIAGE_IN_PROGRESS_STATUS && (
                          <Button
                            size="xs"
                            variant="light"
                            color="grape"
                            leftSection={<ClipboardCheck size={14} />}
                            onClick={() => openTriageModal(row, false)}
                            loading={loadingId === row.id}
                          >
                            Continuar triagem
                          </Button>
                        )}
                        {row.statusFluxo === EXAM_WAITING_STATUS && (
                          <Button
                            size="xs"
                            variant="light"
                            color="cyan"
                            leftSection={<PhoneCall size={14} />}
                            onClick={() => updateExamStatus(row, EXAM_CALLED_STATUS)}
                            loading={loadingId === row.id}
                          >
                            Chamar exame
                          </Button>
                        )}
                        {row.statusFluxo === EXAM_CALLED_STATUS && (
                          <Button
                            size="xs"
                            variant="light"
                            color="teal"
                            leftSection={<Play size={14} />}
                            onClick={() => updateExamStatus(row, EXAM_IN_PROGRESS_STATUS)}
                            loading={loadingId === row.id}
                          >
                            Iniciar exame
                          </Button>
                        )}
                        {row.statusFluxo === EXAM_IN_PROGRESS_STATUS && (
                          <Button
                            size="xs"
                            variant="light"
                            color="green"
                            leftSection={<CheckCircle2 size={14} />}
                            onClick={() => updateExamStatus(row, EXAM_DONE_STATUS)}
                            loading={loadingId === row.id}
                          >
                            Finalizar exame
                          </Button>
                        )}
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                );
              }) : (
                <Table.Tr>
                  <Table.Td colSpan={5}>
                    <Text ta="center" c="dimmed" py="md">Nenhum exame na fila no momento.</Text>
                  </Table.Td>
                </Table.Tr>
              )}
            </Table.Tbody>
          </Table>
        </Box>
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
