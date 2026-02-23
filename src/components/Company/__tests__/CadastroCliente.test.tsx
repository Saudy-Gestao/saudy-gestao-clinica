import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { MantineProvider } from '@mantine/core';
import { CadastroCliente } from '../CadastroCliente';
import companyService from '../../../services/companyService';
import bcrypt from 'bcryptjs';
import { vi, describe, it, beforeEach, expect } from 'vitest';

vi.mock('../../../services/companyService');
const mockedService = vi.mocked(companyService as any);

vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn(),
  },
}));

// bcrypt is the default export; vi.mocked should wrap the whole import
const mockedBcrypt = vi.mocked(bcrypt as any);

describe('CadastroCliente component integration', () => {
  beforeEach(() => {
    mockedService.createCompany.mockReset();
    mockedBcrypt.hash.mockReset();
  });

  it('fills steps and calls companyService.createCompany with correct payload', async () => {
    // arrange
    mockedBcrypt.hash.mockResolvedValue('hashedpw');
    mockedService.createCompany.mockResolvedValue({ id: 'xyz' });

    render(
      <BrowserRouter>
        <MantineProvider>
          <CadastroCliente />
        </MantineProvider>
      </BrowserRouter>
    );

    // step 1 (client admin)
    await userEvent.type(screen.getByLabelText(/Nome do administrador/i), 'Alice');
    await userEvent.type(screen.getByLabelText(/E-mail/i), 'alice@example.com');
    // generate password
    const genBtn = screen.getByRole('button', { name: /Gerar senha/i });
    await userEvent.click(genBtn);

    // move forward
    const nextBtn = screen.getByRole('button', { name: /Próximo/i });
    await userEvent.click(nextBtn);

    // step 2 (company)
    await waitFor(() => expect(screen.getByLabelText(/CNPJ/i)).toBeInTheDocument());
    await userEvent.type(screen.getByLabelText(/CNPJ/i), '1234567890001');
    await userEvent.type(screen.getByLabelText(/Razão social/i), 'Empresa SA');
    await userEvent.type(screen.getByLabelText(/Nome fantasia/i), 'Empresa');
    await userEvent.type(screen.getByLabelText(/Endereço/i), 'Rua 1');

    await userEvent.click(nextBtn);

    // step 3 (branches)
    await waitFor(() => expect(screen.getByLabelText(/Quantidade de filiais/i)).toBeInTheDocument());
    await userEvent.clear(screen.getByLabelText(/Quantidade de filiais/i));
    await userEvent.type(screen.getByLabelText(/Quantidade de filiais/i), '3');

    // submit
    const submitBtn = screen.getByRole('button', { name: /Cadastrar/i });
    await userEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockedBcrypt.hash).toHaveBeenCalled();
      expect(mockedService.createCompany).toHaveBeenCalledWith(
        expect.objectContaining({
          admin: expect.objectContaining({ name: 'Alice', email: 'alice@example.com' }),
          company: expect.objectContaining({ cnpj: '1234567890001', razaoSocial: 'Empresa SA' }),
          branchesCount: 3,
        })
      );
    });
  });
});