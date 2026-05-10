import api from './api';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface KnowledgeSuggestion {
  id: string;
  question: string;
  answer: string;
  codeContext: string | null;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  reviewedAt: string | null;
}

const aiHelpService = {
  async *chat(
    messages: ChatMessage[],
    signal?: AbortSignal,
  ): AsyncGenerator<{ text?: string; error?: string; newSuggestion?: boolean; done?: boolean }> {
    const token = localStorage.getItem('token');

    const response = await fetch(`${api.defaults.baseURL}/care/help/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ messages }),
      signal,
    });

    if (!response.ok) {
      yield { error: 'Erro ao conectar com o assistente.' };
      return;
    }

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const raw = line.slice(6).trim();
        if (raw === '[DONE]') { yield { done: true }; return; }
        try {
          yield JSON.parse(raw);
        } catch {}
      }
    }
  },

  async getSuggestions(status?: string): Promise<KnowledgeSuggestion[]> {
    const params = status ? { status } : {};
    const res = await api.get('/admin/knowledge-suggestions', { params });
    return res.data;
  },

  async updateSuggestion(id: string, status: string, answer?: string): Promise<KnowledgeSuggestion> {
    const res = await api.patch(`/admin/knowledge-suggestions/${id}`, { status, answer });
    return res.data;
  },

  async deleteSuggestion(id: string): Promise<void> {
    await api.delete(`/admin/knowledge-suggestions/${id}`);
  },

  async reindex(): Promise<{ repos: number; files: number; chunks: number }> {
    const res = await api.post('/care/help/reindex');
    return res.data;
  },
};

export default aiHelpService;
