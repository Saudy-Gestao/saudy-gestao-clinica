import api from './api';

export interface BranchSettings {
  id: string;
  branchId: string;
  requireFacialForReportDelivery: boolean;
  requireFacialForPatientRegistration: boolean;
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
