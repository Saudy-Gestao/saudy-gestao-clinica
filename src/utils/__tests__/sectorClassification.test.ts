import { describe, expect, it } from 'vitest';
import {
  isRoomLikeName,
  isRoomSector,
  markRoomDescription,
  stripRoomMarker,
} from '../sectorClassification';

describe('isRoomLikeName', () => {
  it('matches "Sala 1"', () => expect(isRoomLikeName('Sala 1')).toBe(true));
  it('matches "sala"', () => expect(isRoomLikeName('sala')).toBe(true));
  it('matches "room x"', () => expect(isRoomLikeName('room x')).toBe(true));
  it('returns false for "Recepção"', () => expect(isRoomLikeName('Recepção')).toBe(false));
  it('returns false for empty', () => expect(isRoomLikeName('')).toBe(false));
  it('returns false for null', () => expect(isRoomLikeName(null)).toBe(false));
});

describe('isRoomSector', () => {
  it('returns false for null', () => expect(isRoomSector(null)).toBe(false));
  it('returns true when description starts with [SALA]', () => {
    expect(isRoomSector({ name: 'X', description: '[SALA] desc' })).toBe(true);
  });
  it('returns true when description starts with __ROOM__', () => {
    expect(isRoomSector({ name: 'X', description: '__ROOM__ desc' })).toBe(true);
  });
  it('returns true when name is room-like', () => {
    expect(isRoomSector({ name: 'Sala 1', description: '' })).toBe(true);
  });
  it('returns false for regular sector', () => {
    expect(isRoomSector({ name: 'Recepção', description: 'atendimento' })).toBe(false);
  });
});

describe('markRoomDescription', () => {
  it('prepends [SALA] to description', () => {
    expect(markRoomDescription('minha desc')).toBe('[SALA] minha desc');
  });
  it('returns [SALA] for empty', () => {
    expect(markRoomDescription('')).toBe('[SALA]');
  });
  it('does not double-mark', () => {
    expect(markRoomDescription('[SALA] already')).toBe('[SALA] already');
  });
});

describe('stripRoomMarker', () => {
  it('strips [SALA] prefix', () => {
    expect(stripRoomMarker('[SALA] desc')).toBe('desc');
  });
  it('strips __ROOM__ prefix', () => {
    expect(stripRoomMarker('__ROOM__ desc')).toBe('desc');
  });
  it('returns text unchanged if no marker', () => {
    expect(stripRoomMarker('plain text')).toBe('plain text');
  });
  it('returns empty for empty', () => {
    expect(stripRoomMarker('')).toBe('');
  });
});
