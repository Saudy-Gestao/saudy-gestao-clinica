import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Faturamento } from '../Faturamento';

const navigateMock = vi.fn();
const invalidateQueriesMock = vi.fn();
const showNotificationMock = vi.fn();
const createInvoiceMock = vi.fn();
const updateInvoiceMock = vi.fn();
const createBatchMock = vi.fn();

const invoicesQueryMock = vi.fn();
const tissQueryMock = vi.fn();

vi.mock('react-router-dom', () => ({ useNavigate: () => navigateMock }));
vi.mock('@tanstack/react-query', () => ({ useQueryClient: () => ({ invalidateQueries: invalidateQueriesMock }) }));
vi.mock('@mantine/hooks', () => ({ useMediaQuery: () => false }));
vi.mock('@mantine/notifications', () => ({ showNotification: (...args: any[]) => showNotificationMock(...args) }));

vi.mock('../../services/invoiceService', () => ({
  default: {
    createInvoice: (...args: any[]) => createInvoiceMock(...args),
    updateInvoice: (...args: any[]) => updateInvoiceMock(...args),
  },
}));

vi.mock('../../services/tissBatchService', () => ({
  default: {
    create: (...args: any[]) => createBatchMock(...args),
    downloadXml: vi.fn(),
    registerProtocol: vi.fn(),
    registerReturn: vi.fn(),
    represent: vi.fn(),
  },
}));

vi.mock('../../hooks/useInvoicesQuery', () => ({ useInvoicesQuery: () => invoicesQueryMock() }));
vi.mock('../../hooks/useTissBatchesQuery', () => ({ useTissBatchesQuery: () => tissQueryMock() }));

vi.mock('../../components/Header/Header', () => ({ Header: () => <div>Header</div> }));
vi.mock('../../components/common/ResultModal', () => ({
  default: ({ opened, title, message }: any) => (opened ? <div>{title} {message}</div> : null),
}));

vi.mock('../../components/common/FloatingInput', () => ({
  FloatingInput: ({ label, value, onChange, placeholder, ...props }: any) => (
    <label>
      {label}
      <input aria-label={label} value={value || ''} onChange={onChange} placeholder={placeholder} {...props} />
    </label>
  ),
}));
vi.mock('../../components/common/FloatingTextarea', () => ({
  FloatingTextarea: ({ label, value, onChange, ...props }: any) => (
    <label>
      {label}
      <textarea aria-label={label} value={value || ''} onChange={onChange} {...props} />
    </label>
  ),
}));
vi.mock('../../components/common/FloatingNumberInput', () => ({
  FloatingNumberInput: ({ label, value, onChange, ...props }: any) => (
    <label>
      {label}
      <input
        aria-label={label}
        type="number"
        value={value ?? ''}
        onChange={(e) => onChange?.(Number(e.currentTarget.value))}
        {...props}
      />
    </label>
  ),
}));
vi.mock('../../components/common/FloatingSelect', () => ({
  FloatingSelect: ({ label, value, onChange, data = [] }: any) => (
    <label>
      {label}
      <select aria-label={label} value={value || ''} onChange={(e) => onChange?.(e.currentTarget.value)}>
        <option value="">Selecione</option>
        {data.map((item: any) => <option key={item.value} value={item.value}>{item.label}</option>)}
      </select>
    </label>
  ),
}));

vi.mock('@mantine/dates', () => ({
  DatePicker: ({ onChange }: any) => <button onClick={() => onChange?.(new Date('2026-02-01'))}>Data</button>,
}));

