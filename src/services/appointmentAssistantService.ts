import api from './api';

export type AppointmentAssistantPeriod = 'Manhã' | 'Tarde' | 'Noite';
export type AppointmentAssistantModality = 'Presencial' | 'Teleconsulta';

export interface AppointmentAssistantDraft {
  patientName: string | null;
  patientCpf: string | null;
  procedureNames: string[];
  professionalName: string | null;
  professionalPreference: 'first_available' | null;
  date: string | null;
  time: string | null;
  period: AppointmentAssistantPeriod | null;
  modality: AppointmentAssistantModality | null;
  insuranceName: string | null;
  recurrenceOccurrences: number | null;
  recurrenceIntervalWeeks: number | null;
  simultaneous: boolean | null;
  observations: string | null;
}

export interface AppointmentAssistantResponse {
  draft: AppointmentAssistantDraft;
  generatedAt?: string;
}

export default {
  async parse(prompt: string, currentDate?: string) {
    const response = await api.post<AppointmentAssistantResponse>('/care/appointments/assistant/parse', {
      prompt,
      currentDate,
    });
    return response.data;
  },
};
