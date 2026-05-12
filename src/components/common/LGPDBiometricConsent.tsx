import { useState } from 'react';
import { Modal, Stack, Title, Text, Checkbox, Button, Group, List, ThemeIcon } from '@mantine/core';
import { ShieldCheck, AlertTriangle } from 'lucide-react';

interface LGPDBiometricConsentProps {
  opened: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

export function LGPDBiometricConsent({ opened, onAccept, onDecline }: LGPDBiometricConsentProps) {
  const [checked, setChecked] = useState(false);

  const handleAccept = () => {
    if (!checked) return;
    onAccept();
  };

  const handleClose = () => {
    setChecked(false);
    onDecline();
  };

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={
        <Group gap="xs">
          <ThemeIcon color="blue" variant="light" size="md">
            <ShieldCheck size={16} />
          </ThemeIcon>
          <Title order={4}>Autorização para Reconhecimento Facial</Title>
        </Group>
      }
      size="md"
      closeOnClickOutside={false}
      closeOnEscape={false}
    >
      <Stack gap="md">
        <Text size="sm" c="dimmed">
          Em conformidade com a <strong>Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018)</strong>,
          solicitamos seu consentimento para coleta e uso de seus dados biométricos (imagem do rosto).
        </Text>

        <Stack gap="xs">
          <Text size="sm" fw={600}>Seus dados biométricos serão utilizados para:</Text>
          <List size="sm" spacing="xs" icon={
            <ThemeIcon color="green" size={18} variant="light" radius="xl">
              <ShieldCheck size={12} />
            </ThemeIcon>
          }>
            <List.Item>Identificação e check-in nesta unidade de saúde</List.Item>
            <List.Item>Agilizar seu atendimento sem necessidade de documentos físicos</List.Item>
          </List>
        </Stack>

        <Stack gap="xs">
          <Text size="sm" fw={600}>Informações importantes:</Text>
          <List size="sm" spacing="xs" icon={
            <ThemeIcon color="blue" size={18} variant="light" radius="xl">
              <AlertTriangle size={12} />
            </ThemeIcon>
          }>
            <List.Item>A imagem é processada exclusivamente para identificação e <strong>não é armazenada</strong> em formato legível</List.Item>
            <List.Item>Você pode solicitar a exclusão dos seus dados biométricos a qualquer momento</List.Item>
            <List.Item>Seus dados não serão compartilhados com terceiros sem seu consentimento</List.Item>
            <List.Item>O consentimento pode ser revogado entrando em contato com a recepção</List.Item>
          </List>
        </Stack>

        <Checkbox
          checked={checked}
          onChange={(e) => setChecked(e.currentTarget.checked)}
          label={
            <Text size="sm">
              Declaro que li e <strong>concordo com o uso dos meus dados biométricos</strong> para identificação nesta unidade, conforme informado acima.
            </Text>
          }
        />

        <Group justify="flex-end" gap="sm">
          <Button variant="subtle" color="gray" onClick={handleClose}>
            Não autorizo — usar identificação manual
          </Button>
          <Button
            color="blue"
            leftSection={<ShieldCheck size={16} />}
            onClick={handleAccept}
            disabled={!checked}
          >
            Autorizo o uso da biometria
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
