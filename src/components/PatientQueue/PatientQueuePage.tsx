import { Box, Text } from '@/components/ui';
import { useNavigate } from 'react-router-dom';
import { Header } from '../Header/Header';
import { PatientQueue } from './PatientQueue';

export function PatientQueuePage() {
  const navigate = useNavigate();

  return (
    <Box bg="var(--ui-background)" style={{ minHeight: '100vh' }}>
      <Header back={{ label: 'Voltar', onClick: () => navigate('/dashboard') }} />
      <Box p="xl" maw={1400} mx="auto">
        <Box mb={30}>
          <Text fw={600} size="lg">
            Fila de Atendimento
          </Text>
          <Text size="sm" c="dimmed">
            Visualização completa dos pacientes aguardando chamada na recepção.
          </Text>
        </Box>

        <PatientQueue limit={undefined} showViewAll={false} fullPage />
      </Box>
    </Box>
  );
}
