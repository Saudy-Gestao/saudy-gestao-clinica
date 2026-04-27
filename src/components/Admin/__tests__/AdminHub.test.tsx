import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { AdminHub } from '../AdminHub';

const navigateMock = vi.fn();

vi.mock('react-router-dom', () => ({
  useNavigate: () => navigateMock,
}));

vi.mock('../../Header/Header', () => ({ Header: () => <div>Header</div> }));
vi.mock('../../StatsCards/StatsCards', () => ({ StatsCards: () => <div>Stats cards</div> }));

vi.mock('@mantine/core', () => {
  const Wrap = ({ children, ...props }: any) => <div {...props}>{children}</div>;
  const Paper = ({ children, onClick, ...props }: any) => <div onClick={onClick} {...props}>{children}</div>;
  const Text = ({ children, ...props }: any) => <span {...props}>{children}</span>;
  const Title = ({ children, ...props }: any) => <h2 {...props}>{children}</h2>;

  return {
    Box: Wrap,
    Stack: Wrap,
    Text,
    Group: Wrap,
    Paper,
    SimpleGrid: Wrap,
    Title,
    ThemeIcon: Wrap,
    createTheme: (config: any) => config,
  };
});

describe('AdminHub', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('shows stats cards for regular admin user', () => {
    localStorage.setItem('user', JSON.stringify({ isAdmHubOnly: false }));

    render(<AdminHub />);

    expect(screen.getByText('Área Administrativa')).toBeInTheDocument();
    expect(screen.getByText('Stats cards')).toBeInTheDocument();
  });

  it('shows restricted message for adm-hub-only user', () => {
    localStorage.setItem('user', JSON.stringify({ isAdmHubOnly: true }));

    render(<AdminHub />);

    expect(screen.getByText(/Usuário com acesso restrito ao ADM Hub/)).toBeInTheDocument();
    expect(screen.queryByText('Stats cards')).not.toBeInTheDocument();
  });

  it('navigates to module route with origin state', () => {
    render(<AdminHub />);

    fireEvent.click(screen.getByText('Chamados'));

    expect(navigateMock).toHaveBeenCalledWith('/adm-tickets', { state: { from: 'adm-hub' } });
  });

  it('handles invalid localStorage user gracefully', () => {
    localStorage.setItem('user', '{invalid');

    render(<AdminHub />);

    expect(screen.getByText('Stats cards')).toBeInTheDocument();
  });
});
