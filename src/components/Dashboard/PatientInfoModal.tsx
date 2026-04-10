import { useEffect, useState } from 'react';
import {
  Modal,
  Box,
  Title,
  Text,
  Stack,
  Group,
  Paper,
  Badge,
  Tabs,
  SimpleGrid,
  Skeleton,
  Card,
  Divider,
  Center,
  ScrollArea,
  Avatar,
} from '@mantine/core';
import {
  User,
  Calendar,
  AlertCircle,
  FileText,
  Package,
  Clock,
  Phone,
  MapPin,
  CreditCard,
  Heart,
} from 'lucide-react';
import { usePatientSummaryQuery } from '../../hooks/usePatientSummaryQuery';
import { DARK_BLUE } from '../../themes/theme';
import { showErrorToast } from '../../lib/toast';

interface PatientInfoModalProps {
  opened: boolean;
  onClose: () => void;
  patientData: {
    id: string;
    id_medilab: string;
    nome: string;
    cpf: string;
  } | null;
}

export function PatientInfoModal({ opened, onClose, patientData }: PatientInfoModalProps) {
  const [viewMode, setViewMode] = useState<'daily' | 'weekly'>('daily');
  const { data, isLoading, error } = usePatientSummaryQuery(patientData, viewMode, opened);

  useEffect(() => {
    if (!opened) {
      setViewMode('daily');
    }
  }, [opened]);

  useEffect(() => {
    if (!error) return;
    showErrorToast({
      title: 'Erro',
      error,
      fallback: 'Não foi possível carregar os dados do paciente.',
    });
  }, [error]);

  const patientInfo = data?.patientInfo || null;
  const appointments = data?.appointments || [];
  const pendingItems = data?.pendingItems || [];

  const getStatusColor = (status: string) => {
    const statusMap: Record<string, string> = {
      SCHEDULED: 'blue',
      CONFIRMED: 'green',
      IN_PROGRESS: 'yellow',
      COMPLETED: 'gray',
      CANCELLED: 'red',
      PENDING: 'orange',
      PENDENTE: 'orange',
      AVAILABLE: 'cyan',
      DISPONIVEL: 'cyan',
    };
    return statusMap[status] || 'gray';
  };

  const getStatusLabel = (status: string) => {
    const statusMap: Record<string, string> = {
      SCHEDULED: 'Agendada',
      CONFIRMED: 'Confirmada',
      IN_PROGRESS: 'Em andamento',
      COMPLETED: 'Concluída',
      CANCELLED: 'Cancelada',
      PENDING: 'Pendente',
      PENDENTE: 'Pendente',
      AVAILABLE: 'Disponível',
      DISPONIVEL: 'Disponível',
    };
    return statusMap[status] || status;
  };

  const formatDate = (dateString: string) => {
    const datePart = dateString.split('T')[0];
    const [year, month, day] = datePart.split('-');
    return `${day}/${month}/${year}`;
  };

  const PatientSummarySkeleton = () => (
    <Stack gap="lg">
      <Skeleton height={180} radius="md" />
      <Skeleton height={180} radius="md" />
      <Skeleton height={160} radius="md" />
    </Stack>
  );

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      size="xl"
      title={
        <Group gap="sm">
          <Avatar color={DARK_BLUE} radius="xl">
            <User size={24} />
          </Avatar>
          <Box>
            <Title order={3}>Informações do Paciente</Title>
            <Text size="sm" c="dimmed">
              Dados completos e histórico
            </Text>
          </Box>
        </Group>
      }
      scrollAreaComponent={ScrollArea.Autosize}
    >
      {isLoading ? (
        <PatientSummarySkeleton />
      ) : (
        <Stack gap="lg">
          <Paper p="md" withBorder radius="md">
            <Group mb="md">
              <User size={20} color={DARK_BLUE} />
              <Title order={4}>Informações Básicas</Title>
            </Group>
            <Divider mb="md" />

            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
              <Box>
                <Group gap="xs" mb={4}>
                  <User size={16} />
                  <Text size="xs" c="dimmed" fw={500}>Nome Completo</Text>
                </Group>
                <Text size="sm" fw={600}>{patientInfo?.name || '-'}</Text>
              </Box>

              <Box>
                <Group gap="xs" mb={4}>
                  <CreditCard size={16} />
                  <Text size="xs" c="dimmed" fw={500}>CPF</Text>
                </Group>
                <Text size="sm" fw={600}>{patientInfo?.cpf || '-'}</Text>
              </Box>

              <Box>
                <Group gap="xs" mb={4}>
                  <Calendar size={16} />
                  <Text size="xs" c="dimmed" fw={500}>Data de Nascimento</Text>
                </Group>
                <Text size="sm" fw={600}>
                  {patientInfo?.birthDate ? formatDate(patientInfo.birthDate) : '-'}
                </Text>
              </Box>

              <Box>
                <Group gap="xs" mb={4}>
                  <Phone size={16} />
                  <Text size="xs" c="dimmed" fw={500}>Telefone</Text>
                </Group>
                <Text size="sm" fw={600}>
                  {patientInfo?.cellphone || patientInfo?.phone || '-'}
                </Text>
              </Box>

              <Box>
                <Group gap="xs" mb={4}>
                  <Heart size={16} />
                  <Text size="xs" c="dimmed" fw={500}>Convênio</Text>
                </Group>
                <Text size="sm" fw={600}>
                  {patientInfo?.healthInsuranceName || 'Particular'}
                  {patientInfo?.healthInsuranceNumber ? ` - ${patientInfo.healthInsuranceNumber}` : ''}
                </Text>
              </Box>

              <Box>
                <Group gap="xs" mb={4}>
                  <MapPin size={16} />
                  <Text size="xs" c="dimmed" fw={500}>Endereço</Text>
                </Group>
                <Text size="sm" fw={600} lineClamp={2}>
                  {patientInfo?.address || '-'}
                </Text>
              </Box>
            </SimpleGrid>
          </Paper>

          <Paper p="md" withBorder radius="md">
            <Group mb="md">
              <Calendar size={20} color={DARK_BLUE} />
              <Title order={4}>Agendamentos</Title>
            </Group>
            <Divider mb="md" />

            <Tabs value={viewMode} onChange={(value) => setViewMode(value as 'daily' | 'weekly')}>
              <Tabs.List mb="md">
                <Tabs.Tab value="daily" leftSection={<Clock size={16} />}>
                  Hoje
                </Tabs.Tab>
                <Tabs.Tab value="weekly" leftSection={<Calendar size={16} />}>
                  Próximos 7 dias
                </Tabs.Tab>
              </Tabs.List>

              <Tabs.Panel value={viewMode}>
                {appointments.length === 0 ? (
                  <Center p="xl">
                    <Stack align="center" gap="xs">
                      <Calendar size={48} color="gray" />
                      <Text c="dimmed" fw={500}>
                        Nenhum agendamento encontrado
                      </Text>
                      <Text size="sm" c="dimmed">
                        {viewMode === 'daily'
                          ? 'Não há consultas agendadas para hoje.'
                          : 'Não há consultas agendadas para os próximos 7 dias.'}
                      </Text>
                    </Stack>
                  </Center>
                ) : (
                  <Stack gap="sm">
                    {appointments.map((apt) => (
                      <Card key={apt.id} withBorder padding="sm" radius="md">
                        <Group justify="space-between" wrap="nowrap">
                          <Box style={{ flex: 1 }}>
                            <Text fw={600} size="sm">{apt.doctorName}</Text>
                            <Text size="xs" c="dimmed">{apt.specialty}</Text>
                            <Group gap="xs" mt={4}>
                              <Text size="xs" fw={500}>
                                {formatDate(apt.date)} às {apt.time}
                              </Text>
                              {apt.convenio && (
                                <Text size="xs" c="dimmed">• {apt.convenio}</Text>
                              )}
                            </Group>
                          </Box>
                          <Badge size="sm" color={getStatusColor(apt.status)} variant="filled">
                            {getStatusLabel(apt.status)}
                          </Badge>
                        </Group>
                      </Card>
                    ))}
                  </Stack>
                )}
              </Tabs.Panel>
            </Tabs>
          </Paper>

          <Paper p="md" withBorder radius="md">
            <Group mb="md">
              <AlertCircle size={20} color={DARK_BLUE} />
              <Title order={4}>Pendências</Title>
            </Group>
            <Divider mb="md" />

            {pendingItems.length === 0 ? (
              <Center p="xl">
                <Stack align="center" gap="xs">
                  <AlertCircle size={48} color="gray" />
                  <Text c="dimmed" fw={500}>
                    Nenhuma pendência
                  </Text>
                  <Text size="sm" c="dimmed">
                    O paciente não possui pendências no momento.
                  </Text>
                </Stack>
              </Center>
            ) : (
              <Stack gap="sm">
                {pendingItems.map((item) => (
                  <Card key={item.id} withBorder padding="sm" radius="md">
                    <Group justify="space-between" wrap="nowrap">
                      <Group gap="sm" style={{ flex: 1 }}>
                        {item.type === 'report' ? (
                          <FileText size={20} color={DARK_BLUE} />
                        ) : (
                          <Package size={20} color={DARK_BLUE} />
                        )}
                        <Box style={{ flex: 1 }}>
                          <Text fw={600} size="sm">{item.description}</Text>
                          <Text size="xs" c="dimmed">
                            Data: {formatDate(item.date)}
                          </Text>
                        </Box>
                      </Group>
                      <Badge size="sm" color={getStatusColor(item.status)} variant="light">
                        {getStatusLabel(item.status)}
                      </Badge>
                    </Group>
                  </Card>
                ))}
              </Stack>
            )}
          </Paper>
        </Stack>
      )}
    </Modal>
  );
}
