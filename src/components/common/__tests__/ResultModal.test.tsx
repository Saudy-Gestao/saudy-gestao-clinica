import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MantineProvider } from '@mantine/core';
import React from 'react';
import ResultModal from '../ResultModal';

const renderWithMantine = (component: React.ReactElement) => {
  return render(<MantineProvider>{component}</MantineProvider>);
};

describe('ResultModal', () => {
  it('renderiza mensagem de sucesso e botao fechar padrao', () => {
    renderWithMantine(
      <ResultModal
        opened
        onClose={() => {}}
        title="Concluido"
        message="Processo finalizado"
      />,
    );

    expect(screen.getByText('Concluido')).toBeInTheDocument();
    expect(screen.getByText('Processo finalizado')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Fechar' })).toBeInTheDocument();
  });

  it('renderiza variante de erro com titulo padrao', () => {
    renderWithMantine(<ResultModal opened onClose={() => {}} variant="error" />);
    expect(screen.getByText('Ocorreu um erro')).toBeInTheDocument();
  });

  it('aciona onClose no botao fechar padrao', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    renderWithMantine(<ResultModal opened onClose={onClose} />);
    await user.click(screen.getByRole('button', { name: 'Fechar' }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('aciona callbacks primary e secondary quando informados', async () => {
    const user = userEvent.setup();
    const onPrimary = vi.fn();
    const onSecondary = vi.fn();

    renderWithMantine(
      <ResultModal
        opened
        onClose={() => {}}
        primary={{ label: 'Salvar', onClick: onPrimary }}
        secondary={{ label: 'Cancelar', onClick: onSecondary, variant: 'outline' }}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Salvar' }));
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(onPrimary).toHaveBeenCalledTimes(1);
    expect(onSecondary).toHaveBeenCalledTimes(1);
  });
});
