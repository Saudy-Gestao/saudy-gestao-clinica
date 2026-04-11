import { Box, Group, Pagination, Select, Stack, Text, useComputedColorScheme } from '@mantine/core';
import { useMemo } from 'react';
import type { ReactNode } from 'react';

type PaginatedGridProps = {
  children: ReactNode;
  totalItems: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  pageSizeOptions?: number[];
  maxHeight?: number | string;
  isMobile?: boolean;
  showFooter?: boolean;
};

export function PaginatedGrid({
  children,
  totalItems,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [5, 10, 20, 50],
  maxHeight = 560,
  isMobile = false,
  showFooter = true,
}: PaginatedGridProps) {
  const isDarkMode = useComputedColorScheme('light') === 'dark';
  const totalPages = useMemo(() => {
    if (totalItems <= 0) return 1;
    return Math.max(1, Math.ceil(totalItems / pageSize));
  }, [pageSize, totalItems]);

  const rangeStart = totalItems === 0 ? 0 : ((page - 1) * pageSize) + 1;
  const rangeEnd = Math.min(page * pageSize, totalItems);

  return (
    <Stack gap="sm">
      <Box style={{ border: '1px solid var(--mantine-color-default-border)', borderRadius: 6 }}>
        <Box
          style={{
            maxHeight,
            overflowX: 'auto',
            overflowY: 'auto',
            scrollbarWidth: 'thin',
            scrollbarColor: isDarkMode
              ? 'rgba(156, 181, 235, 0.55) rgba(9, 20, 54, 0.5)'
              : 'rgba(42, 84, 166, 0.45) rgba(221, 230, 248, 0.9)',
          }}
          sx={{
            '&::-webkit-scrollbar': {
              width: '10px',
              height: '10px',
            },
            '&::-webkit-scrollbar-track': {
              background: isDarkMode ? 'rgba(9, 20, 54, 0.5)' : 'rgba(221, 230, 248, 0.9)',
              borderRadius: '999px',
            },
            '&::-webkit-scrollbar-thumb': {
              background: isDarkMode ? 'rgba(156, 181, 235, 0.55)' : 'rgba(42, 84, 166, 0.45)',
              borderRadius: '999px',
              border: isDarkMode
                ? '2px solid rgba(9, 20, 54, 0.5)'
                : '2px solid rgba(221, 230, 248, 0.9)',
            },
            '&::-webkit-scrollbar-thumb:hover': {
              background: isDarkMode ? 'rgba(183, 202, 247, 0.72)' : 'rgba(42, 84, 166, 0.62)',
            },
          }}
        >
          {children}
        </Box>
      </Box>

      {showFooter && totalItems > 0 && (
        <Group justify="space-between" align="flex-end" wrap="wrap">
          <Text size="sm" c="dimmed">
            Mostrando {rangeStart}-{rangeEnd} de {totalItems} registros
          </Text>

          <Group gap="sm" align="flex-end">
            <Stack gap={4}>
              <Text size="xs" c="dimmed">Itens por página</Text>
              <Select
                size="xs"
                data={pageSizeOptions.map((value) => ({ value: String(value), label: String(value) }))}
                value={String(pageSize)}
                onChange={(value) => onPageSizeChange(Number(value || pageSize))}
                allowDeselect={false}
                w={120}
              />
            </Stack>

            <Pagination
              value={page}
              onChange={onPageChange}
              total={totalPages}
              size={isMobile ? 'sm' : 'md'}
            />
          </Group>
        </Group>
      )}
    </Stack>
  );
}
