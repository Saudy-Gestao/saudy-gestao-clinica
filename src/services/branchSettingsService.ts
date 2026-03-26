import api from './api';

export interface BranchSettings {
  id: string;
  branchId: string;
  requireFacialForReportDelivery: boolean;
  requireFacialForPatientRegistration: boolean;
  noShowToleranceMinutes: number;
  publicCheckInEnabled: boolean;
  publicCheckInLastEnabledAt?: string | null;
  publicCheckInLastEnabledByUserId?: string | null;
  publicCheckInLastEnabledByName?: string | null;
  publicCheckInLastDisabledAt?: string | null;
  publicCheckInLastDisabledByUserId?: string | null;
  publicCheckInLastDisabledByName?: string | null;
  publicCheckInAuditTrail?: Array<{
    id: string;
    branchId: string;
    action: 'ENABLED' | 'DISABLED' | string;
    performedByUserId?: string | null;
    performedByName?: string | null;
    createdAt: string;
  }>;
}

const branchSettingsService = {
  getBranchSettings: async (branchId: string): Promise<BranchSettings> => {
    const response = await api.get(`/auth/branches/${branchId}/settings`);
    return response.data;
  },

  updateBranchSettings: async (
    branchId: string,
    settings: Partial<Omit<BranchSettings, 'id' | 'branchId'>>
  ): Promise<BranchSettings> => {
    const response = await api.put(`/auth/branches/${branchId}/settings`, settings);
    return response.data;
  },
};

export default branchSettingsService;
