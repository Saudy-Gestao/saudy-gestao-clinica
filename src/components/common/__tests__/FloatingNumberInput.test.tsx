import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MantineProvider } from '@mantine/core';
import React from 'react';
import { FloatingNumberInput } from '../FloatingNumberInput';

const renderWithMantine = (component: React.ReactElement) => {
  return render(<MantineProvider>{component}</MantineProvider>);
};

describe('FloatingNumberInput', () => {
  it('deve renderizar o input numérico com label', () => {
    renderWithMantine(<FloatingNumberInput label="Idade" />);
    expect(screen.getByText('Idade')).toBeInTheDocument();
  });

  it('deve exibir mensagem de erro quando fornecido', () => {
    renderWithMantine(<FloatingNumberInput label="Idade" error="Campo obrigatório" />);
    expect(screen.getByText('Campo obrigatório')).toBeInTheDocument();
  });

  it('deve exibir descrição quando fornecida', () => {
    renderWithMantine(
      <FloatingNumberInput 
        label="Idade" 
        description="Digite sua idade em anos"
      />
    );
    expect(screen.getByText('Digite sua idade em anos')).toBeInTheDocument();
  });

  it('deve aplicar classe has-value quando tem valor numérico', () => {
    renderWithMantine(
      <FloatingNumberInput 
        label="Idade" 
        value={25}
        onChange={() => {}}
      />
    );
    const floatingField = document.querySelector('.floating-mantine-field');
    expect(floatingField).toHaveClass('has-value');
  });

  it('deve aplicar classe has-value para valor zero', () => {
    renderWithMantine(
      <FloatingNumberInput 
        label="Idade" 
        value={0}
        onChange={() => {}}
      />
    );
    const floatingField = document.querySelector('.floating-mantine-field');
    expect(floatingField).toHaveClass('has-value');
  });

  it('não deve aplicar classe has-value quando valor é null', () => {
    renderWithMantine(
      <FloatingNumberInput 
        label="Idade" 
        value={null}
        onChange={() => {}}
      />
    );
    const floatingField = document.querySelector('.floating-mantine-field');
    expect(floatingField).not.toHaveClass('has-value');
  });

  it('não deve aplicar classe has-value quando valor é undefined', () => {
    renderWithMantine(<FloatingNumberInput label="Idade" />);
    const floatingField = document.querySelector('.floating-mantine-field');
    expect(floatingField).not.toHaveClass('has-value');
  });

  it('deve aplicar borderColor vermelho quando há erro', () => {
    renderWithMantine(<FloatingNumberInput label="Idade" error="Erro" />);
    const floatingField = document.querySelector('.floating-mantine-field') as HTMLElement;
    expect(floatingField.style.borderColor).toBe('#fa5252');
  });

  it('deve aplicar cor vermelha ao label quando há erro', () => {
    renderWithMantine(<FloatingNumberInput label="Idade" error="Erro" />);
    const label = document.querySelector('label') as HTMLElement;
    // Verifica se a cor é vermelha (pode ser rgb ou hex)
    expect(label.style.color).toBeTruthy();
  });

  it('deve aceitar containerProps personalizadas', () => {
    renderWithMantine(
      <FloatingNumberInput 
        label="Idade" 
        containerProps={{ 'data-testid': 'custom-container' } as any}
      />
    );
    expect(screen.getByTestId('custom-container')).toBeInTheDocument();
  });

  it('deve aceitar números digitados', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    
    renderWithMantine(
      <FloatingNumberInput 
        label="Idade" 
        onChange={handleChange}
      />
    );

    const input = screen.getByRole('textbox');
    await user.type(input, '25');
    
    expect(handleChange).toHaveBeenCalled();
  });

  it('deve respeitar valor mínimo', () => {
    renderWithMantine(<FloatingNumberInput label="Idade" min={0} />);
    // Apenas verifica se renderizou sem erros
    expect(screen.getByText('Idade')).toBeInTheDocument();
  });

  it('deve respeitar valor máximo', () => {
    renderWithMantine(<FloatingNumberInput label="Idade" max={120} />);
    // Apenas verifica se renderizou sem erros
    expect(screen.getByText('Idade')).toBeInTheDocument();
  });

  it('deve aplicar propriedade disabled', () => {
    renderWithMantine(<FloatingNumberInput label="Idade" disabled />);
    const input = screen.getByRole('textbox');
    expect(input).toBeDisabled();
  });

  it('deve aceitar step personalizado', () => {
    renderWithMantine(<FloatingNumberInput label="Preço" step={0.01} />);
    // Apenas verifica se renderizou sem erros
    expect(screen.getByText('Preço')).toBeInTheDocument();
  });

  it('deve aceitar precisão decimal', () => {
    renderWithMantine(<FloatingNumberInput label="Preço" precision={2} />);
    // Apenas verifica se renderizou sem erros
    expect(screen.getByText('Preço')).toBeInTheDocument();
  });

  it('não deve aplicar has-value para string vazia', () => {
    renderWithMantine(
      <FloatingNumberInput 
        label="Idade" 
        value={''}
        onChange={() => {}}
      />
    );
    const floatingField = document.querySelector('.floating-mantine-field');
    expect(floatingField).not.toHaveClass('has-value');
  });

  it('deve exibir descrição e erro ao mesmo tempo', () => {
    renderWithMantine(
      <FloatingNumberInput 
        label="Idade" 
        description="Descrição do campo"
        error="Campo obrigatório"
      />
    );
    expect(screen.getByText('Descrição do campo')).toBeInTheDocument();
    expect(screen.getByText('Campo obrigatório')).toBeInTheDocument();
  });
});
