import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AdminClients } from '../AdminClients';

const navigateMock = vi.fn();
const invalidateQueriesMock = vi.fn();
const companiesQueryMock = vi.fn();
const updateCompanyMock = vi.fn();
const validateCompanyFormMock = vi.fn();
const showErrorToastMock = vi.fn();
const showSuccessToastMock = vi.fn();

vi.mock('react-router-dom', () => ({ useNavigate: () => navigateMock }));
vi.mock('@tanstack/react-query', () => ({ useQueryClient: () => ({ invalidateQueries: invalidateQueriesMock }) }));

vi.mock('../../../hooks/useSettingsCompaniesQuery', () => ({ useSettingsCompaniesQuery: () => companiesQueryMock() }));
vi.mock('../../../services/companyService', () => ({
  default: { updateCompany: (...args: any[]) => updateCompanyMock(...args) },
}));
vi.mock('../../../utils/validations', () => ({ validateCompanyForm: (...args: any[]) => validateCompanyFormMock(...args) }));
vi.mock('../../../lib/toast', () => ({
  showErrorToast: (...args: any[]) => showErrorToastMock(...args),
  showSuccessToast: (...args: any[]) => showSuccessToastMock(...args),
}));

vi.mock('../../Header/Header', () => ({ Header: () => <div>Header</div> }));

vi.mock('@mantine/core', () => {
  const Wrap = ({ children, ...props }: any) => <div {...props}>{children}</div>;
  const Button = ({ children, onClick, ...props }: any) => <button onClick={onClick} {...props}>{children}</button>;
  const Text = ({ children }: any) => <span>{children}</span>;
  const Title = ({ children }: any) => <h2>{children}</h2>;
  const Skeleton = () => <div>skeleton</div>;

  const Select = ({ label, value, onChange, data = [] }: any) => (
    <label>
      {label}
      <select aria-label={label} value={value || ''} onChange={(e) => onChange?.(e.currentTarget.value)}>
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

  const NumberInput = ({ label, value, onChange }: any) => (
    <label>
      {label}
      <input aria-label={label} type="number" value={value ?? 0} onChange={(e) => onChange?.(Number(e.currentTarget.value))} />
    </label>
  );

  const Radio = ({ value, label, description }: any) => (
    <label>
      <input type="radio" value={value} />
      {label}
      {description}
    </label>
  ) as any;
  Radio.Group = ({ children }: any) => <div>{children}</div>;

  return {
    Box: Wrap,
    Button,
    Group: Wrap,
    NumberInput,
    Paper: Wrap,
    Radio,
    Select,
    Skeleton,
    SimpleGrid: Wrap,
    Stack: Wrap,
    Text,
    TextInput,
    Title,
    createTheme: (config: any) => config,
  };
});

describe('AdminClients', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    companiesQueryMock.mockReturnValue({ data: [], isLoading: false });
    validateCompanyFormMock.mockReturnValue({ isValid: true, errors: {} });
  });

  it('shows skeleton while loading', () => {
    companiesQueryMock.mockReturnValue({ data: [], isLoading: true });
    render(<AdminClients />);
    expect(screen.getAllByText('skeleton').length).toBeGreaterThan(0);
  });

  it('navigates back to adm hub', () => {
    render(<AdminClients />);
    fireEvent.click(screen.getByText('Voltar para o ADM'));
    expect(navigateMock).toHaveBeenCalledWith('/adm-hub');
  });

  it('validates form before save', async () => {
    companiesQueryMock.mockReturnValue({
      data: [{ id: 'c1', cnpj: '123', legalName: 'Empresa', tradeName: 'Emp', address: '', phone: '', module_type: 'padrao', additionalBranchesAllowed: 0 }],
      isLoading: false,
    });
    validateCompanyFormMock.mockReturnValue({ isValid: false, errors: { legalName: 'Obrigatório' } });

    render(<AdminClients />);

    await waitFor(() => expect(screen.getByLabelText('Cliente')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Salvar alterações'));

    expect(showErrorToastMock).toHaveBeenCalled();
    expect(updateCompanyMock).not.toHaveBeenCalled();
  });

  it('updates company and invalidates query on success', async () => {
    companiesQueryMock.mockReturnValue({
      data: [{ id: 'c1', cnpj: '123', legalName: 'Empresa', tradeName: 'Emp', address: 'Rua 1', phone: '11', module_type: 'padrao', additionalBranchesAllowed: 1 }],
      isLoading: false,
    });
    updateCompanyMock.mockResolvedValue({});

    render(<AdminClients />);

    await waitFor(() => expect(screen.getByLabelText('Razão Social')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Salvar alterações'));

    await waitFor(() => {
      expect(updateCompanyMock).toHaveBeenCalledWith('c1', expect.objectContaining({ legalName: 'Empresa' }));
      expect(showSuccessToastMock).toHaveBeenCalled();
      expect(invalidateQueriesMock).toHaveBeenCalled();
    });
  });

  it('shows error toast on save failure', async () => {
    companiesQueryMock.mockReturnValue({
      data: [{ id: 'c1', cnpj: '123', legalName: 'Empresa', tradeName: 'Emp', address: 'Rua 1', phone: '11', module_type: 'padrao', additionalBranchesAllowed: 1 }],
      isLoading: false,
    });
    updateCompanyMock.mockRejectedValue(new Error('falha'));

    render(<AdminClients />);

    await waitFor(() => expect(screen.getByText('Salvar alterações')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Salvar alterações'));

    await waitFor(() => {
      expect(showErrorToastMock).toHaveBeenCalled();
    });
  });
});
