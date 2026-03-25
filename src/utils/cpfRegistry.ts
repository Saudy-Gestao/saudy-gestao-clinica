import doctorService from '../services/doctorService';
import patientService from '../services/patientService';
import { onlyDigits } from './formatters';

type ApiRecord = Record<string, unknown>;

type RegistryEntityType = 'patient' | 'doctor';

type RegistryLookupOptions = {
  cpf: string;
  currentEntityType?: RegistryEntityType;
  currentEntityId?: string | null;
};

type RegistryLookupResult = {
  exists: boolean;
  entityType?: RegistryEntityType;
  entityId?: string;
};

const isRecord = (value: unknown): value is ApiRecord => typeof value === 'object' && value !== null;

const getApiList = (response: unknown): ApiRecord[] => {
  if (Array.isArray(response)) return response as ApiRecord[];

  const record = isRecord(response) ? response : {};
  const directKeys = ['items', 'patients', 'results', 'data'];

  for (const key of directKeys) {
    const value = record[key];
    if (Array.isArray(value)) return value as ApiRecord[];
  }

  const nested = isRecord(record.data) ? record.data : {};
  for (const key of ['items', 'patients', 'results']) {
    const value = nested[key];
    if (Array.isArray(value)) return value as ApiRecord[];
  }

  return [];
};

const getEntityId = (item: ApiRecord) =>
  String(item.id ?? item.patientId ?? item.doctorId ?? item._id ?? item.uuid ?? '').trim();

const getEntityCpf = (item: ApiRecord) => onlyDigits(String(item.cpf ?? ''));

export async function findExistingCpf({
  cpf,
  currentEntityType,
  currentEntityId,
}: RegistryLookupOptions): Promise<RegistryLookupResult> {
  const normalizedCpf = onlyDigits(cpf);
  if (!normalizedCpf) return { exists: false };

  const [patientsResponse, doctorsResponse] = await Promise.all([
    patientService.listPatients(),
    doctorService.listDoctors(),
  ]);

  const patients = getApiList(patientsResponse);
  const doctors = getApiList(doctorsResponse);

  const patientMatch = patients.find((item) => {
    const entityId = getEntityId(item);
    if (currentEntityType === 'patient' && currentEntityId && entityId === currentEntityId) return false;
    return getEntityCpf(item) === normalizedCpf;
  });

  if (patientMatch) {
    return {
      exists: true,
      entityType: 'patient',
      entityId: getEntityId(patientMatch),
    };
  }

  const doctorMatch = doctors.find((item) => {
    const entityId = getEntityId(item);
    if (currentEntityType === 'doctor' && currentEntityId && entityId === currentEntityId) return false;
    return getEntityCpf(item) === normalizedCpf;
  });

  if (doctorMatch) {
    return {
      exists: true,
      entityType: 'doctor',
      entityId: getEntityId(doctorMatch),
    };
  }

  return { exists: false };
}
