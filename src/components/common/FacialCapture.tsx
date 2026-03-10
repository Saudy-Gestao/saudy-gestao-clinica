import { useEffect, useRef, useState } from 'react';
import { Modal, Button, Group, Stack, Text, Center, Box, Loader } from '@mantine/core';
import { Camera, X, Check } from 'lucide-react';
import facialRecognitionService from '../../services/facialRecognitionService';
import { showNotification } from '@mantine/notifications';

interface FacialCaptureProps {
  opened: boolean;
  onClose: () => void;
  onCapture: (imageBase64: string) => void;
  title?: string;
  description?: string;
}

export function FacialCapture({
  opened,
  onClose,
  onCapture,
  title = 'Captura Facial',
  description = 'Posicione seu rosto no centro da câmera'
}: FacialCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (opened) {
      startCamera();
    } else {
      stopCamera();
      setCapturedImage(null);
    }

    return () => {
      stopCamera();
    };
  }, [opened]);

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

  const handleRetake = () => {
    setCapturedImage(null);
  };

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
