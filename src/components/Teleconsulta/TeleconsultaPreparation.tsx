import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Box, Button, Group, NativeSelect, Text, useMantineColorScheme } from '@mantine/core';
import { showNotification } from '@mantine/notifications';
import { Camera, LampDesk, Mic, MicOff, SignalHigh, Wifi, WifiOff } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Header } from '../Header/Header';
import teleconsultationLinkService, { type TeleconsultationPublicTokenMeta } from '../../services/teleconsultationLinkService';
import styles from './TeleconsultaPreparation.module.css';

type NetworkInformationLike = {
  downlink?: number;
  effectiveType?: string;
  addEventListener?: (type: string, listener: EventListenerOrEventListenerObject) => void;
  removeEventListener?: (type: string, listener: EventListenerOrEventListenerObject) => void;
};

type NavigatorWithConnection = Navigator & {
  connection?: NetworkInformationLike;
  mozConnection?: NetworkInformationLike;
  webkitConnection?: NetworkInformationLike;
};

const FALLBACK_PATIENT = {
  name: 'João da Silva',
  detail: '42 anos • Convênio Premium',
  schedule: '14:30',
};
const SPEED_TEST_FILE = '/speed-test.bin';
const SPEED_TEST_TIMEOUT_MS = 8000;
const PREPARED_SESSION_KEY_PREFIX = 'teleconsulta:prepared:';

const getConnection = (): NetworkInformationLike | undefined => {
  const nav = navigator as NavigatorWithConnection;
  return nav.connection || nav.mozConnection || nav.webkitConnection;
};

const parseAppointmentDateTime = (date?: string | null, time?: string | null) => {
  const normalizedTime = String(time || '').trim();
  const [hoursRaw, minutesRaw] = normalizedTime.split(':');
  const hours = Number(hoursRaw);
  const minutes = Number(minutesRaw);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;

  const normalizedDate = String(date || '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(normalizedDate)) {
    const [yearRaw, monthRaw, dayRaw] = normalizedDate.split('-');
    const year = Number(yearRaw);
    const month = Number(monthRaw);
    const day = Number(dayRaw);
    if (Number.isFinite(year) && Number.isFinite(month) && Number.isFinite(day)) {
      return new Date(year, month - 1, day, hours, minutes, 0, 0);
    }
  }

  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0, 0);
};

const formatRemainingToWindow = (ms: number) => {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours} hora${hours === 1 ? '' : 's'} e ${minutes} minuto${minutes === 1 ? '' : 's'}`;
  }

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

const getInitials = (name?: string | null) => {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return '??';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ''}${parts[parts.length - 1][0] || ''}`.toUpperCase();
};

const evaluateConnection = (online: boolean, downlink?: number, effectiveType?: string) => {
  if (!online) {
    return {
      label: 'Sem conexão',
      percent: 15,
      tone: 'red' as const,
    };
  }

  if (typeof downlink === 'number') {
    if (downlink >= 8) return { label: 'Conexão Excelente', percent: 95, tone: 'green' as const };
    if (downlink >= 3) return { label: 'Conexão Boa', percent: 72, tone: 'green' as const };
    if (downlink >= 1.5) return { label: 'Conexão Regular', percent: 48, tone: 'yellow' as const };
    return { label: 'Conexão Instável', percent: 28, tone: 'red' as const };
  }

  const normalized = String(effectiveType || '').toLowerCase();
  if (normalized === '4g') return { label: 'Conexão Boa', percent: 70, tone: 'green' as const };
  if (normalized === '3g') return { label: 'Conexão Regular', percent: 45, tone: 'yellow' as const };
  if (normalized === '2g' || normalized === 'slow-2g') {
    return { label: 'Conexão Instável', percent: 25, tone: 'red' as const };
  }

  return { label: 'Conexão Detectada', percent: 60, tone: 'green' as const };
};

