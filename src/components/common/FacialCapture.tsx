import { useEffect, useRef, useState } from 'react';
import { Modal, Button, Group, Stack, Text, Center, Box, Loader } from '@mantine/core';
import { Camera, X, Check } from 'lucide-react';
import facialRecognitionService from '../../services/facialRecognitionService';
import { showNotification } from '@mantine/notifications';
import { LGPDBiometricConsent } from './LGPDBiometricConsent';

interface FacialCaptureProps {
  opened: boolean;
  onClose: () => void;
  onCapture: (imageBase64: string) => void;
  title?: string;
  description?: string;
  /** When true, skips the LGPD consent step (e.g. staff-only internal flows where consent was given at enrollment) */
  skipConsent?: boolean;
}

export function FacialCapture({
  opened,
  onClose,
  onCapture,
  title = 'Captura Facial',
  description = 'Posicione seu rosto no centro da câmera',
  skipConsent = false,
}: FacialCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [consentGiven, setConsentGiven] = useState(skipConsent);

  // Reset consent state when modal opens/closes
  useEffect(() => {
    if (!opened) {
      setConsentGiven(skipConsent);
      setCapturedImage(null);
    }
  }, [opened, skipConsent]);

  useEffect(() => {
    if (opened && consentGiven) {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened, consentGiven]);

  useEffect(() => {
    if (!opened || capturedImage || !stream || !videoRef.current) return;

    videoRef.current.srcObject = stream;
    videoRef.current.play().catch(() => undefined);
  }, [opened, capturedImage, stream]);

  const startCamera = async () => {
    try {
      setLoading(true);
      const mediaStream = await facialRecognitionService.startWebcam();
      setStream(mediaStream);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }

      setLoading(false);
    } catch (error: any) {
      showNotification({
        title: 'Erro ao acessar câmera',
        message: error?.message || 'Não foi possível acessar a webcam',
        color: 'red',
      });
      setLoading(false);
      onClose();
    }
  };

  const stopCamera = () => {
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.srcObject = null;
    }

    if (stream) {
      facialRecognitionService.stopWebcam(stream);
      setStream(null);
    }
  };

  const handleCapture = async () => {
    if (!videoRef.current) return;

    try {
      setCapturing(true);
      const imageBase64 = await facialRecognitionService.captureFromWebcam(videoRef.current);
      setCapturedImage(imageBase64);
      setCapturing(false);
    } catch (error: any) {
      showNotification({
        title: 'Erro ao capturar imagem',
        message: error?.message || 'Não foi possível capturar a imagem',
        color: 'red',
      });
      setCapturing(false);
    }
  };

  const handleConfirm = () => {
    if (capturedImage) {
      onCapture(capturedImage);
      onClose();
    }
  };

  const handleRetake = async () => {
    setCapturedImage(null);

    // When the preview image is removed, the video element mounts again and
    // needs the current stream rebound. If the stream was interrupted, restart it.
    const hasActiveTrack = stream?.getVideoTracks().some((track) => track.readyState === 'live');
    if (hasActiveTrack && videoRef.current) {
      videoRef.current.srcObject = stream;
      await videoRef.current.play().catch(() => undefined);
      return;
    }

    stopCamera();
    await startCamera();
  };

  const handleConsentDecline = () => {
    onClose();
  };

  // Show LGPD consent modal first if consent not yet given
  if (!consentGiven) {
    return (
      <LGPDBiometricConsent
        opened={opened}
        onAccept={() => setConsentGiven(true)}
        onDecline={handleConsentDecline}
      />
    );
  }

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={title}
      size="lg"
      centered
    >
      <Stack gap="md">
        <Text size="sm" c="dimmed">
          {description}
        </Text>

        <Box
          style={{
            position: 'relative',
            width: '100%',
            aspectRatio: '4/3',
            background: '#000',
            borderRadius: '8px',
            overflow: 'hidden',
          }}
        >
          {loading && (
            <Center style={{ position: 'absolute', inset: 0, zIndex: 10 }}>
              <Loader size="lg" />
            </Center>
          )}

          {capturedImage ? (
            <img
              src={capturedImage}
              alt="Foto capturada"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />
          ) : (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: loading ? 'none' : 'block',
              }}
            />
          )}

          {/* Overlay para guiar o posicionamento do rosto */}
          {!capturedImage && !loading && (
            <Box
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '60%',
                aspectRatio: '3/4',
                border: '3px solid rgba(255, 255, 255, 0.5)',
                borderRadius: '50%',
                pointerEvents: 'none',
              }}
            />
          )}
        </Box>

        <Group justify="center" gap="md">
          {capturedImage ? (
            <>
              <Button
                variant="outline"
                leftSection={<X size={16} />}
                onClick={handleRetake}
              >
                Tirar Novamente
              </Button>
              <Button
                leftSection={<Check size={16} />}
                onClick={handleConfirm}
              >
                Confirmar Foto
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={onClose}
              >
                Cancelar
              </Button>
              <Button
                leftSection={<Camera size={16} />}
                onClick={handleCapture}
                loading={capturing}
                disabled={loading}
              >
                Capturar Foto
              </Button>
            </>
          )}
        </Group>
      </Stack>
    </Modal>
  );
}
