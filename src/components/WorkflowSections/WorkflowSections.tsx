import { Box, Text, SimpleGrid, Paper, Group, ThemeIcon, useMantineColorScheme, Skeleton, Stack, Badge } from '@mantine/core';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { ChevronRight } from 'lucide-react';
import { DARK_BLUE } from '../../themes/theme';
import { useMyTicketsQuery } from '../../hooks/useMyTicketsQuery';
import { useVisibleSections, type ModuleItem } from '../../lib/moduleCatalog';

type WorkflowSectionsProps = {
  /**
   * Quando informado, renderiza apenas os módulos daquele macro, em blocos
   * maiores (modo usado pelo dashboard com a sidebar). Sem prop, renderiza
   * todas as seções no formato compacto original.
   */
  sectionKey?: string;
};

export function WorkflowSections({ sectionKey }: WorkflowSectionsProps) {
  const navigate = useNavigate();
  const { colorScheme } = useMantineColorScheme();
  const accentColor = colorScheme === 'dark' ? 'var(--mantine-color-gray-0)' : DARK_BLUE;
  const {
    sections,
    currentUser,
    doctorView,
    visibleAllowedModules,
    hasResolvedAccessData,
    isLoading,
    isFetching,
    refetch,
  } = useVisibleSections();
  const { data: myTicketsData } = useMyTicketsQuery();
  const unreadMyTickets = Number(myTicketsData?.unreadCount || 0);

  useEffect(() => {
    const onUserUpdated = () => {
      refetch();
    };

    window.addEventListener('auth:changed', onUserUpdated);
    window.addEventListener('auth:user-updated', onUserUpdated);

    return () => {
      window.removeEventListener('auth:changed', onUserUpdated);
      window.removeEventListener('auth:user-updated', onUserUpdated);
    };
  }, [refetch]);

  const filteredSections = sectionKey
    ? sections.filter((section) => section.key === sectionKey)
    : sections;

  const blocksMode = Boolean(sectionKey);

  const openItem = (item: ModuleItem) => {
    if (!item.route) return;
    if (item.moduleName === 'modulo-tea') {
      navigate(item.route, { state: { fromModuleHub: true } });
      return;
    }
    navigate(item.route);
  };

  const renderCard = (item: ModuleItem, i: number) => (
    <Paper
      key={i}
      p={blocksMode ? 'lg' : 'xs'}
      withBorder
      className={colorScheme === 'dark' ? 'module-card-dark' : undefined}
      style={{
        cursor: item.route ? 'pointer' : 'default',
        borderColor: 'var(--mantine-color-default-border)',
        minHeight: blocksMode ? 96 : 60,
        height: '100%',
      }}
      onClick={() => openItem(item)}
    >
      <Group justify="space-between" align={blocksMode ? 'center' : 'flex-start'} wrap="nowrap" h={blocksMode ? '100%' : undefined}>
        <Group gap={blocksMode ? 'md' : 'xs'} wrap="nowrap" style={{ minWidth: 0, flex: 1 }}>
          <ThemeIcon
            size={blocksMode ? 44 : 'md'}
            variant="transparent"
            color="darkBlue"
            bg="transparent"
            style={{ border: `1px solid ${accentColor}`, borderRadius: blocksMode ? 10 : 6, flexShrink: 0 }}
          >
            <item.icon size={blocksMode ? 22 : 18} color={accentColor} />
          </ThemeIcon>
          <Box style={{ minWidth: 0 }}>
            <Group gap={6} wrap="nowrap">
              <Text fw={blocksMode ? 600 : 500} size={blocksMode ? 'md' : 'sm'} lineClamp={1}>{item.label}</Text>
              {item.moduleName === 'meus-chamados' && unreadMyTickets > 0 ? (
                <Badge color="red" size="xs">{unreadMyTickets}</Badge>
              ) : null}
            </Group>
            <Text size={blocksMode ? 'sm' : 'xs'} c="dimmed" lineClamp={blocksMode ? 2 : 1}>{item.desc}</Text>
          </Box>
        </Group>
        {item.route && <ChevronRight size={blocksMode ? 18 : 16} color="var(--mantine-color-dimmed)" style={{ flexShrink: 0 }} />}
      </Group>
    </Paper>
  );

  if ((isLoading && !currentUser) || (isFetching && !hasResolvedAccessData)) {
    return (
      <Box py="xl">
        <Stack gap="xl">
          {Array.from({ length: blocksMode ? 1 : 3 }).map((_, sectionIndex) => (
            <Box key={sectionIndex}>
              {!blocksMode && <Skeleton height={22} width={180} radius="xl" mb="md" />}
              <SimpleGrid cols={{ base: 1, sm: 2, md: blocksMode ? 3 : 4 }} spacing="md">
                {Array.from({ length: 4 }).map((__, cardIndex) => (
                  <Paper
                    key={cardIndex}
                    p="xs"
                    withBorder
                    style={{
                      borderColor: 'var(--mantine-color-default-border)',
                      minHeight: blocksMode ? 96 : 60,
                    }}
                  >
                    <Group justify="space-between" align="flex-start">
                      <Group gap="xs" align="flex-start">
                        <Skeleton height={blocksMode ? 44 : 32} width={blocksMode ? 44 : 32} radius="md" />
                        <Box>
                          <Skeleton height={14} width={120} radius="xl" mb={6} />
                          <Skeleton height={11} width={90} radius="xl" />
                        </Box>
                      </Group>
                      <Skeleton height={14} width={14} radius="xl" />
                    </Group>
                  </Paper>
                ))}
              </SimpleGrid>
            </Box>
          ))}
        </Stack>
      </Box>
    );
  }

  if (visibleAllowedModules.length === 0 && !doctorView) {
    return (
      <Box p="xl" style={{ textAlign: 'center' }}>
        <Text size="lg" c="dimmed" mb="xs">
          🔒 Você ainda não possui acessos configurados
        </Text>
        <Text size="sm" c="dimmed">
          Entre em contato com o administrador do sistema para solicitar permissões
        </Text>
      </Box>
    );
  }

  if (filteredSections.length === 0) {
    return (
      <Box p="xl" style={{ textAlign: 'center' }}>
        <Text size="lg" c="dimmed" mb="xs">
          🔒 Nenhum módulo disponível
        </Text>
        <Text size="sm" c="dimmed">
          Seus acessos não correspondem a nenhum módulo do sistema
        </Text>
      </Box>
    );
  }

  return (
    <>
      {filteredSections.map((section) => (
        <Box key={section.key} mb={30}>
          {!blocksMode && <Text fw={600} size="lg" c="dimmed" mb="md">{section.title}</Text>}
          <SimpleGrid cols={{ base: 1, sm: 2, md: blocksMode ? 3 : 4 }} spacing="md">
            {section.items.map(renderCard)}
          </SimpleGrid>
        </Box>
      ))}
    </>
  );
}
