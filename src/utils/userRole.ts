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

/**
 * Checks whether the user's assigned accesses grant a given module (by name),
 * e.g. 'configuracoes' for the Settings menu. Fails open (returns true) when
 * the user has no access records at all, matching how every other
 * module-gated menu entry in the app behaves for unrestricted users.
 */
export const hasModuleAccess = (user: any, moduleName: string): boolean => {
  if (!user || typeof user !== 'object') return false;

  const accesses = Array.isArray(user?.accesses)
    ? user.accesses
    : Array.isArray(user?.access)
      ? user.access
      : (user?.access ? [user.access] : []);

  const allModuleNames = accesses.flatMap((access: any) =>
    (Array.isArray(access?.modules) ? access.modules : []).map((module: any) => normalizeRoleToken(module?.name)),
  );

  if (allModuleNames.length === 0) return true;

  const target = normalizeRoleToken(moduleName);
  return allModuleNames.includes(target);
};

export const isAdminUser = (user: any): boolean => {
  if (!user || typeof user !== 'object') return false;
  if (Boolean(user?.isAdmHubOnly)) return true;

  const role = normalizeRoleToken(user?.role || user?.perfil || user?.profile || user?.type);
  if (role === 'admin' || role === 'administrator' || role === 'administrador') return true;

  const directDescription = normalizeRoleToken(
    user?.accessDescription
    || user?.access_description
    || user?.accessName
    || user?.access_name
    || user?.permission
    || user?.permissions,
  );
  if (directDescription.includes('admin') || directDescription.includes('administrador')) return true;

  const accesses = Array.isArray(user?.accesses)
    ? user.accesses
    : Array.isArray(user?.access)
      ? user.access
      : (user?.access ? [user.access] : []);

  const hasAdminAccess = accesses.some((access: any) => {
    const description = typeof access === 'string'
      ? normalizeRoleToken(access)
      : normalizeRoleToken(
        access?.description
        || access?.name
        || access?.label
        || access?.role
        || access?.type
        || access?.accessDescription
        || access?.access_name,
      );
    if (description.includes('admin')) return true;
    if (description.includes('administrador')) return true;
    return false;
  });

  if (hasAdminAccess) return true;

  const displayName = normalizeRoleToken(user?.name);
  return displayName === 'admin' || displayName === 'administrador';
};
