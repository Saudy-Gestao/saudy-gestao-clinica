import api from './api';

const companyService = {
  listCompanies: async () => {
    const response = await api.get('/auth/companies');
    return response.data;
  },

  getCompany: async (id: string) => {
    const response = await api.get(`/auth/companies/${id}`);
    return response.data;
  },

  updateCompany: async (id: string, data: any) => {
    const response = await api.put(`/auth/companies/${id}`, data);
    return response.data;
  },

  // register a new client (company + initial branch + admin user)
  // the frontend builds a payload that includes `admin`, `company` and
  // `branchesCount`.  The API expects a `/auth/register` body, so we
  // massage the structure here and forward the request.
  createCompany: async (data: any) => {
    const { admin, company, branchesCount } = data;
    // map frontend names to backend schema
    const body: any = {
      company: {
        cnpj: company.cnpj,
        legalName: company.razaoSocial,
        tradeName: company.nomeFantasia || company.razaoSocial,
        address: company.address || '',
        phone: company.phone || '',
      },
      branch: {
        tradeName: company.nomeFantasia || company.razaoSocial,
        address: company.address || '',
        phone: company.phone || '',
      },
      sector: {
        name: 'Admin',
        description: 'Setor administrativo',
      },
      user: {
        name: admin.name,
        birthDate: new Date().toISOString().split('T')[0], // placeholder
        email: admin.email,
        password: admin.password,
        phone: '',
        address: '',
      },
      accesses: [{ description: 'Administrador' }],
    };

    if (branchesCount !== undefined) {
      body.branchesCount = branchesCount; // some backends may use this
    }

    const response = await api.post('/auth/register', body);
    return response.data;
  },

  deleteCompany: async (id: string) => {
    const response = await api.delete(`/auth/companies/${id}`);
    return response.data;
  },
};

export default companyService;