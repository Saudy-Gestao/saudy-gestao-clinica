import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { Header } from '../Header';

const navigateMock = vi.fn();
const logoutMock = vi.fn();
const getCurrentUserMock = vi.fn();
const useMediaQueryMock = vi.fn();
const useLocationMock = vi.fn();

vi.mock('react-router-dom', () => ({
  useNavigate: () => navigateMock,
  useLocation: () => useLocationMock(),
}));

vi.mock('@mantine/hooks', () => ({
  useMediaQuery: () => useMediaQueryMock(),
}));

vi.mock('../UserMenu', () => ({
  default: () => <div>User menu</div>,
}));

vi.mock('../../../services/authService', () => ({
  default: {
    getCurrentUser: () => getCurrentUserMock(),
    logout: () => logoutMock(),
  },
}));

describe('Header', () => {
  const renderWithMantine = () => render(
    <MantineProvider>
      <Header />
    </MantineProvider>,
  );

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    useMediaQueryMock.mockReturnValue(false);
    useLocationMock.mockReturnValue({ pathname: '/dashboard' });
    getCurrentUserMock.mockReturnValue({
      id: 'u1',
      name: 'Maria',
      company: { tradeName: 'Saudy' },
    });
  });

  it('renders desktop header and navigates through quick links', () => {
    renderWithMantine();

    expect(screen.getByText('Saudy')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Agendamento' }));
    expect(navigateMock).toHaveBeenCalledWith('/agendamento');
  });

  it('executes search for route, known module and fallback path', () => {
    renderWithMantine();
    const input = screen.getByPlaceholderText('Pesquisar palavra-chave + caminho');

    fireEvent.change(input, { target: { value: '/financeiro' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(navigateMock).toHaveBeenCalledWith('/financeiro');

    fireEvent.change(input, { target: { value: 'modulo tea' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(navigateMock).toHaveBeenCalledWith('/tea');

    fireEvent.change(input, { target: { value: 'rota-inexistente' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(navigateMock).toHaveBeenCalledWith('/rota-inexistente');
  });

  it('tracks module usage in localStorage when path matches module', () => {
    useLocationMock.mockReturnValue({ pathname: '/financeiro' });
    renderWithMantine();

    const raw = localStorage.getItem('saudy:module-usage:v1:u1');
    expect(raw).not.toBeNull();
    expect(JSON.parse(raw as string)).toEqual({ financeiro: 1 });
  });

  it('renders mobile mode without search input', () => {
    useMediaQueryMock.mockReturnValue(true);
    renderWithMantine();

    expect(screen.queryByPlaceholderText('Pesquisar palavra-chave + caminho')).not.toBeInTheDocument();
    expect(screen.getByText('User menu')).toBeInTheDocument();
  });

  it('logs out and redirects to login', () => {
    Object.defineProperty(window, 'location', {
      value: { href: '/dashboard', pathname: '/dashboard' },
      configurable: true,
    });

    renderWithMantine();
    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[buttons.length - 1]);

    expect(logoutMock).toHaveBeenCalled();
    expect(window.location.href).toBe('/login');
  });
});
