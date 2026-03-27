import { useQuery } from '@tanstack/react-query';
import teaPreReservationService from '../services/teaPreReservationService';
import { queryKeys } from '../lib/queryKeys';
import type { TeaPreReservationStatus } from '../services/teaPreReservationService';

type Params = {
  search?: string;
  status?: string | null;
};

const normalizePatientFromReservation = (item: any) => {
  const patient = item?.patient ?? {};
  const birthDate = (
    patient?.birthDate
    || patient?.birth_date
    || patient?.birthdate
    || item?.birthDate
    || item?.birth_date
    || item?.birthdate
    || item?.patientBirthDate
    || item?.patient_birth_date
    || item?.patientBirthdate
  );

  return {
    ...patient,
    id: patient?.id || item?.patientId || item?.patient_id,
    name: patient?.name || patient?.nome || item?.patientName || item?.patient_name,
    cpf: patient?.cpf || item?.patientCpf || item?.patient_cpf,
    birthDate,
    birth_date: patient?.birth_date || birthDate,
    birthdate: patient?.birthdate || birthDate,
  };
};

export const fetchTeaPendingReservations = async (params: Params) => {
  const data: any = await teaPreReservationService.listPending({
    search: params.search || undefined,
    status: (params.status || undefined) as TeaPreReservationStatus | undefined,
  });

  const items = Array.isArray(data)
    ? data
    : (Array.isArray(data?.items)
      ? data.items
      : (Array.isArray(data?.data?.items)
        ? data.data.items
        : (Array.isArray(data?.data)
          ? data.data
          : [])));

  return items.map((item: any) => ({
    ...item,
    patient: normalizePatientFromReservation(item),
  }));
};

export const useTeaPendingReservationsQuery = (params: Params) => useQuery({
  queryKey: [...queryKeys.teaPendingReservations, params.search || '', params.status || ''],
  queryFn: () => fetchTeaPendingReservations(params),
  refetchInterval: 30_000,
});
