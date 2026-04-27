import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { UserMenu } from '../UserMenu';

const navigateMock = vi.fn();
const locationMock = vi.fn(() => ({ pathname: '/dashboard' }));
const myTicketsQueryMock = vi.fn(() => ({ data: { unreadCount: 2 } }));
const currentUserMock = vi.fn(() => ({}));
const isDoctorUserMock = vi.fn(() => false);

vi.mock('react-router-dom', () => ({
  useNavigate: () => navigateMock,
  useLocation: () => locationMock(),
}));

vi.mock('../../../hooks/useMyTicketsQuery', () => ({
  useMyTicketsQuery: () => myTicketsQueryMock(),
}));

vi.mock('../../../services/authService', () => ({
  default: {
    getCurrentUser: () => currentUserMock(),
  },
}));

vi.mock('../../../utils/userRole', () => ({
  isDoctorUser: () => isDoctorUserMock(),
}));

vi.mock('@mantine/core', async () => {
  const actual = await vi.importActual<any>('@mantine/core');

  const MenuRoot = ({ children }: any) => <div>{children}</div>;
  const MenuTarget = ({ children }: any) => <div>{children}</div>;
  const MenuDropdown = ({ children }: any) => <div>{children}</div>;
  const MenuItem = ({ children, onClick }: any) => <button onClick={onClick}>{children}</button>;

  (MenuRoot as any).Target = MenuTarget;
  (MenuRoot as any).Dropdown = MenuDropdown;
  (MenuRoot as any).Item = MenuItem;

  return {
    ...actual,
    Menu: MenuRoot,
    Avatar: ({ children }: any) => <div>{children}</div>,
    Group: ({ children }: any) => <div>{children}</div>,
    UnstyledButton: ({ children, ...props }: any) => <button {...props}>{children}</button>,
    Switch: (props: any) => <input type="checkbox" aria-label={props['aria-label']} onChange={props.onChange} />,
    Badge: ({ children }: any) => <span>{children}</span>,
  };
});

describe('UserMenu', () => {
  beforeEach(() => {
    navigateMock.mockReset();
    locationMock.mockReset();
    myTicketsQueryMock.mockReset();
    currentUserMock.mockReset();
    isDoctorUserMock.mockReset();

    locationMock.mockReturnValue({ pathname: '/dashboard' });
    myTicketsQueryMock.mockReturnValue({ data: { unreadCount: 2 } });
    currentUserMock.mockReturnValue({});
    isDoctorUserMock.mockReturnValue(false);
  });

  it('shows settings and tickets for regular users', async () => {
    locationMock.mockReturnValue({ pathname: '/dashboard' });
    isDoctorUserMock.mockReturnValue(false);

    render(<UserMenu />);

    expect(screen.getByText('Configuracoes')).toBeInTheDocument();
    expect(screen.getByText('Meus Chamados')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Meus Chamados' }));
    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith('/meus-chamados');
    });
  });

  it('hides settings and tickets in adm hub screen', () => {
    locationMock.mockReturnValue({ pathname: '/adm-hub' });

    render(<UserMenu />);

    expect(screen.queryByText('Configuracoes')).not.toBeInTheDocument();
    expect(screen.queryByText('Meus Chamados')).not.toBeInTheDocument();
    expect(screen.getByText('Modo escuro')).toBeInTheDocument();
  });

  it('hides settings for doctor users but keeps tickets outside adm hub', () => {
    locationMock.mockReturnValue({ pathname: '/dashboard' });
    isDoctorUserMock.mockReturnValue(true);

    render(<UserMenu />);

    expect(screen.queryByText('Configuracoes')).not.toBeInTheDocument();
    expect(screen.getByText('Meus Chamados')).toBeInTheDocument();
    expect(screen.getByText('Modo escuro')).toBeInTheDocument();
  });
});
