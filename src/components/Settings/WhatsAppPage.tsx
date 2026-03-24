import { Box, Group, ActionIcon, Text, Container } from '@mantine/core';
import { useNavigate } from 'react-router-dom';
import { useMediaQuery } from '@mantine/hooks';
import { ChevronLeft } from 'lucide-react';
import { Header } from '../Header/Header';
import { WhatsAppConfig } from './WhatsAppConfig';

export function WhatsAppPage() {
  const navigate = useNavigate();
  const isMobile = useMediaQuery('(max-width: 768px)');

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
        <WhatsAppConfig />
      </Container>
    </Box>
  );
}
