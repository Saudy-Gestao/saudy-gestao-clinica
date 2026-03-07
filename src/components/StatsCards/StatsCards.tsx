import { useEffect, useState } from 'react';
import { Paper, SimpleGrid, Text, Loader, Center, useMantineColorScheme } from '@mantine/core';
import { showNotification } from '@mantine/notifications';
import consultationService from '../../services/consultationService';
import appointmentService from '../../services/appointmentService';

export function StatsCards() {
  const { colorScheme } = useMantineColorScheme();
  const [stats, setStats] = useState({
    atendimentoHoje: 0,
    agendamentosPendentes: 0,
    emAtendimento: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      try {
        setLoading(true);
        
        // Buscar dados em paralelo
        const [consultationsData, appointmentsData] = await Promise.all([
          consultationService.list({ limit: 1000 }),
          appointmentService.list({ limit: 1000 }),
        ]);

        // Processar consultations
        const consultationsList = Array.isArray(consultationsData) 
          ? consultationsData 
          : (consultationsData?.items || consultationsData?.data || []);

        // Processar appointments
        const appointmentsList = Array.isArray(appointmentsData)
          ? appointmentsData
          : (appointmentsData?.items || appointmentsData?.data || []);

        // Atendimento hoje: consultas agendadas para hoje
        const today = new Date().toISOString().split('T')[0];
        const atendimentoHoje = consultationsList.filter((c: any) => {
          const scheduledDate = c.scheduledFor?.split(' ')[0] || c.scheduledFor?.split('T')[0];
          return scheduledDate === today;
        }).length;

        // Agendamentos pendentes: appointments com status pendente/agendado
        const agendamentosPendentes = appointmentsList.filter((a: any) => 
          !a.status || a.status.toLowerCase() === 'pendente' || a.status.toLowerCase() === 'agendado'
        ).length;

        // Em atendimento: consultas com status "em atendimento" ou similar
        const emAtendimento = consultationsList.filter((c: any) =>
          c.convenioStatus?.toLowerCase() === 'em atendimento' || 
          c.queueType?.toLowerCase() === 'em atendimento'
        ).length;

        setStats({
          atendimentoHoje,
          agendamentosPendentes,
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
        { label: 'Atendimento hoje', value: stats.atendimentoHoje },
        { label: 'Agendamentos pendentes', value: stats.agendamentosPendentes },
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
