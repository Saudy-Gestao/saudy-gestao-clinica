export interface CepLookupResult {
  street: string;
  neighborhood: string;
  city: string;
  state: string;
  complement?: string;
}

const onlyDigits = (value: string) => String(value || "").replace(/\D/g, "");

const parseViaCep = (data: any): CepLookupResult | null => {
  if (!data || data.erro) return null;
  return {
    street: String(data.logradouro || ""),
    neighborhood: String(data.bairro || ""),
    city: String(data.localidade || ""),
    state: String(data.uf || ""),
    complement: String(data.complemento || ""),
  };
};

const parseBrasilApi = (data: any): CepLookupResult | null => {
  if (!data) return null;
  return {
    street: String(data.street || ""),
    neighborhood: String(data.neighborhood || ""),
    city: String(data.city || ""),
    state: String(data.state || ""),
    complement: String(data.complement || ""),
  };
};

async function requestJson(url: string) {
  const response = await fetch(url, { method: "GET" });
  if (!response.ok) return null;
  return response.json();
}

export default {
  async lookup(cep: string): Promise<CepLookupResult | null> {
    const normalized = onlyDigits(cep);
    if (normalized.length !== 8) return null;

    const viaCep = await requestJson(`https://viacep.com.br/ws/${normalized}/json/`);
    const fromViaCep = parseViaCep(viaCep);
    if (fromViaCep) return fromViaCep;

    const brasilApi = await requestJson(`https://brasilapi.com.br/api/cep/v1/${normalized}`);
    return parseBrasilApi(brasilApi);
  },
};
