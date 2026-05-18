import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  Badge,
  Box,
  Button,
  Center,
  Group,
  Loader,
  MultiSelect,
  Paper,
  PinInput,
  Select,
  Stepper,
  Stack,
  Text,
  TextInput,
  Textarea,
  ThemeIcon,
} from '@mantine/core';
import { showNotification } from '@mantine/notifications';
import { CheckCheck } from 'lucide-react';
import dayjs from 'dayjs';
import { FacialCapture } from '../common/FacialCapture';
import preSchedulingService from '../../services/preSchedulingService';
import facialRecognitionService from '../../services/facialRecognitionService';
import { usePublicPreSchedulingMetaQuery } from '../../hooks/usePublicPreSchedulingMetaQuery';
import { queryKeys } from '../../lib/queryKeys';
import { resolveApiErrorMessage } from '../../lib/apiError';

const DOCUMENT_TYPES = [
  { value: 'DOCUMENTO_IDENTIDADE', label: 'Documento de identidade' },
  { value: 'PEDIDO_MEDICO', label: 'Pedido médico' },
  { value: 'CARTEIRINHA_CONVENIO', label: 'Carteirinha do convênio' },
  { value: 'OUTRO', label: 'Outro anexo' },
];

const toBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result || ''));
  reader.onerror = reject;
  reader.readAsDataURL(file);
});

