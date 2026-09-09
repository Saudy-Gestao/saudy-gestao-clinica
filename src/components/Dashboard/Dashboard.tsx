import { useState, useEffect } from 'react';
import { Box, Title, Text, Stack, Group, Button, ThemeIcon } from '@/components/ui';
import { useSearchParams } from 'react-router-dom';
import { useMediaQuery } from '@/components/ui';
import { Camera } from 'lucide-react';
import { showNotification } from '@/components/ui';
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
import './Dashboard.css';

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
  const isMobile = useMediaQuery('(max-width: 799px)');
  const [searchParams] = useSearchParams();
  const activeSection = MACRO_SECTIONS.find((section) => section.key === searchParams.get('secao')) || null;
  const accentColor = 'var(--ui-primary)';

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
    <Box className="dashboard-page">
      <Header />
      <main className="dashboard-container">
        {activeSection ? (
          <>
            {/* Blocos do macro selecionado na sidebar */}
            <Group className="dashboard-section-heading" gap="md" align="center">
              <ThemeIcon
                className="dashboard-section-heading__icon"
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
            <header className="dashboard-hero">
              <div className="dashboard-hero__copy">
                <Text className="dashboard-eyebrow">PAINEL DE GESTÃO · OPERAÇÃO CLÍNICA</Text>
                <Title order={1} className="dashboard-hero__title">{getGreeting()}</Title>
                <Text className="dashboard-hero__subtitle">O que você precisa acompanhar hoje?</Text>
              </div>

              {!doctorView ? (
                <Button
                  size="lg"
                  leftSection={<Camera size={20} strokeWidth={2} />}
                  onClick={() => setFacialCaptureOpen(true)}
                  loading={recognizing}
                  variant="default"
                  radius="md"
                  className="dashboard-hero__action"
                >
                  Identificar Paciente
                </Button>
              ) : null}
            </header>

            <StatsCards user={currentUser} />
            {!doctorView ? <PatientQueue limit={3} /> : null}
            {/* Sem a sidebar (mobile), a Visão Geral segue listando todos os módulos */}
            {isMobile ? <WorkflowSections /> : null}
          </>
        )}
      </main>

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
