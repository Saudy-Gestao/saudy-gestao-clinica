import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AdminTickets } from '../AdminTickets';

const navigateMock = vi.fn();
const invalidateQueriesMock = vi.fn();
const refetchMock = vi.fn();
const useAdminTicketsQueryMock = vi.fn();
const updateStatusMock = vi.fn();
const showSuccessToastMock = vi.fn();
const showErrorToastMock = vi.fn();

vi.mock('react-router-dom', () => ({ useNavigate: () => navigateMock }));
vi.mock('@tanstack/react-query', () => ({ useQueryClient: () => ({ invalidateQueries: invalidateQueriesMock }) }));
vi.mock('../../../hooks/useAdminTicketsQuery', () => ({ useAdminTicketsQuery: (...args: any[]) => useAdminTicketsQueryMock(...args) }));
vi.mock('../../../services/ticketService', () => ({
  default: { updateStatus: (...args: any[]) => updateStatusMock(...args) },
}));
vi.mock('../../../lib/toast', () => ({
  showSuccessToast: (...args: any[]) => showSuccessToastMock(...args),
  showErrorToast: (...args: any[]) => showErrorToastMock(...args),
}));

vi.mock('../../Header/Header', () => ({ Header: () => <div>Header</div> }));

vi.mock('@mantine/core', () => {
  const Wrap = ({ children, ...props }: any) => <div {...props}>{children}</div>;
  const Button = ({ children, onClick, ...props }: any) => <button onClick={onClick} {...props}>{children}</button>;
  const Text = ({ children, ...props }: any) => <span {...props}>{children}</span>;
  const Title = ({ children }: any) => <h2>{children}</h2>;
  const Skeleton = () => <div>skeleton</div>;

  const Select = ({ label, value, onChange, data = [], ...props }: any) => (
    <label>
      {label || 'select'}
      <select aria-label={label || 'select'} value={value || ''} onChange={(e) => onChange?.(e.currentTarget.value)} {...props}>
        <option value="">Selecione</option>
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
  Table.Tr = ({ children }: any) => <tr>{children}</tr>;
  Table.Th = ({ children }: any) => <th>{children}</th>;
  Table.Td = ({ children, ...props }: any) => <td {...props}>{children}</td>;

  return {
    Badge: ({ children }: any) => <span>{children}</span>,
    Box: Wrap,
    Button,
    Group: Wrap,
    Paper: Wrap,
    Select,
    Skeleton,
    SimpleGrid: Wrap,
    Stack: Wrap,
    Table,
    Text,
    TextInput,
    ThemeIcon: Wrap,
    Title,
    createTheme: (config: any) => config,
  };
});

describe('AdminTickets', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAdminTicketsQueryMock.mockReturnValue({ data: { items: [] }, isLoading: false, isFetching: false, refetch: refetchMock });
  });

  it('renders loading state', () => {
    useAdminTicketsQueryMock.mockReturnValue({ data: { items: [] }, isLoading: true, isFetching: false, refetch: refetchMock });
    render(<AdminTickets />);
    expect(screen.getAllByText('skeleton').length).toBeGreaterThan(0);
  });

  it('renders empty state when no tickets are returned', () => {
    render(<AdminTickets />);
    expect(screen.getByText('Nenhum ticket encontrado')).toBeInTheDocument();
  });

  it('refreshes list and opens ticket details', () => {
    useAdminTicketsQueryMock.mockReturnValue({
      data: {
        items: [{
          id: 'tk-1',
          type: 'BUG',
          priority: 'HIGH',
          status: 'OPEN',
          flow: 'assistencial',
          module: 'agenda',
          description: 'Erro na agenda',
          createdByName: 'Joao',
          createdByEmail: 'joao@test.com',
          createdAt: '2026-04-10T10:00:00Z',
          hasUnreadUserMessage: true,
        }],
      },
      isLoading: false,
      isFetching: false,
      refetch: refetchMock,
    });

    render(<AdminTickets />);

    fireEvent.click(screen.getByText('Atualizar lista'));
    expect(refetchMock).toHaveBeenCalled();

    fireEvent.click(screen.getByText('Abrir chamado'));
    expect(navigateMock).toHaveBeenCalledWith('/adm-tickets/tk-1');
  });

  it('updates ticket status successfully', async () => {
    useAdminTicketsQueryMock.mockReturnValue({
      data: {
        items: [{
          id: 'tk-1', type: 'BUG', priority: 'HIGH', status: 'OPEN', flow: 'assistencial', module: 'agenda', description: 'Erro', createdAt: '2026-04-10T10:00:00Z',
        }],
      },
      isLoading: false,
      isFetching: false,
      refetch: refetchMock,
    });
    updateStatusMock.mockResolvedValue({});

    render(<AdminTickets />);

    const selects = screen.getAllByLabelText('select');
    fireEvent.change(selects[selects.length - 1], { target: { value: 'RESOLVED' } });

    await waitFor(() => {
      expect(updateStatusMock).toHaveBeenCalledWith('tk-1', 'RESOLVED');
      expect(invalidateQueriesMock).toHaveBeenCalled();
      expect(showSuccessToastMock).toHaveBeenCalled();
    });
  });

  it('shows error toast when status update fails', async () => {
    useAdminTicketsQueryMock.mockReturnValue({
      data: {
        items: [{
          id: 'tk-1', type: 'BUG', priority: 'HIGH', status: 'OPEN', flow: 'assistencial', module: 'agenda', description: 'Erro', createdAt: '2026-04-10T10:00:00Z',
        }],
      },
      isLoading: false,
      isFetching: false,
      refetch: refetchMock,
    });
    updateStatusMock.mockRejectedValue(new Error('falha'));

    render(<AdminTickets />);

    const selects = screen.getAllByLabelText('select');
    fireEvent.change(selects[selects.length - 1], { target: { value: 'RESOLVED' } });

    await waitFor(() => {
      expect(showErrorToastMock).toHaveBeenCalled();
    });
  });
});
