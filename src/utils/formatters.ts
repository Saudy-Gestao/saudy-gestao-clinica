export const onlyDigits = (s: string) => (s || '').toString().replace(/\D/g, '');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const normalizeEmail = (s: string) => (s || '').toString().trim().toLowerCase();

export const isValidEmail = (s: string) => {
  const email = normalizeEmail(s);
  if (!email) return false;
  return EMAIL_REGEX.test(email);
};

export const isValidCPF = (s: string) => {
  const cpf = onlyDigits(s);
  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false;

  const calcDigit = (base: string, factorStart: number) => {
    let total = 0;
    for (let i = 0; i < base.length; i += 1) {
      total += Number(base[i]) * (factorStart - i);
    }
    const mod = total % 11;
    return mod < 2 ? 0 : 11 - mod;
  };

  const firstDigit = calcDigit(cpf.slice(0, 9), 10);
  const secondDigit = calcDigit(cpf.slice(0, 10), 11);
  return firstDigit === Number(cpf[9]) && secondDigit === Number(cpf[10]);
};

export const formatCPF = (s: string) => {
  const v = onlyDigits(s).slice(0, 11);
  if (!v) return '';
  if (v.length <= 3) return v;
  if (v.length <= 6) return v.replace(/(\d{3})(\d+)/, '$1.$2');
  if (v.length <= 9) return v.replace(/(\d{3})(\d{3})(\d+)/, '$1.$2.$3');
  return v.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
};

export const formatCNPJ = (s: string) => {
  const v = onlyDigits(s).slice(0, 14);
  if (!v) return '';
  if (v.length <= 2) return v;
  if (v.length <= 5) return v.replace(/(\d{2})(\d+)/, '$1.$2');
  if (v.length <= 8) return v.replace(/(\d{2})(\d{3})(\d+)/, '$1.$2.$3');
  if (v.length <= 12) return v.replace(/(\d{2})(\d{3})(\d{3})(\d+)/, '$1.$2.$3/$4');
  return v.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
};

export const formatCEP = (s: string) => {
  const v = onlyDigits(s).slice(0, 8);
  if (!v) return '';
  if (v.length <= 5) return v;
  return v.replace(/(\d{5})(\d{1,3})/, '$1-$2');
};

export const formatPhone = (s: string) => {
  const v = onlyDigits(s).slice(0, 11);
  if (!v) return '';
  if (v.length <= 2) return `(${v}`;
  const ddd = v.slice(0, 2);
  const rest = v.slice(2);
  if (rest.length <= 4) return `(${ddd}) ${rest}`;
  if (rest.length <= 7) return `(${ddd}) ${rest.slice(0, 4)}-${rest.slice(4)}`;
  // 9-digit local (mobile): 5 + 4
  return `(${ddd}) ${rest.slice(0, 5)}-${rest.slice(5)}`;
};

export const formatDateInput = (s: string) => {
  const v = onlyDigits(s).slice(0, 8);
  if (!v) return '';
  if (v.length <= 2) return v;
  if (v.length <= 4) return `${v.slice(0,2)}/${v.slice(2)}`;
  return `${v.slice(0,2)}/${v.slice(2,4)}/${v.slice(4)}`;
};

// Parses API date values into local dates without UTC day shifting.
export const parseApiDateToLocalDate = (value?: string | null): Date | null => {
  if (!value) return null;

  const dateOnlyMatch = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (dateOnlyMatch) {
    const [, year, month, day] = dateOnlyMatch;
    return new Date(Number(year), Number(month) - 1, Number(day), 12, 0, 0, 0);
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate(), 12, 0, 0, 0);
};
