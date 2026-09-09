import type { ReactNode } from 'react';

const hasAsteriskInLabel = (label: ReactNode) => {
  if (typeof label !== 'string') return false;
  return /\*/.test(label);
};

export const withRequiredIndicator = (label: ReactNode, required?: boolean) => {
  if (!required || hasAsteriskInLabel(label)) return label;

  return (
    <>
      {label}
      <span style={{ color: 'var(--ui-hue-red)', marginLeft: 4 }}>*</span>
    </>
  );
};

