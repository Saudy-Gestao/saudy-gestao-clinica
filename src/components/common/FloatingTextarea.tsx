import { Box, Text, Textarea, type BoxProps, type TextareaProps } from '@mantine/core';
import type { ReactNode } from 'react';
import { withRequiredIndicator } from './requiredLabel';

interface FloatingTextareaProps extends TextareaProps {
  label: ReactNode;
  containerProps?: BoxProps;
}

export function FloatingTextarea({ label, containerProps, value, error, ...props }: FloatingTextareaProps) {
  const hasValue = value !== null && value !== undefined && String(value).trim().length > 0;
  const requiredIndicator = Boolean((props as any).required || (props as any).withAsterisk);

  return (
    <Box w="100%" {...containerProps}>
      <Box
        className={`floating-mantine-field floating-mantine-field--textarea ${hasValue ? 'has-value' : ''}`}
        w="100%"
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
        <label style={{ color: error ? '#fa5252' : undefined }}>{withRequiredIndicator(label, requiredIndicator)}</label>
      </Box>
      {error ? (
        <Text size="xs" c="red" mt={4}>
          {error}
        </Text>
      ) : null}
    </Box>
  );
}
