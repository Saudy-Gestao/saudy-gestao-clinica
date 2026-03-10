import { useState, useEffect } from 'react';
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
  Card,
  Divider,
  Loader,
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
import { showNotification } from '@mantine/notifications';
import appointmentService from '../../services/appointmentService';
import reportService from '../../services/reportService';
import deliveryService from '../../services/deliveryService';
import patientService from '../../services/patientService';
import { DARK_BLUE } from '../../themes/theme';

interface PatientInfo {
  id: string;
  id_medilab: string;
  name: string;
  cpf: string;
  birthDate?: string;
  phone?: string;
  cellphone?: string;
  address?: string;
  healthInsuranceName?: string;
  healthInsuranceNumber?: string;
}

interface Appointment {
  id: string;
  patientName: string;
  doctorName: string;
  specialty: string;
  date: string;
  time: string;
  status: string;
  convenio?: string;
}

interface PendingItem {
  id: string;
  type: 'report' | 'delivery';
  description: string;
  date: string;
  status: string;
}

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
  const [loading, setLoading] = useState(false);
  const [patientInfo, setPatientInfo] = useState<PatientInfo | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [pendingItems, setPendingItems] = useState<PendingItem[]>([]);
  const [viewMode, setViewMode] = useState<'daily' | 'weekly'>('daily');

  useEffect(() => {
    if (opened && patientData) {
      loadPatientData();
    } else {
      resetData();
    }
  }, [opened, patientData]);

  const resetData = () => {
    setPatientInfo(null);
    setAppointments([]);
    setPendingItems([]);
    setViewMode('daily');
  };

  const loadPatientData = async () => {
    if (!patientData) return;

    setLoading(true);
    try {
      // Carregar informações completas do paciente
      await loadPatientInfo();
      
      // Carregar agendamentos
      await loadAppointments();
      
      // Carregar pendências (laudos e entregas)
      await loadPendingItems();
    } catch (error: any) {
      console.error('Erro ao carregar dados do paciente:', error);
      showNotification({
        title: 'Erro',
        message: 'Não foi possível carregar os dados do paciente.',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadPatientInfo = async () => {
    if (!patientData) return;

    try {
      console.log('📋 Buscando informações do paciente...', { 
        id: patientData.id,
        cpf: patientData.cpf, 
        nome: patientData.nome 
      });
      
      // Tentar buscar diretamente pelo ID primeiro
      let patient = null;
      
      try {
        if (patientData.id) {
          console.log('🎯 Tentando buscar paciente por ID:', patientData.id);
          const directResponse = await patientService.getPatientById(patientData.id);
          patient = directResponse;
          console.log('✅ Paciente encontrado por ID:', patient);
        }
      } catch (idError) {
        console.log('⚠️ Não foi possível buscar por ID, tentando pela lista...');
      }

      // Se não encontrou por ID, buscar na lista
      if (!patient) {
        const response = await patientService.listPatients();
        const allPatients = Array.isArray(response) ? response : (response?.data || []);
        
        console.log('👥 Total de pacientes no banco:', allPatients.length);
        
        // Normalizar CPF (remover formatação)
        const normalizedSearchCpf = patientData.cpf.replace(/\D/g, '');
        
        // Buscar paciente pelo CPF (comparando sem formatação)
        patient = allPatients.find((p: any) => {
          const patientCpf = (p.cpf || '').replace(/\D/g, '');
          return patientCpf === normalizedSearchCpf || String(p.id) === String(patientData.id);
        });

        console.log('🔍 Paciente encontrado na lista:', patient);
      }

      if (patient) {
        console.log('📦 Dados brutos do paciente:', JSON.stringify(patient, null, 2));
        
        const fullAddress = patient.address
          ? `${patient.address}${patient.addressNumber || patient.address_number ? ', ' + (patient.addressNumber || patient.address_number) : ''}${patient.addressComplement || patient.address_complement ? ' - ' + (patient.addressComplement || patient.address_complement) : ''}${patient.neighborhood ? ' - ' + patient.neighborhood : ''}${patient.city ? ' - ' + patient.city : ''}${patient.state ? '/' + patient.state : ''}`
          : undefined;

        const patientInfo = {
          id: patient.id || patientData.id,
          id_medilab: patientData.id_medilab || patient.id,
          name: patient.name || patientData.nome,
          cpf: patient.cpf || patientData.cpf,
          birthDate: patient.birthDate || patient.birth_date || patient.birthdate,
          phone: patient.phone,
          cellphone: patient.cellphone || patient.cell_phone,
          address: fullAddress,
          healthInsuranceName: patient.healthInsuranceName || patient.health_insurance_name || patient.healthinsurancename,
          healthInsuranceNumber: patient.healthInsuranceNumber || patient.health_insurance_number || patient.healthinsurancenumber,
        };
        
        console.log('📊 Informações processadas:', JSON.stringify(patientInfo, null, 2));
        setPatientInfo(patientInfo);
        console.log('✅ Informações do paciente carregadas com sucesso');
      } else {
        console.warn('⚠️ Paciente não encontrado no banco, usando dados básicos');
        // Se não encontrar, usar dados básicos do reconhecimento facial
        setPatientInfo({
          id: patientData.id,
          id_medilab: patientData.id_medilab,
          name: patientData.nome,
          cpf: patientData.cpf,
        });
      }
    } catch (error) {
      console.error('❌ Erro ao buscar informações do paciente:', error);
      // Usar dados básicos em caso de erro
      setPatientInfo({
        id: patientData.id,
        id_medilab: patientData.id_medilab,
        name: patientData.nome,
        cpf: patientData.cpf,
      });
    }
  };

  const loadAppointments = async () => {
    if (!patientData) return;

    try {
      console.log('📅 Buscando agendamentos do paciente...', { 
        cpf: patientData.cpf, 
        id: patientData.id,
        viewMode 
      });
      
      // Determinar período (hoje ou semana) - usando data LOCAL
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const todayStr = `${year}-${month}-${day}`; // "2026-03-09" em horário local
      
      let apiParams: any = {
        patientId: patientData.id,
        limit: 100,
      };
      
      if (viewMode === 'daily') {
        // Filtrar apenas hoje na API
        apiParams.date = todayStr;
        console.log('🔍 Buscando agendamentos de HOJE:', todayStr);
      } else {
        // Filtrar próximos 7 dias na API (hoje + 6 dias = 7 dias total)
        const weekEnd = new Date(now);
        weekEnd.setDate(weekEnd.getDate() + 6);
        const weekYear = weekEnd.getFullYear();
        const weekMonth = String(weekEnd.getMonth() + 1).padStart(2, '0');
        const weekDay = String(weekEnd.getDate()).padStart(2, '0');
        const weekEndStr = `${weekYear}-${weekMonth}-${weekDay}`;
        
        apiParams.startDate = todayStr;
        apiParams.endDate = weekEndStr;
        console.log('🔍 Buscando agendamentos dos PRÓXIMOS 7 DIAS:', todayStr, 'a', weekEndStr);
      }
      
      const response = await appointmentService.list(apiParams);
      
      // Suportar múltiplas estruturas de resposta
      const allAppointments = Array.isArray(response) 
        ? response 
        : (response?.items || response?.data || []);

      console.log('📊 Resposta da API:', { total: allAppointments.length, items: allAppointments });

      const mapped: Appointment[] = allAppointments.map((apt: any) => ({
        id: String(apt.id),
        patientName: apt.patientName || apt.patient_name || patientData.nome,
        doctorName: apt.doctorName || apt.doctor_name || 'Não informado',
        specialty: apt.specialty || 'Não informado',
        date: apt.date,
        time: apt.time || '00:00',
        status: apt.status || 'SCHEDULED',
        convenio: apt.convenio || apt.healthInsurance || 'Particular',
      }));

      // Ordenar por data e hora
      mapped.sort((a, b) => {
        const dateA = new Date(`${a.date}T${a.time}`).getTime();
        const dateB = new Date(`${b.date}T${b.time}`).getTime();
        return dateA - dateB;
      });

      console.log('✅ Agendamentos carregados:', mapped.length, 'para', viewMode === 'daily' ? 'hoje' : 'próximos 7 dias');
      console.log('📋 Lista final:', mapped);

      setAppointments(mapped);
    } catch (error) {
      console.error('❌ Erro ao carregar agendamentos:', error);
      setAppointments([]);
    }
  };

  const loadPendingItems = async () => {
    if (!patientData) return;

    try {
      console.log('⚠️ Buscando pendências do paciente...', { cpf: patientData.cpf });
      
      const [reportsResponse, deliveriesResponse] = await Promise.all([
        reportService.list({ search: patientData.nome }).catch(() => ({ data: [] })),
        deliveryService.getDeliveries().catch(() => ({ data: [] })),
      ]);

      const reports = Array.isArray(reportsResponse) ? reportsResponse : (reportsResponse?.data || []);
      const deliveries = Array.isArray(deliveriesResponse) ? deliveriesResponse : (deliveriesResponse?.data || []);

      console.log('📄 Laudos encontrados:', reports.length);
      console.log('📦 Entregas encontradas:', deliveries.length);

      const items: PendingItem[] = [];

      // Laudos pendentes
      const pendingReports = reports.filter((report: any) => {
        const reportPatient = report.patientName || report.patient_name;
        const isPending = report.status === 'PENDING' || report.status === 'IN_PROGRESS';
        return reportPatient === patientData.nome && isPending;
      });

      pendingReports.forEach((report: any) => {
        items.push({
          id: String(report.id),
          type: 'report',
          description: `Laudo: ${report.exam || report.description || 'Exame não informado'}`,
          date: report.scheduledFor || report.createdAt || new Date().toISOString(),
          status: report.status || 'PENDING',
        });
      });

      // Entregas pendentes
      const pendingDeliveries = deliveries.filter((delivery: any) => {
        const deliveryPatient = delivery.patientName || delivery.patient_name;
        const isPending = delivery.status === 'PENDING' || delivery.status === 'AVAILABLE';
        return deliveryPatient === patientData.nome && isPending;
      });

      pendingDeliveries.forEach((delivery: any) => {
        items.push({
          id: String(delivery.id),
          type: 'delivery',
          description: `Entrega: ${delivery.documentType || delivery.description || 'Documento não especificado'}`,
          date: delivery.availableAt || delivery.createdAt || new Date().toISOString(),
          status: delivery.status || 'PENDING',
        });
      });

      // Ordenar por data
      items.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      console.log('✅ Total de pendências encontradas:', items.length);

      setPendingItems(items);
    } catch (error) {
      console.error('❌ Erro ao carregar pendências:', error);
      setPendingItems([]);
    }
  };

  // Atualizar agendamentos quando mudar o modo de visualização
  useEffect(() => {
    if (opened && patientData) {
      loadAppointments();
    }
  }, [viewMode]);

  const getStatusColor = (status: string) => {
    const statusMap: Record<string, string> = {
      'SCHEDULED': 'blue',
      'CONFIRMED': 'green',
      'IN_PROGRESS': 'yellow',
      'COMPLETED': 'gray',
      'CANCELLED': 'red',
      'PENDING': 'orange',
      'PENDENTE': 'orange', // Status em português
      'AVAILABLE': 'cyan',
      'DISPONIVEL': 'cyan', // Status em português
    };
    return statusMap[status] || 'gray';
  };

  const getStatusLabel = (status: string) => {
    const statusMap: Record<string, string> = {
      'SCHEDULED': 'Agendada',
      'CONFIRMED': 'Confirmada',
      'IN_PROGRESS': 'Em andamento',
      'COMPLETED': 'Concluída',
      'CANCELLED': 'Cancelada',
      'PENDING': 'Pendente',
      'PENDENTE': 'Pendente',
      'AVAILABLE': 'Disponível',
      'DISPONIVEL': 'Disponível',
    };
    return statusMap[status] || status;
  };

  const formatDate = (dateString: string) => {
    // Parse manual para evitar problema de timezone
    // Suporta "2026-03-09" ou "2000-02-10T00:00:00.000Z"
    const datePart = dateString.split('T')[0]; // Pega só a parte da data antes do 'T'
    const [year, month, day] = datePart.split('-');
    return `${day}/${month}/${year}`;
  };

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
      {loading ? (
        <Center p="xl">
          <Loader size="lg" />
        </Center>
      ) : (
        <Stack gap="lg">
          {/* Seção 1: Informações Básicas */}
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
                  {patientInfo?.healthInsuranceNumber && ` - ${patientInfo.healthInsuranceNumber}`}
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

          {/* Seção 2: Agendamentos */}
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
                          <Badge
                            size="sm"
                            color={getStatusColor(apt.status)}
                            variant="filled"
                          >
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

          {/* Seção 3: Pendências */}
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
                      <Badge
                        size="sm"
                        color={getStatusColor(item.status)}
                        variant="light"
                      >
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
