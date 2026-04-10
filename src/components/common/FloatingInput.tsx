import { Box, Text } from '@mantine/core';
import { type ComponentPropsWithoutRef, type ReactNode, useMemo, useState } from 'react';
import { formatCNPJ, formatCPF, formatDateInput, formatPhone, normalizeEmail } from '../../utils/formatters';

interface FloatingInputProps extends ComponentPropsWithoutRef<'input'> {
  label: ReactNode;
  rightSection?: ReactNode;
  containerProps?: ComponentPropsWithoutRef<typeof Box>;
  error?: string;
  alwaysFloatLabel?: boolean;
}

export function FloatingInput({ label, rightSection, containerProps, error, alwaysFloatLabel = false, ...props }: FloatingInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const labelText = useMemo(() => (typeof label === 'string' ? label.toLowerCase() : ''), [label]);
  const isPhoneField = useMemo(() => (
    /telefone|celular|whatsapp/.test(labelText) && props.type !== 'password'
  ), [labelText, props.type]);
  const isCpfField = useMemo(() => (
    /(^|\b)cpf(\b|$)/.test(labelText) && props.type !== 'password'
  ), [labelText, props.type]);
  const isCnpjField = useMemo(() => (
    /(^|\b)cnpj(\b|$)/.test(labelText) && props.type !== 'password'
  ), [labelText, props.type]);
  const isBirthDateField = useMemo(() => (
    /(data de nascimento|nascimento|data nascimento)/.test(labelText) && props.type !== 'date' && props.type !== 'password'
  ), [labelText, props.type]);
  const isEmailByLabel = useMemo(() => (
    /(^|\b)e-?mail(\b|$)/.test(labelText) && !/usuario|usuário/.test(labelText)
  ), [labelText]);
  const isEmailField = useMemo(() => (
    isEmailByLabel || props.type === 'email'
  ), [isEmailByLabel, props.type]);
  const hasValue = useMemo(() => {
    const rawValue = props.value ?? props.defaultValue;
    if (rawValue === null || rawValue === undefined) return false;
    return String(rawValue).trim().length > 0;
  }, [props.defaultValue, props.value]);
  const controlledValue = useMemo(() => {
    if (props.value === undefined) return undefined;
    const raw = String(props.value ?? '');
    if (isPhoneField) return formatPhone(raw);
    if (isCpfField) return formatCPF(raw);
    if (isCnpjField) return formatCNPJ(raw);
    if (isBirthDateField) return formatDateInput(raw);
    if (isEmailField) return normalizeEmail(raw);
    return props.value;
  }, [isBirthDateField, isCnpjField, isCpfField, isEmailField, isPhoneField, props.value]);

  return (
    <Box w="100%" {...containerProps}>
      <Box
        className={`floating-field ${isFocused || hasValue || alwaysFloatLabel ? 'has-value' : ''}`}
        w="100%"
        style={{ borderColor: error ? '#fa5252' : undefined }}
      >
        <input
          {...props}
          value={controlledValue}
          placeholder=" "
          maxLength={
            isPhoneField
              ? Math.min(Number(props.maxLength || 15), 15)
              : isCpfField
                ? Math.min(Number(props.maxLength || 14), 14)
                : isCnpjField
                  ? Math.min(Number(props.maxLength || 18), 18)
                  : isBirthDateField
                    ? Math.min(Number(props.maxLength || 10), 10)
                    : props.maxLength
          }
          inputMode={
            isPhoneField || isCpfField || isCnpjField || isBirthDateField
              ? 'tel'
              : isEmailField
                ? 'email'
                : props.inputMode
          }
          autoCapitalize={isEmailField ? 'none' : props.autoCapitalize}
          autoCorrect={isEmailField ? 'off' : props.autoCorrect}
          onFocus={(event) => {
            setIsFocused(true);
            props.onFocus?.(event);
          }}
          onBlur={(event) => {
            setIsFocused(false);
            props.onBlur?.(event);
          }}
          onChange={(event) => {
            if (isPhoneField) {
              event.currentTarget.value = formatPhone(event.currentTarget.value);
            } else if (isCpfField) {
              event.currentTarget.value = formatCPF(event.currentTarget.value);
            } else if (isCnpjField) {
              event.currentTarget.value = formatCNPJ(event.currentTarget.value);
            } else if (isBirthDateField) {
              event.currentTarget.value = formatDateInput(event.currentTarget.value);
            } else if (isEmailField) {
              event.currentTarget.value = normalizeEmail(event.currentTarget.value);
            }
            props.onChange?.(event);
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
