import { useState, useEffect } from 'react';
import { Box, Title, Text, Stack, Group, Button } from '@mantine/core';
import { Camera } from 'lucide-react';
import { showNotification } from '@mantine/notifications';
import { Header } from '../Header/Header';
import { StatsCards } from '../StatsCards/StatsCards';
import { PatientQueue } from '../PatientQueue/PatientQueue';
import { WorkflowSections } from '../WorkflowSections/WorkflowSections';
import { FacialCapture } from '../common/FacialCapture';
import { PatientInfoModal } from './PatientInfoModal';
import facialRecognitionService, { type FacialScanResponse } from '../../services/facialRecognitionService';
import authService from '../../services/authService';
import { isDoctorUser } from '../../utils/userRole';
import { useCurrentUserProfileQuery } from '../../hooks/useCurrentUserProfileQuery';

export function Dashboard() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [facialCaptureOpen, setFacialCaptureOpen] = useState(false);
  const [recognizing, setRecognizing] = useState(false);
  const [patientInfoModalOpen, setPatientInfoModalOpen] = useState(false);
  const [recognizedPatient, setRecognizedPatient] = useState<{
    id: string;
    id_medilab: string;
    nome: string;
    cpf: string;
  } | null>(null);
  const { data: profileUser } = useCurrentUserProfileQuery();
  const currentUser = (profileUser || authService.getCurrentUser()) as any;
  const doctorView = isDoctorUser(currentUser);

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 60000); // Atualiza a cada minuto
    return () => clearInterval(interval);
  }, []);

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour >= 5 && hour < 12) return 'Bom dia!';
    if (hour >= 12 && hour < 18) return 'Boa tarde!';
    return 'Boa noite!';
  };

  const handleFacialScan = async (imageBase64: string) => {
    setRecognizing(true);
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const unitId = user?.branchId || user?.branch?.id || '';

      console.log('🔍 Iniciando reconhecimento facial...', { unitId });

      const result: FacialScanResponse = await facialRecognitionService.scanFace({
        image: imageBase64,
        id_unidade: unitId,
      });

      console.log('✅ Resposta do reconhecimento facial:', result);
      console.log('📊 Detalhes:', {
        patient: result.patient,
        trust: result.trust,
        message: result.message
      });

      // Verificar se reconheceu algum paciente
      if (result.patient && result.patient.name) {
        const patientData = {
          id: result.patient.id,
          id_medilab: result.patient.id,
          nome: result.patient.name,
          cpf: result.patient.cpf,
        };

        console.log('👤 Dados do paciente reconhecido:', patientData);

        setRecognizedPatient(patientData);

        // Abrir modal com informações do paciente
        setPatientInfoModalOpen(true);

        showNotification({
          title: 'Reconhecimento bem-sucedido!',
          message: `Bem-vindo(a), ${patientData.nome}!`,
          color: 'green',
        });
      } else {
        console.warn('⚠️ Resposta sem dados de paciente:', result);
        showNotification({
          title: 'Paciente não encontrado',
          message: 'Nenhum paciente foi identificado com esta face. Verifique se o cadastro facial foi realizado.',
          color: 'yellow',
        });
      }
    } catch (error: any) {
      console.error('❌ Erro no reconhecimento facial:', error);
      console.error('Detalhes do erro:', {
        response: error?.response?.data,
        message: error?.message,
        status: error?.response?.status
      });
      
      showNotification({
        title: 'Erro no reconhecimento',
        message: error?.response?.data?.detail || error?.response?.data?.message || error?.message || 'Não foi possível reconhecer o paciente.',
        color: 'red',
      });
    } finally {
      setRecognizing(false);
    }
  };

  return (
    <Box bg="var(--mantine-color-body)" style={{ minHeight: '100vh' }}>
      <Header />
      <Box p="xl" maw={1400} mx="auto">
        {/* Welcome Section */}
        <Group mb={30} justify="space-between" align="center">
          <Stack gap="xs">
            <Title order={1} fw={600} style={{ fontSize: '2rem' }}>{getGreeting()}</Title>
            <Text c="dimmed" size="lg">O que você precisa fazer hoje?</Text>
          </Stack>

          {!doctorView ? (
            <Button
              size="lg"
              leftSection={<Camera size={20} strokeWidth={2} />}
              onClick={() => setFacialCaptureOpen(true)}
              loading={recognizing}
              variant="default"
              radius="md"
              styles={{
                root: {
                  fontWeight: 500,
                  '&:hover': {
                    backgroundColor: 'var(--mantine-color-default-hover)',
                  },
                },
              }}
            >
              Identificar Paciente
            </Button>
          ) : null}
        </Group>

        <StatsCards user={currentUser} />
        {!doctorView ? <PatientQueue limit={3} /> : null}
        <WorkflowSections />
      </Box>

      {/* Modal de Captura Facial */}
      <FacialCapture
        opened={facialCaptureOpen}
        onClose={() => setFacialCaptureOpen(false)}
        onCapture={handleFacialScan}
        title="Reconhecimento Facial"
        description="Posicione o rosto do paciente no centro da câmera"
      />

      {/* Modal de Informações do Paciente */}
      <PatientInfoModal
        opened={patientInfoModalOpen}
        onClose={() => setPatientInfoModalOpen(false)}
        patientData={recognizedPatient}
      />
    </Box>
  );
}
