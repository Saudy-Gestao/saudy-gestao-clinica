import { useQuery } from '@tanstack/react-query';
import appointmentService from '../services/appointmentService';
import deliveryService from '../services/deliveryService';
import patientService from '../services/patientService';
import reportService from '../services/reportService';
import { queryKeys } from '../lib/queryKeys';

export interface PatientSummaryInput {
  id: string;
  id_medilab: string;
  nome: string;
  cpf: string;
}

export interface PatientSummaryInfo {
  id: string;
  id_medilab: string;
  name: string;
  cpf: string;
  birthDate?: string;
  phone?: string;
  cellphone?: string;
  address?: string;
  healthInsuranceName?: string;
  healthInsuranceNumber?: string;
}

export interface PatientSummaryAppointment {
  id: string;
  patientName: string;
  doctorName: string;
  specialty: string;
  date: string;
  time: string;
  status: string;
  convenio?: string;
}

export interface PatientSummaryPendingItem {
  id: string;
  type: 'report' | 'delivery';
  description: string;
  date: string;
  status: string;
}

export interface PatientSummaryData {
  patientInfo: PatientSummaryInfo | null;
  appointments: PatientSummaryAppointment[];
  pendingItems: PatientSummaryPendingItem[];
}

const normalizeArray = (response: any) => (
  Array.isArray(response)
    ? response
    : (Array.isArray(response?.items)
      ? response.items
      : (Array.isArray(response?.data?.items)
        ? response.data.items
        : (Array.isArray(response?.data) ? response.data : [])))
);

const buildFullAddress = (patient: any) => {
  if (!patient?.address) return undefined;
  return `${patient.address}${patient.addressNumber || patient.address_number ? `, ${patient.addressNumber || patient.address_number}` : ''}${patient.addressComplement || patient.address_complement ? ` - ${patient.addressComplement || patient.address_complement}` : ''}${patient.neighborhood ? ` - ${patient.neighborhood}` : ''}${patient.city ? ` - ${patient.city}` : ''}${patient.state ? `/${patient.state}` : ''}`;
};

const findPatientInfo = async (patientData: PatientSummaryInput): Promise<PatientSummaryInfo> => {
  let patient: any = null;

  try {
    if (patientData.id) {
      patient = await patientService.getPatientById(patientData.id);
    }
  } catch {
    patient = null;
  }

  if (!patient) {
    const response = await patientService.listPatients();
    const allPatients = Array.isArray(response) ? response : (response?.data || []);
    const normalizedCpf = patientData.cpf.replace(/\D/g, '');
    patient = allPatients.find((item: any) => {
      const itemCpf = String(item.cpf || '').replace(/\D/g, '');
      return itemCpf === normalizedCpf || String(item.id) === String(patientData.id);
    });
  }

  if (!patient) {
    return {
      id: patientData.id,
      id_medilab: patientData.id_medilab,
      name: patientData.nome,
      cpf: patientData.cpf,
    };
  }

  return {
    id: patient.id || patientData.id,
    id_medilab: patientData.id_medilab || patient.id,
    name: patient.name || patientData.nome,
    cpf: patient.cpf || patientData.cpf,
    birthDate: patient.birthDate || patient.birth_date || patient.birthdate,
    phone: patient.phone,
    cellphone: patient.cellphone || patient.cell_phone,
    address: buildFullAddress(patient),
    healthInsuranceName: patient.healthInsuranceName || patient.health_insurance_name || patient.healthinsurancename,
    healthInsuranceNumber: patient.healthInsuranceNumber || patient.health_insurance_number || patient.healthinsurancenumber,
  };
};

const buildDateRange = (viewMode: 'daily' | 'weekly') => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const today = `${year}-${month}-${day}`;

  if (viewMode === 'daily') {
    return { date: today };
  }

  const weekEnd = new Date(now);
  weekEnd.setDate(weekEnd.getDate() + 6);
  const endYear = weekEnd.getFullYear();
  const endMonth = String(weekEnd.getMonth() + 1).padStart(2, '0');
  const endDay = String(weekEnd.getDate()).padStart(2, '0');

  return {
    startDate: today,
    endDate: `${endYear}-${endMonth}-${endDay}`,
  };
};

