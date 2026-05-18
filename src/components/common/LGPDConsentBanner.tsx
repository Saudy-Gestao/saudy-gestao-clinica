import { useState, useEffect } from 'react';
import { Box, Button, Group, Text, Anchor } from '@mantine/core';
import { ShieldCheck } from 'lucide-react';

const CONSENT_KEY = 'lgpd_consent_accepted';

export function LGPDConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(CONSENT_KEY)) setVisible(true);
  }, []);

  if (!visible) return null;

  const accept = () => {
    localStorage.setItem(CONSENT_KEY, '1');
    setVisible(false);
  };

  return (
    <Box
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        background: 'var(--mantine-color-dark-7, #1a1b1e)',
        borderTop: '1px solid var(--mantine-color-dark-4, #373a40)',
        padding: '16px 24px',
      }}
    >
      <Group justify="space-between" align="center" wrap="wrap" gap="md">
        <Group gap="sm" align="flex-start" style={{ flex: 1, minWidth: 260 }}>
          <ShieldCheck size={20} color="var(--mantine-color-blue-4)" style={{ marginTop: 2, flexShrink: 0 }} />
          <Box>
            <Text size="sm" fw={600} c="white">
              Este sistema utiliza armazenamento local de dados
            </Text>
            <Text size="xs" c="dimmed" mt={2}>
              Para funcionar corretamente, salvamos informações de sessão e preferências no seu dispositivo. Nenhum dado é compartilhado com terceiros nem utilizamos rastreamento externo. Ao continuar, você concorda com nossa{' '}
              <Anchor href="/privacidade" target="_blank" rel="noopener noreferrer" size="xs" c="blue.4">
                Política de Privacidade
              </Anchor>
              {' '}e nossos{' '}
              <Anchor href="/termos" target="_blank" rel="noopener noreferrer" size="xs" c="blue.4">
                Termos de Serviço
              </Anchor>
              {', '}em conformidade com a LGPD.
            </Text>
          </Box>
        </Group>
        <Button size="sm" color="blue" onClick={accept} style={{ flexShrink: 0 }}>
          Entendi e aceito
        </Button>
      </Group>
    </Box>
  );
}
