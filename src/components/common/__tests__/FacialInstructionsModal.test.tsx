import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MantineProvider } from '@mantine/core';
import { FacialInstructionsModal } from '../FacialInstructionsModal';

const renderWithMantine = (component: React.ReactElement) => render(<MantineProvider>{component}</MantineProvider>);

describe('FacialInstructionsModal', () => {
  it('nao renderiza conteudo quando fechado', () => {
    renderWithMantine(<FacialInstructionsModal opened={false} onClose={() => {}} onContinue={() => {}} />);
    expect(screen.queryByText('Instruções para Captura Facial')).not.toBeInTheDocument();
  });

  it('renderiza instrucoes principais quando aberto', () => {
    renderWithMantine(<FacialInstructionsModal opened onClose={() => {}} onContinue={() => {}} />);

    expect(screen.getByText('Instruções para Captura Facial')).toBeInTheDocument();
    expect(screen.getByText('O que fazer:')).toBeInTheDocument();
    expect(screen.getByText('Evite:')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Entendi, Continuar' })).toBeInTheDocument();
  });

  it('chama onContinue ao clicar em continuar', async () => {
    const user = userEvent.setup();
    const onContinue = vi.fn();

    renderWithMantine(<FacialInstructionsModal opened onClose={() => {}} onContinue={onContinue} />);

    await user.click(screen.getByRole('button', { name: 'Entendi, Continuar' }));
    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  it('chama onClose ao clicar em cancelar', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    renderWithMantine(<FacialInstructionsModal opened onClose={onClose} onContinue={() => {}} />);

    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
