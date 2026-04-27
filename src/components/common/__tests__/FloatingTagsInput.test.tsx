import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import React from 'react';
import { FloatingTagsInput } from '../FloatingTagsInput';

const renderWithMantine = (component: React.ReactElement) => {
  return render(<MantineProvider>{component}</MantineProvider>);
};

describe('FloatingTagsInput', () => {
  it('renderiza o label', () => {
    renderWithMantine(<FloatingTagsInput label="Especialidades" />);
    expect(screen.getByText('Especialidades')).toBeInTheDocument();
  });

  it('aplica has-value quando ha tags', () => {
    renderWithMantine(<FloatingTagsInput label="Especialidades" value={['Cardio']} onChange={() => {}} />);
    const field = document.querySelector('.floating-mantine-field--tags');
    expect(field).toHaveClass('has-value');
  });

  it('nao aplica has-value sem tags', () => {
    renderWithMantine(<FloatingTagsInput label="Especialidades" value={[]} onChange={() => {}} />);
    const field = document.querySelector('.floating-mantine-field--tags');
    expect(field).not.toHaveClass('has-value');
  });

  it('mostra erro quando informado', () => {
    renderWithMantine(<FloatingTagsInput label="Especialidades" error="Obrigatorio" />);
    expect(screen.getByText('Obrigatorio')).toBeInTheDocument();
  });

  it('aceita containerProps', () => {
    renderWithMantine(
      <FloatingTagsInput
        label="Especialidades"
        containerProps={{ 'data-testid': 'tags-container' } as any}
      />,
    );
    expect(screen.getByTestId('tags-container')).toBeInTheDocument();
  });
});
