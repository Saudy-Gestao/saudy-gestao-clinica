import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Badge,
  Box,
  Button,
  Loader,
  DateInput,
  Drawer,
  Pagination,
  Paper,
  Select,
  Table,
  Text,
  TextInput,
} from '@/components/ui';
import { useDebouncedValue } from '@/components/ui';
import { CalendarDays, FileText, Search, Stethoscope, Video } from 'lucide-react';
import { Header } from '../Header/Header';
import consultationService, { type HistoricoItem } from '../../services/consultationService';
import './HistoricoAtendimentos.css';

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
    <Box className="historico-vital-item">
      <Text size="xs" c="dimmed">{label}</Text>
      <Text size="sm" fw={600}>{value}{unit ? ` ${unit}` : ''}</Text>
    </Box>
  );
}

function DetailDrawer({ item, onClose }: { item: HistoricoItem | null; onClose: () => void }) {
  if (!item) return null;

  const mr = item.medicalRecord;
  const appt = item.appointment;
  const isTeleconsultation = item.type === 'TELECONSULTA';
  const hasVitals = mr && (
    mr.bloodPressureSystolic != null || mr.heartRate != null || mr.temperature != null ||
    mr.oxygenSaturation != null || mr.weight != null || mr.height != null || mr.bmi != null
  );

  const recordSections = [
    ['Queixa principal', mr?.chiefComplaint],
    ['História da doença atual', mr?.historyOfPresentIllness],
    ['Exame físico', mr?.physicalExamination],
    ['Diagnóstico', mr?.diagnosis],
    ['Conduta / tratamento', mr?.treatment],
    ['Prescrições', mr?.prescriptions],
    ['Solicitação de exames', mr?.examRequests],
    ['Observações', mr?.notes],
  ].filter(([, value]) => value);

  return (
    <Drawer opened={Boolean(item)} onClose={onClose} title="Detalhes do atendimento" className="historico-detail-drawer">
      <Box className="historico-detail-content">
        <Paper className="historico-detail-summary" withBorder>
          <Box className="historico-detail-identity">
            <Box className="historico-detail-avatar">{item.patientName.slice(0, 1).toUpperCase()}</Box>
            <Box>
              <Text className="historico-detail-label">Paciente</Text>
              <Text className="historico-detail-name">{item.patientName}</Text>
            </Box>
          </Box>
          <Badge color={isTeleconsultation ? 'blue' : 'green'} variant="light">
            {isTeleconsultation ? 'Teleconsulta' : 'Presencial'}
          </Badge>
          <Box className="historico-detail-facts">
            <Box><Text className="historico-detail-label">Data e horário</Text><Text>{formatDate(appt?.date)} · {appt?.time || '-'}</Text></Box>
            <Box><Text className="historico-detail-label">Convênio</Text><Text>{appt?.convenio || 'Particular'}</Text></Box>
            {appt?.specialty && <Box><Text className="historico-detail-label">Especialidade</Text><Text>{appt.specialty}</Text></Box>}
            {appt?.durationMinutes && <Box><Text className="historico-detail-label">Duração</Text><Text>{appt.durationMinutes} min</Text></Box>}
          </Box>
        </Paper>

        {hasVitals && (
          <Box className="historico-detail-section">
            <Box className="historico-section-heading"><Text>Sinais vitais</Text><Text>Dados registrados no atendimento</Text></Box>
            <Box className="historico-vitals-grid">
              {mr!.bloodPressureSystolic != null && mr!.bloodPressureDiastolic != null && <Box className="historico-vital-item"><Text size="xs" c="dimmed">Pressão arterial</Text><Text size="sm" fw={600}>{mr!.bloodPressureSystolic}/{mr!.bloodPressureDiastolic} mmHg</Text></Box>}
              <VitalItem label="Freq. cardíaca" value={mr!.heartRate} unit="bpm" />
              <VitalItem label="Temperatura" value={mr!.temperature} unit="°C" />
              <VitalItem label="Saturação O₂" value={mr!.oxygenSaturation} unit="%" />
              <VitalItem label="Peso" value={mr!.weight} unit="kg" />
              <VitalItem label="Altura" value={mr!.height} unit="cm" />
              <VitalItem label="IMC" value={mr!.bmi} />
            </Box>
          </Box>
        )}

        {recordSections.length > 0 ? (
          <Box className="historico-record-sections">
            <Box className="historico-section-heading"><Text>Prontuário clínico</Text><Text>Informações registradas pelo profissional</Text></Box>
            {recordSections.map(([label, value]) => <Box className="historico-record-block" key={label}><Text className="historico-detail-label">{label}</Text><Text className="historico-record-value">{value}</Text></Box>)}
          </Box>
        ) : (
          <Paper className="historico-empty-record" withBorder><FileText size={28} /><Text>Sem prontuário registrado para este atendimento</Text><Text size="sm">Não há informações clínicas adicionais disponíveis.</Text></Paper>
        )}
      </Box>
    </Drawer>
  );
}

