import { Box } from '@mantine/core';
import { type ComponentPropsWithoutRef, type ReactNode } from 'react';

interface FloatingInputProps extends ComponentPropsWithoutRef<'input'> {
  label: string;
  rightSection?: ReactNode;
  containerProps?: ComponentPropsWithoutRef<typeof Box>;
}

export function FloatingInput({ label, rightSection, containerProps, ...props }: FloatingInputProps) {
  return (
    <Box className="floating-field" w="100%" {...containerProps}>
      <input placeholder=" " {...props} />
      <label>{label}</label>
      {rightSection}
    </Box>
  );
}
