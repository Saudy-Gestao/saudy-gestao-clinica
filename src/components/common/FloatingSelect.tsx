import { Box, Text, Select, type BoxProps, type SelectProps } from '@mantine/core';
import type { ReactNode } from 'react';
import { withRequiredIndicator } from './requiredLabel';

interface FloatingSelectProps extends SelectProps {
  label: ReactNode;
  containerProps?: BoxProps;
  alwaysFloatLabel?: boolean;
}

export function FloatingSelect({ label, containerProps, value, error, alwaysFloatLabel = false, styles, ...props }: FloatingSelectProps) {
  const hasValue = typeof value === 'string'
    ? value.trim().length > 0
    : value !== null && value !== undefined;
  const requiredIndicator = Boolean((props as any).required || (props as any).withAsterisk);

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
          styles={{
            input: {
              border: 'none',
              borderBottom: '1px solid var(--mantine-color-default-border)',
              borderRadius: 0,
              padding: '10px 28px 6px 0',
              height: 34,
              boxSizing: 'border-box',
              lineHeight: '1.2',
              background: 'transparent',
              boxShadow: 'none',
            },
            section: {
              top: 'auto',
              bottom: 8,
              transform: 'none',
              pointerEvents: 'none',
            },
            ...styles,
          }}
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
