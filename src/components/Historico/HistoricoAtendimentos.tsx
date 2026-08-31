import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Divider,
  Drawer,
  Grid,
  Group,
  Loader,
  Pagination,
  Paper,
  Select,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
  useComputedColorScheme,
} from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { useDebouncedValue } from '@mantine/hooks';
import { Calendar, ChevronLeft, FileText, Search, Stethoscope, Video } from 'lucide-react';
import { Header } from '../Header/Header';
import { DARK_BLUE } from '../../themes/theme';
import consultationService, { type HistoricoItem } from '../../services/consultationService';

const PAGE_SIZE = 20;

const TYPE_OPTIONS = [
  { value: '', label: 'Todos os tipos' },
  { value: 'PRESENCIAL', label: 'Presencial' },
  { value: 'TELECONSULTA', label: 'Teleconsulta' },
];

function formatDate(dateStr?: string) {
  if (!dateStr) return '-';
  return dateStr.slice(0, 10).split('-').reverse().join('/');
}

function VitalItem({ label, value, unit }: { label: string; value?: number | null; unit?: string }) {
  if (value == null) return null;
  return (
    <Box>
      <Text size="xs" c="dimmed">{label}</Text>
      <Text size="sm" fw={500}>{value}{unit ? ` ${unit}` : ''}</Text>
    </Box>
  );
}

function DetailDrawer({ item, onClose }: { item: HistoricoItem | null; onClose: () => void }) {
  const colorScheme = useComputedColorScheme('light');
  const isDark = colorScheme === 'dark';

  if (!item) return null;

  const mr = item.medicalRecord;
  const appt = item.appointment;
  const hasVitals = mr && (
    mr.bloodPressureSystolic != null || mr.heartRate != null || mr.temperature != null ||
    mr.oxygenSaturation != null || mr.weight != null || mr.height != null
  );

  return (
    <Drawer
      opened={Boolean(item)}
      onClose={onClose}
      title={
        <Group gap="sm">
          <Stethoscope size={20} color={isDark ? 'var(--mantine-color-text)' : DARK_BLUE} />
          <Text fw={700} size="lg">Detalhes do Atendimento</Text>
        </Group>
      }
      position="right"
      size="xl"
      padding="lg"
    >
      <Stack gap="md">
        <Paper p="md" withBorder radius="md" bg={isDark ? 'dark.6' : 'blue.0'}>
          <Grid>
            <Grid.Col span={6}>
              <Text size="xs" c="dimmed">Paciente</Text>
              <Text fw={600}>{item.patientName}</Text>
            </Grid.Col>
            <Grid.Col span={6}>
              <Text size="xs" c="dimmed">Data</Text>
              <Text fw={600}>{formatDate(appt?.date)} {appt?.time || ''}</Text>
            </Grid.Col>
            <Grid.Col span={6}>
              <Text size="xs" c="dimmed">Tipo</Text>
              <Group gap={4}>
                {item.type === 'TELECONSULTA' ? <Video size={14} /> : <Stethoscope size={14} />}
                <Text size="sm">{item.type === 'TELECONSULTA' ? 'Teleconsulta' : 'Presencial'}</Text>
              </Group>
            </Grid.Col>
            <Grid.Col span={6}>
              <Text size="xs" c="dimmed">Convênio</Text>
              <Text size="sm">{appt?.convenio || 'Particular'}</Text>
            </Grid.Col>
            {appt?.specialty && (
              <Grid.Col span={6}>
                <Text size="xs" c="dimmed">Especialidade</Text>
                <Text size="sm">{appt.specialty}</Text>
              </Grid.Col>
            )}
            {appt?.durationMinutes && (
              <Grid.Col span={6}>
                <Text size="xs" c="dimmed">Duração</Text>
                <Text size="sm">{appt.durationMinutes} min</Text>
              </Grid.Col>
            )}
          </Grid>
        </Paper>

        {hasVitals && (
          <>
            <Divider label="Sinais Vitais" labelPosition="left" />
            <Grid>
              {mr!.bloodPressureSystolic != null && mr!.bloodPressureDiastolic != null && (
                <Grid.Col span={4}>
                  <VitalItem label="Pressão Arterial" value={undefined} />
                  <Text size="xs" c="dimmed">Pressão Arterial</Text>
                  <Text size="sm" fw={500}>{mr!.bloodPressureSystolic}/{mr!.bloodPressureDiastolic} mmHg</Text>
                </Grid.Col>
              )}
              <Grid.Col span={4}>
                <VitalItem label="Freq. Cardíaca" value={mr!.heartRate} unit="bpm" />
              </Grid.Col>
              <Grid.Col span={4}>
                <VitalItem label="Temperatura" value={mr!.temperature} unit="°C" />
              </Grid.Col>
              <Grid.Col span={4}>
                <VitalItem label="Saturação O₂" value={mr!.oxygenSaturation} unit="%" />
              </Grid.Col>
              <Grid.Col span={4}>
                <VitalItem label="Peso" value={mr!.weight} unit="kg" />
              </Grid.Col>
              <Grid.Col span={4}>
                <VitalItem label="Altura" value={mr!.height} unit="cm" />
              </Grid.Col>
              <Grid.Col span={4}>
                <VitalItem label="IMC" value={mr!.bmi} />
              </Grid.Col>
            </Grid>
          </>
        )}

        {mr && (
          <>
            {mr.chiefComplaint && (
              <>
                <Divider label="Anamnese" labelPosition="left" />
                <Box>
                  <Text size="xs" c="dimmed" mb={2}>Queixa Principal</Text>
                  <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>{mr.chiefComplaint}</Text>
                </Box>
              </>
            )}

            {mr.historyOfPresentIllness && (
              <Box>
                <Text size="xs" c="dimmed" mb={2}>História da Doença Atual</Text>
                <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>{mr.historyOfPresentIllness}</Text>
              </Box>
            )}

            {mr.physicalExamination && (
              <>
                <Divider label="Exame Físico" labelPosition="left" />
                <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>{mr.physicalExamination}</Text>
              </>
            )}

            {mr.diagnosis && (
              <>
                <Divider label="Diagnóstico" labelPosition="left" />
                <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>{mr.diagnosis}</Text>
              </>
            )}

            {mr.treatment && (
              <>
                <Divider label="Conduta / Tratamento" labelPosition="left" />
                <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>{mr.treatment}</Text>
              </>
            )}

            {mr.prescriptions && (
              <>
                <Divider label="Prescrições" labelPosition="left" />
                <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>{mr.prescriptions}</Text>
              </>
            )}

            {mr.examRequests && (
              <>
                <Divider label="Solicitação de Exames" labelPosition="left" />
                <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>{mr.examRequests}</Text>
              </>
            )}

            {mr.notes && (
              <>
                <Divider label="Observações" labelPosition="left" />
                <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>{mr.notes}</Text>
              </>
            )}
          </>
        )}

        {!mr && (
          <Paper p="md" withBorder radius="md" ta="center">
            <FileText size={32} color="gray" />
            <Text c="dimmed" mt="xs">Sem prontuário registrado para este atendimento</Text>
          </Paper>
        )}
      </Stack>
    </Drawer>
  );
}

