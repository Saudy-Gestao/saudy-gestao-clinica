import { Box, Text } from '@mantine/core';
import { type ComponentPropsWithoutRef, type ReactNode } from 'react';

interface FloatingInputProps extends ComponentPropsWithoutRef<'input'> {
  label: string;
  rightSection?: ReactNode;
  containerProps?: ComponentPropsWithoutRef<typeof Box>;
  error?: string;
}

export function FloatingInput({ label, rightSection, containerProps, error, ...props }: FloatingInputProps) {
  return (
    <Box w="100%" {...containerProps}>
      <Box className="floating-field" w="100%" style={{ borderColor: error ? '#fa5252' : undefined }}>
        <input placeholder=" " {...props} style={{ borderColor: error ? '#fa5252' : undefined }} />
        <label style={{ color: error ? '#fa5252' : undefined }}>{label}</label>
        {rightSection}
      </Box>
      {error && (
        <Text size="xs" c="red" mt={4}>
          {error}
        </Text>
      )}
    </Box>
  );
}