export const fetchPatientSummary = async (
  patientData?: PatientSummaryInput | null,
  viewMode: 'daily' | 'weekly' = 'daily',
): Promise<PatientSummaryData> => {
  if (!patientData) {
    return {
      patientInfo: null,
      appointments: [],
      pendingItems: [],
    };
  }

  const patientInfoPromise = findPatientInfo(patientData);
  const appointmentsPromise = appointmentService.list({
    patientId: patientData.id,
    limit: 100,
    ...buildDateRange(viewMode),
  });
  const reportsPromise = reportService.list({ search: patientData.nome }).catch(() => ({ data: [] }));
  const deliveriesPromise = deliveryService.getDeliveries().catch(() => ({ data: [] }));

  const [patientInfo, appointmentsResponse, reportsResponse, deliveriesResponse] = await Promise.all([
    patientInfoPromise,
    appointmentsPromise,
    reportsPromise,
    deliveriesPromise,
  ]);

  const appointments = normalizeArray(appointmentsResponse)
    .map((apt: any) => ({
      id: String(apt.id),
      patientName: apt.patientName || apt.patient_name || patientData.nome,
      doctorName: apt.doctorName || apt.doctor_name || 'Não informado',
      specialty: apt.specialty || 'Não informado',
      date: apt.date,
      time: apt.time || '00:00',
      status: apt.status || 'SCHEDULED',
      convenio: apt.convenio || apt.healthInsurance || 'Particular',
    }))
    .sort((a: PatientSummaryAppointment, b: PatientSummaryAppointment) => {
      const dateA = new Date(`${a.date}T${a.time}`).getTime();
      const dateB = new Date(`${b.date}T${b.time}`).getTime();
      return dateA - dateB;
    });

  const reports = normalizeArray(reportsResponse);
  const deliveries = normalizeArray(deliveriesResponse);
  const pendingItems: PatientSummaryPendingItem[] = [];

  reports
    .filter((report: any) => {
      const reportPatient = report.patientName || report.patient_name;
      const isPending = report.status === 'PENDING' || report.status === 'IN_PROGRESS';
      return reportPatient === patientData.nome && isPending;
    })
    .forEach((report: any) => {
      pendingItems.push({
        id: String(report.id),
        type: 'report',
        description: `Laudo: ${report.exam || report.description || 'Exame não informado'}`,
        date: report.scheduledFor || report.createdAt || new Date().toISOString(),
        status: report.status || 'PENDING',
      });
    });

  deliveries
    .filter((delivery: any) => {
      const deliveryPatient = delivery.patientName || delivery.patient_name;
      const isPending = delivery.status === 'PENDING' || delivery.status === 'AVAILABLE';
      return deliveryPatient === patientData.nome && isPending;
    })
    .forEach((delivery: any) => {
      pendingItems.push({
        id: String(delivery.id),
        type: 'delivery',
        description: `Entrega: ${delivery.documentType || delivery.description || 'Documento não especificado'}`,
        date: delivery.availableAt || delivery.createdAt || new Date().toISOString(),
        status: delivery.status || 'PENDING',
      });
    });

  pendingItems.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return {
    patientInfo,
    appointments,
    pendingItems,
  };
};

export const usePatientSummaryQuery = (
  patientData?: PatientSummaryInput | null,
  viewMode: 'daily' | 'weekly' = 'daily',
  enabled = true,
) => useQuery({
  queryKey: [...queryKeys.patientSummary, patientData?.id || '', viewMode],
  queryFn: () => fetchPatientSummary(patientData, viewMode),
  enabled: enabled && Boolean(patientData?.id),
  refetchInterval: 15_000,
});
