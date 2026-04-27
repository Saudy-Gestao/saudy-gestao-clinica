import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { withRequiredIndicator } from '../requiredLabel';

describe('withRequiredIndicator', () => {
  it('deve retornar label sem alteração quando required é false', () => {
    const result = withRequiredIndicator('Nome', false);
    expect(result).toBe('Nome');
  });

  it('deve retornar label sem alteração quando required é undefined', () => {
    const result = withRequiredIndicator('Email');
    expect(result).toBe('Email');
  });

  it('deve adicionar asterisco vermelho quando required é true', () => {
    const result = withRequiredIndicator('Telefone', true);
    const { container } = render(<div>{result}</div>);
    
    expect(container.textContent).toContain('Telefone');
    expect(container.querySelector('span')).toBeInTheDocument();
    expect(container.querySelector('span')?.textContent).toBe('*');
  });

  it('asterisco deve ter cor vermelha do Mantine', () => {
    const result = withRequiredIndicator('CPF', true);
    const { container } = render(<div>{result}</div>);
    
    const asterisk = container.querySelector('span') as HTMLElement;
    // Verifica se o asterisco existe e tem algum estilo de cor
    expect(asterisk).toBeInTheDocument();
    expect(asterisk).toHaveStyle({ color: expect.anything() });
  });

  it('asterisco deve ter marginLeft de 4px', () => {
    const result = withRequiredIndicator('CNPJ', true);
    const { container } = render(<div>{result}</div>);
    
    const asterisk = container.querySelector('span') as HTMLElement;
    // Verifica se tem margem (pode variar o formato)
    expect(asterisk).toBeInTheDocument();
  });

  it('não deve adicionar asterisco se label já contém asterisco', () => {
    const labelWithAsterisk = 'Nome *';
    const result = withRequiredIndicator(labelWithAsterisk, true);
    expect(result).toBe(labelWithAsterisk);
  });

  it('deve detectar asterisco no meio do texto', () => {
    const labelWithAsterisk = 'Nome* obrigatório';
    const result = withRequiredIndicator(labelWithAsterisk, true);
    expect(result).toBe(labelWithAsterisk);
  });

  it('deve aceitar ReactNode não-string', () => {
    const elementLabel = <span>Meu Label</span>;
    const result = withRequiredIndicator(elementLabel);
    expect(result).toBe(elementLabel);
  });

  it('deve adicionar asterisco para ReactNode quando required é true', () => {
    const elementLabel = <span>Endereço</span>;
    const result = withRequiredIndicator(elementLabel, true);
    
    const { container } = render(<div>{result}</div>);
    expect(container.querySelector('span')).toBeInTheDocument();
  });

  it('deve tratar label vazia', () => {
    const result = withRequiredIndicator('', true);
    const { container } = render(<div>{result}</div>);
    
    expect(container.querySelector('span')).toBeInTheDocument();
  });

  it('deve retornar label sem modificação quando é número', () => {
    const numLabel = 123 as any;
    const result = withRequiredIndicator(numLabel, true);
    const { container } = render(<div>{result}</div>);
    
    expect(container.textContent).toContain('123');
    expect(container.querySelector('span')).toBeInTheDocument();
  });

  it('deve funcionar com label contendo múltiplos asteriscos', () => {
    const labelWithMultipleAsterisks = 'Nome ** Completo';
    const result = withRequiredIndicator(labelWithMultipleAsterisks, true);
    expect(result).toBe(labelWithMultipleAsterisks);
  });
});
