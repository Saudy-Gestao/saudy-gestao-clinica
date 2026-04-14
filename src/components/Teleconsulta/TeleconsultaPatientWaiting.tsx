import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { useLocalStorage } from '@mantine/hooks';
import { ActionIcon, Box, Button, Group, Text, Textarea } from '@mantine/core';
import { Camera, Cast, Download, Expand, LampDesk, MessageCircle, Mic, MicOff, Paperclip, PhoneOff, Send, SignalHigh } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { showNotification } from '@mantine/notifications';
import { Header } from '../Header/Header';
import teleconsultationLinkService, { type TeleconsultationPublicTokenMeta } from '../../services/teleconsultationLinkService';
import consultationService from '../../services/consultationService';
import styles from './TeleconsultaPatientWaiting.module.css';

const DOCTOR = {
  name: 'Dra. Maria Santos',
  specialty: 'Clínico Geral',
};

const parseScheduledTime = (value: string) => {
  const [hour, minute] = String(value || '').split(':').map((it) => Number(it));
  const date = new Date();
  date.setHours(Number.isFinite(hour) ? hour : 14, Number.isFinite(minute) ? minute : 30, 0, 0);
  return date;
};

const formatClock = (seconds: number, overdue = false) => {
  const safe = Math.max(0, Math.abs(seconds));
  const minutes = String(Math.floor(safe / 60)).padStart(2, '0');
  const secs = String(Math.floor(safe % 60)).padStart(2, '0');
  return overdue ? `+${minutes}:${secs}` : `${minutes}:${secs}`;
};

const RTC_CONFIGURATION: RTCConfiguration = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
};
const PREPARED_SESSION_KEY_PREFIX = 'teleconsulta:prepared:';
const CLINICAL_QUEUE_TYPE = 'Fila clínica';
const IN_PROGRESS_STATUS = 'Em atendimento';
const DONE_STATUS = 'Atendimento concluído';
const MAX_CHAT_FILE_BYTES = 2 * 1024 * 1024;

const normalizeCollection = (data: any) => (
  Array.isArray(data)
    ? data
    : (Array.isArray(data?.items)
      ? data.items
      : (Array.isArray(data?.data) ? data.data : []))
);

