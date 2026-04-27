import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Dashboard } from '../Dashboard';

const scanFaceMock = vi.fn();
const showNotificationMock = vi.fn();
const isDoctorUserMock = vi.fn();
const profileQueryMock = vi.fn();
const getCurrentUserMock = vi.fn();

vi.mock('@mantine/notifications', () => ({
  showNotification: (...args: any[]) => showNotificationMock(...args),
}));

vi.mock('../../../services/facialRecognitionService', () => ({
  default: { scanFace: (...args: any[]) => scanFaceMock(...args) },
}));

vi.mock('../../../utils/userRole', () => ({
  isDoctorUser: (...args: any[]) => isDoctorUserMock(...args),
}));

vi.mock('../../../hooks/useCurrentUserProfileQuery', () => ({
  useCurrentUserProfileQuery: () => profileQueryMock(),
}));

vi.mock('../../../services/authService', () => ({
  default: {
    getCurrentUser: () => getCurrentUserMock(),
  },
}));

vi.mock('../../Header/Header', () => ({ Header: () => <div>Header</div> }));
vi.mock('../../StatsCards/StatsCards', () => ({ StatsCards: () => <div>StatsCards</div> }));
vi.mock('../../PatientQueue/PatientQueue', () => ({ PatientQueue: () => <div>PatientQueue</div> }));
vi.mock('../../WorkflowSections/WorkflowSections', () => ({ WorkflowSections: () => <div>WorkflowSections</div> }));
vi.mock('../PatientInfoModal', () => ({
  PatientInfoModal: ({ opened, patientData }: any) => opened ? <div>PatientModal:{patientData?.nome}</div> : null,
}));
vi.mock('../../common/FacialCapture', () => ({
  FacialCapture: ({ opened, onCapture }: any) => opened ? <button onClick={() => onCapture('img64')}>DoCapture</button> : null,
}));

vi.mock('@mantine/core', () => {
  const Wrap = ({ children, ...props }: any) => <div {...props}>{children}</div>;
  const Button = ({ children, onClick, ...props }: any) => <button onClick={onClick} {...props}>{children}</button>;
  const Title = ({ children }: any) => <h1>{children}</h1>;
  const Text = ({ children }: any) => <span>{children}</span>;

  return {
    Box: Wrap,
    Title,
    Text,
    Stack: Wrap,
    Group: Wrap,
    Button,
    createTheme: (config: any) => config,
  };
});

describe('Dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    profileQueryMock.mockReturnValue({ data: null });
    getCurrentUserMock.mockReturnValue({ id: 'u1', branchId: 'b1' });
    isDoctorUserMock.mockReturnValue(false);
    localStorage.setItem('user', JSON.stringify({ branchId: 'b1' }));
  });

  it('renders default dashboard widgets for non-doctor', () => {
    render(<Dashboard />);

    expect(screen.getByText('StatsCards')).toBeInTheDocument();
    expect(screen.getByText('PatientQueue')).toBeInTheDocument();
    expect(screen.getByText('WorkflowSections')).toBeInTheDocument();
    expect(screen.getByText('Identificar Paciente')).toBeInTheDocument();
  });

  it('hides capture CTA and patient queue for doctor', () => {
    isDoctorUserMock.mockReturnValue(true);
    render(<Dashboard />);

    expect(screen.queryByText('Identificar Paciente')).not.toBeInTheDocument();
    expect(screen.queryByText('PatientQueue')).not.toBeInTheDocument();
  });

  it('recognizes patient and opens info modal', async () => {
    scanFaceMock.mockResolvedValue({ patient: { id: 'p1', name: 'Maria', cpf: '123' } });
    render(<Dashboard />);

    fireEvent.click(screen.getByText('Identificar Paciente'));
    fireEvent.click(screen.getByText('DoCapture'));

    await waitFor(() => {
      expect(scanFaceMock).toHaveBeenCalled();
      expect(screen.getByText('PatientModal:Maria')).toBeInTheDocument();
      expect(showNotificationMock).toHaveBeenCalled();
    });
  });

  it('shows warning notification when no patient is matched', async () => {
    scanFaceMock.mockResolvedValue({ patient: null });
    render(<Dashboard />);

    fireEvent.click(screen.getByText('Identificar Paciente'));
    fireEvent.click(screen.getByText('DoCapture'));

    await waitFor(() => {
      expect(showNotificationMock).toHaveBeenCalledWith(expect.objectContaining({ color: 'yellow' }));
    });
  });

  it('shows error notification when scan fails', async () => {
    scanFaceMock.mockRejectedValue(new Error('falhou'));
    render(<Dashboard />);

    fireEvent.click(screen.getByText('Identificar Paciente'));
    fireEvent.click(screen.getByText('DoCapture'));

    await waitFor(() => {
      expect(showNotificationMock).toHaveBeenCalledWith(expect.objectContaining({ color: 'red' }));
    });
  });
});
