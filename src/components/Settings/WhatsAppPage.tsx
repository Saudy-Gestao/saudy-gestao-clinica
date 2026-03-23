import { Box } from '@mantine/core';
import { Header } from '../Header/Header';
import { WhatsAppConfig } from './WhatsAppConfig';

export function WhatsAppPage() {
  return (
    <Box bg="var(--mantine-color-body)" style={{ minHeight: '100vh' }}>
      <Header />
      <Box p="xl" maw={1400} mx="auto">
        <WhatsAppConfig />
      </Box>
    </Box>
  );
}
