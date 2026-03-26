import { Box, Text, Select, type BoxProps, type SelectProps } from '@mantine/core';
import type { ReactNode } from 'react';

interface FloatingSelectProps extends SelectProps {
  label: ReactNode;
  containerProps?: BoxProps;
  alwaysFloatLabel?: boolean;
}

export function FloatingSelect({ label, containerProps, value, error, alwaysFloatLabel = false, ...props }: FloatingSelectProps) {
  const hasValue = value !== null && value !== undefined;

  return (
    <Box w="100%" {...containerProps}>
      <Box
        className={`floating-mantine-field ${hasValue || alwaysFloatLabel ? 'has-value' : ''}`}
        w="100%"
        style={{ borderColor: error ? '#fa5252' : undefined }}
      >
        <Select
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
