import { useEffect, useRef, useState } from 'react';
import { AlertCircle, Check, Mic, MicOff, Sparkles } from 'lucide-react';
import { Badge, Box, Button, Group, Modal, Stack, Text, Textarea } from '@/components/ui';
import type { AppointmentAssistantDraft } from '../../services/appointmentAssistantService';
import './ScheduleAssistantModal.css';

export interface ScheduleAssistantPreviewField {
  label: string;
  value: string;
  status: 'matched' | 'pending';
}

interface ScheduleAssistantModalProps {
  opened: boolean;
  prompt: string;
  loading: boolean;
  draft: AppointmentAssistantDraft | null;
  previewFields: ScheduleAssistantPreviewField[];
  unresolvedFields: string[];
  onPromptChange: (value: string) => void;
  onParse: () => void;
  onApply: () => void;
  onFieldClick?: (field: string) => void;
  onClose: () => void;
}

const EXAMPLES = [
  'Agendar Marina Freitas para Integração Sensorial amanhã às 10h com a Dra. Camila.',
  'Marcar consulta presencial para João Silva na próxima terça à tarde.',
];

interface SpeechRecognitionResultLike {
  isFinal: boolean;
  [index: number]: { transcript: string };
}

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
}

interface SpeechRecognitionErrorLike {
  error?: string;
}

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognitionLike;
}

type SpeechRecognitionWindow = Window & {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
};

