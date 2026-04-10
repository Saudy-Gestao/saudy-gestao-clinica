import { Box, Button, Paper, Stack, Text, Title } from '@mantine/core';
import { CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function TeleconsultaFinished() {
  const navigate = useNavigate();

  return (
    <Box bg="var(--mantine-color-body)" style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 16 }}>
      <Paper withBorder radius="md" p="xl" maw={560} w="100%">
        <Stack gap="md" align="center">
          <CheckCircle2 size={56} color="#2f9e44" />
          <Title order={3} ta="center">Teleconsulta finalizada com sucesso</Title>
          <Text c="dimmed" ta="center">
            Seu atendimento foi encerrado. Se quiser, você pode voltar para o Portal do Paciente.
          </Text>
          <Button color="darkBlue" onClick={() => navigate('/portal')}>
            Ir para o Portal do Paciente
          </Button>
          <Text size="sm" c="dimmed" ta="center">
            Se preferir, você já pode fechar esta página.
          </Text>
        </Stack>
      </Paper>
    </Box>
  );
}

export default TeleconsultaFinished;
