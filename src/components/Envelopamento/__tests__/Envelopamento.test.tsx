import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { MantineProvider } from '@mantine/core';
import { Envelopamento } from '../Envelopamento';
import envelopmentService from '../../../services/envelopmentService';
import { vi, describe, it, beforeEach, expect } from 'vitest';

vi.mock('../../../services/envelopmentService');
const mockedService = vi.mocked(envelopmentService as any);

describe('Envelopamento component (basic flows)', () => {
  beforeEach(() => {
    mockedService.list.mockReset();
    mockedService.create.mockReset();
    mockedService.update.mockReset();
    mockedService.remove.mockReset();
  });

  it('renders list, allows edit (prefills form) and shows delete confirmation', async () => {
    const sample = [
      {
        id: '42',
        patientName: 'João Silva',
        dateTime: '2026-02-16',
        responsible: 'Ana',
        status: 'Pronto',
        pages: 1,
        documentType: 'relatorio',
        description: 'Obs',
      },
    ];

    mockedService.list.mockResolvedValue(sample);
    mockedService.remove.mockResolvedValue({});

    render(
      <BrowserRouter>
        <MantineProvider>
          <Envelopamento />
        </MantineProvider>
      </BrowserRouter>
    );

    // wait for row to appear
    await waitFor(() => expect(screen.getByText('João Silva')).toBeInTheDocument());

    // click edit icon (button has title "Editar")
    const editBtn = screen.getAllByTitle('Editar')[0];
    await userEvent.click(editBtn);

    // after click the Cadastro tab should be active and the input should contain the name
    await waitFor(() => expect(screen.getByDisplayValue('João Silva')).toBeInTheDocument());

    // click delete and assert confirmation modal appears
    const deleteBtn = screen.getAllByTitle('Excluir')[0];
    await userEvent.click(deleteBtn);

    await waitFor(() => {
      expect(screen.getByText(/Confirmar exclusão/i)).toBeInTheDocument();
      expect(screen.getByText(/Confirma a exclusão de João Silva/i)).toBeInTheDocument();
    });

    // confirm deletion
    const confirmBtn = screen.getByRole('button', { name: /Excluir/i });
    await userEvent.click(confirmBtn);

    await waitFor(() => expect(mockedService.remove).toHaveBeenCalledWith('42'));
  });
});