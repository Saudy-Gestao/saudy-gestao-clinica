import { describe, expect, it } from 'vitest';
import {
  evaluateConnection,
  formatRemainingToWindow,
  parseAppointmentDateTime,
} from '../TeleconsultaPreparation';

describe('TeleconsultaPreparation helpers', () => {
  it('parses appointment datetime using explicit date and time', () => {
    const value = parseAppointmentDateTime('2026-04-10', '14:30');

    expect(value).toBeInstanceOf(Date);
    expect(value?.getFullYear()).toBe(2026);
    expect((value?.getMonth() || 0) + 1).toBe(4);
    expect(value?.getDate()).toBe(10);
    expect(value?.getHours()).toBe(14);
    expect(value?.getMinutes()).toBe(30);
  });

  it('falls back to today when only time is valid and returns null for invalid time', () => {
    const now = new Date();
    const withTimeOnly = parseAppointmentDateTime(undefined, '08:05');
    const invalid = parseAppointmentDateTime('2026-01-01', 'invalid');

    expect(withTimeOnly).toBeInstanceOf(Date);
    expect(withTimeOnly?.getFullYear()).toBe(now.getFullYear());
    expect(withTimeOnly?.getHours()).toBe(8);
    expect(withTimeOnly?.getMinutes()).toBe(5);
    expect(invalid).toBeNull();
  });

  it('formats remaining window in hour and mm:ss modes', () => {
    expect(formatRemainingToWindow(3_900_000)).toBe('1 hora e 5 minutos');
    expect(formatRemainingToWindow(65_000)).toBe('01:05');
    expect(formatRemainingToWindow(-1_000)).toBe('00:00');
  });

  it('evaluates connection status by online flag, downlink and effective type', () => {
    expect(evaluateConnection(false)).toEqual({ label: 'Sem conexão', percent: 15, tone: 'red' });
    expect(evaluateConnection(true, 9)).toEqual({ label: 'Conexão Excelente', percent: 95, tone: 'green' });
    expect(evaluateConnection(true, 2)).toEqual({ label: 'Conexão Regular', percent: 48, tone: 'yellow' });
    expect(evaluateConnection(true, 0.5)).toEqual({ label: 'Conexão Instável', percent: 28, tone: 'red' });
    expect(evaluateConnection(true, undefined, '4g')).toEqual({ label: 'Conexão Boa', percent: 70, tone: 'green' });
    expect(evaluateConnection(true, undefined, 'slow-2g')).toEqual({ label: 'Conexão Instável', percent: 25, tone: 'red' });
    expect(evaluateConnection(true, undefined, 'unknown')).toEqual({ label: 'Conexão Detectada', percent: 60, tone: 'green' });
  });
});
