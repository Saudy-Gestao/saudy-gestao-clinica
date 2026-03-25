import { useEffect, useState } from 'react';
import { Paper, SimpleGrid, Text, Loader, Center, useMantineColorScheme } from '@mantine/core';
import { showNotification } from '@mantine/notifications';
import dayjs from 'dayjs';
import consultationService from '../../services/consultationService';
import appointmentService from '../../services/appointmentService';

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
  const [stats, setStats] = useState({
    agendadosHoje: 0,
    pendentesHoje: 0,
    emAtendimento: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      try {
        setLoading(true);

        // Buscar dados em paralelo e tratar 403 como falta de permissao sem toast de erro.
        const [consultationsResult, appointmentsResult] = await Promise.allSettled([
          consultationService.list({ limit: 1000 }),
          appointmentService.list({ limit: 1000 }),
        ]);

        const extractData = (result: PromiseSettledResult<any>) => {
          if (result.status === 'fulfilled') {
            return result.value;
          }

          const status = (result.reason as any)?.response?.status;
          if (status === 403) {
            return [];
          }

          throw result.reason;
        };

        const consultationsData = extractData(consultationsResult);
        const appointmentsData = extractData(appointmentsResult);

        // Processar consultations
        const consultationsList = Array.isArray(consultationsData) 
          ? consultationsData 
          : (consultationsData?.items || consultationsData?.data || []);

        // Processar appointments
        const appointmentsList = Array.isArray(appointmentsData)
          ? appointmentsData
          : (appointmentsData?.items || appointmentsData?.data || []);

        const today = dayjs().format('YYYY-MM-DD');

        const appointmentsToday = appointmentsList.filter((a: any) => extractDateOnly(a.date || a.data) === today);

        const agendadosHoje = appointmentsToday.filter((a: any) => {
          const status = normalizeAppointmentStatus(a.status);
          return !['CANCELADO', 'CANCELED'].includes(status);
        }).length;

        const pendentesHoje = appointmentsToday.filter((a: any) => {
          const status = normalizeAppointmentStatus(a.status);
          return ['AGENDADO', 'CONFIRMADO', 'PENDENTE'].includes(status) || !status;
        }).length;

        const emAtendimento = consultationsList.filter((c: any) => {
          const queueStatus = String(c.queue || c.queueType || '').trim().toLowerCase();
          return ACTIVE_CONSULTATION_STATUSES.includes(queueStatus);
        }).length;

        setStats({
          agendadosHoje,
          pendentesHoje,
          emAtendimento,
        });
      } catch (err: any) {
        showNotification({
          title: 'Erro',
          message: err?.response?.data?.message || err?.message || 'Erro ao carregar estatísticas',
          color: 'red',
        });
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, []);

  if (loading) {
    return (
      <Center h={200} mb={40}>
        <Loader size="lg" />
      </Center>
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
