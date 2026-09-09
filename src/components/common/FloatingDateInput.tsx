import { Box, Text, type BoxProps } from '@/components/ui';
import { DateInput, type DateInputProps } from '@/components/ui';
import type { ReactNode } from 'react';
import { withRequiredIndicator } from './requiredLabel';

interface FloatingDateInputProps extends DateInputProps {
  label: ReactNode;
  containerProps?: BoxProps;
}

export function FloatingDateInput({ label, containerProps, value, error, ...props }: FloatingDateInputProps) {
  const hasValue = value !== null && value !== undefined;
  const requiredIndicator = Boolean((props as any).required || (props as any).withAsterisk);

  return (
    <Box w="100%" {...containerProps}>
      <Box
        className={`floating-mantine-field ${hasValue ? 'has-value' : ''}`}
        w="100%"
        style={{ borderColor: error ? '#fa5252' : undefined }}
      >
        <DateInput
          {...props}
          value={value}
          error={undefined}
          label={undefined}
          placeholder=""
          variant="unstyled"
        />
        <span className="floating-field-label" style={{ color: error ? '#fa5252' : undefined }}>{withRequiredIndicator(label, requiredIndicator)}</span>
      </Box>
      {error ? (
        <Text size="xs" c="red" mt={4}>
          {error}
        </Text>
      ) : null}
    </Box>
  );
}
