import { Box, Text, type BoxProps } from '@mantine/core';
import { DateInput, type DateInputProps } from '@mantine/dates';
import type { ReactNode } from 'react';

interface FloatingDateInputProps extends DateInputProps {
  label: ReactNode;
  containerProps?: BoxProps;
}

export function FloatingDateInput({ label, containerProps, value, error, ...props }: FloatingDateInputProps) {
  const hasValue = value !== null && value !== undefined;

  return (
    <Box w="100%" {...containerProps}>
      <Box
        className={`floating-mantine-field ${hasValue ? 'has-value' : ''}`}
        w="100%"
        style={{ borderColor: error ? '#fa5252' : undefined }}
      >
        <DateInput
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
