import React from 'react';
import { Modal, Center, ThemeIcon, Text, Group, Button } from '@mantine/core';
import { Check, X } from 'lucide-react';
import { DARK_BLUE } from '../../themes/theme';

type Variant = 'success' | 'error';

interface Action {
  label: string;
  onClick: () => void;
  variant?: 'filled' | 'outline' | 'default';
}

interface ResultModalProps {
  opened: boolean;
  onClose: () => void;
  variant?: Variant;
  title?: string;
  message?: string;
  primary?: Action;
  secondary?: Action;
  size?: number | 'auto' | 'xs' | 'sm' | 'md' | 'lg' | 'xl';
}

export default function ResultModal({ opened, onClose, variant = 'success', title, message, primary, secondary, size = 420 }: ResultModalProps) {
  const isSuccess = variant === 'success';
  return (
    <Modal opened={opened} onClose={onClose} withCloseButton={false} centered size={size as any} closeOnEscape={true} closeOnClickOutside={false}>
      <Center style={{ flexDirection: 'column', gap: 16, padding: 8 }}>
        <ThemeIcon size={64} radius="xl" color={isSuccess ? 'teal' : 'red'} variant="filled">
          {isSuccess ? <Check size={34} /> : <X size={34} />}
        </ThemeIcon>
        <Text fw={700} size="lg">{title || (isSuccess ? 'Operação realizada' : 'Ocorreu um erro')}</Text>
        {message && <Text c="dimmed" align="center">{message}</Text>}

        <Group mt={8} justify="center" gap="lg">
          {primary && (
            <Button bg={DARK_BLUE} c="white" onClick={() => { primary.onClick(); }} style={{ minWidth: 140 }}>
              {primary.label}
            </Button>
          )}

          {secondary ? (
            <Button variant={secondary.variant || 'default'} onClick={() => { secondary.onClick(); }} style={{ minWidth: 140 }}>
              {secondary.label}
            </Button>
          ) : (
            <Button variant="default" onClick={onClose} style={{ minWidth: 140 }}>Fechar</Button>
          )}
        </Group>
      </Center>
    </Modal>
  );
}