export function ScheduleAssistantModal({
  opened,
  prompt,
  loading,
  draft,
  previewFields,
  unresolvedFields,
  onPromptChange,
  onParse,
  onApply,
  onFieldClick,
  onClose,
}: ScheduleAssistantModalProps) {
  const promptRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const shouldKeepListeningRef = useRef(false);
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const promptBeforeSpeechRef = useRef('');
  const finalTranscriptRef = useRef('');
  const [isListening, setIsListening] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const speechSupported = typeof window !== 'undefined'
    && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  useEffect(() => {
    if (opened) window.setTimeout(() => promptRef.current?.focus(), 0);
  }, [opened]);

  useEffect(() => () => {
    shouldKeepListeningRef.current = false;
    if (restartTimerRef.current) window.clearTimeout(restartTimerRef.current);
    recognitionRef.current?.abort?.();
  }, []);

  const composeSpeechPrompt = (finalTranscript: string, interimTranscript = '') => {
    const spokenText = `${finalTranscript} ${interimTranscript}`.trim();
    const typedText = promptBeforeSpeechRef.current.trimEnd();
    return [typedText, spokenText].filter(Boolean).join(typedText ? ' ' : '');
  };

  const createRecognition = () => {
    const speechWindow = window as SpeechRecognitionWindow;
    const SpeechRecognition = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
    if (!SpeechRecognition) throw new Error('Speech Recognition indisponível');
    const recognition = new SpeechRecognition();
    recognition.lang = 'pt-BR';
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: SpeechRecognitionEventLike) => {
      let interimTranscript = '';
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const transcript = event.results[index][0]?.transcript || '';
        if (event.results[index].isFinal) {
          finalTranscriptRef.current += `${transcript} `;
        } else {
          interimTranscript += transcript;
        }
      }
      onPromptChange(composeSpeechPrompt(finalTranscriptRef.current, interimTranscript));
    };

    recognition.onerror = (event: SpeechRecognitionErrorLike) => {
      if (event.error === 'aborted' || event.error === 'no-speech') return;

      shouldKeepListeningRef.current = false;
      setIsListening(false);
      recognitionRef.current = null;

      const message = event.error === 'not-allowed'
        ? 'Permita o acesso ao microfone no navegador para usar a entrada por voz.'
        : event.error === 'network'
          ? 'O reconhecimento de voz precisa de conexão com a internet. Tente novamente.'
          : 'Não foi possível reconhecer sua fala. Você pode digitar o pedido normalmente.';
      setSpeechError(message);
    };

    recognition.onend = () => {
      if (recognitionRef.current !== recognition) return;

      if (!shouldKeepListeningRef.current) {
        setIsListening(false);
        recognitionRef.current = null;
        return;
      }

      restartTimerRef.current = window.setTimeout(() => {
        if (!shouldKeepListeningRef.current) return;
        const nextRecognition = createRecognition();
        recognitionRef.current = nextRecognition;
        try {
          nextRecognition.start();
        } catch {
          shouldKeepListeningRef.current = false;
          recognitionRef.current = null;
          setIsListening(false);
        }
      }, 250);
    };

    return recognition;
  };

  const stopListening = () => {
    shouldKeepListeningRef.current = false;
    if (restartTimerRef.current) {
      window.clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
    const recognition = recognitionRef.current;
    recognitionRef.current = null;
    recognition?.stop?.();
    setIsListening(false);
  };

  const startListening = () => {
    if (!speechSupported) {
      setSpeechError('Seu navegador não oferece entrada por voz. Use Chrome ou Edge ou digite o pedido.');
      return;
    }

    stopListening();
    promptBeforeSpeechRef.current = prompt;
    finalTranscriptRef.current = '';
    setSpeechError(null);
    shouldKeepListeningRef.current = true;

    try {
      const recognition = createRecognition();
      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      shouldKeepListeningRef.current = false;
      recognitionRef.current = null;
      setIsListening(false);
      setSpeechError('Não foi possível iniciar o microfone. Verifique a permissão e tente novamente.');
    }
  };

  const toggleListening = () => {
    if (isListening) stopListening();
    else startListening();
  };

  const handleClose = () => {
    stopListening();
    onClose();
  };

  const hasDraft = Boolean(draft);
  const canApply = hasDraft && previewFields.some((field) => field.status === 'matched');

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title="Agendar com IA"
      size={620}
      className="schedule-assistant-modal"
      closeButtonProps={{ 'aria-label': 'Fechar assistente de agendamento' }}
      footer={(
        <Group className="schedule-assistant-modal__footer" justify="space-between" wrap="wrap" gap="sm">
          <Button variant="default" onClick={handleClose}>Cancelar</Button>
          <Group gap="sm" wrap="wrap">
            <Button variant="default" onClick={onParse} loading={loading} disabled={!prompt.trim()}>
              {hasDraft ? 'Interpretar novamente' : 'Preparar rascunho'}
            </Button>
            <Button onClick={onApply} disabled={!canApply || loading}>
              Aplicar ao agendamento
            </Button>
          </Group>
        </Group>
      )}
    >
      <Stack className="schedule-assistant-modal__content" gap="lg">
        <Box className="schedule-assistant-modal__intro">
          <Box className="schedule-assistant-modal__icon" aria-hidden="true"><Sparkles size={20} /></Box>
          <Box>
            <Text fw={700}>Descreva o que precisa marcar</Text>
            <Text size="sm" c="dimmed">
              A IA prepara um rascunho com paciente, procedimento, profissional, data e horário para você revisar.
            </Text>
          </Box>
        </Box>

        <Box>
          <Box className="schedule-assistant-modal__prompt-shell">
            <Textarea
              ref={promptRef}
              className="schedule-assistant-modal__prompt"
              label="Pedido de agendamento"
              placeholder="Ex.: Agendar Maria Souza para psicologia na terça às 14h com a Dra. Ana..."
              value={prompt}
              onChange={(event) => onPromptChange(event.currentTarget.value)}
              rows={4}
              maxLength={800}
              description={`${prompt.length}/800 caracteres`}
              disabled={loading || isListening}
            />
            <Button
              className={`schedule-assistant-modal__voice-button${isListening ? ' schedule-assistant-modal__voice-button--listening' : ''}`}
              variant={isListening ? 'light' : 'default'}
              color={isListening ? 'red' : undefined}
              onClick={toggleListening}
              disabled={loading || !speechSupported}
              aria-label={isListening ? 'Parar entrada por voz' : 'Usar entrada por voz'}
              aria-pressed={isListening}
              title={!speechSupported ? 'Entrada por voz indisponível neste navegador' : undefined}
            >
              {isListening ? <MicOff size={18} /> : <Mic size={18} />}
            </Button>
          </Box>
          <Text className={`schedule-assistant-modal__voice-status${speechError ? ' schedule-assistant-modal__voice-status--error' : ''}`} size="xs" c={speechError ? undefined : 'dimmed'} role={speechError ? 'alert' : undefined} aria-live="polite">
            {speechError || (isListening
              ? 'Ouvindo… fale seu pedido e clique no microfone para encerrar.'
              : speechSupported
                ? 'Digite ou fale seu pedido usando o microfone.'
                : 'Entrada por voz indisponível neste navegador. Digite seu pedido.')}
          </Text>
          <Group className="schedule-assistant-modal__examples" gap="xs" wrap="wrap">
            {EXAMPLES.map((example) => (
              <Button
                key={example}
                variant="subtle"
                size="xs"
                onClick={() => onPromptChange(example)}
                disabled={loading}
              >
                Exemplo {EXAMPLES.indexOf(example) + 1}
              </Button>
            ))}
          </Group>
        </Box>

        {!hasDraft && (
          <Box className="schedule-assistant-modal__hint">
            <Text size="sm" c="dimmed">
              Diga também se é presencial ou teleconsulta. Para recorrência, informe a quantidade de ocorrências.
            </Text>
          </Box>
        )}

        {draft && (
          <Stack className="schedule-assistant-modal__result" gap="md">
            <Group justify="space-between" align="center" wrap="wrap">
              <Box>
                <Text fw={700}>Rascunho identificado</Text>
                <Text size="sm" c="dimmed">Confira os dados antes de aplicar ao fluxo.</Text>
              </Box>
              <Badge variant="light" color={unresolvedFields.length > 0 ? 'yellow' : 'green'}>
                {unresolvedFields.length > 0 ? 'Revisão necessária' : 'Pronto para revisar'}
              </Badge>
            </Group>
            <Box className="schedule-assistant-modal__fields">
              {previewFields.map((field) => {
                const isActionable = field.status === 'pending' && Boolean(onFieldClick);
                return (
                  <Box
                    key={field.label}
                    component={isActionable ? 'button' : undefined}
                    type={isActionable ? 'button' : undefined}
                    className={`schedule-assistant-modal__field schedule-assistant-modal__field--${field.status}${isActionable ? ' schedule-assistant-modal__field--action' : ''}`}
                    onClick={isActionable ? () => onFieldClick?.(field.label) : undefined}
                    aria-label={isActionable ? `Revisar ${field.label}` : undefined}
                  >
                    <Box className="schedule-assistant-modal__field-icon" aria-hidden="true">
                      {field.status === 'matched' ? <Check size={14} /> : <AlertCircle size={14} />}
                    </Box>
                    <Box>
                      <Text className="schedule-assistant-modal__field-label" size="xs">{field.label}</Text>
                      <Text className="schedule-assistant-modal__field-value" size="sm">{field.value}</Text>
                    </Box>
                  </Box>
                );
              })}
            </Box>
            {unresolvedFields.length > 0 && (
              <Box className="schedule-assistant-modal__warning" role="status">
                <Text size="sm" fw={600}>Alguns dados precisam ser escolhidos no formulário:</Text>
                {onFieldClick ? (
                  <Group className="schedule-assistant-modal__warning-fields" gap="xs" wrap="wrap">
                    {unresolvedFields.map((field) => (
                      <Button
                        key={field}
                        className="schedule-assistant-modal__warning-field"
                        variant="subtle"
                        size="xs"
                        onClick={() => onFieldClick(field)}
                        aria-label={`Ir para ${field}`}
                      >
                        {field}
                      </Button>
                    ))}
                  </Group>
                ) : (
                  <Text size="sm" c="dimmed">{unresolvedFields.join(' • ')}</Text>
                )}
              </Box>
            )}
          </Stack>
        )}
      </Stack>
    </Modal>
  );
}
