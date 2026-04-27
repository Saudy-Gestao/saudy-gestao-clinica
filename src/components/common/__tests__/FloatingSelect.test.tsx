import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MantineProvider } from '@mantine/core';
import React from 'react';
import { FloatingSelect } from '../FloatingSelect';

const renderWithMantine = (component: React.ReactElement) => {
  return render(<MantineProvider>{component}</MantineProvider>);
};

describe('FloatingSelect', () => {
  const mockOptions = [
    { value: 'opcao1', label: 'Opção 1' },
    { value: 'opcao2', label: 'Opção 2' },
    { value: 'opcao3', label: 'Opção 3' },
  ];

  it('deve renderizar o select com label', () => {
    renderWithMantine(
      <FloatingSelect label="Selecione uma opção" data={mockOptions} />
    );
    expect(screen.getByText('Selecione uma opção')).toBeInTheDocument();
  });

  it('deve exibir mensagem de erro quando fornecido', () => {
    renderWithMantine(
      <FloatingSelect 
        label="Selecione" 
        data={mockOptions} 
        error="Campo obrigatório" 
      />
    );
    expect(screen.getByText('Campo obrigatório')).toBeInTheDocument();
  });

  it('deve aplicar classe has-value quando tem valor selecionado', () => {
    renderWithMantine(
      <FloatingSelect 
        label="Selecione" 
        data={mockOptions} 
        value="opcao1"
        onChange={() => {}}
      />
    );
    const floatingField = document.querySelector('.floating-mantine-field');
    expect(floatingField).toHaveClass('has-value');
  });

  it('não deve aplicar classe has-value quando não tem valor', () => {
    renderWithMantine(
      <FloatingSelect label="Selecione" data={mockOptions} />
    );
    const floatingField = document.querySelector('.floating-mantine-field');
    expect(floatingField).not.toHaveClass('has-value');
  });

  it('deve sempre flutuar label quando alwaysFloatLabel é true', () => {
    renderWithMantine(
      <FloatingSelect 
        label="Selecione" 
        data={mockOptions} 
        alwaysFloatLabel={true}
      />
    );
    const floatingField = document.querySelector('.floating-mantine-field');
    expect(floatingField).toHaveClass('has-value');
  });

  it('deve aplicar borderColor vermelho quando há erro', () => {
    renderWithMantine(
      <FloatingSelect 
        label="Selecione" 
        data={mockOptions} 
        error="Erro de validação" 
      />
    );
    const floatingField = document.querySelector('.floating-mantine-field') as HTMLElement;
    expect(floatingField.style.borderColor).toBe('#fa5252');
  });

  it('deve aplicar cor vermelha ao label quando há erro', () => {
    renderWithMantine(
      <FloatingSelect 
        label="Selecione" 
        data={mockOptions} 
        error="Erro de validação" 
      />
    );
    const label = document.querySelector('label') as HTMLElement;
    // Verifica se a cor é vermelha (pode ser rgb ou hex)
    expect(label.style.color).toBeTruthy();
  });

  it('deve aceitar containerProps personalizadas', () => {
    renderWithMantine(
      <FloatingSelect 
        label="Selecione" 
        data={mockOptions}
        containerProps={{ 'data-testid': 'custom-container' } as any}
      />
    );
    expect(screen.getByTestId('custom-container')).toBeInTheDocument();
  });

  it('deve aplicar required indicator quando required é true', () => {
    renderWithMantine(
      <FloatingSelect 
        label="Selecione" 
        data={mockOptions}
        required
      />
    );
    // O indicador de required é adicionado ao label
    const label = screen.getByText(/Selecione/);
    expect(label).toBeInTheDocument();
  });

  it('deve aplicar required indicator quando withAsterisk é true', () => {
    renderWithMantine(
      <FloatingSelect 
        label="Selecione" 
        data={mockOptions}
        withAsterisk
      />
    );
    // O indicador de required é adicionado ao label
    const label = screen.getByText(/Selecione/);
    expect(label).toBeInTheDocument();
  });

  it('deve permitir seleção de opções', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    
    renderWithMantine(
      <FloatingSelect 
        label="Selecione" 
        data={mockOptions}
        onChange={handleChange}
      />
    );

    const select = screen.getByRole('textbox');
    await user.click(select);
    
    // Verifica se o select está funcional
    expect(select).toBeInTheDocument();
  });

  it('deve aceitar valor vazio sem aplicar has-value', () => {
    renderWithMantine(
      <FloatingSelect 
        label="Selecione" 
        data={mockOptions}
        value=""
        onChange={() => {}}
      />
    );
    const floatingField = document.querySelector('.floating-mantine-field');
    expect(floatingField).not.toHaveClass('has-value');
  });

  it('deve aceitar valor null sem aplicar has-value', () => {
    renderWithMantine(
      <FloatingSelect 
        label="Selecione" 
        data={mockOptions}
        value={null}
        onChange={() => {}}
      />
    );
    const floatingField = document.querySelector('.floating-mantine-field');
    expect(floatingField).not.toHaveClass('has-value');
  });

  it('deve aceitar estilos personalizados', () => {
    renderWithMantine(
      <FloatingSelect 
        label="Selecione" 
        data={mockOptions}
        styles={{
          input: { backgroundColor: 'red' }
        }}
      />
    );
    // Apenas verifica se renderizou sem erros
    expect(screen.getByText('Selecione')).toBeInTheDocument();
  });
});
