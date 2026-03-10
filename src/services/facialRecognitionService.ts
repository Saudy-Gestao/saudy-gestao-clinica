import axios from 'axios';

// API de reconhecimento facial separada
const faceApi = axios.create({
  baseURL: import.meta.env.VITE_FACE_API_URL || 'http://localhost:8000',
});

// Interceptor para adicionar token de autenticação
faceApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export interface FacialScanRequest {
  image: string; // Base64 da imagem
  id_unidade: string;
}

export interface FacialScanResponse {
  responsavel: {
    id: string;
    nome: string;
    cpf: string;
    parentesco: string;
  };
  pacientes: Array<{
    id: string;
    id_medilab: string;
    nome?: string;
  }>;
  trust: string;
  log_registered?: boolean;
}

export interface FacialCreateRequest {
  image: string; // Base64 da imagem
  cpf: string;
  nome: string;
  parentesco: string;
  id_unidade: string;
  id_medilab?: string;
}

export interface FacialCreateResponse {
  id: string;
  nome: string;
  cpf: string;
  parentesco: string;
  id_unidade: string;
  id_medilab?: string;
  message: string;
}

const facialRecognitionService = {
  /**
   * Realiza o reconhecimento facial e retorna os dados do responsável e pacientes associados
   */
  async scanFace(request: FacialScanRequest): Promise<FacialScanResponse> {
    const response = await faceApi.post('/facial/scan', request);
    return response.data;
  },

  /**
   * Registra uma nova face no sistema (para cadastro de paciente)
   */
  async registerFace(request: FacialCreateRequest): Promise<FacialCreateResponse> {
    const response = await faceApi.post('/facial/scan/create', request);
    return response.data;
  },

  /**
   * Converte um arquivo de imagem para Base64
   */
  async imageToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  },

  /**
   * Captura imagem da webcam e converte para Base64
   */
  async captureFromWebcam(videoElement: HTMLVideoElement): Promise<string> {
    const canvas = document.createElement('canvas');
    canvas.width = videoElement.videoWidth;
    canvas.height = videoElement.videoHeight;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      throw new Error('Não foi possível obter o contexto do canvas');
    }
    
    ctx.drawImage(videoElement, 0, 0);
    return canvas.toDataURL('image/jpeg', 0.95);
  },

  /**
   * Inicia a captura de vídeo da webcam
   */
  async startWebcam(): Promise<MediaStream> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        }
      });
      return stream;
    } catch (error) {
      throw new Error('Não foi possível acessar a webcam. Verifique as permissões.');
    }
  },

  /**
   * Para a captura de vídeo da webcam
   */
  stopWebcam(stream: MediaStream) {
    stream.getTracks().forEach(track => track.stop());
  }
};

export default facialRecognitionService;
