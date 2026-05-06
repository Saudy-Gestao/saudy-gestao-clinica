import api from './api';

export interface AiQuestion {
  id: number;
  question: string;
  options?: string[];
}

export interface AiQuestionnaire {
  id?: string;
  appointmentId: string;
  patientComplaints?: string | null;
  questions: AiQuestion[];
  answers?: Record<string, string> | null;
  generatedAt?: string;
  savedAt?: string | null;
}

const aiQuestionnaireService = {
  async generate(appointmentId: string): Promise<{ questions: AiQuestion[]; answers?: Record<string, string> | null; patientComplaints?: string; alreadyGenerated?: boolean }> {
    const response = await api.post('/care/ai-questionnaire/generate', { appointmentId });
    return response.data;
  },

  async get(appointmentId: string): Promise<AiQuestionnaire> {
    const response = await api.get(`/care/ai-questionnaire/${appointmentId}`);
    return response.data;
  },

  async saveAnswers(appointmentId: string, answers: Record<string, string>): Promise<{ message: string; savedAt: string }> {
    const response = await api.post('/care/ai-questionnaire/save-answers', { appointmentId, answers });
    return response.data;
  },
};

export default aiQuestionnaireService;
