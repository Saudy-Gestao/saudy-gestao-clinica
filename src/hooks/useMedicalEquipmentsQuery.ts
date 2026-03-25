import { useQuery } from '@tanstack/react-query';
import medicalEquipmentService from '../services/medicalEquipmentService';
import { queryKeys } from '../lib/queryKeys';

export const fetchMedicalEquipments = () => medicalEquipmentService.list();

export const useMedicalEquipmentsQuery = () => useQuery({
  queryKey: queryKeys.medicalEquipments,
  queryFn: fetchMedicalEquipments,
  refetchInterval: 15_000,
});