export function HistoricoAtendimentos() {
  const navigate = useNavigate();
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
      <Header back={{ label: 'Voltar', onClick: () => navigate(-1) }} />
      <Box className="historico-page">
        <Box className="historico-hero ui-page-intro">
          <Box className="historico-hero-copy">
            <Box className="historico-hero-icon"><CalendarDays size={22} /></Box>
            <Box>
              <Text className="historico-eyebrow">REGISTRO CLÍNICO</Text>
              <Text component="h1" className="historico-title">Histórico de atendimentos</Text>
              <Text className="historico-subtitle">Consulte atendimentos concluídos e os registros clínicos associados.</Text>
            </Box>
          </Box>
          <Box className="historico-total"><Text className="historico-total-value">{total}</Text><Text className="historico-total-label">{total === 1 ? 'atendimento encontrado' : 'atendimentos encontrados'}</Text></Box>
        </Box>

        <Paper className="historico-filter-panel" withBorder>
          <Box className="historico-panel-heading"><Box><Text className="historico-panel-title">Filtrar histórico</Text><Text className="historico-panel-description">Refine os resultados por paciente, tipo ou período.</Text></Box><Button className="historico-clear-button" variant="subtle" onClick={() => { setSearch(''); setType(''); setStartDate(null); setEndDate(null); setPage(1); }}>Limpar filtros</Button></Box>
          <Box className="historico-filter-grid">
            <TextInput className="historico-search-field" label="Buscar paciente" placeholder="Nome do paciente ou CPF" leftSection={<Search size={16} />} value={search} onChange={(e) => { setSearch(e.currentTarget.value); handleFilterChange(); }} />
            <Select label="Tipo de atendimento" data={TYPE_OPTIONS} value={type} onChange={(v) => { setType(v ?? ''); handleFilterChange(); }} />
            <DateInput className="historico-date-field" label="Data inicial" value={startDate} onChange={(date) => { setStartDate(date ?? null); handleFilterChange(); }} />
            <DateInput className="historico-date-field" label="Data final" value={endDate} onChange={(date) => { setEndDate(date ?? null); handleFilterChange(); }} />
          </Box>
        </Paper>

        <Box className="historico-results-header"><Box><Text className="historico-results-title">Atendimentos encontrados</Text><Text className="historico-results-description">Clique em um registro para visualizar o prontuário completo.</Text></Box>{!isLoading && <Badge variant="light">Página {page}{totalPages > 1 ? ` de ${totalPages}` : ''}</Badge>}</Box>

        {isLoading ? (
          <Box className="historico-loading"><Loader /><Text>Carregando histórico...</Text></Box>
        ) : items.length === 0 ? (
          <Paper className="historico-empty-state" withBorder><Box className="historico-empty-icon"><Stethoscope size={25} /></Box><Text className="historico-empty-title">Nenhum atendimento encontrado</Text><Text className="historico-empty-description">Tente remover algum filtro ou buscar por outro paciente.</Text></Paper>
        ) : (
          <Box className="historico-table-shell">
            <Table className="historico-table">
              <Table.Thead><Table.Tr><Table.Th>Paciente</Table.Th><Table.Th>Data e horário</Table.Th><Table.Th>Tipo</Table.Th><Table.Th>Especialidade</Table.Th><Table.Th>Convênio</Table.Th><Table.Th>Prontuário</Table.Th><Table.Th className="historico-actions-column">Ação</Table.Th></Table.Tr></Table.Thead>
              <Table.Tbody>
                {items.map((item) => (
                  <Table.Tr key={item.id} onClick={() => setSelectedItem(item)}>
                    <Table.Td><Box className="historico-patient-cell"><Box className="historico-patient-avatar">{item.patientName.slice(0, 1).toUpperCase()}</Box><Box className="historico-patient-copy"><Text fw={650}>{item.patientName}</Text><Text size="xs" c="dimmed">{item.appointment?.id ? `Atendimento #${item.appointment.id.slice(0, 8)}` : 'Registro clínico'}</Text></Box></Box></Table.Td>
                    <Table.Td><Text className="historico-date-value">{formatDate(item.appointment?.date)} <span>·</span> {item.appointment?.time || '-'}</Text></Table.Td>
                    <Table.Td><Badge className="historico-type-badge" variant="light" color={item.type === 'TELECONSULTA' ? 'blue' : 'green'}>{item.type === 'TELECONSULTA' ? <><Video size={13} /> Teleconsulta</> : <><Stethoscope size={13} /> Presencial</>}</Badge></Table.Td>
                    <Table.Td><Text className="historico-truncate" title={item.appointment?.specialty || '-'}>{item.appointment?.specialty || '-'}</Text></Table.Td>
                    <Table.Td><Text className="historico-truncate" title={item.appointment?.convenio || 'Particular'}>{item.appointment?.convenio || 'Particular'}</Text></Table.Td>
                    <Table.Td><Badge color={item.medicalRecord ? 'green' : 'gray'} variant="light">{item.medicalRecord ? 'Registrado' : 'Sem registro'}</Badge></Table.Td>
                    <Table.Td className="historico-actions-column"><Button className="historico-view-button" size="sm" variant="outline" leftSection={<FileText size={14} />} onClick={(event) => { event.stopPropagation(); setSelectedItem(item); }}>Ver detalhes</Button></Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Box>
        )}

        {!isLoading && items.length > 0 && (
          <Box className="historico-mobile-list">
            {items.map((item) => (
              <Paper className="historico-mobile-card" key={`mobile-${item.id}`} withBorder onClick={() => setSelectedItem(item)}>
                <Box className="historico-mobile-card-header">
                  <Box className="historico-patient-cell">
                    <Box className="historico-patient-avatar">{item.patientName.slice(0, 1).toUpperCase()}</Box>
                    <Box className="historico-patient-copy">
                      <Text fw={650}>{item.patientName}</Text>
                      <Text size="xs" c="dimmed">{item.appointment?.id ? `Atendimento #${item.appointment.id.slice(0, 8)}` : 'Registro clínico'}</Text>
                    </Box>
                  </Box>
                  <Badge color={item.type === 'TELECONSULTA' ? 'blue' : 'green'} variant="light">
                    {item.type === 'TELECONSULTA' ? 'Teleconsulta' : 'Presencial'}
                  </Badge>
                </Box>
                <Box className="historico-mobile-card-facts">
                  <Box><Text className="historico-detail-label">Data e horário</Text><Text>{formatDate(item.appointment?.date)} · {item.appointment?.time || '-'}</Text></Box>
                  <Box><Text className="historico-detail-label">Procedimento</Text><Text className="historico-truncate" title={item.appointment?.specialty || '-'}>{item.appointment?.specialty || '-'}</Text></Box>
                  <Box><Text className="historico-detail-label">Convênio</Text><Text className="historico-truncate" title={item.appointment?.convenio || 'Particular'}>{item.appointment?.convenio || 'Particular'}</Text></Box>
                  <Box><Text className="historico-detail-label">Prontuário</Text><Badge color={item.medicalRecord ? 'green' : 'gray'} variant="light">{item.medicalRecord ? 'Registrado' : 'Sem registro'}</Badge></Box>
                </Box>
                <Button className="historico-mobile-view-button" variant="outline" leftSection={<FileText size={14} />} onClick={(event) => { event.stopPropagation(); setSelectedItem(item); }}>Ver detalhes</Button>
              </Paper>
            ))}
          </Box>
        )}

        {totalPages > 1 && <Box className="historico-pagination"><Text size="sm" c="dimmed">Página {page} de {totalPages}</Text><Pagination total={totalPages} value={page} onChange={setPage} /></Box>}
      </Box>

      <DetailDrawer item={selectedItem} onClose={() => setSelectedItem(null)} />
    </>
  );
}
