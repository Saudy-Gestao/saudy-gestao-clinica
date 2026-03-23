import { Box, Text, MultiSelect, type BoxProps, type MultiSelectProps } from '@mantine/core';
import { useState } from 'react';

interface FloatingMultiSelectProps extends MultiSelectProps {
  label: string;
  containerProps?: BoxProps;
}

export function FloatingMultiSelect({ label, containerProps, value, error, ...props }: FloatingMultiSelectProps) {
  const [isFocused, setIsFocused] = useState(false);
  const hasValue = Array.isArray(value) && value.length > 0;

  return (
    <Box w="100%" {...containerProps}>
      <Box
        className={`floating-mantine-field ${isFocused || hasValue ? 'has-value' : ''}`}
        w="100%"
        onFocusCapture={() => setIsFocused(true)}
        onBlurCapture={() => setIsFocused(false)}
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
