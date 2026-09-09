import { Box, Button, Paper, Stack, Text, Title } from '@/components/ui';
import { ArrowRight, CheckCircle2, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import styles from './TeleconsultaFinished.module.css';

export function TeleconsultaFinished() {
  const navigate = useNavigate();

  return (
    <Box className={styles.page}>
      <Box className={styles.header}>
        <Box className={styles.brandMark}>S</Box>
        <Box>
          <Text className={styles.brand}>Saudy</Text>
          <Text className={styles.context}>Teleconsulta segura</Text>
        </Box>
        <Box className={styles.headerStatus}><span /> Sessão encerrada</Box>
      </Box>

      <Box className={styles.content}>
        <Paper className={styles.card} withBorder>
          <Box className={styles.successIcon}><CheckCircle2 size={30} /></Box>
          <Text className={styles.overline}><ShieldCheck size={15} /> Atendimento concluído</Text>
          <Title order={1} className={styles.title}>Teleconsulta finalizada</Title>
          <Text className={styles.description}>
            O atendimento foi encerrado com segurança. Obrigado por utilizar a plataforma Saudy.
          </Text>
          <Stack gap="sm" className={styles.actions}>
            <Button fullWidth size="lg" rightSection={<ArrowRight size={18} />} onClick={() => navigate('/portal')}>
              Ir para o Portal do Paciente
            </Button>
            <Text className={styles.helper}>Você já pode fechar esta página.</Text>
          </Stack>
        </Paper>
      </Box>
    </Box>
  );
}

export default TeleconsultaFinished;
