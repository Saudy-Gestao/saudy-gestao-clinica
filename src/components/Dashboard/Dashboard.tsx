import { useState, useEffect } from 'react';
import { Box, Title, Text, Stack, Group, Button, ThemeIcon, useMantineColorScheme } from '@mantine/core';
import { useSearchParams } from 'react-router-dom';
import { useMediaQuery } from '@mantine/hooks';
import { Camera } from 'lucide-react';
import { showNotification } from '@mantine/notifications';
import { Header } from '../Header/Header';
import { StatsCards } from '../StatsCards/StatsCards';
import { PatientQueue } from '../PatientQueue/PatientQueue';
import { WorkflowSections } from '../WorkflowSections/WorkflowSections';
import { FacialCapture } from '../common/FacialCapture';
import { PatientInfoModal } from './PatientInfoModal';
import { resolveApiErrorMessage } from '../../lib/apiError';
import facialRecognitionService, { type FacialScanResponse } from '../../services/facialRecognitionService';
import authService from '../../services/authService';
import { isDoctorUser } from '../../utils/userRole';
import { useCurrentUserProfileQuery } from '../../hooks/useCurrentUserProfileQuery';
import { MACRO_SECTIONS } from '../../lib/moduleCatalog';
import { DARK_BLUE } from '../../themes/theme';

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
  const { colorScheme } = useMantineColorScheme();
  const isMobile = useMediaQuery('(max-width: 799px)');
  const [searchParams] = useSearchParams();
  const activeSection = MACRO_SECTIONS.find((section) => section.key === searchParams.get('secao')) || null;
  const accentColor = colorScheme === 'dark' ? 'var(--mantine-color-gray-0)' : DARK_BLUE;

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

      const result: FacialScanResponse = await facialRecognitionService.scanFace({
        image: imageBase64,
        id_unidade: unitId,
      });

      // Verificar se reconheceu algum paciente
      if (result.patient && result.patient.name) {
        const patientData = {
          id: result.patient.id,
          id_medilab: result.patient.id,
          nome: result.patient.name,
          cpf: result.patient.cpf,
        };

        setRecognizedPatient(patientData);

        // Abrir modal com informações do paciente
        setPatientInfoModalOpen(true);

        showNotification({
          title: 'Reconhecimento bem-sucedido!',
          message: `Bem-vindo(a), ${patientData.nome}!`,
          color: 'green',
        });
      } else {
        showNotification({
          title: 'Paciente não encontrado',
          message: 'Nenhum paciente foi identificado com esta face. Verifique se o cadastro facial foi realizado.',
          color: 'yellow',
        });
      }
    } catch (error: any) {
      showNotification({
        title: 'Erro no reconhecimento',
        message: resolveApiErrorMessage(error, 'Não foi possível reconhecer o paciente.'),
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
        {activeSection ? (
          <>
            {/* Blocos do macro selecionado na sidebar */}
            <Group mb={30} gap="md" align="center">
              <ThemeIcon
                size={48}
                variant="transparent"
                color="darkBlue"
                bg="transparent"
                style={{ border: `1px solid ${accentColor}`, borderRadius: 12 }}
              >
                <activeSection.icon size={26} color={accentColor} />
              </ThemeIcon>
              <Stack gap={2}>
                <Title order={1} fw={600} style={{ fontSize: '1.7rem' }}>{activeSection.title}</Title>
                <Text c="dimmed">Escolha um módulo para começar</Text>
              </Stack>
            </Group>
            <WorkflowSections sectionKey={activeSection.key} />
          </>
        ) : (
          <>
            {/* Visão Geral */}
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
            {/* Sem a sidebar (mobile), a Visão Geral segue listando todos os módulos */}
            {isMobile ? <WorkflowSections /> : null}
          </>
        )}
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