vi.mock('@mantine/core', () => {
  const Wrap = ({ children }: any) => <div>{children}</div>;
  const Button = ({ children, onClick, ...props }: any) => <button onClick={onClick} {...props}>{children}</button>;
  const Modal = ({ opened, children }: any) => (opened ? <div>{children}</div> : null);
  const ActionIcon = ({ children, onClick, title, ...props }: any) => <button onClick={onClick} title={title} {...props}>{children}</button>;
  const Checkbox = ({ checked, onChange, ...props }: any) => (
    <input type="checkbox" checked={!!checked} onChange={onChange} {...props} />
  );

  const Tabs = ({ children }: any) => <div>{children}</div>;
  (Tabs as any).List = Wrap;
  (Tabs as any).Tab = Button;
  (Tabs as any).Panel = Wrap;

  const Table = ({ children }: any) => <table>{children}</table>;
  (Table as any).Thead = ({ children }: any) => <thead>{children}</thead>;
  (Table as any).Tbody = ({ children }: any) => <tbody>{children}</tbody>;
  (Table as any).Tr = ({ children }: any) => <tr>{children}</tr>;
  (Table as any).Th = ({ children }: any) => <th>{children}</th>;
  (Table as any).Td = ({ children, ...props }: any) => <td {...props}>{children}</td>;

  const Popover = Wrap as any;
  Popover.Target = Wrap;
  Popover.Dropdown = Wrap;

  const Grid = Wrap as any;
  Grid.Col = Wrap;

  return {
    Box: Wrap,
    Group: Wrap,
    Text: ({ children }: any) => <span>{children}</span>,
    Button,
    Table,
    Modal,
    Stack: Wrap,
    ActionIcon,
    Paper: Wrap,
    Popover,
    Grid,
    Badge: ({ children }: any) => <span>{children}</span>,
    Skeleton: () => <div>loading</div>,
    Checkbox,
    SimpleGrid: Wrap,
    Tabs,
    createTheme: (config: any) => config,
  };
});

describe('Faturamento', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    invoicesQueryMock.mockReturnValue({ data: [], isLoading: false, error: null });
    tissQueryMock.mockReturnValue({ data: [], isLoading: false });
  });

  it('renders loading state for invoices', () => {
    invoicesQueryMock.mockReturnValue({ data: [], isLoading: true, error: null });
    render(<Faturamento />);
    expect(screen.getAllByText('loading').length).toBeGreaterThan(0);
  });

  it('validates required fields before saving', () => {
    render(<Faturamento />);
    fireEvent.click(screen.getByText('Nova fatura'));
    fireEvent.click(screen.getByText('Salvar'));

    expect(showNotificationMock).toHaveBeenCalled();
    expect(createInvoiceMock).not.toHaveBeenCalled();
  });

  it('creates a new invoice successfully', async () => {
    createInvoiceMock.mockResolvedValue({ id: '1', number: 'FAT-001', value: 120, status: 'Emitida' });
    render(<Faturamento />);

    fireEvent.click(screen.getByText('Nova fatura'));
    fireEvent.change(screen.getByLabelText('Tipo'), { target: { value: 'lancamento' } });
    fireEvent.change(screen.getByLabelText('Valor (R$)'), { target: { value: '120' } });
    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Maria' } });
    fireEvent.click(screen.getByText('Salvar'));

    await waitFor(() => {
      expect(createInvoiceMock).toHaveBeenCalledTimes(1);
      expect(invalidateQueriesMock).toHaveBeenCalled();
      expect(screen.getByText(/Fatura criada/)).toBeInTheDocument();
    });
  });

  it('updates an existing invoice when editing', async () => {
    invoicesQueryMock.mockReturnValue({
      data: [{ id: '10', number: 'FAT-10', issuedAt: '2026-04-01T10:00:00Z', dueDate: '2026-04-30', status: 'Emitida', convention: 'Unimed', value: 100, discount: 0, patientName: 'Joao' }],
      isLoading: false,
      error: null,
    });

    updateInvoiceMock.mockResolvedValue({ number: 'FAT-10' });
    render(<Faturamento />);

    fireEvent.click(screen.getByTitle('Editar fatura'));
    fireEvent.change(screen.getByLabelText('Tipo'), { target: { value: 'nota' } });
    fireEvent.change(screen.getByLabelText('Valor (R$)'), { target: { value: '150' } });
    fireEvent.click(screen.getByText('Salvar alterações'));

    await waitFor(() => {
      expect(updateInvoiceMock).toHaveBeenCalledTimes(1);
      expect(invalidateQueriesMock).toHaveBeenCalled();
    });
  });

  it('creates TISS batch from selected invoices', async () => {
    invoicesQueryMock.mockReturnValue({
      data: [{ id: '10', number: 'FAT-10', issuedAt: '2026-04-01T10:00:00Z', dueDate: '2026-04-30', status: 'Emitida', convention: 'Unimed', value: 100, discount: 0 }],
      isLoading: false,
      error: null,
    });
    createBatchMock.mockResolvedValue({ batchNumber: 'TISS-1' });

    render(<Faturamento />);

    fireEvent.click(screen.getByLabelText('Selecionar FAT-10'));
    fireEvent.click(screen.getByText('Criar lote TISS'));
    fireEvent.click(screen.getByText('Criar lote'));

    await waitFor(() => {
      expect(createBatchMock).toHaveBeenCalledTimes(1);
      expect(invalidateQueriesMock).toHaveBeenCalled();
    });
  });
});
