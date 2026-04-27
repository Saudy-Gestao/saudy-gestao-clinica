import { describe, expect, it } from 'vitest';
import { queryKeys } from '../queryKeys';

describe('queryKeys', () => {
  it('defines stable array keys for important modules', () => {
    expect(queryKeys.adminTickets).toEqual(['admin-tickets']);
    expect(queryKeys.preSchedulings).toEqual(['pre-schedulings']);
    expect(queryKeys.whatsappConfig).toEqual(['whatsapp-config']);
    expect(queryKeys.teaProfiles).toEqual(['tea-profiles']);
    expect(queryKeys.publicPreSchedulingMeta).toEqual(['public-pre-scheduling-meta']);
  });

  it('exports only array-shaped query keys', () => {
    const values = Object.values(queryKeys);

    expect(values.length).toBeGreaterThan(20);
    expect(values.every((value) => Array.isArray(value))).toBe(true);
    expect(values.every((value) => value.length === 1)).toBe(true);
  });
});
