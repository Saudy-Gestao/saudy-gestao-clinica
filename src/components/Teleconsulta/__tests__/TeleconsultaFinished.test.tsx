import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { describe, expect, it, vi } from 'vitest';
import { TeleconsultaFinished } from '../TeleconsultaFinished';

const navigateMock = vi.fn();

vi.mock('react-router-dom', () => ({
  useNavigate: () => navigateMock,
}));

describe('TeleconsultaFinished', () => {
  it('renders success message and navigates to portal', () => {
    render(
      <MantineProvider>
        <TeleconsultaFinished />
      </MantineProvider>,
    );

    expect(screen.getByText(/teleconsulta finalizada com sucesso/i)).toBeInTheDocument();
    expect(screen.getByText(/voltar para o portal do paciente/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /ir para o portal do paciente/i }));
    expect(navigateMock).toHaveBeenCalledWith('/portal');
  });
});
