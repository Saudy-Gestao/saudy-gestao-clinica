import { useEffect, useState } from 'react';
import { Box, Group, Text, Modal, Stack, Button } from '@/components/ui';
import { useNavigate } from 'react-router-dom';
import { useMediaQuery } from '@/components/ui';
import { Header } from '../Header/Header';
import { WhatsAppConfig } from './WhatsAppConfig';
import { useWhatsAppConfigQuery } from '../../hooks/useWhatsAppConfigQuery';
import './WhatsAppPage.css';

const hasDatabaseWhatsAppCredentials = (config: any) => Boolean(
  config?.accountSid?.trim()
  && config?.authToken?.trim()
  && config?.fromNumber?.trim(),
);

export function WhatsAppPage() {
  const navigate = useNavigate();
  const isMobile = useMediaQuery('(max-width: 799px)');
  const isTablet = useMediaQuery('(max-width: 1279px)');
  const { data: config, isLoading } = useWhatsAppConfigQuery();
  const [redirectModalOpen, setRedirectModalOpen] = useState(false);
  const hasCredentialsConfigured = hasDatabaseWhatsAppCredentials(config);

  useEffect(() => {
    if (isLoading) return;
    setRedirectModalOpen(!hasCredentialsConfigured);
  }, [hasCredentialsConfigured, isLoading]);

  return (
    <Box bg="var(--ui-background)" style={{ minHeight: '100vh' }}>
      <Header back={{ label: 'Voltar', onClick: () => navigate('/dashboard?secao=comunicacao') }} />
      <Box p={isMobile ? 'sm' : isTablet ? 'md' : 'xl'} maw={isMobile ? '100%' : 1400} mx="auto" w="100%">
        <Box className="whatsapp-page-hero">
          <Text className="whatsapp-page-eyebrow">COMUNICAÇÃO</Text>
          <Text className="whatsapp-page-title" fw={700} size="2xl">WhatsApp</Text>
          <Text className="whatsapp-page-subtitle" size="sm">Mensagens, templates e configuração do canal.</Text>
        </Box>

        {hasCredentialsConfigured ? (
          <WhatsAppConfig />
        ) : (
          <Box py="xl">
            <Text c="dimmed">
              Para usar a tela de WhatsApp, salve primeiro as credenciais da filial em Configurações.
            </Text>
          </Box>
        )}
      </Box>

      <Modal
        opened={redirectModalOpen}
        onClose={() => {
          setRedirectModalOpen(false);
          navigate('/dashboard');
        }}
        title="Credencial obrigatória"
        centered
        withCloseButton={false}
        closeOnClickOutside={false}
        closeOnEscape={false}
      >
        <Stack gap="md">
          <Text size="sm">
            A tela de WhatsApp só pode ser usada quando a credencial estiver salva no banco para esta filial.
            Deseja ir agora para Configurações?
          </Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => {
              setRedirectModalOpen(false);
              navigate('/dashboard');
            }}>
              Não
            </Button>
            <Button onClick={() => {
              setRedirectModalOpen(false);
              navigate('/settings');
            }}>
              OK
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Box>
  );
}
