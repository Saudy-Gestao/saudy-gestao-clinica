import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MantineProvider } from '@mantine/core';
import React from 'react';
import { FloatingInput } from '../FloatingInput';

const renderWithMantine = (component: React.ReactElement) => {
  return render(<MantineProvider>{component}</MantineProvider>);
};

describe('FloatingInput', () => {
  it('deve renderizar o input com label', () => {
    renderWithMantine(<FloatingInput label="Nome" />);
    expect(screen.getByText('Nome')).toBeInTheDocument();
  });

  it('deve aplicar formatação de telefone automaticamente', async () => {
    const user = userEvent.setup();
    renderWithMantine(<FloatingInput label="Telefone" />);
    
    const input = screen.getByRole('textbox');
    await user.type(input, '11987654321');
    
    // Verifica se o telefone foi formatado
    expect(input).toHaveValue('(11) 98765-4321');
  });

  it('deve aplicar formatação de CPF automaticamente', async () => {
    const user = userEvent.setup();
    renderWithMantine(<FloatingInput label="CPF" />);
    
    const input = screen.getByRole('textbox');
    await user.type(input, '12345678900');
    
    // Verifica se o CPF foi formatado
    expect(input).toHaveValue('123.456.789-00');
  });

  it('deve aplicar formatação de CNPJ automaticamente', async () => {
    const user = userEvent.setup();
    renderWithMantine(<FloatingInput label="CNPJ" />);
    
    const input = screen.getByRole('textbox');
    await user.type(input, '12345678000199');
    
    // Verifica se o CNPJ foi formatado
    expect(input).toHaveValue('12.345.678/0001-99');
  });

  it('deve aplicar formatação de data de nascimento automaticamente', async () => {
    const user = userEvent.setup();
    renderWithMantine(<FloatingInput label="Data de Nascimento" />);
    
    const input = screen.getByRole('textbox');
    await user.type(input, '01011990');
    
    // Verifica se a data foi formatada
    expect(input).toHaveValue('01/01/1990');
  });

  it('deve normalizar email automaticamente', async () => {
    const user = userEvent.setup();
    renderWithMantine(<FloatingInput label="Email" type="email" />);
    
    const input = screen.getByRole('textbox');
    await user.type(input, 'TESTE@EXEMPLO.COM');
    
    // Verifica se o email foi normalizado para lowercase
    expect(input).toHaveValue('teste@exemplo.com');
  });

  it('deve exibir mensagem de erro quando fornecido', () => {
    renderWithMantine(<FloatingInput label="Nome" error="Campo obrigatório" />);
    expect(screen.getByText('Campo obrigatório')).toBeInTheDocument();
  });

  it('deve aplicar a propriedade required', () => {
    renderWithMantine(<FloatingInput label="Nome" required />);
    const input = screen.getByRole('textbox');
    expect(input).toBeRequired();
  });

  it('deve aplicar maxLength corretamente', () => {
    renderWithMantine(<FloatingInput label="Nome" maxLength={50} />);
    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('maxLength', '50');
  });

  it('deve limitar maxLength para campos de telefone', () => {
    renderWithMantine(<FloatingInput label="Telefone" maxLength={100} />);
    const input = screen.getByRole('textbox');
    // Deve limitar a 15 caracteres para telefone
    expect(input).toHaveAttribute('maxLength', '15');
  });

  it('deve limitar maxLength para campos de CPF', () => {
    renderWithMantine(<FloatingInput label="CPF" maxLength={100} />);
    const input = screen.getByRole('textbox');
    // Deve limitar a 14 caracteres para CPF
    expect(input).toHaveAttribute('maxLength', '14');
  });

  it('deve limitar maxLength para campos de CNPJ', () => {
    renderWithMantine(<FloatingInput label="CNPJ" maxLength={100} />);
    const input = screen.getByRole('textbox');
    // Deve limitar a 18 caracteres para CNPJ
    expect(input).toHaveAttribute('maxLength', '18');
  });

  it('deve adicionar classe has-value quando tem valor', () => {
    renderWithMantine(<FloatingInput label="Nome" value="João" onChange={() => {}} />);
    const floatingField = document.querySelector('.floating-field');
    expect(floatingField).toHaveClass('has-value');
  });

  it('deve aplicar inputMode tel para campos de telefone', () => {
    renderWithMantine(<FloatingInput label="Telefone" />);
    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('inputMode', 'tel');
  });

  it('deve aplicar inputMode email para campos de email', () => {
    renderWithMantine(<FloatingInput label="Email" />);
    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('inputMode', 'email');
  });

  it('deve sempre flutuar label quando alwaysFloatLabel é true', () => {
    renderWithMantine(<FloatingInput label="Nome" alwaysFloatLabel={true} />);
    const floatingField = document.querySelector('.floating-field');
    expect(floatingField).toHaveClass('has-value');
  });

  it('deve renderizar rightSection quando fornecido', () => {
    renderWithMantine(
      <FloatingInput 
        label="Nome" 
        rightSection={<span data-testid="right-section">Icon</span>}
      />
    );
    expect(screen.getByTestId('right-section')).toBeInTheDocument();
  });

  it('deve aplicar borderColor vermelho quando há erro', () => {
    renderWithMantine(<FloatingInput label="Nome" error="Erro" />);
    const floatingField = document.querySelector('.floating-field') as HTMLElement;
    expect(floatingField.style.borderColor).toBe('#fa5252');
  });

  it('deve aceitar containerProps personalizadas', () => {
    renderWithMantine(
      <FloatingInput 
        label="Nome" 
        containerProps={{ 'data-testid': 'custom-container' } as any}
      />
    );
    expect(screen.getByTestId('custom-container')).toBeInTheDocument();
  });
});
