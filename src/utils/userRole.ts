export const isDoctorUser = (user: any): boolean => {
  if (!user || typeof user !== 'object') return false;

  const doctorId = String(user?.doctorId || user?.doctor?.id || '').trim();
  if (doctorId) return true;

  const sectorName = String(user?.sector?.name || '').trim().toLowerCase();
  return sectorName === 'medicos' || sectorName === 'médicos';
};

