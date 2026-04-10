import { Box, Text, MultiSelect, type BoxProps, type MultiSelectProps } from '@mantine/core';
import type { ReactNode } from 'react';
import { withRequiredIndicator } from './requiredLabel';

interface FloatingMultiSelectProps extends MultiSelectProps {
  label: ReactNode;
  containerProps?: BoxProps;
}

export function FloatingMultiSelect({ label, containerProps, value, error, styles, ...props }: FloatingMultiSelectProps) {
  const hasValue = Array.isArray(value) && value.length > 0;
  const requiredIndicator = Boolean((props as any).required || (props as any).withAsterisk);

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
          styles={{
            input: {
              border: 'none',
              borderBottom: '1px solid var(--mantine-color-default-border)',
              borderRadius: 0,
              minHeight: 34,
              padding: '8px 28px 4px 0',
              background: 'transparent',
              boxShadow: 'none',
            },
            pillsList: {
              gap: 6,
              minHeight: 0,
              paddingTop: 0,
              paddingBottom: 0,
            },
            inputField: {
              minHeight: 18,
              fontSize: '0.875rem',
              color: 'var(--mantine-color-text)',
              padding: 0,
            },
            pill: {
              height: 22,
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
