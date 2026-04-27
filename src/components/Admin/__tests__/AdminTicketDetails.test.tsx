import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AdminTicketDetails } from '../AdminTicketDetails';

const navigateMock = vi.fn();
const getAdminByIdMock = vi.fn();
const listAdminMessagesMock = vi.fn();
const updateStatusMock = vi.fn();
const updatePriorityMock = vi.fn();
const sendAdminMessageMock = vi.fn();
const showSuccessToastMock = vi.fn();
const showErrorToastMock = vi.fn();

vi.mock('react-router-dom', () => ({
  useNavigate: () => navigateMock,
  useParams: () => ({ id: 'tk-1' }),
}));

vi.mock('../../../services/ticketService', () => ({
  default: {
    getAdminById: (...args: any[]) => getAdminByIdMock(...args),
    listAdminMessages: (...args: any[]) => listAdminMessagesMock(...args),
    updateStatus: (...args: any[]) => updateStatusMock(...args),
    updatePriority: (...args: any[]) => updatePriorityMock(...args),
    sendAdminMessage: (...args: any[]) => sendAdminMessageMock(...args),
    viewAdminMessageAttachment: vi.fn(),
  },
}));

vi.mock('../../../lib/toast', () => ({
  showSuccessToast: (...args: any[]) => showSuccessToastMock(...args),
  showErrorToast: (...args: any[]) => showErrorToastMock(...args),
}));

vi.mock('@mantine/notifications', () => ({
  notifications: { show: vi.fn() },
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

  const Textarea = ({ label, value, onChange, ...props }: any) => (
    <label>
      {label}
      <textarea aria-label={label} value={value || ''} onChange={onChange} {...props} />
    </label>
  );

  return {
    Badge: ({ children }: any) => <span>{children}</span>,
    Box: Wrap,
    Button,
    Divider: Wrap,
    Group: Wrap,
    Paper: Wrap,
    ScrollArea: Wrap,
    Select,
    Skeleton,
    Stack: Wrap,
    Text,
    Textarea,
    ThemeIcon: Wrap,
    Title,
    createTheme: (config: any) => config,
  };
});

const baseTicket = {
  id: 'tk-1',
  status: 'OPEN',
  type: 'BUG',
  priority: 'HIGH',
  flow: 'assistencial',
  module: 'agenda',
  createdAt: '2026-04-10T10:00:00Z',
  updatedAt: '2026-04-10T11:00:00Z',
  createdByName: 'Joao',
  createdByEmail: 'joao@test.com',
  branchName: 'Matriz',
};

describe('AdminTicketDetails', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getAdminByIdMock.mockResolvedValue(baseTicket);
    listAdminMessagesMock.mockResolvedValue([
      {
        id: 'm1',
        authorRole: 'USER',
        authorName: 'Joao',
        authorEmail: 'joao@test.com',
        createdAt: '2026-04-10T10:10:00Z',
        message: 'Preciso de ajuda',
      },
    ]);
  });

  it('loads ticket and messages', async () => {
    render(<AdminTicketDetails />);

    expect(await screen.findByText(/Chamado/)).toBeInTheDocument();
    expect(getAdminByIdMock).toHaveBeenCalledWith('tk-1');
    expect(listAdminMessagesMock).toHaveBeenCalledWith('tk-1');
  });

  it('updates status and priority', async () => {
    updateStatusMock.mockResolvedValue({ ...baseTicket, status: 'RESOLVED' });
    updatePriorityMock.mockResolvedValue({ ...baseTicket, priority: 'LOW' });

    render(<AdminTicketDetails />);

    await screen.findByText(/Chamado/);
    fireEvent.change(screen.getByLabelText('Status do chamado'), { target: { value: 'RESOLVED' } });
    fireEvent.change(screen.getByLabelText('Prioridade'), { target: { value: 'LOW' } });

    await waitFor(() => {
      expect(updateStatusMock).toHaveBeenCalledWith('tk-1', 'RESOLVED');
      expect(updatePriorityMock).toHaveBeenCalledWith('tk-1', 'LOW');
      expect(showSuccessToastMock).toHaveBeenCalled();
    });
  });

  it('sends a new admin message', async () => {
    sendAdminMessageMock.mockResolvedValue({});

    render(<AdminTicketDetails />);

    await screen.findByText(/Chamado/);
    fireEvent.change(screen.getByLabelText('Registrar atualização'), { target: { value: 'Atualização interna' } });
    fireEvent.click(screen.getByRole('button', { name: 'Registrar atualização' }));

    await waitFor(() => {
      expect(sendAdminMessageMock).toHaveBeenCalledWith('tk-1', { message: 'Atualização interna', attachment: null });
      expect(showSuccessToastMock).toHaveBeenCalled();
    });
  });

  it('navigates back to list when initial load fails', async () => {
    getAdminByIdMock.mockRejectedValueOnce(new Error('falha'));
    listAdminMessagesMock.mockResolvedValueOnce([]);

    render(<AdminTicketDetails />);

    await waitFor(() => {
      expect(showErrorToastMock).toHaveBeenCalled();
      expect(navigateMock).toHaveBeenCalledWith('/adm-tickets');
    });
  });
});
