import { Box, Text } from '@mantine/core';
import { type ComponentPropsWithoutRef, type ReactNode, useMemo, useState } from 'react';

interface FloatingInputProps extends ComponentPropsWithoutRef<'input'> {
  label: ReactNode;
  rightSection?: ReactNode;
  containerProps?: ComponentPropsWithoutRef<typeof Box>;
  error?: string;
  alwaysFloatLabel?: boolean;
}

export function FloatingInput({ label, rightSection, containerProps, error, alwaysFloatLabel = false, ...props }: FloatingInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const hasValue = useMemo(() => {
    const rawValue = props.value ?? props.defaultValue;
    if (rawValue === null || rawValue === undefined) return false;
    return String(rawValue).trim().length > 0;
  }, [props.defaultValue, props.value]);

  return (
    <Box w="100%" {...containerProps}>
      <Box
        className={`floating-field ${isFocused || hasValue || alwaysFloatLabel ? 'has-value' : ''}`}
        w="100%"
        style={{ borderColor: error ? '#fa5252' : undefined }}
      >
        <input
          {...props}
          placeholder=" "
          onFocus={(event) => {
            setIsFocused(true);
            props.onFocus?.(event);
          }}
          onBlur={(event) => {
            setIsFocused(false);
            props.onBlur?.(event);
          }}
          style={{
            borderColor: error ? '#fa5252' : undefined,
            paddingRight: rightSection ? 28 : undefined,
            ...(props.style || {}),
          }}
        />
        <label style={{ color: error ? '#fa5252' : undefined }}>{label}</label>
        {rightSection ? <Box className="floating-field__right-section">{rightSection}</Box> : null}
      </Box>
      {error && (
        <Text size="xs" c="red" mt={4}>
          {error}
        </Text>
      )}
    </Box>
  );
}
