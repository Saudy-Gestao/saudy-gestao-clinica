import { useEffect, useState } from 'react';
import { Box, Group, ActionIcon, Text, Container, Modal, Stack, Button } from '@mantine/core';
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
  const isMobile = useMediaQuery('(max-width: 768px)');
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
      
      {/* Page Header */}
      <Box
        style={{
          backgroundColor: 'var(--mantine-color-body)',
          borderBottom: '1px solid var(--mantine-color-default-border)',
          padding: isMobile ? '12px 16px' : '16px 24px',
        }}
      >
        <Container size="xl" px={isMobile ? 0 : 'md'}>
          <Group mb={isMobile ? 16 : 24} wrap="nowrap">
            <ActionIcon 
              variant="default" 
              color="black" 
              size={isMobile ? 'lg' : 'xl'} 
              onClick={() => navigate('/dashboard')}
            >
              <ChevronLeft size={isMobile ? 22 : 28} />
            </ActionIcon>
            <Box>
              <Text fw={600} size={isMobile ? 'md' : 'lg'} c="var(--mantine-color-text)">
                WhatsApp
              </Text>
              <Text size="sm" c="dimmed">
                Notificações e configurações
              </Text>
            </Box>
          </Group>
        </Container>
      </Box>

      {/* Content */}
      <Container size="xl" px={isMobile ? 'xs' : 'md'} py="xl">
        {hasCredentialsConfigured ? (
          <WhatsAppConfig />
        ) : (
          <Box py="xl">
            <Text c="dimmed">
              Para usar a tela de WhatsApp, salve primeiro as credenciais da filial em Configurações.
            </Text>
          </Box>
        )}
      </Container>

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
