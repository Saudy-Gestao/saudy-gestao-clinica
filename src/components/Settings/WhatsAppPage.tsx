import { useEffect, useState } from 'react';
import { Box, Group, ActionIcon, Text, Modal, Stack, Button } from '@mantine/core';
import { useNavigate } from 'react-router-dom';
import { useMediaQuery } from '@mantine/hooks';
import { ChevronLeft } from 'lucide-react';
import { Header } from '../Header/Header';
import { WhatsAppConfig } from './WhatsAppConfig';
import { useWhatsAppConfigQuery } from '../../hooks/useWhatsAppConfigQuery';

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
    <Box bg="var(--mantine-color-body)" style={{ minHeight: '100vh' }}>
      <Header />
      <Box p={isMobile ? 'sm' : isTablet ? 'md' : 'xl'} maw={isMobile ? '100%' : 1400} mx="auto" w="100%">
        <Group mb={isMobile ? 20 : 30} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Group align="center">
            <ActionIcon variant="default" color="black" size="xl" onClick={() => navigate(-1)}>
              <ChevronLeft size={28} />
            </ActionIcon>
            <Box>
              <Text fw={600} size={isMobile ? 'md' : 'lg'} c="var(--mantine-color-text)">WhatsApp</Text>
              <Text size="sm" c="dimmed">Notificações e configurações</Text>
            </Box>
          </Group>
        </Group>

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
