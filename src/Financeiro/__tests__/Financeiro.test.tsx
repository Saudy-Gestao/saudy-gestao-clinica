import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Financeiro } from '../Financeiro';

const navigateMock = vi.fn();
const invalidateQueriesMock = vi.fn();
const createEntryMock = vi.fn();
const updateEntryMock = vi.fn();
const financeQueryMock = vi.fn();

vi.mock('react-router-dom', () => ({
  useNavigate: () => navigateMock,
}));

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: invalidateQueriesMock }),
}));

vi.mock('@mantine/hooks', () => ({
  useMediaQuery: () => false,
}));

vi.mock('../../hooks/useFinanceEntriesQuery', () => ({
  useFinanceEntriesQuery: () => financeQueryMock(),
}));

vi.mock('../../services/financeService', () => ({
  default: {
    createEntry: (...args: any[]) => createEntryMock(...args),
    updateEntry: (...args: any[]) => updateEntryMock(...args),
  },
}));

vi.mock('../../components/Header/Header', () => ({
  Header: () => <div>Header</div>,
}));

vi.mock('../../components/common/ResultModal', () => ({
  default: ({ opened, title, message }: any) => (opened ? <div>{title} {message}</div> : null),
}));

vi.mock('../../components/common/FloatingInput', () => ({
  FloatingInput: ({ label, value, onChange, placeholder, rightSection, ...props }: any) => (
    <label>
      {label}
      <input aria-label={label} value={value || ''} onChange={onChange} placeholder={placeholder} {...props} />
      {rightSection}
    </label>
  ),
}));

vi.mock('../../components/common/FloatingTextarea', () => ({
  FloatingTextarea: ({ label, value, onChange, placeholder, ...props }: any) => (
    <label>
      {label}
      <textarea aria-label={label} value={value || ''} onChange={onChange} placeholder={placeholder} {...props} />
    </label>
  ),
}));

vi.mock('../../components/common/FloatingSelect', () => ({
  FloatingSelect: ({ label, value, onChange, data = [] }: any) => (
    <label>
      {label}
      <select aria-label={label} value={value || ''} onChange={(e) => onChange?.(e.currentTarget.value)}>
        <option value="">Selecione</option>
        {data.map((item: any) => (
          <option key={item.value} value={item.value}>{item.label}</option>
        ))}
      </select>
    </label>
  ),
}));

vi.mock('@mantine/dates', () => ({
  DatePicker: ({ onChange }: any) => <button onClick={() => onChange?.(new Date('2026-01-01'))}>Escolher data</button>,
}));

