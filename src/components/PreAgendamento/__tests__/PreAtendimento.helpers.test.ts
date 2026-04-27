import { describe, expect, it } from 'vitest';
import {
  dedupeReceptionPatients,
  extractDoctorNameFromAgenda,
  formatDateDisplay,
  getAgendaSummary,
  getChecklistAppointmentDate,
  getReceptionStatusColor,
  hasValidPreAttendanceId,
  isConsultationAppointmentFkError,
  isPrivateCare,
  isSameReceptionPatient,
  mapApiToPatient,
  normalizeChecklistGenderForApi,
  normalizeComparableText,
  normalizeAppointmentIdForApi,
  parseDisplayDateToApi,
  RECEPTION_CHECKLIST_STATUS,
  RECEPTION_DONE_STATUS,
  RECEPTION_IN_PROGRESS_STATUS,
  normalizePhoneForApi,
} from '../PreAtendimento';

describe('PreAtendimento helpers', () => {
  it('normalizes phone values for api payloads', () => {
    expect(normalizePhoneForApi('(11) 98888-7777')).toBe('11988887777');
    expect(normalizePhoneForApi('5511988887777')).toBe('11988887777');
    expect(normalizePhoneForApi('abc5511988887777')).toBe('11988887777');
    expect(normalizePhoneForApi('')).toBe('');
  });

  it('normalizes appointment id only when it is a valid uuid', () => {
    expect(normalizeAppointmentIdForApi('550e8400-e29b-41d4-a716-446655440000')).toBe('550e8400-e29b-41d4-a716-446655440000');
    expect(normalizeAppointmentIdForApi(' not-a-uuid ')).toBeUndefined();
    expect(normalizeAppointmentIdForApi('')).toBeUndefined();
  });

  it('detects consultation appointment foreign key errors from details or normalized message', () => {
    expect(
      isConsultationAppointmentFkError({
        response: { data: { details: 'violates consultations_appointmentId_fkey constraint' } },
      }),
    ).toBe(true);

    expect(
      isConsultationAppointmentFkError({
        response: { data: { details: 'other constraint' } },
      }),
    ).toBe(false);

    expect(
      isConsultationAppointmentFkError({
        response: { data: { message: 'Outra falha' } },
      }),
    ).toBe(false);
  });

  it('covers reception status, private care and id validation helpers', () => {
    expect(isPrivateCare(null)).toBe(true);
    expect(isPrivateCare({ convenio: 'Particular' })).toBe(true);
    expect(isPrivateCare({ convenio: 'Unimed' })).toBe(false);

    expect(getReceptionStatusColor(RECEPTION_IN_PROGRESS_STATUS)).toBe('blue');
    expect(getReceptionStatusColor(RECEPTION_CHECKLIST_STATUS)).toBe('violet');
    expect(getReceptionStatusColor(RECEPTION_DONE_STATUS)).toBe('green');
    expect(getReceptionStatusColor('Outro')).toBe('gray');

    expect(hasValidPreAttendanceId('abc')).toBe(true);
    expect(hasValidPreAttendanceId('tmp-123')).toBe(false);
    expect(hasValidPreAttendanceId('')).toBe(false);
  });

  it('parses agenda, text, dates and gender helpers', () => {
    expect(extractDoctorNameFromAgenda('08:00Ã¢â‚¬Â¢CardioÃ¢â‚¬Â¢Dr. Ana')).toBe('Dr. Ana');
    expect(extractDoctorNameFromAgenda('')).toBe('');

    expect(getAgendaSummary('08:00 • Cardiologia • Dr. Ana')).toEqual({
      horario: '08:00',
      procedimento: 'Cardiologia',
    });
    expect(getAgendaSummary('')).toEqual({
      horario: 'Não informado',
      procedimento: 'Não informado',
    });

    expect(normalizeComparableText(' Ólá Mundo ')).toBe('ola mundo');
    expect(parseDisplayDateToApi('10/04/2026')).toBe('2026-04-10');
    expect(parseDisplayDateToApi('invalida')).toBeUndefined();

    expect(normalizeChecklistGenderForApi('masculino')).toBe('MALE');
    expect(normalizeChecklistGenderForApi('F')).toBe('FEMALE');
    expect(normalizeChecklistGenderForApi('other')).toBe('OTHER');
    expect(normalizeChecklistGenderForApi('')).toBeUndefined();

    expect(formatDateDisplay('2026-04-10')).toBe('10/04/2026');
    expect(formatDateDisplay('10/04/2026')).toBe('10/04/2026');
    expect(formatDateDisplay('invalid')).toBe('');
    expect(getChecklistAppointmentDate({ date: '2026-04-10' } as any)).toBe('10/04/2026');
    expect(getChecklistAppointmentDate(null)).toBe('Não informada');
  });

  it('matches, deduplicates and maps reception patients', () => {
    const left = {
      id: 'tmp-1',
      appointmentId: 'appt-1',
      patientId: 'pat-1',
      cpf: '52998224725',
      status: RECEPTION_IN_PROGRESS_STATUS,
      convenio: 'Unimed',
    };
    const right = {
      id: 'pre-1',
      appointmentId: 'appt-1',
      patientId: 'pat-1',
      cpf: '529.982.247-25',
      status: RECEPTION_CHECKLIST_STATUS,
      convenio: 'Unimed',
    };

    expect(isSameReceptionPatient(left as any, right as any)).toBe(true);
    expect(dedupeReceptionPatients([left as any, right as any])).toEqual([right]);

    const mapped = mapApiToPatient({
      preAttendanceId: 'pre-2',
      patient: { id: 'pat-2', name: 'Maria', cpf: '11122233344' },
      doctor: { id: 'doc-1', name: 'Dra. Ana' },
      appointmentId: 'appt-2',
      queueType: 'Fila clínica',
      bloodPressure: '12x8',
      healthInsuranceName: 'Particular',
    });

    expect(mapped.id).toBe('pre-2');
    expect(mapped.patientId).toBe('pat-2');
    expect(mapped.nomeCompleto).toBe('Maria');
    expect(mapped.doctorName).toBe('Dra. Ana');
    expect(mapped.tipoFila).toBe('Fila clínica');
    expect(mapped.pressaoArterial).toBe('12x8');
    expect(mapped.convenio).toBe('Particular');
  });
});
