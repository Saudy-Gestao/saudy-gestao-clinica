import { Box, Text, Select, type BoxProps, type SelectProps } from '@mantine/core';
import { useState } from 'react';

interface FloatingSelectProps extends SelectProps {
  label: string;
  containerProps?: BoxProps;
}

export function FloatingSelect({ label, containerProps, value, error, ...props }: FloatingSelectProps) {
  const [isFocused, setIsFocused] = useState(false);
  const hasValue = value !== null && value !== undefined;

  return (
    <Box w="100%" {...containerProps}>
      <Box
        className={`floating-mantine-field ${isFocused || hasValue ? 'has-value' : ''}`}
        w="100%"
        onFocusCapture={() => setIsFocused(true)}
        onBlurCapture={() => setIsFocused(false)}
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
