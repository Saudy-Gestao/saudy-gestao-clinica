import { Box, TagsInput, Text, type BoxProps, type TagsInputProps } from '@mantine/core';
import type { ReactNode } from 'react';

interface FloatingTagsInputProps extends TagsInputProps {
  label: ReactNode;
  containerProps?: BoxProps;
}

export function FloatingTagsInput({ label, containerProps, value, error, styles, ...props }: FloatingTagsInputProps) {
  const hasValue = Array.isArray(value) && value.length > 0;

  return (
    <Box w="100%" {...containerProps}>
      <Box
        className={`floating-mantine-field floating-mantine-field--tags ${hasValue ? 'has-value' : ''}`}
        w="100%"
        style={{ borderColor: error ? '#fa5252' : undefined }}
      >
        <TagsInput
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
              minHeight: 36,
              padding: '14px 0 6px',
              background: 'transparent',
              boxShadow: 'none',
            },
            pillsList: {
              gap: 6,
              minHeight: 36,
              paddingTop: 10,
              paddingBottom: 4,
            },
            inputField: {
              minHeight: 20,
              fontSize: '0.875rem',
              color: 'var(--mantine-color-text)',
              padding: 0,
            },
            pill: {
              height: 24,
            },
            ...styles,
          }}
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
