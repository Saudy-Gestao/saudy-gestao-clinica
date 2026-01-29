import { Box, Group, Text, ActionIcon } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { User, ExternalLink } from 'lucide-react';
import { DARK_BLUE } from '../../themes/theme';

export function Header() {
  const isMobile = useMediaQuery('(max-width: 799px)');

  const currentTime = new Date();
  const timeStr = currentTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const day = currentTime.getDate().toString().padStart(2, '0');
  const month = currentTime.toLocaleDateString('pt-BR', { month: 'long' }).replace(/^\w/, c => c.toUpperCase());
  const year = currentTime.getFullYear();
  const dateStr = `${day} de ${month}, ${year}`;

  return (
    <Box bg={DARK_BLUE} c="white" py="md" px="xl">
      <Group justify="space-between">
        <Group>
          <Box bg="white" w={40} h={40} style={{ borderRadius: 8 }} />
          <Text fw={500} size="lg">Logo Clínica</Text>
        </Group>

        <Group gap="xl">
          {!isMobile && <Text size="sm">{timeStr} | {dateStr}</Text>}
          <Group gap="xs">
            <ActionIcon variant="subtle" color="white" size="sm">
              <User size={16} color="white" />
            </ActionIcon>
            <Text c="white" size="xs">|</Text>
            <ActionIcon variant="subtle" color="white" size="sm">
              <ExternalLink size={16} color="white" />
            </ActionIcon>
          </Group>
        </Group>
      </Group>
    </Box>
  );
}