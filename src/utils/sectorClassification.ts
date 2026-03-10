const ROOM_PREFIX = '[SALA]';

const normalizeText = (value: unknown) => String(value || '').trim();

export const isRoomLikeName = (name: unknown) => {
  const normalized = normalizeText(name).toLowerCase();
  if (!normalized) return false;
  return /^sala(\s|$|\d)/i.test(normalized) || normalized.startsWith('room ');
};

export const isRoomSector = (sector: any) => {
  if (!sector) return false;
  const name = normalizeText(sector.name);
  const description = normalizeText(sector.description);

  if (description.startsWith(ROOM_PREFIX)) return true;
  if (description.startsWith('__ROOM__')) return true;
  return isRoomLikeName(name);
};

export const markRoomDescription = (description: string) => {
  const text = normalizeText(description);
  if (!text) return ROOM_PREFIX;
  if (text.startsWith(ROOM_PREFIX)) return text;
  if (text.startsWith('__ROOM__')) return text;
  return `${ROOM_PREFIX} ${text}`;
};

export const stripRoomMarker = (description: unknown) => {
  const text = normalizeText(description);
  if (!text) return '';
  if (text.startsWith(ROOM_PREFIX)) return text.slice(ROOM_PREFIX.length).trim();
  if (text.startsWith('__ROOM__')) return text.replace(/^__ROOM__[:|]?\s*/i, '').trim();
  return text;
};

