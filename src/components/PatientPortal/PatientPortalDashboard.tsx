import { type ReactNode, useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Card,
  Group,
  Loader,
  Modal,
  Paper,
  Select,
  Skeleton,
  SimpleGrid,
  Stack,
  Tabs,
  Text,
  Textarea,
  Title,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { CalendarDays, Check, ClipboardList, Download, Eye, FileClock, FileText, FolderOpen, LogOut, Moon, ShieldCheck, Stethoscope, Sun, X } from 'lucide-react';
import patientPortalService, {
  type PatientPortalAccessLogItem,
  type PatientPortalAppointmentItem,
  type PatientPortalDeliveryRequestItem,
  type PatientPortalDocumentItem,
  type PatientPortalProfileItem,
  type PatientPortalUpcomingConsultationItem,
  type PatientPortalReportItem,
  type PatientPortalSummary,
} from '../../services/patientPortalService';
import patientPortalAuthService from '../../services/patientPortalAuthService';
import { formatCPF } from '../../utils/formatters';
import { usePatientPortalTheme } from './usePatientPortalTheme';
import { showErrorToast, showSuccessToast } from '../../lib/toast';
import './patient-portal.css';

const formatDateTime = (date?: string | null, time?: string | null) => {
  const rawDate = String(date || '').trim();
  if (!rawDate) return 'Data não informada';
  const formattedDate = dayjs(rawDate).isValid() ? dayjs(rawDate).format('DD/MM/YYYY') : rawDate;
  const rawTime = String(time || '').trim();
  return rawTime ? `${formattedDate} às ${rawTime}` : formattedDate;
};

const formatFileSize = (sizeBytes?: number | null) => {
  const size = Number(sizeBytes || 0);
  if (!Number.isFinite(size) || size <= 0) return '-';
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

const getDocumentSourceLabel = (source: PatientPortalDocumentItem['source']) => {
  if (source === 'pre-scheduling') return 'Pré-agendamento';
  if (source === 'appointment-attachment') return 'Anexo clínico';
  return 'Laudo';
};

const statusTone = (status?: string | null): 'red' | 'teal' | 'blue' => {
  const normalized = normalizeAppointmentStatus(status);
  if (normalized.includes('CANCEL')) return 'red';
  if (normalized === 'REALIZADO' || normalized.includes('FINAL') || normalized.includes('CONCLU') || normalized.includes('LIBER')) return 'teal';
  if (normalized === 'NAO_COMPARECEU') return 'blue';
  return 'blue';
};

const normalizeAppointmentStatus = (status?: string | null): string => {
  const normalized = String(status || '').trim().toUpperCase();
  if (normalized === 'REALIZADO' || normalized === 'COMPLETED' || normalized === 'FINALIZADO' || normalized === 'ATENDIDO') return 'REALIZADO';
  if (normalized === 'NAO_COMPARECEU' || normalized === 'NÃO_COMPARECEU' || normalized === 'NO_SHOW' || normalized === 'NO-SHOW' || normalized === 'AUSENTE' || normalized === 'FALTOU') return 'NAO_COMPARECEU';
  if (normalized === 'CONFIRMADO' || normalized === 'CONFIRMED') return 'CONFIRMADO';
  if (normalized === 'CANCELED') return 'CANCELADO';
  if (normalized === 'AGENDADO' || normalized === 'SCHEDULED') return 'AGENDADO';
  if (normalized === 'PENDENTE') return 'AGENDADO';
  return normalized || 'AGENDADO';
};

const getAppointmentStatusLabel = (status?: string | null): string => {
  const normalized = normalizeAppointmentStatus(status);
  if (normalized === 'CONFIRMADO') return 'Confirmado';
  if (normalized === 'NAO_COMPARECEU') return 'Não compareceu';
  if (normalized === 'REALIZADO') return 'Realizado';
  if (normalized === 'CANCELADO') return 'Cancelado';
  return 'Agendado';
};

type RecordCardProps = {
  kind: 'consultation' | 'exam';
  title: ReactNode;
  subtitle: ReactNode;
  status?: string | null;
  details?: ReactNode;
  extra?: ReactNode;
  badges?: ReactNode;
  action?: ReactNode;
  timeline?: ReactNode;
};

function RecordCard({ kind, title, subtitle, status, details, extra, badges, action, timeline }: RecordCardProps) {
  return (
    <Card className="patient-portal-record-card" withBorder radius="md">
      <Stack gap={12}>
        <Group justify="space-between" align="flex-start" wrap="wrap" gap="sm">
          <Stack gap={6} className="patient-portal-record-main">
            <Group gap={8}>
              <span className={`patient-portal-record-icon patient-portal-record-icon--${kind}`}>
                {kind === 'consultation' ? <Stethoscope size={14} /> : <CalendarDays size={14} />}
              </span>
              <Text className="patient-portal-record-title">{title}</Text>
            </Group>
            <Text className="patient-portal-record-subtitle">{subtitle}</Text>
            {details ? <Text size="sm">{details}</Text> : null}
          </Stack>
          <Stack gap={8} align="flex-end" className="patient-portal-record-side">
            <Badge variant="light" color={statusTone(status)}>{getAppointmentStatusLabel(status)}</Badge>
            {action}
          </Stack>
        </Group>
        {(badges || extra) ? (
          <Group gap={8} wrap="wrap">
            {badges}
            {extra ? <Badge variant="light" color="gray">{extra}</Badge> : null}
          </Group>
        ) : null}
        {timeline}
      </Stack>
    </Card>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <Paper className="patient-portal-empty-state" withBorder radius="md">
      <Text c="dimmed">{message}</Text>
    </Paper>
  );
}

type TimelineStepState = 'done' | 'current' | 'pending';

type UpcomingTimelineProps = {
  kind: 'consultation' | 'exam';
  appointmentStatus?: string | null;
  hasAnamnesis?: boolean;
  anamnesisAnswered?: boolean;
  interactionCompleted?: boolean;
  canPrepare?: boolean;
  isUpcoming?: boolean;
};

function UpcomingTimeline({
  kind,
  appointmentStatus,
  hasAnamnesis = false,
  anamnesisAnswered = false,
  interactionCompleted = false,
  canPrepare = false,
  isUpcoming = false,
}: UpcomingTimelineProps) {
  const normalizedStatus = normalizeAppointmentStatus(appointmentStatus);
  const isScheduled = normalizedStatus === 'AGENDADO' || normalizedStatus === 'PENDENTE';
  const isConfirmed = normalizedStatus === 'CONFIRMADO';
  const isCompleted = normalizedStatus === 'REALIZADO';
  const isNoShow = normalizedStatus === 'NAO_COMPARECEU';
  const isCanceled = normalizedStatus === 'CANCELADO' || isNoShow;

  if (!isUpcoming) {
    const stepAgendada: TimelineStepState = 'done';
    const stepConfirmada: TimelineStepState = isCompleted || isConfirmed || isCanceled ? 'done' : (isScheduled ? 'current' : 'pending');
    const stepFinal: TimelineStepState = isCompleted || isCanceled ? 'done' : (isConfirmed ? 'current' : 'pending');

    const finalLabel = isCompleted ? (kind === 'consultation' ? 'Atendimento realizado' : 'Exame realizado') : (isNoShow ? 'Não compareceu' : (isCanceled ? 'Cancelado' : 'Desfecho'));
    const finalStateClass = isNoShow ? 'patient-portal-timeline-step--noshow' : (isCanceled ? 'patient-portal-timeline-step--canceled' : '');

    const steps = [
      { label: 'Agendada', state: stepAgendada, icon: <Check size={11} /> },
      { label: 'Confirmada', state: stepConfirmada, icon: stepConfirmada === 'done' ? <Check size={11} /> : <span /> },
      { label: finalLabel, state: stepFinal, icon: isCanceled ? <X size={11} /> : (stepFinal === 'done' ? <Check size={11} /> : <span />), extraClass: finalStateClass },
    ];

    return (
      <Box className="patient-portal-timeline patient-portal-timeline--history">
        {steps.map((step, index) => (
          <Box
            key={`${step.label}-${index}`}
            className={`patient-portal-timeline-step patient-portal-timeline-step--${step.state} ${step.extraClass || ''}`}
          >
            <span className="patient-portal-timeline-dot">{step.icon}</span>
            <span className="patient-portal-timeline-label">{step.label}</span>
            {index < steps.length - 1 ? <span className="patient-portal-timeline-line" /> : null}
          </Box>
        ))}
      </Box>
    );
  }

  const stepAgendada: TimelineStepState = 'done';
  const stepConfirmada: TimelineStepState = isCompleted || isConfirmed ? 'done' : (isScheduled ? 'current' : 'pending');
  const stepAnamnese: TimelineStepState = hasAnamnesis
    ? (isCompleted ? 'done' : (anamnesisAnswered ? 'done' : ((isConfirmed || canPrepare) && !isCanceled ? 'current' : 'pending')))
    : 'done';
  const canStartPreparation = !hasAnamnesis || anamnesisAnswered;
  const stepPreparo: TimelineStepState = isCompleted
    ? 'done'
    : (interactionCompleted ? 'done' : ((isConfirmed || canPrepare) && canStartPreparation && !isCanceled ? 'current' : 'pending'));

  const steps = [
    { label: 'Agendada', state: stepAgendada, icon: <Check size={11} /> },
    { label: 'Confirmada', state: stepConfirmada, icon: stepConfirmada === 'done' ? <Check size={11} /> : <span /> },
    { label: hasAnamnesis ? 'Anamnese' : 'Sem anamnese', state: stepAnamnese, icon: stepAnamnese === 'done' ? <Check size={11} /> : <span /> },
    { label: 'Preparo', state: stepPreparo, icon: stepPreparo === 'done' ? <Check size={11} /> : <span /> },
  ];

  return (
    <Box className="patient-portal-timeline">
      {steps.map((step, index) => (
        <Box
          key={`${step.label}-${index}`}
          className={`patient-portal-timeline-step patient-portal-timeline-step--${step.state}`}
        >
          <span className="patient-portal-timeline-dot">{step.icon}</span>
          <span className="patient-portal-timeline-label">{step.label}</span>
          {index < steps.length - 1 ? <span className="patient-portal-timeline-line" /> : null}
        </Box>
      ))}
    </Box>
  );
}

function SkeletonCards({ count = 3 }: { count?: number }) {
  return (
    <Stack gap="sm">
      {Array.from({ length: count }).map((_, index) => (
        <Card key={index} className="patient-portal-record-card patient-portal-skeleton-card" withBorder radius="md">
          <Box className="patient-portal-skeleton-line patient-portal-skeleton-line--title" />
          <Box className="patient-portal-skeleton-line patient-portal-skeleton-line--subtitle" />
          <Box className="patient-portal-skeleton-line patient-portal-skeleton-line--small" />
        </Card>
      ))}
    </Stack>
  );
}

function PatientPortalDashboardSkeleton() {
  return (
    <Box className="patient-portal-dashboard-page">
      <Box className="patient-portal-dashboard-bg" />
      <Stack className="patient-portal-dashboard-shell" gap="lg">
        <Paper className="patient-portal-hero-card" withBorder>
          <Stack gap="md">
            <Skeleton height={20} width={130} radius="xl" />
            <Skeleton height={34} width="45%" radius="md" />
            <Skeleton height={16} width="60%" radius="md" />
          </Stack>
        </Paper>
        <SimpleGrid cols={{ base: 1, sm: 3 }}>
          <Skeleton height={110} radius="md" />
          <Skeleton height={110} radius="md" />
          <Skeleton height={110} radius="md" />
        </SimpleGrid>
        <Paper className="patient-portal-content-card" withBorder>
          <Stack p="md" gap="sm">
            <Skeleton height={36} radius="md" />
            <Skeleton height={98} radius="md" />
            <Skeleton height={98} radius="md" />
            <Skeleton height={98} radius="md" />
          </Stack>
        </Paper>
      </Stack>
    </Box>
  );
}

export function PatientPortalDashboard() {
  const { isDark, toggleTheme } = usePatientPortalTheme();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string | null>('upcoming');
  const [loadingUpcoming, setLoadingUpcoming] = useState(false);
  const [loadingConsultations, setLoadingConsultations] = useState(false);
  const [loadingExams, setLoadingExams] = useState(false);
  const [loadingReports, setLoadingReports] = useState(false);
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  const [loadingDeliveryHistory, setLoadingDeliveryHistory] = useState(false);
  const [loadingProfiles, setLoadingProfiles] = useState(false);
  const [switchingProfileTo, setSwitchingProfileTo] = useState<string | null>(null);
  const [summary, setSummary] = useState<PatientPortalSummary | null>(null);
  const [profiles, setProfiles] = useState<PatientPortalProfileItem[]>([]);
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
  const [consultations, setConsultations] = useState<PatientPortalAppointmentItem[]>([]);
  const [exams, setExams] = useState<PatientPortalAppointmentItem[]>([]);
  const [reports, setReports] = useState<PatientPortalReportItem[]>([]);
  const [documents, setDocuments] = useState<PatientPortalDocumentItem[]>([]);
  const [accessLogs, setAccessLogs] = useState<PatientPortalAccessLogItem[]>([]);
  const [deliveryRequests, setDeliveryRequests] = useState<PatientPortalDeliveryRequestItem[]>([]);
  const [upcomingConsultations, setUpcomingConsultations] = useState<PatientPortalUpcomingConsultationItem[]>([]);
  const [openingPreSchedulingFor, setOpeningPreSchedulingFor] = useState<string | null>(null);
  const [openingDocumentId, setOpeningDocumentId] = useState<string | null>(null);
  const [reportDeliveryModalOpen, setReportDeliveryModalOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<PatientPortalReportItem | null>(null);
  const [preferredDeliveryDate, setPreferredDeliveryDate] = useState('');
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [requestingDeliveryFor, setRequestingDeliveryFor] = useState<string | null>(null);

  const patientName = useMemo(() => summary?.patient?.name || 'Paciente', [summary?.patient?.name]);
  const activeProfile = useMemo(
    () => profiles.find((profile) => profile.id === activeProfileId) || null,
    [profiles, activeProfileId],
  );

  const loadSummary = async () => {
    const summaryData = await patientPortalService.getSummary();
    setSummary(summaryData);
  };

  const loadProfiles = async () => {
    setLoadingProfiles(true);
    try {
      const data = await patientPortalService.listProfiles();
      setProfiles(data.profiles || []);
      setActiveProfileId(data.activePatientId || data.profiles?.find((profile) => profile.selected)?.id || null);
    } finally {
      setLoadingProfiles(false);
    }
  };

  const loadUpcoming = async () => {
    setLoadingUpcoming(true);
    try {
      const upcomingData = await patientPortalService.listUpcomingConsultations({ limit: 8, offset: 0 });
      setUpcomingConsultations(upcomingData.items || []);
    } finally {
      setLoadingUpcoming(false);
    }
  };

  const loadConsultations = async () => {
    setLoadingConsultations(true);
    try {
      const consultationsData = await patientPortalService.listConsultations({ limit: 100, offset: 0 });
      setConsultations(consultationsData.items || []);
    } finally {
      setLoadingConsultations(false);
    }
  };

  const loadExams = async () => {
    setLoadingExams(true);
    try {
      const examsData = await patientPortalService.listExams({ limit: 100, offset: 0 });
      setExams(examsData.items || []);
    } finally {
      setLoadingExams(false);
    }
  };

  const loadReports = async () => {
    setLoadingReports(true);
    try {
      const reportsData = await patientPortalService.listReports({ limit: 100, offset: 0 });
      setReports(reportsData.items || []);
    } finally {
      setLoadingReports(false);
    }
  };

  const loadDocuments = async () => {
    setLoadingDocuments(true);
    try {
      const [documentsData, accessLogsData] = await Promise.all([
        patientPortalService.listDocuments({ limit: 100, offset: 0 }),
        patientPortalService.listAccessLogs({ limit: 10 }),
      ]);
      setDocuments(documentsData.items || []);
      setAccessLogs(accessLogsData.items || []);
    } finally {
      setLoadingDocuments(false);
    }
  };

  const loadDeliveryHistory = async () => {
    setLoadingDeliveryHistory(true);
    try {
      const deliveryData = await patientPortalService.listDeliveryRequests({ limit: 20, offset: 0 });
      setDeliveryRequests(deliveryData.items || []);
    } finally {
      setLoadingDeliveryHistory(false);
    }
  };

  const openPreSchedulingFlow = async (appointment: PatientPortalUpcomingConsultationItem) => {
    if (!appointment?.id) return;
    setOpeningPreSchedulingFor(appointment.id);
    try {
      const response = await patientPortalService.getPreSchedulingLink(appointment.id);
      if (response?.publicUrl) {
        window.location.href = response.publicUrl;
        return;
      }
      notifications.show({
        title: 'Link indisponível',
        message: 'Não foi possível abrir o fluxo de preparo/anamnese para esta consulta.',
        color: 'yellow',
      });
    } catch (error: unknown) {
      showErrorToast({
        title: 'Falha ao abrir preparo',
        error,
        fallback: 'Não foi possível abrir o link de preparo/anamnese.',
      });
    } finally {
      setOpeningPreSchedulingFor(null);
    }
  };

  const handleSelectProfile = async (nextPatientId: string | null) => {
    const targetId = String(nextPatientId || '').trim();
    if (!targetId || targetId === activeProfileId) return;
    setSwitchingProfileTo(targetId);
    try {
      const response = await patientPortalAuthService.selectProfile(targetId);
      setActiveProfileId(response?.patient?.id || targetId);
      if (response?.patient) {
        localStorage.setItem('patient_portal_user', JSON.stringify(response.patient));
      }
      await Promise.all([
        loadProfiles(),
        loadSummary(),
        loadUpcoming(),
        loadConsultations(),
        loadExams(),
        loadReports(),
        loadDocuments(),
        loadDeliveryHistory(),
      ]);
      showSuccessToast({
        title: 'Perfil alterado',
        message: 'Os dados do portal foram atualizados para o perfil selecionado.',
      });
    } catch (error: unknown) {
      showErrorToast({
        title: 'Falha ao trocar perfil',
        error,
        fallback: 'Não foi possível alterar o perfil ativo.',
      });
    } finally {
      setSwitchingProfileTo(null);
    }
  };

  const downloadReportPdf = async (report: PatientPortalReportItem) => {
    try {
      const blob = await patientPortalService.downloadReportPdf(report.id);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `laudo-${report.id}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error: unknown) {
      showErrorToast({
        title: 'Falha no download',
        error,
        fallback: 'Não foi possível baixar o PDF do laudo.',
      });
    }
  };

  const openDocument = async (docItem: PatientPortalDocumentItem) => {
    setOpeningDocumentId(docItem.id);
    try {
      const blob = await patientPortalService.downloadDocument(docItem.source, docItem.sourceId);
      const url = window.URL.createObjectURL(blob);
      const isInlineFriendly = String(docItem.mimeType || '').includes('pdf') || String(docItem.mimeType || '').startsWith('image/');

      if (isInlineFriendly) {
        const tab = window.open(url, '_blank', 'noopener,noreferrer');
        if (!tab) {
          const link = document.createElement('a');
          link.href = url;
          link.download = docItem.fileName || 'documento';
          document.body.appendChild(link);
          link.click();
          link.remove();
        }
      } else {
        const link = document.createElement('a');
        link.href = url;
        link.download = docItem.fileName || 'documento';
        document.body.appendChild(link);
        link.click();
        link.remove();
      }
      window.setTimeout(() => window.URL.revokeObjectURL(url), 1000);
    } catch (error: unknown) {
      showErrorToast({
        title: 'Falha ao abrir documento',
        error,
        fallback: 'Não foi possível abrir este documento.',
      });
    } finally {
      setOpeningDocumentId(null);
    }
  };

  const openReportDeliveryModal = (report: PatientPortalReportItem) => {
    setSelectedReport(report);
    setPreferredDeliveryDate(dayjs().format('YYYY-MM-DD'));
    setDeliveryNotes('');
    setReportDeliveryModalOpen(true);
  };

  const handleRequestPhysicalDelivery = async () => {
    if (!selectedReport?.id) return;
    setRequestingDeliveryFor(selectedReport.id);
    try {
      await patientPortalService.requestPhysicalReportDelivery(selectedReport.id, {
        preferredDate: preferredDeliveryDate || undefined,
        notes: deliveryNotes || undefined,
      });
      showSuccessToast({
        title: 'Solicitação registrada',
        message: 'Pedido de entrega física enviado para a clínica.',
      });
      setReportDeliveryModalOpen(false);
      setSelectedReport(null);
      await Promise.all([loadReports(), loadDeliveryHistory()]);
    } catch (error: unknown) {
      showErrorToast({
        title: 'Falha na solicitação',
        error,
        fallback: 'Não foi possível solicitar a entrega física.',
      });
    } finally {
      setRequestingDeliveryFor(null);
    }
  };

  useEffect(() => {
    const boot = async () => {
      setLoading(true);
      try {
        await Promise.all([loadSummary(), loadProfiles(), loadUpcoming()]);
      } catch (error: unknown) {
        showErrorToast({
          title: 'Erro ao carregar portal',
          error,
          fallback: 'Não foi possível carregar seus dados.',
        });
      } finally {
        setLoading(false);
      }
    };

    void boot();
  }, []);

  useEffect(() => {
    if (!activeTab) return;
    if (activeTab === 'consultations' && consultations.length === 0 && !loadingConsultations) void loadConsultations();
    if (activeTab === 'exams' && exams.length === 0 && !loadingExams) void loadExams();
    if (activeTab === 'documents' && documents.length === 0 && !loadingDocuments) void loadDocuments();
    if (profiles.length === 0 && !loadingProfiles) void loadProfiles();
    if (activeTab === 'reports' && reports.length === 0 && !loadingReports) {
      void Promise.all([loadReports(), loadDeliveryHistory()]);
    }
  }, [activeTab]);

  const handleLogout = () => {
    patientPortalAuthService.logout();
    window.location.replace('/portal/login');
  };

  if (loading && !summary) {
    return <PatientPortalDashboardSkeleton />;
  }

  return (
    <Box className="patient-portal-dashboard-page">
      <a href="#patient-portal-main-content" className="patient-portal-skip-link">Ir para conteúdo principal</a>
      <Box className="patient-portal-dashboard-bg" />
      <Stack className="patient-portal-dashboard-shell" gap="lg" role="main" aria-label="Área do paciente">
        <Paper className="patient-portal-hero-card" withBorder>
          <Group justify="space-between" align="flex-start" wrap="wrap" gap="md">
            <Stack gap={4}>
              <Badge className="patient-portal-kicker">Portal do Paciente</Badge>
              <Title className="patient-portal-hero-greeting">Olá, {patientName}</Title>
              <Text c="dimmed">
                CPF: {formatCPF(summary?.patient?.cpf || '')}
                {summary?.patient?.email ? ` • ${summary.patient.email}` : ''}
              </Text>
            </Stack>
            <Stack gap="sm" align="flex-end">
              <Group>
                <ActionIcon
                  variant="light"
                  color="blue"
                  size="lg"
                  radius="xl"
                  onClick={toggleTheme}
                  aria-label="Alternar tema"
                >
                  {isDark ? <Sun size={18} /> : <Moon size={18} />}
                </ActionIcon>
                <Button leftSection={<LogOut size={16} />} variant="light" color="red" onClick={handleLogout}>
                  Sair
                </Button>
              </Group>
              <Box className="patient-portal-profile-switch">
                <Text size="xs" c="dimmed">Perfil ativo</Text>
                <Select
                  aria-label="Selecionar perfil do paciente"
                  value={activeProfileId}
                  onChange={(value) => void handleSelectProfile(value)}
                  data={profiles.map((profile) => ({
                    value: profile.id,
                    label: `${profile.name || 'Paciente'} • ${profile.relationship}`,
                  }))}
                  disabled={loadingProfiles || Boolean(switchingProfileTo) || profiles.length <= 1}
                  rightSection={switchingProfileTo ? <Loader size={14} /> : null}
                  comboboxProps={{ withinPortal: true }}
                />
                {activeProfile ? <Text size="xs" c="dimmed">{`Acessando como: ${activeProfile.relationship}`}</Text> : null}
                {profiles.length <= 1 ? (
                  <Text size="xs" c="dimmed">Nenhum dependente autorizado encontrado para troca de perfil.</Text>
                ) : null}
              </Box>
            </Stack>
          </Group>
        </Paper>

        <SimpleGrid cols={{ base: 1, sm: 3 }}>
          <Card className="patient-portal-stat-card patient-portal-stat-card--consultation" withBorder>
            <Group justify="space-between">
              <Text fw={600}>Consultas</Text>
              <Stethoscope size={18} />
            </Group>
            <Title order={2}>{summary?.stats?.consultationsCount ?? 0}</Title>
          </Card>
          <Card className="patient-portal-stat-card patient-portal-stat-card--exam" withBorder>
            <Group justify="space-between">
              <Text fw={600}>Exames</Text>
              <CalendarDays size={18} />
            </Group>
            <Title order={2}>{summary?.stats?.examsCount ?? 0}</Title>
          </Card>
          <Card className="patient-portal-stat-card patient-portal-stat-card--report" withBorder>
            <Group justify="space-between">
              <Text fw={600}>Laudos liberados</Text>
              <FileText size={18} />
            </Group>
            <Title order={2}>{summary?.stats?.reportsCount ?? 0}</Title>
          </Card>
        </SimpleGrid>

        <Paper className="patient-portal-content-card" withBorder id="patient-portal-main-content">
          <Tabs value={activeTab} onChange={setActiveTab} classNames={{ tab: 'patient-portal-tab', list: 'patient-portal-tab-list' }}>
            <Tabs.List grow>
              <Tabs.Tab value="upcoming" leftSection={<CalendarDays size={14} />}>Próximas consultas</Tabs.Tab>
              <Tabs.Tab value="consultations" leftSection={<Stethoscope size={14} />}>Consultas</Tabs.Tab>
              <Tabs.Tab value="exams" leftSection={<CalendarDays size={14} />}>Exames</Tabs.Tab>
              <Tabs.Tab value="documents" leftSection={<FolderOpen size={14} />}>Documentos</Tabs.Tab>
              <Tabs.Tab value="reports" leftSection={<ClipboardList size={14} />}>Laudos</Tabs.Tab>
            </Tabs.List>

            <Tabs.Panel value="upcoming" pt="md">
              {loadingUpcoming ? (
                <SkeletonCards count={3} />
              ) : (
                <Stack gap="sm">
                  {upcomingConsultations.map((appointment) => {
                  const hasAnamnesis = Boolean(appointment.preScheduling?.hasAnamnesis);
                  const actionLabel = hasAnamnesis ? 'Preencher anamnese' : 'Visualizar preparo';
                  return (
                    <RecordCard
                      key={appointment.id}
                      kind="consultation"
                      title={appointment.specialty || 'Consulta'}
                      subtitle={formatDateTime(appointment.date, appointment.time)}
                      status={appointment.status}
                      details={appointment.doctorName ? `Médico(a): ${appointment.doctorName}` : 'Médico não informado'}
                      badges={
                        <>
                          {hasAnamnesis ? <Badge variant="light" color="grape">Anamnese disponível</Badge> : null}
                          {appointment.preScheduling?.interactionCompleted ? <Badge variant="light" color="teal">Preparo já enviado</Badge> : null}
                        </>
                      }
                      action={(
                        <Button
                          size="sm"
                          radius="xl"
                          className="patient-portal-record-action"
                          loading={openingPreSchedulingFor === appointment.id}
                          disabled={!appointment.preScheduling?.canPrepare}
                          onClick={() => void openPreSchedulingFlow(appointment)}
                        >
                          {actionLabel}
                        </Button>
                      )}
                      timeline={(
                        <UpcomingTimeline
                          kind="consultation"
                          isUpcoming
                          appointmentStatus={appointment.status}
                          hasAnamnesis={hasAnamnesis}
                          anamnesisAnswered={Boolean(appointment.preScheduling?.anamnesisAnswered)}
                          interactionCompleted={Boolean(appointment.preScheduling?.interactionCompleted)}
                          canPrepare={Boolean(appointment.preScheduling?.canPrepare)}
                        />
                      )}
                    />
                  );
                  })}
                  {upcomingConsultations.length === 0 ? <EmptyState message="Você não possui consultas futuras no momento." /> : null}
                </Stack>
              )}
            </Tabs.Panel>

            <Tabs.Panel value="consultations" pt="md">
              {loadingConsultations ? (
                <SkeletonCards count={3} />
              ) : (
                <Stack gap="sm">
                {consultations.map((item) => (
                  <RecordCard
                    key={item.id}
                    kind="consultation"
                    title={item.specialty || 'Consulta'}
                    subtitle={formatDateTime(item.date, item.time)}
                    status={item.status}
                    details={item.doctorName ? `Médico(a): ${item.doctorName}` : undefined}
                    extra={item.convenio ? `Convênio: ${item.convenio}` : undefined}
                    timeline={(
                      <UpcomingTimeline
                        kind="consultation"
                        appointmentStatus={item.status}
                      />
                    )}
                  />
                ))}
                {consultations.length === 0 ? <EmptyState message="Nenhuma consulta encontrada no momento." /> : null}
                </Stack>
              )}
            </Tabs.Panel>

            <Tabs.Panel value="exams" pt="md">
              {loadingExams ? (
                <SkeletonCards count={3} />
              ) : (
                <Stack gap="sm">
                {exams.map((item) => (
                  <RecordCard
                    key={item.id}
                    kind="exam"
                    title={item.specialty || 'Exame'}
                    subtitle={formatDateTime(item.date, item.time)}
                    status={item.status}
                    details={item.doctorName ? `Solicitante: ${item.doctorName}` : undefined}
                    extra={item.accessionNumber ? `Código: ${item.accessionNumber}` : undefined}
                    timeline={(
                      <UpcomingTimeline
                        kind="exam"
                        appointmentStatus={item.status}
                      />
                    )}
                  />
                ))}
                {exams.length === 0 ? <EmptyState message="Nenhum exame encontrado no momento." /> : null}
                </Stack>
              )}
            </Tabs.Panel>

            <Tabs.Panel value="documents" pt="md">
              {loadingDocuments ? (
                <SkeletonCards count={3} />
              ) : (
                <Stack gap="sm">
                  <Card className="patient-portal-record-card" withBorder radius="md">
                    <Stack gap="xs">
                      <Group gap="xs">
                        <ShieldCheck size={16} />
                        <Text fw={700}>Atividade recente de acesso</Text>
                      </Group>
                      {accessLogs.length === 0 ? (
                        <Text size="sm" c="dimmed">Nenhuma atividade recente registrada.</Text>
                      ) : (
                        <Stack gap={6}>
                          {accessLogs.slice(0, 5).map((entry) => (
                            <Group key={entry.id} justify="space-between" wrap="wrap">
                              <Text size="sm">{dayjs(entry.createdAt).isValid() ? dayjs(entry.createdAt).format('DD/MM/YYYY HH:mm') : '-'}</Text>
                              <Badge
                                variant="light"
                                color={entry.status === 'SUCCESS' ? 'teal' : (entry.status === 'RATE_LIMITED' || entry.status === 'BLOCKED' ? 'orange' : 'red')}
                              >
                                {entry.status}
                              </Badge>
                            </Group>
                          ))}
                        </Stack>
                      )}
                    </Stack>
                  </Card>

                  {documents.map((doc) => (
                    <Card key={doc.id} className="patient-portal-record-card" withBorder radius="md">
                      <Stack gap={8}>
                        <Group justify="space-between" align="flex-start" wrap="wrap" gap="sm">
                          <Box>
                            <Text className="patient-portal-record-title">{doc.fileName || doc.label}</Text>
                            <Text className="patient-portal-record-subtitle">
                              {dayjs(doc.uploadedAt).isValid() ? dayjs(doc.uploadedAt).format('DD/MM/YYYY HH:mm') : '-'}
                            </Text>
                          </Box>
                          <Group gap={6}>
                            <Badge variant="light" color="indigo">{getDocumentSourceLabel(doc.source)}</Badge>
                            <Badge variant="light" color="gray">{formatFileSize(doc.sizeBytes)}</Badge>
                          </Group>
                        </Group>
                        <Text size="sm">{doc.label}</Text>
                        {doc.appointment ? (
                          <Text size="xs" c="dimmed">
                            {`${doc.appointment.specialty || 'Atendimento'} • ${formatDateTime(doc.appointment.date, doc.appointment.time)}`}
                          </Text>
                        ) : null}
                        <Group justify="flex-end">
                          <Button
                            size="xs"
                            radius="xl"
                            variant="default"
                            leftSection={<Eye size={14} />}
                            loading={openingDocumentId === doc.id}
                            onClick={() => void openDocument(doc)}
                          >
                            Visualizar/baixar
                          </Button>
                        </Group>
                      </Stack>
                    </Card>
                  ))}
                  {documents.length === 0 ? <EmptyState message="Nenhum documento disponível para este paciente." /> : null}
                </Stack>
              )}
            </Tabs.Panel>

            <Tabs.Panel value="reports" pt="md">
              {loadingReports ? (
                <SkeletonCards count={3} />
              ) : (
                <Stack gap="sm">
                <Card className="patient-portal-record-card" withBorder radius="md">
                  <Stack gap="xs">
                    <Group gap="xs">
                      <FileClock size={16} />
                      <Text fw={700}>Minhas solicitações de entrega física</Text>
                    </Group>
                    {loadingDeliveryHistory ? (
                      <Text size="sm" c="dimmed">Carregando histórico...</Text>
                    ) : deliveryRequests.length === 0 ? (
                      <Text size="sm" c="dimmed">Nenhuma solicitação de entrega física registrada.</Text>
                    ) : (
                      <Stack gap={6}>
                        {deliveryRequests.slice(0, 5).map((request) => (
                          <Group key={request.id} justify="space-between" wrap="wrap">
                            <Text size="sm">{dayjs(request.createdAt).isValid() ? dayjs(request.createdAt).format('DD/MM/YYYY HH:mm') : '-'}</Text>
                            <Badge variant="light" color={statusTone(request.status)}>{request.status}</Badge>
                          </Group>
                        ))}
                      </Stack>
                    )}
                  </Stack>
                </Card>
                {reports.map((item) => (
                  <Card key={item.id} className="patient-portal-record-card" withBorder radius="md">
                    <Stack gap={8}>
                      <Group justify="space-between" align="flex-start">
                        <Box>
                          <Text className="patient-portal-record-title">{item.exam || item.appointment?.specialty || 'Laudo'}</Text>
                          <Text className="patient-portal-record-subtitle">{dayjs(item.updatedAt).isValid() ? dayjs(item.updatedAt).format('DD/MM/YYYY HH:mm') : '-'}</Text>
                        </Box>
                        <Badge variant="light" color={statusTone(item.status)}>{item.status || 'Sem status'}</Badge>
                      </Group>
                      {item.reportingDoctor ? <Text size="sm">{`Laudado por: ${item.reportingDoctor}`}</Text> : null}
                      {(item.conclusion || item.description) ? (
                        <Text size="xs" c="dimmed">{item.conclusion || item.description}</Text>
                      ) : null}
                      <Group justify="flex-end">
                        <Button size="xs" radius="xl" variant="default" onClick={() => void downloadReportPdf(item)} leftSection={<Download size={14} />}>
                          Baixar PDF
                        </Button>
                        <Button size="xs" radius="xl" variant="light" onClick={() => openReportDeliveryModal(item)}>
                          Agendar entrega física
                        </Button>
                      </Group>
                    </Stack>
                  </Card>
                ))}
                {reports.length === 0 ? <EmptyState message="Nenhum laudo liberado disponível." /> : null}
                </Stack>
              )}
            </Tabs.Panel>
          </Tabs>
        </Paper>
      </Stack>

      <Modal
        opened={reportDeliveryModalOpen}
        onClose={() => setReportDeliveryModalOpen(false)}
        title="Entrega física do laudo"
        centered
      >
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            Solicite a impressão sob demanda e informe a data preferencial para retirada.
          </Text>
          <Box className="patient-portal-input-wrap">
            <label htmlFor="preferred-delivery-date">Data preferencial</label>
            <input
              id="preferred-delivery-date"
              type="date"
              value={preferredDeliveryDate}
              onChange={(event) => setPreferredDeliveryDate(event.currentTarget.value)}
            />
          </Box>
          <Textarea
            label="Observações (opcional)"
            placeholder="Ex.: retirar no período da tarde."
            value={deliveryNotes}
            onChange={(event) => setDeliveryNotes(event.currentTarget.value)}
            minRows={3}
          />
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setReportDeliveryModalOpen(false)}>Cancelar</Button>
            <Button
              onClick={() => void handleRequestPhysicalDelivery()}
              loading={requestingDeliveryFor === selectedReport?.id}
            >
              Confirmar solicitação
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Box>
  );
}