vi.mock('@mantine/core', () => {
  const Box = ({ children }: any) => <div>{children}</div>;
  const Container = ({ children }: any) => <div>{children}</div>;
  const Group = ({ children }: any) => <div>{children}</div>;
  const Stack = ({ children }: any) => <div>{children}</div>;
  const Paper = ({ children }: any) => <div>{children}</div>;
  const Avatar = ({ children }: any) => <div>{children}</div>;
  const Text = ({ children }: any) => <span>{children}</span>;
  const Badge = ({ children }: any) => <span>{children}</span>;
  const Button = ({ children, onClick, ...props }: any) => <button onClick={onClick} {...props}>{children}</button>;
  const Modal = ({ opened, children, title }: any) => (opened ? <div><h2>{title}</h2>{children}</div> : null);
  const ActionIcon = ({ children, onClick, ...props }: any) => <button onClick={onClick} {...props}>{children}</button>;
  const Popover = ({ children }: any) => <div>{children}</div>;
  (Popover as any).Target = ({ children }: any) => <div>{children}</div>;
  (Popover as any).Dropdown = ({ children }: any) => <div>{children}</div>;

  const Menu = ({ children }: any) => <div>{children}</div>;
  (Menu as any).Target = ({ children }: any) => <div>{children}</div>;
  (Menu as any).Dropdown = ({ children }: any) => <div>{children}</div>;
  (Menu as any).Item = ({ children, onClick, disabled }: any) => <button onClick={onClick} disabled={disabled}>{children}</button>;

  const Tabs = ({ children }: any) => <div>{children}</div>;
  (Tabs as any).List = ({ children }: any) => <div>{children}</div>;
  (Tabs as any).Tab = ({ children, onClick, value }: any) => <button onClick={onClick} data-value={value}>{children}</button>;

  const Grid = ({ children }: any) => <div>{children}</div>;
  (Grid as any).Col = ({ children }: any) => <div>{children}</div>;

  const Table = ({ children }: any) => <table>{children}</table>;
  (Table as any).Thead = ({ children }: any) => <thead>{children}</thead>;
  (Table as any).Tbody = ({ children }: any) => <tbody>{children}</tbody>;
  (Table as any).Tr = ({ children }: any) => <tr>{children}</tr>;
  (Table as any).Th = ({ children }: any) => <th>{children}</th>;
  (Table as any).Td = ({ children, ...props }: any) => <td {...props}>{children}</td>;

  const Skeleton = () => <div>loading</div>;

  return {
    Box,
    Button,
    Container,
    Group,
    Modal,
    Stack,
    Table,
    Tabs,
    Badge,
    Grid,
    Paper,
    Avatar,
    Text,
    Popover,
    ActionIcon,
    Menu,
    Skeleton,
    createTheme: (config: any) => config,
    useMantineColorScheme: () => ({ colorScheme: 'light' }),
  };
});

describe('Financeiro', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    financeQueryMock.mockReturnValue({ data: [], isLoading: false, error: null });
  });

  it('renders loading state', () => {
    financeQueryMock.mockReturnValue({ data: [], isLoading: true, error: null });
    render(<Financeiro />);
    expect(screen.getAllByText('loading').length).toBeGreaterThan(0);
  });

  it('shows empty state when no entries exist', () => {
    render(<Financeiro />);
    expect(screen.getByText('Nenhum lançamento encontrado')).toBeInTheDocument();
  });

  it('creates a new entry and shows success modal', async () => {
    createEntryMock.mockResolvedValue({ id: '1', relatedName: 'Maria', value: 100, discount: 10, status: 'PENDING' });

    render(<Financeiro />);

    fireEvent.click(screen.getByText('+ Novo lançamento'));
    fireEvent.change(screen.getByLabelText('Tipo'), { target: { value: 'receita' } });
    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Maria' } });
    fireEvent.change(screen.getByLabelText('Valor (R$)'), { target: { value: '100' } });
    fireEvent.change(screen.getByLabelText('Desconto (%)'), { target: { value: '10' } });

    fireEvent.click(screen.getByText('Salvar'));

    await waitFor(() => {
      expect(createEntryMock).toHaveBeenCalledTimes(1);
      expect(invalidateQueriesMock).toHaveBeenCalled();
      expect(screen.getByText(/Lançamento criado/)).toBeInTheDocument();
    });
  });

  it('marks an entry as paid', async () => {
    financeQueryMock.mockReturnValue({
      data: [{ id: 'e1', relatedName: 'Joao', createdAt: '2026-04-10T10:00:00Z', type: 'receita', status: 'PENDING', value: 50, discount: 0 }],
      isLoading: false,
      error: null,
    });

    updateEntryMock.mockResolvedValue({});
    render(<Financeiro />);

    fireEvent.click(screen.getByText('Pagar'));

    await waitFor(() => {
      expect(updateEntryMock).toHaveBeenCalledWith('e1', { status: 'PAID' });
      expect(invalidateQueriesMock).toHaveBeenCalled();
    });
  });

  it('shows error modal when list query fails', async () => {
    financeQueryMock.mockReturnValue({ data: [], isLoading: false, error: new Error('Falhou') });
    render(<Financeiro />);

    await waitFor(() => {
      expect(screen.getByText(/Erro ao criar lançamento/)).toBeInTheDocument();
    });
  });
});
