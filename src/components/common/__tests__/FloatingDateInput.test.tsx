import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import React from 'react';
import { FloatingDateInput } from '../FloatingDateInput';

const renderWithMantine = (component: React.ReactElement) => {
  return render(<MantineProvider>{component}</MantineProvider>);
};

describe('FloatingDateInput', () => {
  it('renderiza o label', () => {
    renderWithMantine(<FloatingDateInput label="Data" />);
    expect(screen.getByText('Data')).toBeInTheDocument();
  });

  it('aplica has-value quando existe valor', () => {
    renderWithMantine(<FloatingDateInput label="Data" value={new Date('2026-04-10')} onChange={() => {}} />);
    const field = document.querySelector('.floating-mantine-field');
    expect(field).toHaveClass('has-value');
  });

  it('nao aplica has-value sem valor', () => {
    renderWithMantine(<FloatingDateInput label="Data" value={null} onChange={() => {}} />);
    const field = document.querySelector('.floating-mantine-field');
    expect(field).not.toHaveClass('has-value');
  });

  it('mostra erro quando informado', () => {
    renderWithMantine(<FloatingDateInput label="Data" error="Obrigatorio" />);
    expect(screen.getByText('Obrigatorio')).toBeInTheDocument();
  });

  it('aceita containerProps', () => {
    renderWithMantine(<FloatingDateInput label="Data" containerProps={{ 'data-testid': 'date-container' } as any} />);
    expect(screen.getByTestId('date-container')).toBeInTheDocument();
  });

  it('adiciona indicador de obrigatorio', () => {
    renderWithMantine(<FloatingDateInput label="Data" required />);
    expect(screen.getByText('*')).toBeInTheDocument();
  });
});
