import { useEffect, useMemo } from 'react';
import { Paper, SimpleGrid, Text, Skeleton, useMantineColorScheme, Stack } from '@mantine/core';
import { showNotification } from '@mantine/notifications';
import dayjs from 'dayjs';
import { useClinicalQueueQuery } from '../../hooks/useClinicalQueueQuery';
import { useAppointmentsQuery } from '../../hooks/useAppointmentsQuery';
import { isDoctorUser } from '../../utils/userRole';
import { resolveApiErrorMessage } from '../../lib/apiError';

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
  const { colorScheme } = useMantineColorScheme();
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
      <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="lg" mb={40}>
        {Array.from({ length: 3 }).map((_, index) => (
          <Paper
            key={index}
            p="lg"
            withBorder
            shadow="none"
            style={colorScheme === 'dark' ? {
              backgroundColor: 'transparent',
              borderColor: 'var(--mantine-color-default-border)',
            } : undefined}
          >
            <Stack gap="sm">
              <Skeleton height={14} width="45%" radius="xl" />
              <Skeleton height={42} width="30%" radius="md" />
            </Stack>
          </Paper>
        ))}
      </SimpleGrid>
    );
  }

  return (
    <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="lg" mb={40}>
      {[
        { label: 'Agendados hoje', value: stats.agendadosHoje },
        ...(doctorView
          ? [{ label: 'Atendidos hoje', value: stats.atendidosHoje }]
          : [
            { label: 'Pendentes hoje', value: stats.pendentesHoje },
            { label: 'Em atendimento', value: stats.emAtendimento },
          ]),
      ].map((stat, index) => (
        <Paper
          key={index}
          p="lg"
          withBorder
          shadow="none"
          style={colorScheme === 'dark' ? {
            backgroundColor: 'transparent',
            borderColor: 'var(--mantine-color-default-border)',
          } : undefined}
        >
          <Text c="dimmed" size="sm" fw={500} mb="xs">{stat.label}</Text>
          <Text size="2.5rem" fw={500} style={{ lineHeight: 1 }}>
            {String(stat.value).padStart(2, '0')}
          </Text>
        </Paper>
      ))}
    </SimpleGrid>
  );
}
