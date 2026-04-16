export const isDoctorUser = (user: any): boolean => {
  if (!user || typeof user !== 'object') return false;

  const doctorId = String(user?.doctorId || user?.doctor?.id || '').trim();
  if (doctorId) return true;

  const sectorName = String(user?.sector?.name || '').trim().toLowerCase();
  return sectorName === 'medicos' || sectorName === 'médicos';
};

const normalizeRoleToken = (value: unknown) => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .trim()
  .toLowerCase();

export const isAdminUser = (user: any): boolean => {
  if (!user || typeof user !== 'object') return false;
  if (Boolean(user?.isAdmHubOnly)) return true;

  const accesses = Array.isArray(user?.accesses)
    ? user.accesses
    : Array.isArray(user?.access)
      ? user.access
      : [];

  return accesses.some((access: any) => {
    const description = normalizeRoleToken(access?.description);
    if (description.includes('admin')) return true;
    if (description.includes('administrador')) return true;
    return false;
  });
};
