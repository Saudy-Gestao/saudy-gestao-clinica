import { Box, Text, MultiSelect, type BoxProps, type MultiSelectProps } from '@mantine/core';
import type { ReactNode } from 'react';

interface FloatingMultiSelectProps extends MultiSelectProps {
  label: ReactNode;
  containerProps?: BoxProps;
}

export function FloatingMultiSelect({ label, containerProps, value, error, ...props }: FloatingMultiSelectProps) {
  const hasValue = Array.isArray(value) && value.length > 0;

  return (
    <Box w="100%" {...containerProps}>
      <Box
        className={`floating-mantine-field ${hasValue ? 'has-value' : ''}`}
        w="100%"
        style={{ borderColor: error ? '#fa5252' : undefined }}
      >
        <MultiSelect
          {...props}
          value={value}
          error={undefined}
          label={undefined}
          placeholder=""
          variant="unstyled"
        />
        <label style={{ color: error ? '#fa5252' : undefined }}>{label}</label>
      </Box>
      {error ? (
        <Text size="xs" c="red" mt={4}>
          {error}
        </Text>
      ) : null}
    </Box>
  );
}
