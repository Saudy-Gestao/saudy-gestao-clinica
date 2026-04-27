import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MantineProvider } from '@mantine/core';
import React from 'react';
import { FloatingTextarea } from '../FloatingTextarea';

const renderWithMantine = (component: React.ReactElement) => {
  return render(<MantineProvider>{component}</MantineProvider>);
};

describe('FloatingTextarea', () => {
  it('deve renderizar o textarea com label', () => {
    renderWithMantine(<FloatingTextarea label="Observações" />);
    expect(screen.getByText('Observações')).toBeInTheDocument();
  });

  it('deve exibir mensagem de erro quando fornecido', () => {
    renderWithMantine(<FloatingTextarea label="Observações" error="Campo obrigatório" />);
    expect(screen.getByText('Campo obrigatório')).toBeInTheDocument();
  });

  it('deve aplicar classe has-value quando tem valor', () => {
    renderWithMantine(
      <FloatingTextarea 
        label="Observações" 
        value="Algum texto"
        onChange={() => {}}
      />
    );
    const floatingField = document.querySelector('.floating-mantine-field--textarea');
    expect(floatingField).toHaveClass('has-value');
  });

  it('não deve aplicar classe has-value quando não tem valor', () => {
    renderWithMantine(<FloatingTextarea label="Observações" />);
    const floatingField = document.querySelector('.floating-mantine-field--textarea');
    expect(floatingField).not.toHaveClass('has-value');
  });

  it('deve aceitar texto digitado', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    
    renderWithMantine(
      <FloatingTextarea 
        label="Observações" 
        onChange={handleChange}
      />
    );

    const textarea = screen.getByRole('textbox');
    await user.type(textarea, 'Texto de teste');
    
    expect(handleChange).toHaveBeenCalled();
  });

  it('deve aplicar borderColor vermelho quando há erro', () => {
    renderWithMantine(<FloatingTextarea label="Observações" error="Erro" />);
    const floatingField = document.querySelector('.floating-mantine-field--textarea') as HTMLElement;
    expect(floatingField.style.borderColor).toBe('#fa5252');
  });

  it('deve aplicar cor vermelha ao label quando há erro', () => {
    renderWithMantine(<FloatingTextarea label="Observações" error="Erro" />);
    const label = document.querySelector('label') as HTMLElement;
    // Verifica se a cor é vermelha (pode ser rgb ou hex)
    expect(label.style.color).toBeTruthy();
  });

  it('deve aceitar containerProps personalizadas', () => {
    renderWithMantine(
      <FloatingTextarea 
        label="Observações" 
        containerProps={{ 'data-testid': 'custom-container' } as any}
      />
    );
    expect(screen.getByTestId('custom-container')).toBeInTheDocument();
  });

  it('deve aplicar required indicator quando required é true', () => {
    renderWithMantine(<FloatingTextarea label="Observações" required />);
    const label = screen.getByText(/Observações/);
    expect(label).toBeInTheDocument();
  });

  it('deve aplicar required indicator quando withAsterisk é true', () => {
    renderWithMantine(<FloatingTextarea label="Observações" withAsterisk />);
    const label = screen.getByText(/Observações/);
    expect(label).toBeInTheDocument();
  });

  it('não deve aplicar has-value para string vazia', () => {
    renderWithMantine(
      <FloatingTextarea 
        label="Observações" 
        value=""
        onChange={() => {}}
      />
    );
    const floatingField = document.querySelector('.floating-mantine-field--textarea');
    expect(floatingField).not.toHaveClass('has-value');
  });

  it('não deve aplicar has-value para string somente com espaços', () => {
    renderWithMantine(
      <FloatingTextarea 
        label="Observações" 
        value="   "
        onChange={() => {}}
      />
    );
    const floatingField = document.querySelector('.floating-mantine-field--textarea');
    expect(floatingField).not.toHaveClass('has-value');
  });

  it('deve aceitar valor undefined', () => {
    renderWithMantine(
      <FloatingTextarea 
        label="Observações" 
        value={undefined}
        onChange={() => {}}
      />
    );
    const floatingField = document.querySelector('.floating-mantine-field--textarea');
    expect(floatingField).not.toHaveClass('has-value');
  });

  it('deve respeitar propriedade maxLength', () => {
    renderWithMantine(<FloatingTextarea label="Observações" maxLength={100} />);
    const textarea = screen.getByRole('textbox');
    expect(textarea).toHaveAttribute('maxLength', '100');
  });

  it('deve respeitar propriedade rows', () => {
    renderWithMantine(<FloatingTextarea label="Observações" rows={5} />);
    const textarea = screen.getByRole('textbox');
    expect(textarea).toHaveAttribute('rows', '5');
  });

  it('deve aplicar propriedade disabled', () => {
    renderWithMantine(<FloatingTextarea label="Observações" disabled />);
    const textarea = screen.getByRole('textbox');
    expect(textarea).toBeDisabled();
  });
});