export function TeleconsultaPatientWaiting() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [colorScheme] = useLocalStorage<'light' | 'dark'>({
    key: 'mantine-color-scheme',
    defaultValue: 'light',
  });
  const [now, setNow] = useState<Date>(() => new Date());
  const [doctorJoined, setDoctorJoined] = useState(false);
  const [doctorInConsultation, setDoctorInConsultation] = useState(false);
  const [patientJoined, setPatientJoined] = useState(false);
  const [tokenMeta, setTokenMeta] = useState<TeleconsultationPublicTokenMeta | null>(null);
  const [inCall, setInCall] = useState(false);
  const [remoteConnected, setRemoteConnected] = useState(false);
  const [signalingReady, setSignalingReady] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<Array<{
    id: string;
    fromRole: string;
    kind: 'text' | 'file';
    text?: string;
    fileName?: string;
    fileMimeType?: string;
    fileDataUrl?: string;
    fileSizeBytes?: number;
    createdAt: string;
  }>>([]);
  const [sendingChat, setSendingChat] = useState(false);
  const [callStartedAt, setCallStartedAt] = useState<number | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [recordTab, setRecordTab] = useState<'record' | 'patient'>('record');
  const [recordSubTab, setRecordSubTab] = useState<'prescription' | 'notes'>('prescription');
  const [soapData, setSoapData] = useState({
    subjective: '',
    objective: '',
    assessment: '',
    cid10: '',
    treatmentPlan: '',
    prescription: '',
    notes: '',
  });
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const doctorMainVideoRef = useRef<HTMLDivElement | null>(null);
  const doctorAttachmentInputRef = useRef<HTMLInputElement | null>(null);
  const chatBodyRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const pollingRef = useRef<number | null>(null);
  const lastEventIdRef = useRef<number>(0);
  const enteringCallRef = useRef(false);
  const pendingOfferRef = useRef<any | null>(null);
  const pendingIceCandidatesRef = useRef<any[]>([]);
  const consultationIdRef = useRef<string | null>(null);
  const isDark = colorScheme === 'dark';
  const token = params.get('token') || '';
  const clearPreparedSession = () => {
    if (!token) return;
    sessionStorage.removeItem(`${PREPARED_SESSION_KEY_PREFIX}${token}`);
  };
  const redirectPatientToFinished = () => {
    clearPreparedSession();
    navigate('/teleconsulta/finalizada', { replace: true });
  };
  const appendChatMessage = (message: {
    id: string;
    fromRole: string;
    kind: 'text' | 'file';
    text?: string;
    fileName?: string;
    fileMimeType?: string;
    fileDataUrl?: string;
    fileSizeBytes?: number;
    createdAt: string;
  }) => {
    setChatMessages((prev) => {
      const alreadyExists = prev.some((item) =>
        item.createdAt === message.createdAt
        && item.fromRole === message.fromRole
        && item.kind === message.kind
        && (item.text || '') === (message.text || '')
        && (item.fileName || '') === (message.fileName || ''),
      );
      if (alreadyExists) return prev;
      return [...prev, message];
    });
  };

  useEffect(() => {
    if (!token) {
      setTokenMeta(null);
      return;
    }

    let active = true;
    teleconsultationLinkService.resolvePublicToken(token)
      .then((data) => {
        if (!active) return;
        setTokenMeta(data);
        void teleconsultationLinkService.listPublicMessages(token, 200)
          .then((history) => {
            if (!active) return;
            setChatMessages((history.items || []).map((item) => ({
              id: String(item.id),
              fromRole: String(item.fromRole || ''),
              kind: item.kind === 'file' ? 'file' : 'text',
              text: item.text || undefined,
              fileName: item.fileName || undefined,
              fileMimeType: item.fileMimeType || undefined,
              fileDataUrl: item.fileDataUrl || undefined,
              fileSizeBytes: typeof item.fileSizeBytes === 'number' ? item.fileSizeBytes : undefined,
              createdAt: String(item.createdAt || new Date().toISOString()),
            })));
          })
          .catch(() => undefined);
      })
      .catch((error: any) => {
        if (!active) return;
        setTokenMeta(null);
        showNotification({
          title: 'Link inválido',
          message: error?.response?.data?.error || error?.response?.data?.message || 'Não foi possível validar o link da teleconsulta.',
          color: 'red',
        });
      });

    return () => {
      active = false;
    };
  }, [token]);

  const scheduledLabel = tokenMeta?.appointment?.time || params.get('scheduled') || '14:30';
  const tokenRole = String(tokenMeta?.role || '').toUpperCase();
  const isDoctorRole = tokenRole === 'DOCTOR';
  const counterpartRole = isDoctorRole ? 'PATIENT' : 'DOCTOR';
  const doctorName = tokenMeta?.appointment?.doctorName || DOCTOR.name;
  const doctorSpecialty = tokenMeta?.appointment?.specialty || DOCTOR.specialty;
  const patientName = tokenMeta?.appointment?.patientName || 'Paciente não informado';
  const topCardLabel = isDoctorRole ? 'Paciente' : 'Médico Responsável';
  const topCardName = isDoctorRole ? patientName : doctorName;
  const topCardDetail = isDoctorRole ? 'Paciente da teleconsulta' : doctorSpecialty;
  const allowJoinFromMinutesBefore = tokenMeta?.window?.allowJoinFromMinutesBefore ?? 10;
  const fromPreparation = params.get('fromPrep') === '1';
  const hasPreparedSession = token ? sessionStorage.getItem(`${PREPARED_SESSION_KEY_PREFIX}${token}`) === '1' : false;
  const scheduledAt = useMemo(() => parseScheduledTime(scheduledLabel), [scheduledLabel]);

  useEffect(() => {
    if (!token || !isDoctorRole) return;
    if (fromPreparation || hasPreparedSession) return;
    navigate(`/teleconsulta/preparacao?token=${encodeURIComponent(token)}`, { replace: true });
  }, [fromPreparation, hasPreparedSession, isDoctorRole, navigate, token]);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const onDoctorJoined = () => setDoctorJoined(true);
    window.addEventListener('teleconsulta:doctor-joined', onDoctorJoined);
    return () => window.removeEventListener('teleconsulta:doctor-joined', onDoctorJoined);
  }, []);

  const stopMediaAndPeer = (signalType?: 'hangup' | 'patient-left') => {
    if (signalType && token) {
      void teleconsultationLinkService.sendPublicSignal(token, { type: signalType, toRole: 'ALL' }).catch(() => undefined);
    }

    if (peerRef.current) {
      peerRef.current.ontrack = null;
      peerRef.current.onicecandidate = null;
      peerRef.current.close();
      peerRef.current = null;
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
    remoteStreamRef.current = null;
    pendingOfferRef.current = null;
    pendingIceCandidatesRef.current = [];

    setRemoteConnected(false);
    enteringCallRef.current = false;
    setCallStartedAt(null);
  };

  const resetPeerForReconnect = () => {
    if (peerRef.current) {
      peerRef.current.ontrack = null;
      peerRef.current.onicecandidate = null;
      peerRef.current.close();
      peerRef.current = null;
    }

    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
    remoteStreamRef.current = null;
    pendingOfferRef.current = null;
    pendingIceCandidatesRef.current = [];
    setRemoteConnected(false);
  };

  const resolveConsultationIdByAppointment = async () => {
    if (consultationIdRef.current) return consultationIdRef.current;
    const appointmentId = String(tokenMeta?.appointment?.id || '').trim();
    if (!appointmentId) return null;

    const data = await consultationService.list({
      queueType: CLINICAL_QUEUE_TYPE,
      limit: 200,
    });
    const rows = normalizeCollection(data);
    const matched = rows.find((row: any) => {
      const candidate = String(row?.appointmentId || row?.appointment_id || row?.appointment?.id || '').trim();
      return candidate === appointmentId;
    });
    const resolvedId = matched?.id ? String(matched.id) : null;
    consultationIdRef.current = resolvedId;
    return resolvedId;
  };

  const updateConsultationQueue = async (targetStatus: string) => {
    if (!isDoctorRole) return;
    const consultationId = await resolveConsultationIdByAppointment();
    if (!consultationId) return;
    await consultationService.update(consultationId, {
      queue: targetStatus,
      queueType: CLINICAL_QUEUE_TYPE,
    });
  };

  const ensurePeerConnection = async () => {
    if (peerRef.current) return peerRef.current;

    const stream = localStreamRef.current || await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: { echoCancellation: true, noiseSuppression: true },
    });
    localStreamRef.current = stream;

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
      await localVideoRef.current.play().catch(() => undefined);
    }

    const peer = new RTCPeerConnection(RTC_CONFIGURATION);
    stream.getTracks().forEach((track) => peer.addTrack(track, stream));

    peer.ontrack = (event) => {
      const [remoteStream] = event.streams;
      if (remoteStream) {
        remoteStreamRef.current = remoteStream;
      }
      if (remoteVideoRef.current && remoteStream) {
        remoteVideoRef.current.srcObject = remoteStream;
        void remoteVideoRef.current.play().catch(() => undefined);
      }
      setRemoteConnected(true);
    };

    peer.onicecandidate = (event) => {
      if (!event.candidate || !token) return;
      void teleconsultationLinkService.sendPublicSignal(token, {
        type: 'ice',
        toRole: counterpartRole as 'PATIENT' | 'DOCTOR',
        payload: event.candidate.toJSON(),
      }).catch(() => undefined);
    };

    peerRef.current = peer;
    return peer;
  };

  const acceptPendingOfferIfAny = async () => {
    if (!pendingOfferRef.current) return;
    const peer = await ensurePeerConnection();
    const offer = pendingOfferRef.current;
    pendingOfferRef.current = null;

    await peer.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await peer.createAnswer();
    await peer.setLocalDescription(answer);
    await teleconsultationLinkService.sendPublicSignal(token, {
      type: 'answer',
      toRole: 'DOCTOR',
      payload: answer,
    });

    for (const candidatePayload of pendingIceCandidatesRef.current) {
      try {
        await peer.addIceCandidate(new RTCIceCandidate(candidatePayload));
      } catch {
        // Ignora candidato inválido.
      }
    }
    pendingIceCandidatesRef.current = [];
  };

  const enterConsultation = async () => {
    if (!token || enteringCallRef.current) return;
    enteringCallRef.current = true;

    try {
      if (isDoctorRole) {
        await updateConsultationQueue(IN_PROGRESS_STATUS);
      }

      setCallStartedAt(Date.now());
      setInCall(true);
      const peer = await ensurePeerConnection();

      if (isDoctorRole) {
        setDoctorInConsultation(true);
        const offer = await peer.createOffer();
        await peer.setLocalDescription(offer);
        await teleconsultationLinkService.sendPublicSignal(token, {
          type: 'offer',
          toRole: 'PATIENT',
          payload: offer,
        });
      } else {
        await acceptPendingOfferIfAny();
        await teleconsultationLinkService.sendPublicSignal(token, {
          type: 'ready',
          toRole: 'DOCTOR',
          payload: { ts: Date.now() },
        });
      }
    } catch (error: any) {
      setInCall(false);
      setCallStartedAt(null);
      stopMediaAndPeer();
      showNotification({
        title: 'Falha ao iniciar chamada',
        message: error?.message || 'Não foi possível iniciar a teleconsulta.',
        color: 'red',
      });
    } finally {
      enteringCallRef.current = false;
    }
  };

  const finalizeDoctorConsultation = async () => {
    if (!isDoctorRole) return;
    try {
      try {
        await updateConsultationQueue(DONE_STATUS);
      } catch {
        await updateConsultationQueue(IN_PROGRESS_STATUS);
        await updateConsultationQueue(DONE_STATUS);
      }
      clearPreparedSession();
      navigate('/consulta', { replace: true });
    } catch (error: any) {
      showNotification({
        title: 'Falha ao finalizar atendimento',
        message: error?.response?.data?.message || error?.response?.data?.error || 'Não foi possível concluir a consulta na fila clínica.',
        color: 'red',
      });
    }
  };

  const handleSignalEvent = async (event: { id?: number; type: string; payload?: any; fromRole?: string; createdAt?: string }) => {
    const type = String(event?.type || '').toLowerCase();
    const fromRole = String(event?.fromRole || '').toUpperCase();

    if (type === 'doctor-joined' && !isDoctorRole) {
      setDoctorJoined(true);
      return;
    }

    if (type === 'chat-message') {
      const text = String(event?.payload?.text || '').trim();
      if (!text) return;
      appendChatMessage({
        id: `signal-${String(event?.id || Date.now())}`,
        fromRole: fromRole || 'UNKNOWN',
        kind: 'text',
        text,
        fileName: undefined,
        fileMimeType: undefined,
        fileDataUrl: undefined,
        fileSizeBytes: undefined,
        createdAt: String(event?.payload?.createdAt || event?.createdAt || new Date().toISOString()),
      });
      return;
    }

    if (type === 'chat-file') {
      const fileName = String(event?.payload?.fileName || '').trim();
      const fileDataUrl = String(event?.payload?.fileDataUrl || '').trim();
      if (!fileName || !fileDataUrl) return;
      appendChatMessage({
        id: `signal-${String(event?.id || Date.now())}`,
        fromRole: fromRole || 'UNKNOWN',
        kind: 'file',
        text: undefined,
        fileName,
        fileMimeType: String(event?.payload?.fileMimeType || 'application/octet-stream'),
        fileDataUrl,
        fileSizeBytes: Number(event?.payload?.fileSizeBytes || 0),
        createdAt: String(event?.payload?.createdAt || event?.createdAt || new Date().toISOString()),
      });
      return;
    }

    if (type === 'ready' && isDoctorRole) {
      setPatientJoined(true);
      if (inCall) {
        const peer = await ensurePeerConnection();
        const offer = await peer.createOffer();
        await peer.setLocalDescription(offer);
        await teleconsultationLinkService.sendPublicSignal(token, {
          type: 'offer',
          toRole: 'PATIENT',
          payload: offer,
        });
      }
      return;
    }

    if (type === 'offer') {
      setDoctorInConsultation(true);

      if (!isDoctorRole && !inCall) {
        pendingOfferRef.current = event.payload;
        return;
      }

      const peer = await ensurePeerConnection();
      await peer.setRemoteDescription(new RTCSessionDescription(event.payload));
      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);
      await teleconsultationLinkService.sendPublicSignal(token, {
        type: 'answer',
        toRole: 'DOCTOR',
        payload: answer,
      });
      return;
    }

    if (type === 'answer' && peerRef.current) {
      await peerRef.current.setRemoteDescription(new RTCSessionDescription(event.payload));
      return;
    }

    if (type === 'ice' && peerRef.current && event.payload) {
      try {
        await peerRef.current.addIceCandidate(new RTCIceCandidate(event.payload));
      } catch {
        // Ignora candidatos inválidos enquanto a chamada estabiliza.
      }
      return;
    }

    if (type === 'ice' && event.payload) {
      pendingIceCandidatesRef.current.push(event.payload);
      return;
    }

    if (type === 'patient-left') {
      if (isDoctorRole) {
        resetPeerForReconnect();
        setRemoteConnected(false);
        showNotification({
          title: 'Paciente saiu da chamada',
          message: 'Aguardando retorno do paciente ou finalize a teleconsulta.',
          color: 'yellow',
        });
      }
      return;
    }

    if (type === 'hangup') {
      stopMediaAndPeer();
      setInCall(false);
      if (isDoctorRole) {
        clearPreparedSession();
        navigate('/consulta', { replace: true });
        return;
      }
      redirectPatientToFinished();
    }
  };

  const pollSignals = async () => {
    if (!token) return;
    try {
      const response = await teleconsultationLinkService.pullPublicSignals(token, lastEventIdRef.current, 50);
      if (typeof response?.lastEventId === 'number') {
        lastEventIdRef.current = Math.max(lastEventIdRef.current, response.lastEventId);
      }
      for (const event of response?.events || []) {
        await handleSignalEvent(event);
      }
      setSignalingReady(true);
    } catch {
      // Mantém polling silencioso.
    }
  };

  useEffect(() => {
    if (!token) return;

    void pollSignals();
    pollingRef.current = window.setInterval(() => {
      void pollSignals();
    }, 1200);

    return () => {
      if (pollingRef.current) {
        window.clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, inCall, isDoctorRole]);

  useEffect(() => {
    if (!token || !isDoctorRole) return;
    void teleconsultationLinkService.sendPublicSignal(token, {
      type: 'doctor-joined',
      toRole: 'PATIENT',
      payload: { ts: Date.now() },
    }).catch(() => undefined);
  }, [isDoctorRole, token]);

  useEffect(() => {
    if (!inCall) return;
    if (localVideoRef.current && localStreamRef.current) {
      localVideoRef.current.srcObject = localStreamRef.current;
      void localVideoRef.current.play().catch(() => undefined);
    }
    if (remoteVideoRef.current && remoteStreamRef.current) {
      remoteVideoRef.current.srcObject = remoteStreamRef.current;
      void remoteVideoRef.current.play().catch(() => undefined);
    }
  }, [inCall]);

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', onFullscreenChange);
    };
  }, []);

  useEffect(() => {
    return () => {
      stopMediaAndPeer();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!chatBodyRef.current) return;
    chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
  }, [chatMessages]);

  const diffSeconds = useMemo(
    () => Math.floor((scheduledAt.getTime() - now.getTime()) / 1000),
    [now, scheduledAt],
  );

  const withinWindow = diffSeconds <= allowJoinFromMinutesBefore * 60;
  const isOverdue = diffSeconds < 0;

  const counterpartReady = isDoctorRole ? patientJoined : doctorJoined;

  const status = useMemo(() => {
    if (!isDoctorRole && doctorInConsultation) {
      return { label: 'Médico na consulta', color: '#58d82e' };
    }

    if (counterpartReady) {
      return { label: 'Tudo pronto!', color: '#58d82e' };
    }

    if (isOverdue) {
      return { label: 'Aguardando médico (atraso)', color: '#ff4c4c' };
    }

    if (diffSeconds <= 5 * 60) {
      return { label: 'Quase pronto', color: '#f7a623' };
    }

    return { label: 'Em preparação', color: '#7b90ff' };
  }, [counterpartReady, diffSeconds, doctorInConsultation, isDoctorRole, isOverdue]);

  const ringProgress = useMemo(() => {
    if (!isDoctorRole && doctorInConsultation) return 1;
    if (counterpartReady) return 1;
    if (isOverdue) return Math.min(Math.abs(diffSeconds) / 600, 1);
    return Math.max(0, Math.min(1, (600 - Math.max(diffSeconds, 0)) / 600));
  }, [counterpartReady, diffSeconds, doctorInConsultation, isDoctorRole, isOverdue]);

  const ringColor = (!isDoctorRole && doctorInConsultation) ? '#58d82e' : counterpartReady ? '#58d82e' : isOverdue ? '#ff4c4c' : status.color;
  const timeText = (!isDoctorRole && doctorInConsultation) ? 'PRONTO' : counterpartReady ? 'PRONTO' : formatClock(diffSeconds, isOverdue);
  const canJoinConsultation = isDoctorRole || (doctorInConsultation && withinWindow);
  const chatCounterpartName = isDoctorRole ? patientName : doctorName;
  const doctorInCallMode = inCall && isDoctorRole;
  const recordFieldStyles = {
    input: {
      border: 'none',
      borderBottom: `1px solid ${isDark ? 'rgba(187, 196, 212, 0.45)' : '#2b2f36'}`,
      borderRadius: 0,
      paddingLeft: 0,
      paddingRight: 0,
      background: 'transparent',
      color: 'inherit',
      fontSize: '15px',
      minHeight: 34,
    },
    label: {
      fontSize: '13px',
      fontWeight: 600,
      marginBottom: 2,
      color: isDark ? '#d3ddf2' : '#21252c',
    },
  } as const;
  const callElapsed = useMemo(() => {
    if (!inCall || !callStartedAt) return '00:00';
    const seconds = Math.max(0, Math.floor((Date.now() - callStartedAt) / 1000));
    return formatClock(seconds, false);
  }, [callStartedAt, inCall, now]);

  const formatChatTime = (iso: string) => {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return '';
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  };

  const sendChatMessage = async () => {
    const text = chatInput.trim();
    if (!token || !text || sendingChat) return;

    const nowIso = new Date().toISOString();
    setSendingChat(true);
    try {
      await teleconsultationLinkService.sendPublicSignal(token, {
        type: 'chat-message',
        toRole: 'ALL',
        payload: { text, createdAt: nowIso },
      });
      appendChatMessage({
        id: `local-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        fromRole: tokenRole || (isDoctorRole ? 'DOCTOR' : 'PATIENT'),
        kind: 'text',
        text,
        fileName: undefined,
        fileMimeType: undefined,
        fileDataUrl: undefined,
        fileSizeBytes: undefined,
        createdAt: nowIso,
      });
      setChatInput('');
    } catch {
      showNotification({
        title: 'Falha ao enviar mensagem',
        message: 'Não foi possível enviar no chat agora.',
        color: 'red',
      });
    } finally {
      setSendingChat(false);
    }
  };

  const renderFilePreview = (message: {
    fileDataUrl?: string;
    fileMimeType?: string;
    fileName?: string;
  }) => {
    const fileUrl = String(message.fileDataUrl || '');
    const mime = String(message.fileMimeType || '').toLowerCase();
    if (!fileUrl) return null;

    if (mime.startsWith('image/')) {
      return (
        <img
          src={fileUrl}
          alt={message.fileName || 'Imagem enviada no chat'}
          className={styles.chatFilePreviewImage}
        />
      );
    }

    if (mime === 'application/pdf') {
      return (
        <iframe
          title={message.fileName || 'PDF enviado no chat'}
          src={fileUrl}
          className={styles.chatFilePreviewPdf}
        />
      );
    }

    return null;
  };

  const handlePickFileClick = () => {
    fileInputRef.current?.click();
  };

  const toggleDoctorFullscreen = async () => {
    const element = doctorMainVideoRef.current;
    if (!element) return;
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await element.requestFullscreen();
      }
    } catch {
      // Ignora erro de fullscreen.
    }
  };

  const handleSaveDoctorRecord = () => {
    showNotification({
      title: 'Prontuário salvo',
      message: 'Rascunho salvo localmente para esta sessão de teleconsulta.',
      color: 'green',
    });
  };

  const handleAttachDoctorDocument = () => {
    doctorAttachmentInputRef.current?.click();
  };

  const handleDoctorAttachmentSelected = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    if (!file) return;
    showNotification({
      title: 'Documento anexado',
      message: `${file.name} adicionado ao prontuário da sessão.`,
      color: 'green',
    });
  };

  const handleFileSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    if (!file || !token) return;

    if (file.size > MAX_CHAT_FILE_BYTES) {
      showNotification({
        title: 'Arquivo muito grande',
        message: 'Limite de 2MB por arquivo no chat de pré-consulta.',
        color: 'red',
      });
      return;
    }

    setSendingChat(true);
    try {
      const nowIso = new Date().toISOString();
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(new Error('Falha ao ler arquivo'));
        reader.readAsDataURL(file);
      });

      await teleconsultationLinkService.sendPublicSignal(token, {
        type: 'chat-file',
        toRole: 'ALL',
        payload: {
          fileName: file.name,
          fileMimeType: file.type || 'application/octet-stream',
          fileSizeBytes: file.size,
          fileDataUrl: dataUrl,
          createdAt: nowIso,
        },
      });
      appendChatMessage({
        id: `local-file-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        fromRole: tokenRole || (isDoctorRole ? 'DOCTOR' : 'PATIENT'),
        kind: 'file',
        text: undefined,
        fileName: file.name,
        fileMimeType: file.type || 'application/octet-stream',
        fileDataUrl: dataUrl,
        fileSizeBytes: file.size,
        createdAt: nowIso,
      });
    } catch {
      showNotification({
        title: 'Falha ao enviar arquivo',
        message: 'Não foi possível enviar o arquivo no chat.',
        color: 'red',
      });
    } finally {
      setSendingChat(false);
    }
  };

  return (
    <Box bg={doctorInCallMode ? '#efefef' : 'var(--mantine-color-body)'} style={{ minHeight: '100vh' }}>
      {!doctorInCallMode ? <Header /> : null}
      <Box className={`${styles.page} ${doctorInCallMode ? styles.pageConsultation : (isDark ? styles.pageDark : styles.pageLight)}`}>
        <Box className={styles.wrapper}>
          {!doctorInCallMode ? <Text className={styles.title}>Teleconsulta</Text> : null}

          {!doctorInCallMode ? (
          <Box className={`${styles.topCard} ${isDark ? styles.surfaceDark : styles.surfaceLight}`}>
            <Box className={styles.topLeft}>
              <Box className={styles.avatar}>MS</Box>
              <div>
                <p className={styles.metaLabel}>{topCardLabel}</p>
                <p className={styles.metaName}>{topCardName}</p>
                <p className={styles.metaDetail}>{topCardDetail}</p>
              </div>
            </Box>

            <Box className={styles.schedule}>
              <p className={styles.scheduleLabel}>Horário Agendado</p>
              <p className={styles.scheduleTime}>{scheduledLabel}</p>
            </Box>
          </Box>
          ) : null}

          {inCall ? (
            isDoctorRole ? (
              <Box className={styles.consultationShell}>
                <Box ref={doctorMainVideoRef} className={styles.consultationVideoPanel}>
                  <Box className={styles.consultationTimerPill}>{callElapsed}</Box>
                  <ActionIcon
                    size="lg"
                    radius="md"
                    className={styles.consultationFullscreenBtn}
                    onClick={() => { void toggleDoctorFullscreen(); }}
                    aria-label={isFullscreen ? 'Sair da tela cheia' : 'Entrar em tela cheia'}
                  >
                    <Expand size={18} />
                  </ActionIcon>

                  <video ref={remoteVideoRef} autoPlay playsInline className={styles.consultationRemoteVideo} />
                  {!remoteConnected ? (
                    <Box className={styles.consultationRemoteOverlay}>
                      <Text size="sm">Aguardando vídeo do paciente...</Text>
                    </Box>
                  ) : null}

                  <Box className={styles.consultationControls}>
                    <ActionIcon className={styles.consultationControlBtn} radius="md" size="xl" aria-label="Microfone">
                      <Mic size={20} />
                    </ActionIcon>
                    <ActionIcon className={styles.consultationControlBtn} radius="md" size="xl" aria-label="Câmera">
                      <Camera size={20} />
                    </ActionIcon>
                    <ActionIcon className={styles.consultationControlBtn} radius="md" size="xl" aria-label="Compartilhar tela">
                      <Cast size={20} />
                    </ActionIcon>
                    <ActionIcon className={styles.consultationControlBtn} radius="md" size="xl" aria-label="Chat">
                      <MessageCircle size={20} />
                    </ActionIcon>
                    <ActionIcon
                      className={styles.consultationControlBtnDanger}
                      radius="md"
                      size="xl"
                      aria-label="Encerrar chamada"
                      onClick={() => {
                        stopMediaAndPeer('hangup');
                        setInCall(false);
                        setCallStartedAt(null);
                        void finalizeDoctorConsultation();
                      }}
                    >
                      <MicOff size={20} />
                    </ActionIcon>
                  </Box>

                  <Box className={styles.consultationLocalPreview}>
                    <video ref={localVideoRef} muted autoPlay playsInline className={styles.consultationLocalVideo} />
                  </Box>
                </Box>

                <Box className={`${styles.consultationRecordPanel} ${isDark ? styles.surfaceDark : styles.surfaceLight}`}>
                  <Box className={styles.consultationRecordTabs}>
                    <button
                      type="button"
                      className={`${styles.consultationRecordTabBtn} ${recordTab === 'record' ? styles.consultationRecordTabBtnActive : ''}`}
                      onClick={() => setRecordTab('record')}
                    >
                      Prontuário
                    </button>
                    <button
                      type="button"
                      className={`${styles.consultationRecordTabBtn} ${recordTab === 'patient' ? styles.consultationRecordTabBtnActive : ''}`}
                      onClick={() => setRecordTab('patient')}
                    >
                      Paciente
                    </button>
                  </Box>

                  {recordTab === 'record' ? (
                    <Box className={styles.consultationRecordBody}>
                      <Group justify="space-between" align="center" mb="sm">
                        <Text fw={800} size="xl">Prontuário</Text>
                        <Button
                          size="sm"
                          leftSection={<Download size={14} />}
                          onClick={handleSaveDoctorRecord}
                          style={{ background: '#0a2a67', color: '#fff' }}
                        >
                          Salvar
                        </Button>
                      </Group>

                      <Box className={styles.consultationSubTabs}>
                        <button
                          type="button"
                          className={`${styles.consultationSubTabBtn} ${recordSubTab === 'prescription' ? styles.consultationSubTabBtnActive : ''}`}
                          onClick={() => setRecordSubTab('prescription')}
                        >
                          Prescrição
                        </button>
                        <button
                          type="button"
                          className={`${styles.consultationSubTabBtn} ${recordSubTab === 'notes' ? styles.consultationSubTabBtnActive : ''}`}
                          onClick={() => setRecordSubTab('notes')}
                        >
                          Notas
                        </button>
                      </Box>

                      <Textarea
                        label="Subjetivo (Queixa do paciente)"
                        value={soapData.subjective}
                        onChange={(event) => setSoapData((prev) => ({ ...prev, subjective: event.currentTarget.value }))}
                        minRows={1}
                        autosize
                        styles={recordFieldStyles}
                      />
                      <Textarea
                        label="Objetivo (Exame / Observação)"
                        value={soapData.objective}
                        onChange={(event) => setSoapData((prev) => ({ ...prev, objective: event.currentTarget.value }))}
                        minRows={1}
                        autosize
                        styles={recordFieldStyles}
                      />
                      <Textarea
                        label="Avaliação / Diagnóstico"
                        value={soapData.assessment}
                        onChange={(event) => setSoapData((prev) => ({ ...prev, assessment: event.currentTarget.value }))}
                        minRows={1}
                        autosize
                        styles={recordFieldStyles}
                      />
                      <Textarea
                        label="CID - 10"
                        value={soapData.cid10}
                        onChange={(event) => setSoapData((prev) => ({ ...prev, cid10: event.currentTarget.value }))}
                        minRows={1}
                        autosize
                        styles={recordFieldStyles}
                      />
                      <Textarea
                        label="Plano de Tratamento"
                        value={soapData.treatmentPlan}
                        onChange={(event) => setSoapData((prev) => ({ ...prev, treatmentPlan: event.currentTarget.value }))}
                        minRows={1}
                        autosize
                        styles={recordFieldStyles}
                      />
                      <Textarea
                        label={recordSubTab === 'prescription' ? 'Prescrição' : 'Notas'}
                        value={recordSubTab === 'prescription' ? soapData.prescription : soapData.notes}
                        onChange={(event) => {
                          const value = event.currentTarget.value;
                          setSoapData((prev) => (recordSubTab === 'prescription'
                            ? { ...prev, prescription: value }
                            : { ...prev, notes: value }));
                        }}
                        minRows={1}
                        autosize
                        styles={recordFieldStyles}
                      />

                      <Button
                        variant="default"
                        leftSection={<Paperclip size={14} />}
                        onClick={handleAttachDoctorDocument}
                        fullWidth
                        style={{ minHeight: 88, fontSize: 18, background: '#d9d9d9', borderColor: '#d9d9d9' }}
                      >
                        Anexar documentos
                      </Button>
                      <input
                        ref={doctorAttachmentInputRef}
                        type="file"
                        style={{ display: 'none' }}
                        onChange={handleDoctorAttachmentSelected}
                      />
                    </Box>
                  ) : (
                    <Box className={styles.consultationRecordBody}>
                      <Text fw={700}>Dados do paciente</Text>
                      <Text size="sm">Nome: {patientName}</Text>
                      <Text size="sm">Médico: {doctorName}</Text>
                      <Text size="sm">Especialidade: {doctorSpecialty}</Text>
                      <Text size="sm">Horário: {scheduledLabel}</Text>
                    </Box>
                  )}
                </Box>
              </Box>
            ) : (
              <Box className={`${styles.waitCard} ${isDark ? styles.surfaceDark : styles.surfaceLight}`} style={{ padding: 16 }}>
                <Group justify="space-between" mb="md">
                  <Text fw={700} size="lg">Consulta em andamento</Text>
                  <Button
                    size="sm"
                    color="red"
                    variant="light"
                    leftSection={<PhoneOff size={16} />}
                    onClick={() => {
                      const confirmed = window.confirm('Deseja realmente sair da teleconsulta?');
                      if (!confirmed) return;
                      stopMediaAndPeer('patient-left');
                      setInCall(false);
                      setCallStartedAt(null);
                      redirectPatientToFinished();
                    }}
                  >
                    Sair da teleconsulta
                  </Button>
                </Group>
                <Box style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <Box style={{ borderRadius: 12, overflow: 'hidden', background: '#000', minHeight: 260 }}>
                    <video ref={localVideoRef} muted autoPlay playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </Box>
                  <Box style={{ borderRadius: 12, overflow: 'hidden', background: '#000', minHeight: 260, position: 'relative' }}>
                    <video ref={remoteVideoRef} autoPlay playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    {!remoteConnected ? (
                      <Text size="sm" c="gray.3" style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>
                        Aguardando conexão da outra ponta...
                      </Text>
                    ) : null}
                  </Box>
                </Box>
              </Box>
            )
          ) : (
            <Box className={styles.mainGrid}>
              <Box className={`${styles.waitCard} ${isDark ? styles.surfaceDark : styles.surfaceLight}`}>
                <Box className={styles.waitHeader}>
                  <div>
                    <p className={styles.waitTitle}>Tempo de Espera</p>
                    <p className={styles.waitSubtitle}>Atualizado em tempo real</p>
                  </div>

                  <Box className={styles.legend}>
                    <span className={styles.legendRow}><span className={styles.legendDot} style={{ background: '#7b90ff' }} />Em preparação</span>
                    <span className={styles.legendRow}><span className={styles.legendDot} style={{ background: '#f7a623' }} />Quase pronto</span>
                    <span className={styles.legendRow}><span className={styles.legendDot} style={{ background: '#58d82e' }} />Tudo pronto!</span>
                  </Box>
                </Box>

                <Box className={styles.ringArea}>
                  <Box
                    className={styles.ring}
                    style={{
                      ['--ring-bg' as string]: `conic-gradient(${ringColor} ${Math.round(ringProgress * 360)}deg, ${isDark ? '#08163f' : '#c6d0eb'} 0deg)`,
                    }}
                  >
                    <span className={styles.timeText}>{timeText}</span>
                  </Box>

                  <span className={styles.statusBadge} style={{ color: status.color }}>
                    <span className={styles.legendDot} style={{ background: status.color }} />
                    {status.label}
                  </span>
                </Box>
              </Box>

              <Box className={`${styles.chatCard} ${isDark ? styles.surfaceDark : styles.surfaceLight}`}>
                <Box className={`${styles.chatHeader} ${isDark ? styles.chatHeaderDark : styles.chatHeaderLight}`}>
                  <p className={styles.chatTitle}>Chat</p>
                  <p className={styles.chatDoctor}>{chatCounterpartName}</p>
                </Box>

                <Box className={styles.chatBody} ref={chatBodyRef}>
                  <Box className={`${styles.chatBubble} ${isDark ? styles.chatBubbleDark : styles.chatBubbleLight}`}>
                    Olá! Este é o canal de pré-consulta. Você pode enviar documentos, exames ou dúvidas para {doctorName} antes da chamada começar.
                  </Box>
                  {chatMessages.map((message) => {
                    const ownMessage = (message.fromRole === 'DOCTOR') === isDoctorRole;
                    return (
                      <Box key={message.id} className={`${styles.chatMessageRow} ${ownMessage ? styles.chatMessageOwn : styles.chatMessageOther}`}>
                        <Box className={`${styles.chatMessageBubble} ${ownMessage ? styles.chatMessageBubbleOwn : styles.chatMessageBubbleOther}`}>
                          <Text size="xs" fw={700} className={styles.chatMessageAuthor}>
                            {ownMessage ? 'Você' : chatCounterpartName}
                          </Text>
                          {message.kind === 'file' ? (
                            <>
                              {renderFilePreview(message)}
                              <a
                                href={message.fileDataUrl}
                                download={message.fileName}
                                target="_blank"
                                rel="noreferrer"
                                className={styles.chatFileLink}
                              >
                                [arquivo] {message.fileName}
                              </a>
                            </>
                          ) : (
                            <Text size="sm">{message.text}</Text>
                          )}
                          <Text size="xs" c="dimmed" ta="right">{formatChatTime(message.createdAt)}</Text>
                        </Box>
                      </Box>
                    );
                  })}
                </Box>

                <Box className={styles.chatInputRow}>
                  <button type="button" className={`${styles.inputBtn} ${isDark ? styles.inputBtnDark : styles.inputBtnLight}`} onClick={handlePickFileClick}>
                    +
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    style={{ display: 'none' }}
                    onChange={(event) => { void handleFileSelected(event); }}
                  />
                  <input
                    className={`${styles.inputField} ${isDark ? styles.inputFieldDark : styles.inputFieldLight}`}
                    placeholder="Mensagem"
                    value={chatInput}
                    onChange={(event) => setChatInput(event.currentTarget.value.slice(0, 500))}
                    onKeyDown={(event) => {
                      if (event.key !== 'Enter') return;
                      event.preventDefault();
                      void sendChatMessage();
                    }}
                  />
                  <button
                    type="button"
                    className={`${styles.inputBtn} ${isDark ? styles.inputBtnDark : styles.inputBtnLight}`}
                    onClick={() => { void sendChatMessage(); }}
                    disabled={sendingChat || !chatInput.trim()}
                  >
                    <Send size={20} />
                  </button>
                </Box>
              </Box>
            </Box>
          )}

          {!doctorInCallMode && !withinWindow && !isDoctorRole ? (
            <Text c="yellow.3" mt={10}>
              A consulta será liberada {allowJoinFromMinutesBefore} minutos antes do horário agendado.
            </Text>
          ) : null}

          {!doctorInCallMode ? (
          <Box className={styles.enterRow}>
            <Button size="lg" radius="md" disabled={!canJoinConsultation || !signalingReady || inCall} onClick={() => { void enterConsultation(); }}>
              {isDoctorRole ? 'Entrar na Teleconsulta' : 'Entrar na Consulta'}
            </Button>
          </Box>
          ) : null}

          {!doctorInCallMode && !isDoctorRole && doctorInConsultation && !inCall ? (
            <Text mt={8} c={isDark ? 'green.3' : 'green.8'} ta="right">
              O médico já está na consulta. Clique em "Entrar na Consulta" para participar.
            </Text>
          ) : null}

          {!doctorInCallMode ? (
          <Box className={styles.tipsRow}>
            <Box className={`${styles.tipCard} ${isDark ? styles.tipCardDark : styles.tipCardLight}`}>
              <LampDesk size={24} />
              <Text className={styles.tipText}>Escolha um ambiente iluminado</Text>
            </Box>
            <Box className={`${styles.tipCard} ${isDark ? styles.tipCardDark : styles.tipCardLight}`}>
              <MicOff size={24} />
              <Text className={styles.tipText}>Um local silencioso</Text>
            </Box>
            <Box className={`${styles.tipCard} ${isDark ? styles.tipCardDark : styles.tipCardLight}`}>
              <SignalHigh size={24} />
              <Text className={styles.tipText}>Use uma conexão estável</Text>
            </Box>
          </Box>
          ) : null}
        </Box>
      </Box>
    </Box>
  );
}
