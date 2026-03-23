import { Box, Text, Textarea, type BoxProps, type TextareaProps } from '@mantine/core';
import { useState } from 'react';

interface FloatingTextareaProps extends TextareaProps {
  label: string;
  containerProps?: BoxProps;
}

export function FloatingTextarea({ label, containerProps, value, error, ...props }: FloatingTextareaProps) {
  const [isFocused, setIsFocused] = useState(false);
  const hasValue = value !== null && value !== undefined && String(value).trim().length > 0;

  return (
    <Box w="100%" {...containerProps}>
      <Box
        className={`floating-mantine-field floating-mantine-field--textarea ${isFocused || hasValue ? 'has-value' : ''}`}
        w="100%"
        onFocusCapture={() => setIsFocused(true)}
        onBlurCapture={() => setIsFocused(false)}
        style={{ borderColor: error ? '#fa5252' : undefined }}
      >
        <Textarea
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