export function PublicPreAgendamentoDocs() {
  const { token } = useParams<{ token: string }>();
  const queryClient = useQueryClient();
  const [verified, setVerified] = useState(false);
  const [facialOpen, setFacialOpen] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [emailCodeSent, setEmailCodeSent] = useState(false);
  const [emailCodeMasked, setEmailCodeMasked] = useState('');
  const [emailCode, setEmailCode] = useState('');
  const [requestingCode, setRequestingCode] = useState(false);
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const [docType, setDocType] = useState<string | null>('DOCUMENTO_IDENTIDADE');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [submittingAnamnesis, setSubmittingAnamnesis] = useState(false);
  const [expired, setExpired] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const [patientComplaints, setPatientComplaints] = useState('');
  const [anamnesisAnswers, setAnamnesisAnswers] = useState<Record<string, {
    answerText?: string;
    answerValues?: string[];
    answerBoolean?: boolean | null;
    answerNumber?: number | null;
  }>>({});
  const { data: meta, isLoading: loading, error: metaError } = usePublicPreSchedulingMetaQuery(token);

  useEffect(() => {
    if (!meta) return;
    setVerified(Boolean(meta.verified));
    setExpired(false);
    const answersMap: Record<string, {
      answerText?: string;
      answerValues?: string[];
      answerBoolean?: boolean | null;
      answerNumber?: number | null;
    }> = {};
    (meta.anamnesis?.answers || []).forEach((answer) => {
      if (!answer.questionId) return;
      answersMap[String(answer.questionId)] = {
        answerText: answer.answerText || '',
        answerValues: answer.answerValues || [],
        answerBoolean: answer.answerBoolean ?? null,
        answerNumber: answer.answerNumber ?? null,
      };
    });
    setAnamnesisAnswers(answersMap);
  }, [meta]);

  useEffect(() => {
    if (!metaError) return;
    const err: any = metaError;
    if (err?.response?.status === 410) {
      setExpired(true);
    }
    showNotification({
      title: 'Link inválido',
      message: resolveApiErrorMessage(err, 'Não foi possível abrir esse link.'),
      color: 'red',
    });
  }, [metaError]);

  const scheduleSummary = useMemo(() => {
    if (!meta?.appointment) return '-';
    const date = meta.appointment.date ? dayjs(meta.appointment.date).format('DD/MM/YYYY') : '-';
    const time = meta.appointment.time || '--:--';
    const specialty = meta.appointment.specialty || 'Procedimento';
    return `${date} • ${time} • ${specialty}`;
  }, [meta?.appointment]);

  const anamnesisAnswered = Boolean(meta?.anamnesis?.answered);
  const interactionCompleted = Boolean(meta?.interactionCompleted || meta?.status === 'DOCUMENTS_RECEIVED' || meta?.status === 'COMPLETED');

  useEffect(() => {
    if (!verified || !meta?.verificationExpiresAt || interactionCompleted) {
      setRemainingSeconds(null);
      return;
    }

    const updateCountdown = () => {
      const diff = Math.max(0, dayjs(meta.verificationExpiresAt).diff(dayjs(), 'second'));
      setRemainingSeconds(diff);
      if (diff <= 0) setExpired(true);
    };

    updateCountdown();
    const timer = window.setInterval(updateCountdown, 1000);
    return () => window.clearInterval(timer);
  }, [verified, meta?.verificationExpiresAt, interactionCompleted]);

  const countdownLabel = useMemo(() => {
    if (remainingSeconds === null) return '';
    const minutes = Math.floor(remainingSeconds / 60);
    const seconds = remainingSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }, [remainingSeconds]);

  const handleVerifyCapture = async (imageBase64: string) => {
    if (!token || !meta) return;
    setVerifying(true);
    try {
      const scan = await facialRecognitionService.scanFace({
        image: imageBase64,
        id_unidade: String(meta.branchId || ''),
        skipAuth: true,
      });

      const recognizedCpf = String(scan?.patient?.cpf || '').replace(/\D/g, '');
      if (!recognizedCpf) {
        throw new Error('Nenhum CPF reconhecido pela biometria facial.');
      }

      await preSchedulingService.verifyPublic(token, {
        recognizedCpf,
        recognizedName: scan?.patient?.name || undefined,
        recognizedTrust: Number.isFinite(Number(scan?.trust)) ? Number(scan?.trust) : undefined,
        facialImageBase64: imageBase64,
      });
      setVerified(true);
      showNotification({
        title: 'Identidade validada',
        message: meta?.anamnesis ? 'Você já pode responder a anamnese e enviar os documentos.' : 'Você já pode enviar os documentos.',
        color: 'green',
      });
      await queryClient.invalidateQueries({ queryKey: [...queryKeys.publicPreSchedulingMeta, token || ''] });
    } catch (err: any) {
      if (err?.response?.status === 410) setExpired(true);
      showNotification({
        title: 'Falha na validação',
        message: resolveApiErrorMessage(err, 'Não foi possível validar sua identidade.'),
        color: 'red',
      });
    } finally {
      setVerifying(false);
    }
  };

  const handleRequestEmailCode = async () => {
    if (!token) return;
    setRequestingCode(true);
    try {
      const result = await preSchedulingService.requestEmailCode(token);
      setEmailCodeSent(true);
      setEmailCodeMasked(result.emailMasked);
      setResendCooldown(60);
      const interval = window.setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) { window.clearInterval(interval); return 0; }
          return prev - 1;
        });
      }, 1000);
      showNotification({
        title: 'Código enviado',
        message: `Um código de 6 dígitos foi enviado para ${result.emailMasked}.`,
        color: 'green',
      });
    } catch (err: any) {
      if (err?.response?.status === 410) setExpired(true);
      showNotification({
        title: 'Erro ao enviar código',
        message: resolveApiErrorMessage(err, 'Não foi possível enviar o código de verificação.'),
        color: 'red',
      });
    } finally {
      setRequestingCode(false);
    }
  };

  const handleVerifyEmailCode = async () => {
    if (!token || emailCode.length !== 6) return;
    setVerifyingCode(true);
    try {
      const result = await preSchedulingService.verifyEmailCode(token, emailCode);
      setVerified(true);
      showNotification({
        title: 'Identidade confirmada',
        message: meta?.anamnesis ? 'Você já pode responder a anamnese e enviar os documentos.' : 'Você já pode enviar os documentos.',
        color: 'green',
      });
      await queryClient.invalidateQueries({ queryKey: [...queryKeys.publicPreSchedulingMeta, token || ''] });
      if (result.verificationExpiresAt) {
        setExpired(false);
      }
    } catch (err: any) {
      if (err?.response?.status === 410) setExpired(true);
      setEmailCode('');
      showNotification({
        title: 'Código inválido',
        message: resolveApiErrorMessage(err, 'Código incorreto ou expirado. Tente novamente.'),
        color: 'red',
      });
    } finally {
      setVerifyingCode(false);
    }
  };

  const handleUpload = async () => {
    if (!token || !selectedFile || !docType) return;
    setUploading(true);
    try {
      const base64 = await toBase64(selectedFile);
      await preSchedulingService.uploadPublicDocument(token, {
        documentType: docType,
        fileName: selectedFile.name,
        mimeType: selectedFile.type,
        fileBase64: base64,
      });
      showNotification({
        title: 'Documento enviado',
        message: 'Seu anexo foi enviado com sucesso.',
        color: 'green',
      });
      setSelectedFile(null);
      await queryClient.invalidateQueries({ queryKey: [...queryKeys.publicPreSchedulingMeta, token || ''] });
    } catch (err: any) {
      if (err?.response?.status === 410) setExpired(true);
      showNotification({
        title: 'Erro no envio',
        message: resolveApiErrorMessage(err, 'Não foi possível enviar esse arquivo.'),
        color: 'red',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleFinalize = async () => {
    if (!token) return;
    if ((meta?.documentsCount || 0) <= 0 && !anamnesisAnswered) {
      showNotification({
        title: 'Envio pendente',
        message: 'Envie ao menos um documento ou responda a anamnese antes de finalizar.',
        color: 'yellow',
      });
      return;
    }
    setFinalizing(true);
    try {
      await preSchedulingService.finalizePublicDocuments(token, {
        patientComplaints: patientComplaints.trim() || undefined,
      });
      showNotification({
        title: 'Envio finalizado',
        message: 'Documentos enviados e liberados para revisão da clínica.',
        color: 'green',
      });
      await queryClient.invalidateQueries({ queryKey: [...queryKeys.publicPreSchedulingMeta, token || ''] });
    } catch (err: any) {
      if (err?.response?.status === 410) setExpired(true);
      showNotification({
        title: 'Erro ao finalizar',
        message: resolveApiErrorMessage(err, 'Não foi possível finalizar o envio.'),
        color: 'red',
      });
    } finally {
      setFinalizing(false);
    }
  };

  const handleSubmitAnamnesis = async () => {
    if (!token || !meta?.anamnesis) return;

    const missingRequired = meta.anamnesis.questions.find((question) => {
      if (!question.isRequired) return false;
      const current = anamnesisAnswers[String(question.id)] || {};
      if (question.responseType === 'BOOLEAN') return typeof current.answerBoolean !== 'boolean';
      if (question.responseType === 'NUMBER') return current.answerNumber === null || current.answerNumber === undefined || Number.isNaN(Number(current.answerNumber));
      if (question.responseType === 'SINGLE_CHOICE' || question.responseType === 'MULTIPLE_CHOICE') {
        return !Array.isArray(current.answerValues) || current.answerValues.length === 0;
      }
      return !String(current.answerText || '').trim();
    });

    if (missingRequired) {
      showNotification({
        title: 'Pergunta obrigatória',
        message: `Responda "${missingRequired.label}" antes de enviar a anamnese.`,
        color: 'yellow',
      });
      return;
    }

    setSubmittingAnamnesis(true);
    try {
      await preSchedulingService.submitPublicAnamnesis(token, {
        answers: meta.anamnesis.questions.map((question) => {
          const current = anamnesisAnswers[String(question.id)] || {};
          return {
            questionId: String(question.id),
            answerText: current.answerText || undefined,
            answerValues: current.answerValues || [],
            answerBoolean: current.answerBoolean ?? null,
            answerNumber: current.answerNumber ?? null,
          };
        }),
      });
      showNotification({
        title: 'Anamnese enviada',
        message: 'As respostas foram registradas com sucesso.',
        color: 'green',
      });
      await queryClient.invalidateQueries({ queryKey: [...queryKeys.publicPreSchedulingMeta, token || ''] });
    } catch (err: any) {
      if (err?.response?.status === 410) setExpired(true);
      showNotification({
        title: 'Erro ao enviar anamnese',
        message: resolveApiErrorMessage(err, 'Não foi possível enviar a anamnese.'),
        color: 'red',
      });
    } finally {
      setSubmittingAnamnesis(false);
    }
  };

  return (
    <Box bg="#0A1128" style={{ minHeight: '100vh' }} p={{ base: 'md', md: 'xl' }}>
      <Stack maw={920} mx="auto" gap="md">
        <Paper p={{ base: 'md', md: 'lg' }} withBorder bg="#001F54">
          <Stack gap={4}>
            <Text size="xl" fw={700} c="white">Pré-atendimento • Documentos e anamnese</Text>
            <Text c="rgba(255,255,255,0.8)" size="sm">
              Confirme sua identidade para liberar os anexos e, quando houver, responder a anamnese do procedimento.
            </Text>
          </Stack>
        </Paper>

        {loading ? (
          <Paper p="xl" bg="#001F54" withBorder>
            <Group justify="center"><Loader size="sm" color="white" /></Group>
          </Paper>
        ) : !meta ? (
          <Paper p="xl" bg="#001F54" withBorder>
            <Text c="white">Link inválido ou expirado.</Text>
          </Paper>
        ) : expired ? (
          <Paper p="xl" bg="#001F54" withBorder>
            <Center py="xl">
              <Stack align="center" gap="sm">
                <Text size="xl" fw={700} c="white">Sessão expirada</Text>
                <Text c="rgba(255,255,255,0.8)" ta="center" maw={520}>
                  O tempo para responder este link terminou. Solicite um novo envio à clínica para continuar.
                </Text>
              </Stack>
            </Center>
          </Paper>
        ) : interactionCompleted ? (
          <Paper p="xl" bg="#001F54" withBorder>
            <Center py="xl">
              <Stack align="center" gap="md">
                <ThemeIcon size={84} radius="xl" color="green" variant="light">
                  <CheckCheck size={40} />
                </ThemeIcon>
                <Text size="xl" fw={700} c="white">Tudo respondido com sucesso</Text>
                <Text c="rgba(255,255,255,0.8)" ta="center" maw={560}>
                  Suas respostas e anexos foram recebidos pela clínica. Você já pode fechar esta tela.
                </Text>
              </Stack>
            </Center>
          </Paper>
        ) : (
          <>
            {(() => {
              const requireFacial = meta.requireFacialForPatientRegistration !== false;
              const identityStepDesc = requireFacial ? 'Reconhecimento facial' : 'Código por e-mail';
              return (
                <>
                  <Paper p="md" bg="#001F54" withBorder>
                    <Stepper
                      active={!verified ? 0 : (anamnesisAnswered || !meta.anamnesis ? 2 : 1)}
                      color="green"
                      size="sm"
                      styles={{
                        stepLabel: { color: 'white' },
                        stepDescription: { color: 'rgba(255,255,255,0.7)' },
                      }}
                    >
                      <Stepper.Step label="Validar identidade" description={identityStepDesc} />
                      <Stepper.Step label="Responder anamnese" description={meta.anamnesis ? 'Perguntas do procedimento' : 'Sem anamnese para este procedimento'} />
                      <Stepper.Step label="Enviar anexos" description="Documentos do atendimento" />
                    </Stepper>
                  </Paper>

                  <Paper p="lg" bg="#001F54" withBorder>
                    <Stack gap="md">
                      <Group justify="space-between" align="start">
                        <Stack gap={0}>
                          <Text c="white" fw={700}>{meta.patientName}</Text>
                          <Text c="rgba(255,255,255,0.8)" size="sm">{scheduleSummary}</Text>
                        </Stack>
                        <Badge color={verified ? 'green' : 'yellow'} variant="light">
                          {verified ? 'Identidade validada' : 'Validação pendente'}
                        </Badge>
                      </Group>

                      {verified ? (
                        <Text size="sm" c="rgba(255,255,255,0.8)">
                          {requireFacial ? 'Reconhecimento facial concluído.' : 'Verificação por e-mail concluída.'} Você já pode prosseguir.
                        </Text>
                      ) : requireFacial ? (
                        <Group justify="space-between">
                          <Text size="sm" c="rgba(255,255,255,0.8)">
                            Para seguir, confirme sua identidade por reconhecimento facial.
                          </Text>
                          <Button color="darkBlue" onClick={() => setFacialOpen(true)} loading={verifying}>
                            Validar identidade
                          </Button>
                        </Group>
                      ) : !meta.patientEmailMasked ? (
                        <Paper p="md" bg="#0A1128" withBorder radius="md">
                          <Text c="rgba(255,220,100,0.95)" size="sm" fw={500}>
                            Não há e-mail cadastrado para este paciente. Por favor, procure a recepção para validar sua identidade presencialmente.
                          </Text>
                        </Paper>
                      ) : (
                        <Stack gap="sm">
                          <Text size="sm" c="rgba(255,255,255,0.8)">
                            {emailCodeSent
                              ? `Um código de 6 dígitos foi enviado para ${emailCodeMasked}. Informe o código abaixo para confirmar sua identidade.`
                              : `Enviaremos um código de verificação para o e-mail cadastrado (${meta.patientEmailMasked}).`}
                          </Text>

                          {!emailCodeSent ? (
                            <Button
                              color="darkBlue"
                              onClick={handleRequestEmailCode}
                              loading={requestingCode}
                              style={{ alignSelf: 'flex-start' }}
                            >
                              Enviar código por e-mail
                            </Button>
                          ) : (
                            <Stack gap="sm">
                              <Text size="sm" c="white" fw={500}>Digite o código recebido:</Text>
                              <PinInput
                                length={6}
                                type="number"
                                value={emailCode}
                                onChange={setEmailCode}
                                size="lg"
                                styles={{
                                  input: { background: '#0A1128', color: 'white', borderColor: '#3559A8', fontSize: 20, fontWeight: 700 },
                                }}
                              />
                              <Group gap="sm">
                                <Button
                                  color="green"
                                  onClick={handleVerifyEmailCode}
                                  loading={verifyingCode}
                                  disabled={emailCode.length !== 6}
                                >
                                  Confirmar código
                                </Button>
                                <Button
                                  variant="subtle"
                                  color="gray"
                                  onClick={handleRequestEmailCode}
                                  loading={requestingCode}
                                  disabled={resendCooldown > 0}
                                >
                                  {resendCooldown > 0 ? `Reenviar em ${resendCooldown}s` : 'Reenviar código'}
                                </Button>
                              </Group>
                            </Stack>
                          )}
                        </Stack>
                      )}
                    </Stack>
                  </Paper>

                  {verified && remainingSeconds !== null && (
                    <Paper p="md" bg="#12305f" withBorder>
                      <Group justify="space-between" align="center">
                        <Text c="white" fw={600}>
                          Sessão disponível por mais
                        </Text>
                        <Badge color={remainingSeconds <= 300 ? 'red' : 'yellow'} variant="filled" size="lg">
                          {countdownLabel}
                        </Badge>
                      </Group>
                    </Paper>
                  )}
                </>
              );
            })()}

            {verified && meta.anamnesis && (
              <Paper p="lg" bg="#001F54" withBorder>
                <Stack gap="sm">
                  <Group justify="space-between" align="start">
                    <Stack gap={0}>
                      <Text fw={700} c="white">Anamnese</Text>
                      <Text size="sm" c="rgba(255,255,255,0.85)">{meta.anamnesis.name}</Text>
                      {meta.anamnesis.description && (
                        <Text size="sm" c="rgba(255,255,255,0.7)">{meta.anamnesis.description}</Text>
                      )}
                    </Stack>
                    <Badge color={anamnesisAnswered ? 'green' : 'yellow'} variant="light">
                      {anamnesisAnswered ? 'Anamnese respondida' : 'Resposta pendente'}
                    </Badge>
                  </Group>

                  <Stack gap="md">
                    {meta.anamnesis.questions.map((question) => {
                      const answer = anamnesisAnswers[String(question.id)] || {};
                      const label = `${question.label}${question.isRequired ? ' *' : ''}`;
                      const options = (question.options || []).map((option) => ({
                        value: option.value,
                        label: option.label,
                      }));

                      if (anamnesisAnswered) {
                        const displayValue = answer.answerValues && answer.answerValues.length > 0
                          ? answer.answerValues.join(', ')
                          : answer.answerBoolean !== null && answer.answerBoolean !== undefined
                            ? (answer.answerBoolean ? 'Sim' : 'Não')
                            : answer.answerNumber !== null && answer.answerNumber !== undefined
                              ? String(answer.answerNumber)
                              : answer.answerText || 'Sem resposta';

                        return (
                          <Paper key={question.id} p="sm" bg="#0A1128" withBorder>
                            <Text size="sm" fw={600} c="white">{label}</Text>
                            {question.helpText && (
                              <Text size="xs" c="rgba(255,255,255,0.65)">{question.helpText}</Text>
                            )}
                            <Text mt={6} c="white">{displayValue}</Text>
                          </Paper>
                        );
                      }

                      if (question.responseType === 'TEXTAREA') {
                        return (
                          <Textarea
                            key={question.id}
                            label={label}
                            description={question.helpText || undefined}
                            placeholder={question.placeholder || undefined}
                            value={answer.answerText || ''}
                            onChange={(event) => {
                              const value = event.currentTarget.value;
                              setAnamnesisAnswers((prev) => ({
                                ...prev,
                                [String(question.id)]: { ...prev[String(question.id)], answerText: value },
                              }));
                            }}
                            minRows={3}
                            styles={{
                              label: { color: 'white' },
                              description: { color: 'rgba(255,255,255,0.65)' },
                              input: { background: '#0A1128', color: 'white', borderColor: '#3559A8' },
                            }}
                          />
                        );
                      }

                      if (question.responseType === 'SINGLE_CHOICE') {
                        return (
                          <Select
                            key={question.id}
                            label={label}
                            description={question.helpText || undefined}
                            placeholder={question.placeholder || 'Selecione'}
                            data={options}
                            value={answer.answerValues?.[0] || null}
                            onChange={(value) => {
                              setAnamnesisAnswers((prev) => ({
                                ...prev,
                                [String(question.id)]: { ...prev[String(question.id)], answerValues: value ? [value] : [] },
                              }));
                            }}
                            styles={{
                              label: { color: 'white' },
                              description: { color: 'rgba(255,255,255,0.65)' },
                              input: { background: '#0A1128', color: 'white', borderColor: '#3559A8' },
                              dropdown: { background: '#0A1128', borderColor: '#3559A8' },
                              option: { color: 'white' },
                            }}
                          />
                        );
                      }

                      if (question.responseType === 'MULTIPLE_CHOICE') {
                        return (
                          <MultiSelect
                            key={question.id}
                            label={label}
                            description={question.helpText || undefined}
                            placeholder={question.placeholder || 'Selecione uma ou mais opções'}
                            data={options}
                            value={answer.answerValues || []}
                            onChange={(value) => {
                              setAnamnesisAnswers((prev) => ({
                                ...prev,
                                [String(question.id)]: { ...prev[String(question.id)], answerValues: value },
                              }));
                            }}
                            styles={{
                              label: { color: 'white' },
                              description: { color: 'rgba(255,255,255,0.65)' },
                              input: { background: '#0A1128', color: 'white', borderColor: '#3559A8' },
                              dropdown: { background: '#0A1128', borderColor: '#3559A8' },
                              option: { color: 'white' },
                              pill: { background: '#3559A8', color: 'white' },
                            }}
                          />
                        );
                      }

                      if (question.responseType === 'BOOLEAN') {
                        return (
                          <Select
                            key={question.id}
                            label={label}
                            description={question.helpText || undefined}
                            data={[
                              { value: 'true', label: 'Sim' },
                              { value: 'false', label: 'Não' },
                            ]}
                            value={typeof answer.answerBoolean === 'boolean' ? String(answer.answerBoolean) : null}
                            onChange={(value) => {
                              setAnamnesisAnswers((prev) => ({
                                ...prev,
                                [String(question.id)]: { ...prev[String(question.id)], answerBoolean: value === 'true' },
                              }));
                            }}
                            styles={{
                              label: { color: 'white' },
                              description: { color: 'rgba(255,255,255,0.65)' },
                              input: { background: '#0A1128', color: 'white', borderColor: '#3559A8' },
                              dropdown: { background: '#0A1128', borderColor: '#3559A8' },
                              option: { color: 'white' },
                            }}
                          />
                        );
                      }

                      return (
                        <TextInput
                          key={question.id}
                          label={label}
                          description={question.helpText || undefined}
                          placeholder={question.placeholder || undefined}
                          type={question.responseType === 'NUMBER' ? 'number' : question.responseType === 'DATE' ? 'date' : question.responseType === 'TIME' ? 'time' : question.responseType === 'DATETIME' ? 'datetime-local' : 'text'}
                          value={question.responseType === 'NUMBER'
                            ? (answer.answerNumber ?? '').toString()
                            : answer.answerText || ''}
                          onChange={(event) => {
                            const value = event.currentTarget.value;
                            setAnamnesisAnswers((prev) => ({
                              ...prev,
                              [String(question.id)]: question.responseType === 'NUMBER'
                                ? { ...prev[String(question.id)], answerNumber: value === '' ? null : Number(value) }
                                : { ...prev[String(question.id)], answerText: value },
                            }));
                          }}
                          styles={{
                            label: { color: 'white' },
                            description: { color: 'rgba(255,255,255,0.65)' },
                            input: { background: '#0A1128', color: 'white', borderColor: '#3559A8' },
                          }}
                        />
                      );
                    })}
                  </Stack>

                  {!anamnesisAnswered && (
                    <Group justify="flex-end">
                      <Button color="green" onClick={handleSubmitAnamnesis} loading={submittingAnamnesis}>
                        Enviar anamnese
                      </Button>
                    </Group>
                  )}
                </Stack>
              </Paper>
            )}

            {verified && (
              <Paper p="lg" bg="#001F54" withBorder>
                <Stack gap="sm">
                  <Text fw={700} c="white">Anexar documentos</Text>
                  <Text size="sm" c="rgba(255,255,255,0.8)">
                    Documento de identidade, pedido médico e outros anexos relevantes.
                  </Text>

                  <Group grow align="end">
                    <Select
                      label="Tipo de documento"
                      data={DOCUMENT_TYPES}
                      value={docType}
                      onChange={setDocType}
                      c="white"
                      styles={{
                        label: { color: 'white' },
                        input: { background: '#0A1128', color: 'white', borderColor: '#3559A8' },
                        dropdown: { background: '#0A1128', borderColor: '#3559A8' },
                        option: { color: 'white' },
                      }}
                    />
                    <TextInput
                      label="Arquivo selecionado"
                      value={selectedFile?.name || ''}
                      placeholder="Nenhum arquivo"
                      readOnly
                      c="white"
                      styles={{
                        label: { color: 'white' },
                        input: { background: '#0A1128', color: '#9fb6ea', borderColor: '#3559A8' },
                      }}
                    />
                  </Group>

                  <Group justify="space-between">
                    <Button
                      variant="default"
                      component="label"
                      styles={{ root: { background: '#0A1128', color: 'white', borderColor: '#3559A8' } }}
                    >
                      Selecionar arquivo
                      <input
                        type="file"
                        hidden
                        onChange={(e) => {
                          const file = e.currentTarget.files?.[0] || null;
                          setSelectedFile(file);
                        }}
                      />
                    </Button>
                    <Button
                      color="darkBlue"
                      disabled={!selectedFile || !docType}
                      onClick={handleUpload}
                      loading={uploading}
                    >
                      Enviar documento
                    </Button>
                  </Group>

                  <Text size="sm" c="rgba(255,255,255,0.85)">
                    Documentos já enviados: {meta.documentsCount}
                  </Text>
                  <Stack gap={6}>
                    {meta.documents.map((doc) => (
                      <Paper key={doc.id} p="xs" bg="#0A1128" withBorder>
                        <Text size="sm" c="white">{doc.documentType} • {doc.fileName}</Text>
                        <Text size="xs" c="rgba(255,255,255,0.7)">
                          Enviado em {dayjs(doc.uploadedAt).format('DD/MM/YYYY HH:mm')}
                        </Text>
                      </Paper>
                    ))}
                    {meta.documents.length === 0 && (
                      <Text size="sm" c="rgba(255,255,255,0.7)">Nenhum documento enviado ainda.</Text>
                    )}
                  </Stack>

                  <Textarea
                    label="O que você está sentindo?"
                    description="Descreva seus sintomas ou queixas para auxiliar o atendimento."
                    placeholder="Ex: dor de cabeça, tontura, falta de ar..."
                    value={patientComplaints}
                    onChange={(e) => setPatientComplaints(e.currentTarget.value)}
                    minRows={3}
                    styles={{
                      label: { color: 'white' },
                      description: { color: 'rgba(255,255,255,0.65)' },
                      input: { background: '#0A1128', color: 'white', borderColor: '#3559A8' },
                    }}
                  />

                  <Group justify="flex-end" mt="sm">
                    <Button
                      color="green"
                      variant="filled"
                      onClick={handleFinalize}
                      loading={finalizing}
                      disabled={((meta.documentsCount || 0) <= 0 && !anamnesisAnswered)}
                    >
                      Finalizar envio
                    </Button>
                  </Group>
                </Stack>
              </Paper>
            )}
          </>
        )}
      </Stack>

      <FacialCapture
        opened={facialOpen}
        onClose={() => setFacialOpen(false)}
        onCapture={handleVerifyCapture}
        title="Validação facial"
        description="Posicione o rosto no centro para validar sua identidade."
      />
    </Box>
  );
}

export default PublicPreAgendamentoDocs;
