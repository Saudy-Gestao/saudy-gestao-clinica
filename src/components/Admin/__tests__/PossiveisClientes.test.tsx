import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { PossiveisClientes } from '../PossiveisClientes';

const useAdminLeadsQueryMock = vi.fn();
const updateStatusMock = vi.fn();
const invalidateQueriesMock = vi.fn();
const showSuccessToastMock = vi.fn();
const showErrorToastMock = vi.fn();

vi.mock('../../Header/Header', () => ({ Header: () => <div>Header</div> }));

vi.mock('../../../hooks/useAdminLeadsQuery', () => ({
  useAdminLeadsQuery: (...args: any[]) => useAdminLeadsQueryMock(...args),
}));

vi.mock('../../../services/leadService', () => ({
  default: {
    updateStatus: (...args: any[]) => updateStatusMock(...args),
  },
}));

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: (...args: any[]) => invalidateQueriesMock(...args) }),
}));

vi.mock('../../../lib/toast', () => ({
  showSuccessToast: (...args: any[]) => showSuccessToastMock(...args),
  showErrorToast: (...args: any[]) => showErrorToastMock(...args),
}));

vi.mock('@mantine/core', () => {
  const Wrap = ({ children, ...props }: any) => <div {...props}>{children}</div>;
  const Text = ({ children, ...props }: any) => <span {...props}>{children}</span>;
  const Button = ({ children, onClick, ...props }: any) => <button onClick={onClick} {...props}>{children}</button>;
  const ActionIcon = ({ children, onClick, disabled, ...props }: any) => <button aria-disabled={disabled} onClick={onClick} {...props}>{children}</button>;
  const Select = ({ label, value, onChange, data = [], ...props }: any) => (
    <label>
      {label || 'select'}
      <select aria-label={label || 'select'} value={value || ''} onChange={(e) => onChange?.(e.currentTarget.value)} {...props}>
        {data.map((item: any) => <option key={item.value} value={item.value}>{item.label}</option>)}
      </select>
    </label>
  );
  const TextInput = ({ label, value, onChange, ...props }: any) => (
    <label>
      {label}
      <input aria-label={label} value={value || ''} onChange={onChange} {...props} />
    </label>
  );

  const Table: any = ({ children }: any) => <table>{children}</table>;
  Table.ScrollContainer = ({ children }: any) => <div>{children}</div>;
  Table.Thead = ({ children }: any) => <thead>{children}</thead>;
  Table.Tbody = ({ children }: any) => <tbody>{children}</tbody>;
  Table.Tr = ({ children, ...props }: any) => <tr {...props}>{children}</tr>;
  Table.Th = ({ children }: any) => <th>{children}</th>;
  Table.Td = ({ children }: any) => <td>{children}</td>;

  return {
    ActionIcon,
    Badge: ({ children }: any) => <span>{children}</span>,
    Box: Wrap,
    Button,
    Group: Wrap,
    Paper: Wrap,
    Select,
    Skeleton: () => <div>skeleton</div>,
    SimpleGrid: Wrap,
    Stack: Wrap,
    Table,
    Text,
    TextInput,
    ThemeIcon: Wrap,
    Title: ({ children }: any) => <h2>{children}</h2>,
    createTheme: (config: any) => config,
  };
});

const refetchMock = vi.fn();

const lead = {
  id: 'l1',
  name: 'Maria',
  email: 'maria@test.com',
  phone: '(11) 99999-8888',
  companyName: 'CliniCorp',
  status: 'NEW',
  message: 'Quero saber mais',
  source: 'Landing page',
  createdAt: '2026-04-10T10:00:00Z',
  updatedAt: '2026-04-10T11:00:00Z',
};

describe('PossiveisClientes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAdminLeadsQueryMock.mockReturnValue({
      data: { items: [lead] },
      isLoading: false,
      isFetching: false,
      refetch: refetchMock,
    });
    updateStatusMock.mockResolvedValue({});

    Object.defineProperty(window, 'location', {
      value: { href: 'http://localhost/' },
      writable: true,
    });
    vi.spyOn(window, 'open').mockImplementation(() => null);
  });

  it('renders loading state', () => {
    useAdminLeadsQueryMock.mockReturnValueOnce({
      data: { items: [] },
      isLoading: true,
      isFetching: false,
      refetch: refetchMock,
    });

    render(<PossiveisClientes />);

    expect(screen.getAllByText('skeleton').length).toBeGreaterThan(0);
  });

  it('renders empty state when no leads', () => {
    useAdminLeadsQueryMock.mockReturnValueOnce({
      data: { items: [] },
      isLoading: false,
      isFetching: false,
      refetch: refetchMock,
    });

    render(<PossiveisClientes />);

    expect(screen.getByText('Nenhum possível cliente encontrado')).toBeInTheDocument();
  });

  it('updates lead status and refreshes query cache', async () => {
    render(<PossiveisClientes />);

    const selects = screen.getAllByRole('combobox');
    fireEvent.change(selects[selects.length - 1], { target: { value: 'CONTACTED' } });

    await waitFor(() => {
      expect(updateStatusMock).toHaveBeenCalledWith('l1', 'CONTACTED');
      expect(invalidateQueriesMock).toHaveBeenCalled();
      expect(showSuccessToastMock).toHaveBeenCalled();
    });
  });

  it('shows error toast when status update fails', async () => {
    updateStatusMock.mockRejectedValueOnce(new Error('falha'));

    render(<PossiveisClientes />);

    const selects = screen.getAllByRole('combobox');
    fireEvent.change(selects[selects.length - 1], { target: { value: 'LOST' } });

    await waitFor(() => {
      expect(showErrorToastMock).toHaveBeenCalled();
    });
  });

  it('refreshes list and opens contact actions', async () => {
    render(<PossiveisClientes />);

    fireEvent.click(screen.getByRole('button', { name: 'Atualizar lista' }));
    expect(refetchMock).toHaveBeenCalled();

    fireEvent.click(screen.getByLabelText('Enviar e-mail'));
    expect(window.location.href).toContain('mailto:maria@test.com');

    fireEvent.click(screen.getByLabelText('Abrir WhatsApp'));
    expect(window.open).toHaveBeenCalledWith(
      expect.stringContaining('api.whatsapp.com/send/'),
      '_blank',
      'noopener,noreferrer',
    );
  });
});