export function TeleconsultaPreparation() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

  const { colorScheme } = useMantineColorScheme();

  const [cameraDevices, setCameraDevices] = useState<MediaDeviceInfo[]>([]);
  const [microphoneDevices, setMicrophoneDevices] = useState<MediaDeviceInfo[]>([]);
  const [audioOutputDevices, setAudioOutputDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState('');
  const [selectedMicrophoneId, setSelectedMicrophoneId] = useState('');
  const [selectedAudioOutputId, setSelectedAudioOutputId] = useState('');
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [microphoneEnabled, setMicrophoneEnabled] = useState(true);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [microphoneLevel, setMicrophoneLevel] = useState(0);
  const [tokenMeta, setTokenMeta] = useState<TeleconsultationPublicTokenMeta | null>(null);
  const [now, setNow] = useState<Date>(() => new Date());

  const [online, setOnline] = useState<boolean>(() => navigator.onLine);
  const [downlink, setDownlink] = useState<number | undefined>(() => getConnection()?.downlink);
  const [effectiveType, setEffectiveType] = useState<string | undefined>(() => getConnection()?.effectiveType);
  const [measuredDownlink, setMeasuredDownlink] = useState<number | undefined>(undefined);

  const isDark = colorScheme === 'dark';
  const token = params.get('token') || '';

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

  const stopAudioMeter = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    sourceRef.current?.disconnect();
    sourceRef.current = null;
    analyserRef.current = null;

    if (audioContextRef.current) {
      void audioContextRef.current.close();
      audioContextRef.current = null;
    }

    setMicrophoneLevel(0);
  }, []);

  const startAudioMeter = useCallback((stream: MediaStream) => {
    stopAudioMeter();

    const hasAudioTrack = stream.getAudioTracks().some((track) => track.enabled);
    if (!hasAudioTrack) {
      setMicrophoneLevel(0);
      return;
    }

    const AudioCtx = window.AudioContext
      || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;
    analyser.smoothingTimeConstant = 0.85;

    const source = ctx.createMediaStreamSource(stream);
    source.connect(analyser);

    audioContextRef.current = ctx;
    analyserRef.current = analyser;
    sourceRef.current = source;

    const sample = new Uint8Array(analyser.frequencyBinCount);

    const tick = () => {
      analyser.getByteFrequencyData(sample);
      let sum = 0;
      for (let i = 0; i < sample.length; i += 1) sum += sample[i];
      const avg = sum / sample.length;
      const normalized = Math.max(0, Math.min(100, Math.round((avg / 128) * 100)));
      setMicrophoneLevel(normalized);
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
  }, [stopAudioMeter]);

  const stopCurrentStream = useCallback(() => {
    const current = streamRef.current;
    if (!current) return;
    current.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  const listDevices = useCallback(async () => {
    const allDevices = await navigator.mediaDevices.enumerateDevices();
    const cameras = allDevices.filter((d) => d.kind === 'videoinput');
    const microphones = allDevices.filter((d) => d.kind === 'audioinput');
    const outputs = allDevices.filter((d) => d.kind === 'audiooutput');

    setCameraDevices(cameras);
    setMicrophoneDevices(microphones);
    setAudioOutputDevices(outputs);

    if (!selectedCameraId && cameras[0]?.deviceId) {
      setSelectedCameraId(cameras[0].deviceId);
    }

    if (!selectedMicrophoneId && microphones[0]?.deviceId) {
      setSelectedMicrophoneId(microphones[0].deviceId);
    }

    if (!selectedAudioOutputId && outputs[0]?.deviceId) {
      setSelectedAudioOutputId(outputs[0].deviceId);
    }
  }, [selectedAudioOutputId, selectedCameraId, selectedMicrophoneId]);

  const initializeMedia = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setMediaError('Este navegador não suporta acesso à câmera e microfone.');
      return;
    }

    try {
      setMediaError(null);
      stopCurrentStream();

      const stream = await navigator.mediaDevices.getUserMedia({
        video: cameraEnabled
          ? {
              deviceId: selectedCameraId ? { exact: selectedCameraId } : undefined,
              width: { ideal: 1280 },
              height: { ideal: 720 },
            }
          : false,
        audio: microphoneEnabled
          ? {
              deviceId: selectedMicrophoneId ? { exact: selectedMicrophoneId } : undefined,
              noiseSuppression: true,
              echoCancellation: true,
            }
          : false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => undefined);
      }

      startAudioMeter(stream);
      await listDevices();
    } catch {
      setMediaError('Não foi possível acessar seus dispositivos. Verifique permissões do navegador.');
      stopAudioMeter();
    }
  }, [cameraEnabled, listDevices, microphoneEnabled, selectedCameraId, selectedMicrophoneId, startAudioMeter, stopAudioMeter, stopCurrentStream]);

  const runSpeedTest = useCallback(async () => {
    if (!online) return;

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), SPEED_TEST_TIMEOUT_MS);

    try {
      const startedAt = performance.now();
      const response = await fetch(`${SPEED_TEST_FILE}?t=${Date.now()}`, {
        cache: 'no-store',
        signal: controller.signal,
      });
      if (!response.ok) return;

      const payload = await response.arrayBuffer();
      const elapsedSeconds = (performance.now() - startedAt) / 1000;
      if (elapsedSeconds <= 0) return;

      const bitsDownloaded = payload.byteLength * 8;
      const mbps = bitsDownloaded / elapsedSeconds / 1_000_000;
      if (Number.isFinite(mbps) && mbps > 0) {
        setMeasuredDownlink(Number(mbps.toFixed(1)));
      }
    } catch {
      // Mantém fallback do navegador quando o speed test falhar.
    } finally {
      window.clearTimeout(timeout);
    }
  }, [online]);

  useEffect(() => {
    void initializeMedia();
    return () => {
      stopAudioMeter();
      stopCurrentStream();
    };
  }, [initializeMedia, stopAudioMeter, stopCurrentStream]);

  useEffect(() => {
    const onMediaChange = () => {
      void listDevices();
    };

    navigator.mediaDevices?.addEventListener?.('devicechange', onMediaChange);
    return () => {
      navigator.mediaDevices?.removeEventListener?.('devicechange', onMediaChange);
    };
  }, [listDevices]);

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    const connection = getConnection();

    const handleConnectionUpdate = () => {
      const current = getConnection();
      setDownlink(current?.downlink);
      setEffectiveType(current?.effectiveType);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    connection?.addEventListener?.('change', handleConnectionUpdate);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      connection?.removeEventListener?.('change', handleConnectionUpdate);
    };
  }, []);

  useEffect(() => {
    if (!online) {
      setMeasuredDownlink(undefined);
      return;
    }

    void runSpeedTest();
    const interval = window.setInterval(() => {
      void runSpeedTest();
    }, 45_000);

    return () => window.clearInterval(interval);
  }, [online, runSpeedTest]);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  const resolvedDownlink = measuredDownlink ?? downlink;
  const connectionState = useMemo(
    () => evaluateConnection(online, resolvedDownlink, effectiveType),
    [effectiveType, online, resolvedDownlink],
  );
  const scheduledTime = tokenMeta?.appointment?.time || FALLBACK_PATIENT.schedule;
  const doctorName = tokenMeta?.appointment?.doctorName || 'Dr(a) não informado(a)';
  const doctorSpecialty = tokenMeta?.appointment?.specialty || 'Especialidade não informada';
  const patientName = tokenMeta?.appointment?.patientName || FALLBACK_PATIENT.name;
  const doctorInitials = getInitials(doctorName);
  const isPatientToken = String(tokenMeta?.role || '').toUpperCase() === 'PATIENT';
  const isDoctorToken = String(tokenMeta?.role || '').toUpperCase() === 'DOCTOR';

  const appointmentDateTime = useMemo(
    () => parseAppointmentDateTime(tokenMeta?.appointment?.date, scheduledTime),
    [scheduledTime, tokenMeta?.appointment?.date],
  );
  const millisUntilAppointment = appointmentDateTime
    ? (appointmentDateTime.getTime() - now.getTime())
    : 0;
  const joinWindowMinutes = 10;
  const millisUntilAllowedWindow = millisUntilAppointment - (joinWindowMinutes * 60 * 1000);
  const canJoinWaitingWindow = millisUntilAllowedWindow <= 0;
  const canEnter = cameraEnabled && microphoneEnabled && online && !mediaError && canJoinWaitingWindow;

  const progressToneClass = connectionState.tone === 'green'
    ? styles.progressGreen
    : connectionState.tone === 'yellow'
      ? styles.progressYellow
      : styles.progressRed;

  const formatDeviceName = (device: MediaDeviceInfo, fallback: string) => {
    const name = (device.label || '').trim();
    return name || fallback;
  };

  const selectBg = isDark ? '#03184f' : '#002a72';

  return (
    <Box bg="var(--mantine-color-body)" style={{ minHeight: '100vh' }}>
      {isDoctorToken ? <Header /> : null}

      <Box className={`${styles.page} ${isDark ? styles.pageDark : styles.pageLight}`}>
        <Box className={styles.wrapper}>
          <Text className={styles.title}>Teleconsulta</Text>

          <Box className={`${styles.doctorCard} ${isDark ? styles.doctorCardDark : styles.doctorCardLight}`}>
            <Box className={styles.doctorLeft}>
              <Box className={styles.avatar}>{doctorInitials}</Box>
              <div>
                <p className={styles.doctorLabel}>Médico Responsável</p>
                <p className={styles.doctorName}>{doctorName}</p>
                <p className={styles.doctorSpecialty}>{doctorSpecialty}</p>
                {!isPatientToken && (
                  <p className={styles.doctorSpecialty}>Paciente: {patientName}</p>
                )}
              </div>
            </Box>

            <Box className={styles.schedule}>
              <p className={styles.scheduleLabel}>Horário Agendado</p>
              <p className={styles.scheduleTime}>{scheduledTime}</p>
            </Box>
          </Box>

          <Box className={styles.mainGrid}>
            <Box className={`${styles.panel} ${styles.leftPanel} ${isDark ? styles.surfaceDark : styles.surfaceLight}`}>
              <Box className={`${styles.videoBox} ${isDark ? styles.videoDark : styles.videoLight}`}>
                {cameraEnabled ? (
                  <video ref={videoRef} muted autoPlay playsInline className={styles.video} />
                ) : (
                  <Box className={styles.videoFallback}>Câmera desativada</Box>
                )}
              </Box>

              <Box className={styles.cameraActions}>
                <NativeSelect
                  data={cameraDevices.map((device, index) => ({
                    value: device.deviceId,
                    label: formatDeviceName(device, `Câmera ${index + 1}`),
                  }))}
                  value={selectedCameraId}
                  onChange={(event) => setSelectedCameraId(event.currentTarget.value)}
                  leftSection={<Camera size={18} />}
                  disabled={!cameraEnabled || cameraDevices.length === 0}
                  styles={{
                    input: {
                      height: 36,
                      borderRadius: 8,
                      border: 'none',
                      backgroundColor: selectBg,
                      color: '#e8efff',
                      fontSize: 14,
                      fontWeight: 600,
                    },
                  }}
                />

                <Button variant={cameraEnabled ? 'filled' : 'light'} color="darkBlue" onClick={() => setCameraEnabled((prev) => !prev)}>
                  {cameraEnabled ? 'Desativar' : 'Ativar'}
                </Button>
              </Box>
            </Box>

            <Box className={styles.rightColumn}>
              <Box className={`${styles.panel} ${styles.rightPanel} ${isDark ? styles.surfaceDark : styles.surfaceLight}`}>
                <Box className={styles.controlHeader}>
                  <span className={styles.controlTitle}>
                    {microphoneEnabled ? <Mic className={styles.icon} /> : <MicOff className={styles.icon} />}
                    Microfone
                  </span>
                  <Button variant={microphoneEnabled ? 'filled' : 'light'} color="darkBlue" onClick={() => setMicrophoneEnabled((prev) => !prev)}>
                    {microphoneEnabled ? 'Desativar' : 'Ativar'}
                  </Button>
                </Box>

                <Box className={styles.progressTrack}>
                  <Box
                    className={`${styles.progressBar} ${microphoneEnabled ? styles.progressGreen : styles.progressRed}`}
                    style={{ width: `${microphoneEnabled ? Math.max(microphoneLevel, 8) : 6}%` }}
                  />
                </Box>

                <Text className={styles.deviceLabel}>Dispositivo selecionado</Text>

                <NativeSelect
                  data={microphoneDevices.map((device, index) => ({
                    value: device.deviceId,
                    label: formatDeviceName(device, `Microfone ${index + 1}`),
                  }))}
                  value={selectedMicrophoneId}
                  onChange={(event) => setSelectedMicrophoneId(event.currentTarget.value)}
                  disabled={!microphoneEnabled || microphoneDevices.length === 0}
                  styles={{
                    input: {
                      height: 38,
                      borderRadius: 8,
                      border: 'none',
                      backgroundColor: selectBg,
                      color: '#e8efff',
                      fontSize: 14,
                      fontWeight: 600,
                    },
                  }}
                />

              </Box>

              <Box className={`${styles.panel} ${styles.rightPanel} ${isDark ? styles.surfaceDark : styles.surfaceLight}`}>
                <span className={styles.controlTitle}>
                  <SignalHigh className={styles.icon} />
                  Saída de áudio
                </span>

                <Text className={styles.deviceLabel}>Dispositivo selecionado</Text>

                <NativeSelect
                  data={audioOutputDevices.map((device, index) => ({
                    value: device.deviceId,
                    label: formatDeviceName(device, `Saída ${index + 1}`),
                  }))}
                  value={selectedAudioOutputId}
                  onChange={(event) => setSelectedAudioOutputId(event.currentTarget.value)}
                  disabled={audioOutputDevices.length === 0}
                  styles={{
                    input: {
                      height: 38,
                      borderRadius: 8,
                      border: 'none',
                      backgroundColor: selectBg,
                      color: '#e8efff',
                      fontSize: 14,
                      fontWeight: 600,
                    },
                  }}
                />
              </Box>

              <Box className={`${styles.panel} ${styles.rightPanel} ${styles.connectionCard} ${isDark ? styles.surfaceDark : styles.surfaceLight}`}>
                <span className={styles.controlTitle}>
                  {online ? <Wifi className={styles.icon} /> : <WifiOff className={styles.icon} />}
                  Conexão
                </span>

                <Box className={styles.connectionRow}>
                  <span>{connectionState.label}</span>
                  <Group gap={8}>
                    <SignalHigh size={20} />
                    <span>{typeof resolvedDownlink === 'number' ? `${resolvedDownlink.toFixed(1)} Mbps` : '-- Mbps'}</span>
                  </Group>
                </Box>

                <Box className={styles.progressTrack}>
                  <Box className={`${styles.progressBar} ${progressToneClass}`} style={{ width: `${connectionState.percent}%` }} />
                </Box>
              </Box>
            </Box>
          </Box>

          <Box className={styles.ingressarRow}>
            <Button
              size="md"
              radius="md"
              disabled={!canEnter}
              onClick={() => {
                if (token) {
                  sessionStorage.setItem(`${PREPARED_SESSION_KEY_PREFIX}${token}`, '1');
                  navigate(`/teleconsulta/paciente/espera?token=${encodeURIComponent(token)}&fromPrep=1`);
                  return;
                }
                navigate(`/teleconsulta/paciente/espera?scheduled=${encodeURIComponent(scheduledTime)}&fromPrep=1`);
              }}
            >
              Ingressar
            </Button>
          </Box>

          {mediaError ? (
            <Text c="red.6" mt="sm" ta="right">
              {mediaError}
            </Text>
          ) : !canJoinWaitingWindow ? (
            <Text c={isDark ? 'yellow.3' : 'yellow.9'} mt="sm" ta="right">
              {`Você poderá ingressar na fila de espera em ${formatRemainingToWindow(millisUntilAllowedWindow)}.`}
            </Text>
          ) : null}

          <Box className={styles.tipsRow}>
            <Box className={`${styles.tipCard} ${isDark ? styles.tipDark : styles.tipLight}`}>
              <LampDesk size={28} />
              <Text className={styles.tipText}>Escolha um ambiente iluminado</Text>
            </Box>

            <Box className={`${styles.tipCard} ${isDark ? styles.tipDark : styles.tipLight}`}>
              <MicOff size={28} />
              <Text className={styles.tipText}>Um local silencioso</Text>
            </Box>

            <Box className={`${styles.tipCard} ${isDark ? styles.tipDark : styles.tipLight}`}>
              <Wifi size={28} />
              <Text className={styles.tipText}>Use uma conexão estável</Text>
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
