import api from './api';

export interface MedicalEquipmentPayload {
  name: string;
  manufacturer?: string;
  model?: string;
  modality?: string;
  integrationType?: string;
  bridgeIdentifier?: string;
  aeTitle?: string;
  mwlRemoteAeTitle?: string;
  storeRemoteAeTitle?: string;
  stationName?: string;
  serialNumber?: string;
  patrimonyCode?: string;
  branchId?: string | null;
  roomId?: string | null;
  mwlHost?: string;
  mwlPort?: number | null;
  storeHost?: string;
  storePort?: number | null;
  dicomWebPath?: string;
  supportsWorklist?: boolean;
  supportsStore?: boolean;
  supportsPrint?: boolean;
  procedureIds?: string[];
  status?: string;
  observations?: string;
  isActive?: boolean;
}

export interface MedicalEquipmentItem extends MedicalEquipmentPayload {
  id: string;
  lastTestStatus?: string;
  lastTestMessage?: string;
  lastTestedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

const BASE_URL = '/procedures/medical-equipments';

const normalizeItem = (item: any): MedicalEquipmentItem | null => {
  const id = String(item?.id || item?.equipmentId || '');
  if (!id) return null;
  return {
    id,
    name: String(item?.name || item?.nome || 'Equipamento sem nome'),
    manufacturer: item?.manufacturer || item?.fabricante || '',
    model: item?.model || item?.modelo || '',
    modality: item?.modality || item?.modalidade || '',
    integrationType: item?.integrationType || item?.tipoIntegracao || 'MWL_BRIDGE',
    bridgeIdentifier: item?.bridgeIdentifier || item?.connectorId || item?.identificadorBridge || '',
    aeTitle: item?.aeTitle || item?.aetitle || item?.ae_title || '',
    mwlRemoteAeTitle: item?.mwlRemoteAeTitle || item?.remoteAeTitle || item?.calledAeTitle || '',
    storeRemoteAeTitle: item?.storeRemoteAeTitle || '',
    stationName: item?.stationName || item?.station || item?.nomeEstacao || '',
    serialNumber: item?.serialNumber || item?.serial || '',
    patrimonyCode: item?.patrimonyCode || item?.assetTag || item?.tombo || '',
    branchId: item?.branchId ? String(item.branchId) : null,
    roomId: item?.roomId ? String(item.roomId) : null,
    mwlHost: item?.mwlHost || item?.dicomHost || item?.host || '',
    mwlPort: Number.isFinite(Number(item?.mwlPort ?? item?.dicomPort)) ? Number(item?.mwlPort ?? item?.dicomPort) : null,
    storeHost: item?.storeHost || '',
    storePort: Number.isFinite(Number(item?.storePort)) ? Number(item.storePort) : null,
    dicomWebPath: item?.dicomWebPath || item?.dicomwebUrl || item?.dicomWebUrl || '',
    supportsWorklist: Boolean(item?.supportsWorklist),
    supportsStore: Boolean(item?.supportsStore ?? true),
    supportsPrint: Boolean(item?.supportsPrint),
    procedureIds: Array.isArray(item?.procedureIds)
      ? item.procedureIds.map((it: any) => String(it))
      : Array.isArray(item?.procedures)
        ? item.procedures.map((it: any) => String(it?.procedureId || it?.id || '')).filter(Boolean)
        : [],
    status: String(item?.status || 'Ativo'),
    observations: item?.observations || item?.observacao || '',
    lastTestStatus: item?.lastTestStatus || '',
    lastTestMessage: item?.lastTestMessage || '',
    lastTestedAt: item?.lastTestedAt || item?.last_tested_at || '',
    isActive: Boolean(item?.isActive ?? true),
    createdAt: item?.createdAt || item?.created_at,
    updatedAt: item?.updatedAt || item?.updated_at,
  };
};

const sortByName = (items: MedicalEquipmentItem[]) => {
  return [...items].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
};

export default {
  async list() {
    const res = await api.get(`${BASE_URL}/`);
    const source = Array.isArray(res.data)
      ? res.data
      : Array.isArray(res.data?.items)
        ? res.data.items
        : Array.isArray(res.data?.data?.items)
          ? res.data.data.items
          : Array.isArray(res.data?.data)
            ? res.data.data
            : [];
    const items = source.map(normalizeItem).filter(Boolean) as MedicalEquipmentItem[];
    return sortByName(items);
  },

  async getById(id: string) {
    const res = await api.get(`${BASE_URL}/${id}`);
    const item = normalizeItem(res.data);
    if (!item) throw new Error('Equipamento não encontrado');
    return item;
  },

  async create(payload: MedicalEquipmentPayload) {
    const res = await api.post(`${BASE_URL}/`, payload);
    const item = normalizeItem(res.data);
    if (!item) throw new Error('Resposta inválida ao criar equipamento');
    return item;
  },

  async update(id: string, payload: Partial<MedicalEquipmentPayload>) {
    const res = await api.put(`${BASE_URL}/${id}`, payload);
    const item = normalizeItem(res.data);
    if (!item) throw new Error('Resposta inválida ao atualizar equipamento');
    return item;
  },

  async testConnection(id: string) {
    const res = await api.post(`${BASE_URL}/${id}/test-connection`);
    return {
      ok: Boolean(res.data?.ok),
      status: String(res.data?.status || ''),
      message: String(res.data?.message || ''),
      equipment: normalizeItem(res.data?.equipment),
    };
  },
};
