import { useEffect, useMemo } from 'react';
import { Paper, Text, Skeleton, Stack, Group } from '@/components/ui';
import { showNotification } from '@/components/ui';
import dayjs from 'dayjs';
import { useClinicalQueueQuery } from '../../hooks/useClinicalQueueQuery';
import { useAppointmentsQuery } from '../../hooks/useAppointmentsQuery';
import { isDoctorUser } from '../../utils/userRole';
import { resolveApiErrorMessage } from '../../lib/apiError';
import { Activity, CalendarDays, CheckCircle2, Clock3 } from 'lucide-react';
import './StatsCards.css';

const ACTIVE_CONSULTATION_STATUSES = [
  'aguardando atendimento',
  'chamado para atendimento',
  'em atendimento',
];

const normalizeAppointmentStatus = (value?: string | null) => String(value || '').trim().toUpperCase();

const extractDateOnly = (value?: string | null) => {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const parsed = dayjs(raw);
  return parsed.isValid() ? parsed.format('YYYY-MM-DD') : raw.split('T')[0] || raw.split(' ')[0] || '';
};

interface StatsCardsProps {
  user?: any;
}

const normalizeText = (value?: string | null) => String(value || '').trim().toLowerCase();

const isDoneStatus = (value?: string | null) => {
  const status = normalizeText(value);
  return (
    status.includes('atendido')
    || status.includes('atendida')
    || status.includes('finalizado')
    || status.includes('concluido')
    || status.includes('concluído')
    || status.includes('realizado')
  );
};

const extractAppointmentDoctorId = (appointment: any) => String(
  appointment?.doctorId
  || appointment?.doctor_id
  || appointment?.doctor?.id
  || '',
).trim();

const extractAppointmentDoctorName = (appointment: any) => normalizeText(
  appointment?.doctorName
  || appointment?.doctor_name
  || appointment?.doctor?.name
  || '',
);

export function StatsCards({ user }: StatsCardsProps) {
  const { data: consultations = [], isLoading: consultationsLoading, error: consultationsError } = useClinicalQueueQuery();
  const { data: appointments = [], isLoading: appointmentsLoading, error: appointmentsError } = useAppointmentsQuery();
  const doctorView = isDoctorUser(user);
  const doctorId = String((user as any)?.doctorId || (user as any)?.doctor?.id || '').trim();
  const doctorName = normalizeText((user as any)?.doctor?.name || (user as any)?.name || '');

  useEffect(() => {
    const err: any = consultationsError || appointmentsError;
    if (!err) return;
    showNotification({
      title: 'Erro',
      message: resolveApiErrorMessage(err, 'Erro ao carregar estatísticas'),
      color: 'red',
    });
  }, [consultationsError, appointmentsError]);

  const stats = useMemo(() => {
    const today = dayjs().format('YYYY-MM-DD');
    const appointmentsToday = appointments.filter((a: any) => extractDateOnly(a.date || a.data) === today);
    const doctorAppointmentsToday = doctorView
      ? appointmentsToday.filter((appointment: any) => {
        const appointmentDoctorId = extractAppointmentDoctorId(appointment);
        if (doctorId && appointmentDoctorId) return appointmentDoctorId === doctorId;
        if (doctorName) return extractAppointmentDoctorName(appointment) === doctorName;
        return false;
      })
      : appointmentsToday;

    const agendadosHoje = doctorAppointmentsToday.filter((a: any) => {
      const status = normalizeAppointmentStatus(a.status);
      return !['CANCELADO', 'CANCELED'].includes(status);
    }).length;

    const pendentesHoje = doctorAppointmentsToday.filter((a: any) => {
      const status = normalizeAppointmentStatus(a.status);
      return ['AGENDADO', 'CONFIRMADO', 'PENDENTE'].includes(status) || !status;
    }).length;

    const atendidosHoje = doctorAppointmentsToday.filter((a: any) => isDoneStatus(a.status)).length;

    const emAtendimento = consultations.filter((c: any) => {
      const queueStatus = String(c.queue || c.queueType || '').trim().toLowerCase();
      if (!ACTIVE_CONSULTATION_STATUSES.includes(queueStatus)) return false;

      if (!doctorView) return true;

      const consultationDoctorId = String(c?.doctorId || c?.doctor?.id || '').trim();
      const consultationDoctorName = normalizeText(c?.doctor || c?.doctorName || c?.doctor?.name || '');

      if (doctorId && consultationDoctorId) return consultationDoctorId === doctorId;
      if (doctorName) return consultationDoctorName === doctorName;
      return false;
    }).length;

    return {
      agendadosHoje,
      pendentesHoje,
      atendidosHoje,
      emAtendimento,
    };
  }, [appointments, consultations, doctorView, doctorId, doctorName]);

  const loading = consultationsLoading || appointmentsLoading;

  if (loading) {
    return (
      <div className="dashboard-stats-grid" aria-label="Carregando indicadores">
        {Array.from({ length: 3 }).map((_, index) => (
          <Paper
            key={index}
            className="dashboard-stat-card"
            withBorder
            shadow="none"
          >
            <Stack gap="sm">
              <Skeleton height={14} width="45%" radius="xl" />
              <Skeleton height={42} width="30%" radius="md" />
            </Stack>
          </Paper>
        ))}
      </div>
    );
  }

  const statItems = [
    {
      label: 'Agendados hoje',
      value: stats.agendadosHoje,
      helper: 'compromissos previstos para hoje',
      icon: CalendarDays,
      tone: 'blue',
    },
    ...(doctorView
      ? [{ label: 'Atendidos hoje', value: stats.atendidosHoje, helper: 'atendimentos finalizados no dia', icon: CheckCircle2, tone: 'green' }]
      : [
        { label: 'Pendentes hoje', value: stats.pendentesHoje, helper: 'aguardando confirmação ou início', icon: Clock3, tone: 'amber' },
        { label: 'Em atendimento', value: stats.emAtendimento, helper: 'na operação clínica agora', icon: Activity, tone: 'violet' },
      ]),
  ];

  return (
    <div className="dashboard-stats-grid" aria-label="Indicadores do dia">
      {statItems.map((stat) => (
        <Paper
          key={stat.label}
          className="dashboard-stat-card"
          withBorder
          shadow="none"
        >
          <Group className={`dashboard-stat-card__top dashboard-stat-card__top--${stat.tone}`} justify="space-between" wrap="nowrap">
            <Text className="dashboard-stat-card__label" size="sm" fw={600}>{stat.label}</Text>
            <span className="dashboard-stat-card__icon" aria-hidden="true"><stat.icon size={18} strokeWidth={2.1} /></span>
          </Group>
          <Text className="dashboard-stat-card__value" size="2.5rem" fw={700}>
            {String(stat.value).padStart(2, '0')}
          </Text>
          <Text className="dashboard-stat-card__helper" size="sm">{stat.helper}</Text>
        </Paper>
      ))}
    </div>
  );
}