export function HistoricoAtendimentos() {
  const navigate = useNavigate();
  const isDark = useComputedColorScheme('light') === 'dark';
  const [search, setSearch] = useState('');
  const [type, setType] = useState('');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [page, setPage] = useState(1);
  const [selectedItem, setSelectedItem] = useState<HistoricoItem | null>(null);

  const [debouncedSearch] = useDebouncedValue(search, 400);

  const params = {
    search: debouncedSearch || undefined,
    type: type || undefined,
    startDate: startDate ? `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}-${String(startDate.getDate()).padStart(2, '0')}` : undefined,
    endDate: endDate ? `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}` : undefined,
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
  };

  const { data: rawData, isLoading } = useQuery({
    queryKey: ['historico', params],
    queryFn: () => consultationService.listHistorico(params),
  });

  const data = useMemo(() => {
    if (!rawData) return rawData;

    return {
      ...rawData,
      items: (rawData.items || []).map((rawItem: any) => {
        if (rawItem.appointment) return rawItem;

        const appointmentId = String(rawItem.appointmentId || rawItem.id || '').trim();
        const hasMedicalRecord = Boolean(rawItem.medicalRecord || rawItem.hasMedicalRecord);
        return {
          ...rawItem,
          status: rawItem.status || rawItem.appointmentStatus || '',
          appointment: {
            id: appointmentId,
            date: rawItem.date || '',
            time: rawItem.time || '',
            type: rawItem.type || '',
            specialty: rawItem.specialty || '',
            convenio: rawItem.convenio || undefined,
            durationMinutes: rawItem.durationMinutes,
            status: rawItem.appointmentStatus || '',
          },
          medicalRecord: rawItem.medicalRecord || (hasMedicalRecord ? {
            id: `${rawItem.id}-record`,
            chiefComplaint: rawItem.chiefComplaint || undefined,
            diagnosis: rawItem.diagnosis || undefined,
          } : undefined),
        };
      }),
    };
  }, [rawData]);

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  function handleFilterChange() {
    setPage(1);
  }

  return (
    <>
      <Header />
      <Box p="lg" maw={1200} mx="auto">
        <Group mb="lg" justify="space-between">
          <Group gap="sm">
            <ActionIcon
              variant="default"
              size="xl"
              onClick={() => navigate(-1)}
              aria-label="Voltar"
            >
              <ChevronLeft size={28} />
            </ActionIcon>
            <Calendar size={24} color={isDark ? 'var(--mantine-color-text)' : DARK_BLUE} />
            <Title order={2} c={isDark ? 'var(--mantine-color-text)' : DARK_BLUE}>Histórico de Atendimentos</Title>
          </Group>
          <Text size="sm" c="dimmed">{total} atendimento{total !== 1 ? 's' : ''} encontrado{total !== 1 ? 's' : ''}</Text>
        </Group>

        <Paper p="md" withBorder radius="md" mb="md">
          <Grid align="flex-end">
            <Grid.Col span={{ base: 12, sm: 4 }}>
              <TextInput
                label="Buscar paciente"
                placeholder="Nome do paciente..."
                leftSection={<Search size={16} />}
                value={search}
                onChange={(e) => { setSearch(e.currentTarget.value); handleFilterChange(); }}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 3 }}>
              <Select
                label="Tipo"
                data={TYPE_OPTIONS}
                value={type}
                onChange={(v) => { setType(v ?? ''); handleFilterChange(); }}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 2 }}>
              <DatePickerInput
                label="Data início"
                placeholder="DD/MM/AAAA"
                value={startDate}
                onChange={(v) => { setStartDate(v); handleFilterChange(); }}
                clearable
                valueFormat="DD/MM/YYYY"
                locale="pt-br"
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 2 }}>
              <DatePickerInput
                label="Data fim"
                placeholder="DD/MM/AAAA"
                value={endDate}
                onChange={(v) => { setEndDate(v); handleFilterChange(); }}
                clearable
                valueFormat="DD/MM/YYYY"
                locale="pt-br"
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 1 }}>
              <Button
                variant="subtle"
                onClick={() => { setSearch(''); setType(''); setStartDate(null); setEndDate(null); setPage(1); }}
                fullWidth
              >
                Limpar
              </Button>
            </Grid.Col>
          </Grid>
        </Paper>

        {isLoading ? (
          <Box ta="center" py="xl">
            <Loader />
          </Box>
        ) : items.length === 0 ? (
          <Paper p="xl" withBorder radius="md" ta="center">
            <Stethoscope size={40} color="gray" />
            <Text c="dimmed" mt="md">Nenhum atendimento encontrado</Text>
          </Paper>
        ) : (
          <Paper withBorder radius="md" style={{ overflow: 'hidden' }}>
            <Table highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Paciente</Table.Th>
                  <Table.Th>Data</Table.Th>
                  <Table.Th>Horário</Table.Th>
                  <Table.Th>Tipo</Table.Th>
                  <Table.Th>Especialidade</Table.Th>
                  <Table.Th>Convênio</Table.Th>
                  <Table.Th>Prontuário</Table.Th>
                  <Table.Th />
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {items.map((item) => (
                  <Table.Tr key={item.id} style={{ cursor: 'pointer' }} onClick={() => setSelectedItem(item)}>
                    <Table.Td>
                      <Text size="sm" fw={500}>{item.patientName}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{formatDate(item.appointment?.date)}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{item.appointment?.time || '-'}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Group gap={4}>
                        {item.type === 'TELECONSULTA' ? <Video size={14} /> : <Stethoscope size={14} />}
                        <Text size="sm">{item.type === 'TELECONSULTA' ? 'Teleconsulta' : 'Presencial'}</Text>
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{item.appointment?.specialty || '-'}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{item.appointment?.convenio || 'Particular'}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Badge
                        color={item.medicalRecord ? 'green' : 'gray'}
                        variant="light"
                        size="sm"
                      >
                        {item.medicalRecord ? 'Sim' : 'Não'}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Button size="xs" variant="light" leftSection={<FileText size={12} />}>
                        Ver
                      </Button>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Paper>
        )}

        {totalPages > 1 && (
          <Group justify="center" mt="lg">
            <Pagination total={totalPages} value={page} onChange={setPage} />
          </Group>
        )}
      </Box>

      <DetailDrawer item={selectedItem} onClose={() => setSelectedItem(null)} />
    </>
  );
}
