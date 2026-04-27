import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { MantineProvider } from '@mantine/core';
import { Login } from '../components/Auth/Login';

vi.mock('../services/authService', () => ({
  default: {
    login: vi.fn(),
    isAuthenticated: () => false,
    getCurrentUser: () => null,
  },
}));

describe('Login integration', () => {
  it('renders the login screen fields', () => {
    render(
      <MemoryRouter>
        <MantineProvider>
          <Login />
        </MantineProvider>
      </MemoryRouter>,
    );

    expect(screen.getByText(/bem-vindo de volta/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/e-mail\/cpf/i)).toBeInTheDocument();
  });
});
