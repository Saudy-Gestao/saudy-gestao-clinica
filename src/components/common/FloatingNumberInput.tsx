import { Box, NumberInput, Text, type BoxProps, type NumberInputProps } from '@mantine/core';
import type { ReactNode } from 'react';

interface FloatingNumberInputProps extends NumberInputProps {
  label: ReactNode;
  containerProps?: BoxProps;
}

export function FloatingNumberInput({ label, containerProps, value, error, ...props }: FloatingNumberInputProps) {
  const hasValue = value !== null && value !== undefined && value !== '';

  return (
    <Box w="100%" {...containerProps}>
      <Box
        className={`floating-mantine-field ${hasValue ? 'has-value' : ''}`}
        w="100%"
        style={{ borderColor: error ? '#fa5252' : undefined }}
      >
        <NumberInput
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
