import { useEffect, useMemo } from 'react';
import { Paper, SimpleGrid, Text, Skeleton, useMantineColorScheme, Stack } from '@mantine/core';
import { showNotification } from '@mantine/notifications';
import dayjs from 'dayjs';
import { useClinicalQueueQuery } from '../../hooks/useClinicalQueueQuery';
import { useAppointmentsQuery } from '../../hooks/useAppointmentsQuery';
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

export function StatsCards() {
  const { colorScheme } = useMantineColorScheme();
  const { data: consultations = [], isLoading: consultationsLoading, error: consultationsError } = useClinicalQueueQuery();
  const { data: appointments = [], isLoading: appointmentsLoading, error: appointmentsError } = useAppointmentsQuery();

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

    const agendadosHoje = appointmentsToday.filter((a: any) => {
      const status = normalizeAppointmentStatus(a.status);
      return !['CANCELADO', 'CANCELED'].includes(status);
    }).length;

    const pendentesHoje = appointmentsToday.filter((a: any) => {
      const status = normalizeAppointmentStatus(a.status);
      return ['AGENDADO', 'CONFIRMADO', 'PENDENTE'].includes(status) || !status;
    }).length;

    const emAtendimento = consultations.filter((c: any) => {
      const queueStatus = String(c.queue || c.queueType || '').trim().toLowerCase();
      return ACTIVE_CONSULTATION_STATUSES.includes(queueStatus);
    }).length;

    return {
      agendadosHoje,
      pendentesHoje,
      emAtendimento,
    };
  }, [appointments, consultations]);

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
        { label: 'Pendentes hoje', value: stats.pendentesHoje },
        { label: 'Em atendimento', value: stats.emAtendimento },
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
