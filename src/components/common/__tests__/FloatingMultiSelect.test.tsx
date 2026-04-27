import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import React from 'react';
import { FloatingMultiSelect } from '../FloatingMultiSelect';

const renderWithMantine = (component: React.ReactElement) => {
  return render(<MantineProvider>{component}</MantineProvider>);
};

const data = [
  { value: 'a', label: 'A' },
  { value: 'b', label: 'B' },
];

describe('FloatingMultiSelect', () => {
  it('renderiza o label', () => {
    renderWithMantine(<FloatingMultiSelect label="Tags" data={data} />);
    expect(screen.getByText('Tags')).toBeInTheDocument();
  });

  it('aplica has-value com itens selecionados', () => {
    renderWithMantine(<FloatingMultiSelect label="Tags" data={data} value={['a']} onChange={() => {}} />);
    const field = document.querySelector('.floating-mantine-field');
    expect(field).toHaveClass('has-value');
  });

  it('nao aplica has-value sem itens', () => {
    renderWithMantine(<FloatingMultiSelect label="Tags" data={data} value={[]} onChange={() => {}} />);
    const field = document.querySelector('.floating-mantine-field');
    expect(field).not.toHaveClass('has-value');
  });

  it('mostra erro quando informado', () => {
    renderWithMantine(<FloatingMultiSelect label="Tags" data={data} error="Obrigatorio" />);
    expect(screen.getByText('Obrigatorio')).toBeInTheDocument();
  });

  it('adiciona indicador de obrigatorio', () => {
    renderWithMantine(<FloatingMultiSelect label="Tags" data={data} required />);
    expect(screen.getByText('*')).toBeInTheDocument();
  });

  it('aceita containerProps', () => {
    renderWithMantine(
      <FloatingMultiSelect
        label="Tags"
        data={data}
        containerProps={{ 'data-testid': 'multi-container' } as any}
      />,
    );
    expect(screen.getByTestId('multi-container')).toBeInTheDocument();
  });
});
