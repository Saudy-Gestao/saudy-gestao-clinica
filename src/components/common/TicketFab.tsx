import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActionIcon,
  Box,
  Button,
  Group,
  Modal,
  Paper,
  ScrollArea,
  SimpleGrid,
  Stack,
  Tabs,
  Text,
  ThemeIcon,
  useComputedColorScheme,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { AlertTriangle, Bug, CircleHelp, Lightbulb, LoaderCircle, MapPin, Send, Ticket } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import ticketService, { type TicketType } from '../../services/ticketService';
import aiHelpService, { type ChatMessage } from '../../services/aiHelpService';
import { resolveApiErrorMessage } from '../../lib/apiError';
import { FloatingSelect } from './FloatingSelect';
import { FloatingTextarea } from './FloatingTextarea';

const FLOW_OPTIONS = [
  { value: 'ATENDIMENTO_AGENDA', label: 'Atendimento e Agenda' },
  { value: 'EXAMES_LAUDO', label: 'Exames e Laudo' },
  { value: 'CADASTROS', label: 'Cadastros' },
  { value: 'FINANCEIRO_FATURAMENTO', label: 'Financeiro e Faturamento' },
  { value: 'TEA', label: 'Módulo TEA' },
  { value: 'OUTRO', label: 'Outro fluxo' },
];

const MODULE_OPTIONS = [
  { value: 'DASHBOARD', label: 'Dashboard' },
  { value: 'PRE_ATENDIMENTO', label: 'Pré-atendimento' },
  { value: 'AGENDAMENTO', label: 'Agendamento' },
  { value: 'CONSULTA', label: 'Consulta' },
  { value: 'EXECUCAO_EXAMES', label: 'Execução de Exames' },
  { value: 'LAUDO_EXAMES', label: 'Laudo de Exames' },
  { value: 'ENTREGA', label: 'Entrega' },
  { value: 'ESTOQUE', label: 'Estoque' },
  { value: 'FINANCEIRO', label: 'Financeiro' },
  { value: 'FATURAMENTO', label: 'Faturamento' },
  { value: 'SETTINGS', label: 'Configurações' },
  { value: 'MODULO_TEA', label: 'Módulo TEA' },
  { value: 'OUTRO', label: 'Outro módulo' },
];

const TYPE_CARDS: Array<{ value: TicketType; label: string; desc: string; icon: React.ElementType; color: string }> = [
  { value: 'BUG',         label: 'Bug',      desc: 'Comportamento incorreto', icon: Bug,           color: 'red'    },
  { value: 'ERROR',       label: 'Erro',     desc: 'Falha ou travamento',     icon: AlertTriangle, color: 'orange' },
  { value: 'IMPROVEMENT', label: 'Melhoria', desc: 'Sugestão ou melhoria',   icon: Lightbulb,     color: 'blue'   },
];

const HIDDEN_PATH_PREFIXES = [
  '/login', '/cadastro', '/esqueci-a-senha', '/adm', '/adm-register',
  '/check-in', '/pre-atendimento/documentos', '/pre-agendamento/documentos',
  '/teleconsulta/preparacao', '/teleconsulta/paciente', '/teleconsulta/finalizada',
];

const isAuthenticated = () => Boolean(localStorage.getItem('token'));

function detectModuleFromPath(pathname: string): string | null {
  if (pathname.includes('/tea')) return 'MODULO_TEA';
  if (pathname.includes('/laudo')) return 'LAUDO_EXAMES';
  if (pathname.includes('/exames')) return 'EXECUCAO_EXAMES';
  if (pathname.includes('/pre-atendimento')) return 'PRE_ATENDIMENTO';
  if (pathname.includes('/agenda')) return 'AGENDAMENTO';
  if (pathname.includes('/consulta')) return 'CONSULTA';
  if (pathname.includes('/entrega')) return 'ENTREGA';
  if (pathname.includes('/estoque')) return 'ESTOQUE';
  if (pathname.includes('/faturamento')) return 'FATURAMENTO';
  if (pathname.includes('/financeiro')) return 'FINANCEIRO';
  if (pathname.includes('/settings') || pathname.includes('/configuracoes')) return 'SETTINGS';
  if (pathname.includes('/dashboard')) return 'DASHBOARD';
  return null;
}

function readablePathname(pathname: string): string {
  const label = MODULE_OPTIONS.find((m) => m.value === detectModuleFromPath(pathname))?.label;
  return label ?? pathname;
}

const MAX_DESC = 1000;

// ── helpers ──────────────────────────────────────────────────────────────────

const SUGGESTED_QUESTIONS = [
  'Como criar um agendamento?',
  'Como gerar uma guia TISS?',
  'Como fazer o pré-agendamento?',
  'Como registrar a triagem?',
  'Como configurar o WhatsApp?',
];

function formatMessage(content: string) {
  return content
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code style="background:rgba(0,0,0,.08);padding:1px 5px;border-radius:4px;font-size:.85em;font-family:monospace">$1</code>')
    .replace(/^(\d+)\. (.+)$/gm, '<div style="display:flex;gap:6px;margin:2px 0"><span style="font-weight:600;color:#2c5be8;flex-shrink:0">$1.</span><span>$2</span></div>')
    .replace(/^[-•] (.+)$/gm, '<div style="display:flex;gap:6px;margin:2px 0"><span style="color:#4674ff;flex-shrink:0">•</span><span>$1</span></div>')
    .replace(/\n/g, '<br/>');
}

function TypingDots() {
  return (
    <span style={{ display: 'inline-flex', gap: 3, alignItems: 'center', height: 16 }}>
      {[0, 150, 300].map((delay) => (
        <span
          key={delay}
          style={{
            width: 6, height: 6, borderRadius: '50%',
            background: 'var(--mantine-color-gray-5)',
            display: 'inline-block',
            animation: 'sau-bounce 1s infinite',
            animationDelay: `${delay}ms`,
          }}
        />
      ))}
      <style>{`@keyframes sau-bounce{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-5px)}}`}</style>
    </span>
  );
}

// ── AI Chat Tab ──────────────────────────────────────────────────────────────

function AiChatTab({ isDark, messages, setMessages }: {
  isDark: boolean;
  messages: ChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
}) {
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streaming]);

  const send = async (text = input) => {
    if (!text.trim() || streaming) return;
    const userMsg: ChatMessage = { role: 'user', content: text.trim() };
    const newMessages = [...messages, userMsg];
    // optimistically add assistant placeholder
    setMessages([...newMessages, { role: 'assistant', content: '' }]);
    setInput('');
    setStreaming(true);

    const abort = new AbortController();
    abortRef.current = abort;
    let full = '';

    try {
      for await (const chunk of aiHelpService.chat(newMessages, abort.signal)) {
        if (chunk.done) break;
        if (chunk.text) {
          full += chunk.text;
          setMessages((prev) => {
            const updated = [...prev];
            updated[updated.length - 1] = { role: 'assistant', content: full };
            return updated;
          });
        }
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: 'assistant', content: '❌ Erro ao conectar com o assistente.' };
          return updated;
        });
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const isEmpty = messages.length === 0;
  const bubbleBg = isDark ? 'var(--mantine-color-dark-5)' : 'var(--mantine-color-gray-1)';
  const bubbleColor = isDark ? 'var(--mantine-color-gray-2)' : 'var(--mantine-color-gray-8)';

  return (
    <Box style={{ display: 'flex', flexDirection: 'column', height: 440 }}>

      {/* Messages */}
      <ScrollArea style={{ flex: 1, padding: '12px 16px' }} scrollbarSize={4}>
        {isEmpty ? (
          <Stack gap="sm">
            <Box style={{ background: isDark ? 'rgba(31,73,191,.15)' : '#eff6ff', borderRadius: 12, padding: '12px 14px' }}>
              <Text size="sm" lh={1.65} c={isDark ? 'gray.3' : 'gray.7'}>
                Oi! Sou a <strong>Saú</strong>, assistente do Saudy. Pode me perguntar qualquer coisa sobre o sistema — estou aqui pra ajudar!
              </Text>
            </Box>
            <Text size="xs" c="dimmed">Perguntas frequentes:</Text>
            <Stack gap={6}>
              {SUGGESTED_QUESTIONS.map((q) => (
                <Box
                  key={q}
                  onClick={() => send(q)}
                  style={{
                    cursor: 'pointer',
                    fontSize: 12,
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: `1px solid ${isDark ? 'var(--mantine-color-dark-4)' : 'var(--mantine-color-gray-3)'}`,
                    background: isDark ? 'var(--mantine-color-dark-6)' : 'var(--mantine-color-gray-0)',
                    color: isDark ? 'var(--mantine-color-gray-3)' : 'var(--mantine-color-gray-7)',
                    transition: 'all 100ms',
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = isDark ? 'var(--mantine-color-dark-5)' : '#eff6ff'; (e.currentTarget as HTMLDivElement).style.color = '#2c5be8'; (e.currentTarget as HTMLDivElement).style.borderColor = '#bfdbfe'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = isDark ? 'var(--mantine-color-dark-6)' : 'var(--mantine-color-gray-0)'; (e.currentTarget as HTMLDivElement).style.color = isDark ? 'var(--mantine-color-gray-3)' : 'var(--mantine-color-gray-7)'; (e.currentTarget as HTMLDivElement).style.borderColor = isDark ? 'var(--mantine-color-dark-4)' : 'var(--mantine-color-gray-3)'; }}
                >
                  {q}
                </Box>
              ))}
            </Stack>
          </Stack>
        ) : (
          <Stack gap={10} pb={4}>
            {messages.map((msg, i) => (
              <Box key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start', alignItems: 'flex-end', gap: 8 }}>
                {msg.role === 'assistant' && (
                  <img src="/sau.png" alt="Saú" style={{ width: 22, height: 22, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '1.5px solid #bfdbfe' }} />
                )}
                <Box style={{
                  maxWidth: '80%',
                  padding: '9px 13px',
                  borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                  background: msg.role === 'user' ? '#1f49bf' : bubbleBg,
                  color: msg.role === 'user' ? '#fff' : bubbleColor,
                  fontSize: 13,
                  lineHeight: 1.65,
                  wordBreak: 'break-word',
                }}>
                  {msg.role === 'assistant' && msg.content === '' && streaming && i === messages.length - 1
                    ? <TypingDots />
                    : msg.role === 'assistant'
                      ? <div dangerouslySetInnerHTML={{ __html: formatMessage(msg.content) }} />
                      : msg.content
                  }
                </Box>
              </Box>
            ))}
            <div ref={bottomRef} />
          </Stack>
        )}
      </ScrollArea>

      {/* Input */}
      <Box style={{
        padding: '10px 12px',
        borderTop: `1px solid ${isDark ? 'var(--mantine-color-dark-4)' : 'var(--mantine-color-gray-2)'}`,
        flexShrink: 0,
      }}>
        <Box style={{
          display: 'flex', alignItems: 'flex-end', gap: 8,
          background: isDark ? 'var(--mantine-color-dark-6)' : 'var(--mantine-color-gray-0)',
          borderRadius: 12,
          border: `1px solid ${isDark ? 'var(--mantine-color-dark-4)' : 'var(--mantine-color-gray-3)'}`,
          padding: '8px 10px 8px 14px',
        }}>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.currentTarget.value)}
            onKeyDown={handleKeyDown}
            placeholder="Escreva sua dúvida para a Saú..."
            rows={1}
            disabled={streaming}
            style={{
              flex: 1, background: 'transparent', border: 'none', outline: 'none', resize: 'none',
              fontSize: 13, lineHeight: 1.5, minHeight: 36, maxHeight: 100,
              color: isDark ? 'var(--mantine-color-gray-2)' : 'var(--mantine-color-gray-8)',
              fontFamily: 'inherit',
            }}
          />
          <ActionIcon
            size={32} radius="md" color="darkBlue" variant="filled"
            onClick={() => send()} disabled={!input.trim() || streaming}
            style={{ flexShrink: 0, marginBottom: 1 }}
          >
            {streaming ? <LoaderCircle size={14} className="animate-spin" /> : <Send size={14} />}
          </ActionIcon>
        </Box>
        <Text size="xs" c="dimmed" ta="center" mt={6}>Enter para enviar · Shift+Enter para nova linha</Text>
      </Box>
    </Box>
  );
}

// ── Ticket Form Tab ──────────────────────────────────────────────────────────

function TicketFormTab({ isDark, pathname, onSuccess }: { isDark: boolean; pathname: string; onSuccess: () => void }) {
  const [submitting, setSubmitting] = useState(false);
  const [flow, setFlow] = useState<string | null>(null);
  const [moduleName, setModuleName] = useState<string | null>(detectModuleFromPath(pathname));
  const [type, setType] = useState<TicketType>('BUG');
  const [description, setDescription] = useState('');

  const handleSubmit = async () => {
    if (!flow || !moduleName || !type || !description.trim()) {
      notifications.show({ title: 'Campos obrigatórios', message: 'Preencha todos os campos para abrir o chamado.', color: 'yellow' });
      return;
    }
    if (description.trim().length < 10) {
      notifications.show({ title: 'Descrição muito curta', message: 'Descreva melhor o contexto (mínimo de 10 caracteres).', color: 'yellow' });
      return;
    }
    setSubmitting(true);
    try {
      await ticketService.create({ flow, module: moduleName, type, description: description.trim() });
      notifications.show({ title: 'Chamado aberto', message: 'Seu ticket foi enviado para análise da equipe interna.', color: 'green' });
      onSuccess();
    } catch (error: any) {
      notifications.show({ title: 'Erro ao abrir chamado', message: resolveApiErrorMessage(error, 'Não foi possível enviar o ticket.'), color: 'red' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Stack gap="lg">
      <Text size="sm" c={isDark ? 'gray.4' : 'gray.6'} lh={1.6}>
        Descreva o problema com detalhes. Nossa equipe analisa e responde em até 24h úteis.
      </Text>

      <Stack gap={6}>
        <Text size="xs" fw={600} c={isDark ? 'gray.4' : 'gray.6'} tt="uppercase" style={{ letterSpacing: '0.06em' }}>
          Tipo de chamado *
        </Text>
        <SimpleGrid cols={3} spacing={8}>
          {TYPE_CARDS.map((t) => {
            const selected = type === t.value;
            return (
              <Paper
                key={t.value}
                withBorder
                p="sm"
                radius="md"
                onClick={() => setType(t.value)}
                style={{
                  cursor: 'pointer',
                  transition: 'all 120ms ease',
                  borderWidth: selected ? 2 : 1,
                  borderColor: selected
                    ? `var(--mantine-color-${t.color}-${isDark ? '7' : '5'})`
                    : isDark ? 'var(--mantine-color-dark-4)' : undefined,
                  background: selected
                    ? isDark ? `var(--mantine-color-${t.color}-9)` : `var(--mantine-color-${t.color}-0)`
                    : isDark ? 'var(--mantine-color-dark-6)' : undefined,
                }}
              >
                <Stack gap={6} align="center">
                  <ThemeIcon color={t.color} variant={selected ? 'filled' : 'light'} size="lg" radius="md">
                    <t.icon size={16} />
                  </ThemeIcon>
                  <Text size="sm" fw={700} ta="center">{t.label}</Text>
                  <Text size="xs" c={isDark ? 'gray.5' : 'dimmed'} ta="center" lh={1.4}>{t.desc}</Text>
                </Stack>
              </Paper>
            );
          })}
        </SimpleGrid>
      </Stack>

      <SimpleGrid cols={2} spacing="sm">
        <FloatingSelect label="Fluxo" placeholder="Selecione o fluxo" data={FLOW_OPTIONS} value={flow} onChange={setFlow} searchable required />
        <FloatingSelect label="Módulo" placeholder="Selecione o módulo" data={MODULE_OPTIONS} value={moduleName} onChange={setModuleName} searchable required />
      </SimpleGrid>

      <Box style={{ position: 'relative' }}>
        <FloatingTextarea
          label="Descrição detalhada"
          placeholder="Explique o que aconteceu, onde ocorreu e qual comportamento era esperado..."
          minRows={4}
          autosize
          required
          value={description}
          maxLength={MAX_DESC}
          onChange={(e) => setDescription(e.currentTarget.value)}
        />
        <Text
          size="xs"
          c={description.length > MAX_DESC * 0.9 ? 'orange' : 'dimmed'}
          style={{ position: 'absolute', bottom: 10, right: 12, pointerEvents: 'none' }}
        >
          {description.length}/{MAX_DESC}
        </Text>
      </Box>

      <Group gap={6}>
        <MapPin size={12} style={{ color: 'var(--mantine-color-gray-5)', flexShrink: 0 }} />
        <Text size="xs" c={isDark ? 'gray.5' : 'gray.5'}>
          Contexto capturado:{' '}
          <Text span fw={600} c={isDark ? 'gray.3' : 'gray.7'}>{readablePathname(pathname)}</Text>
        </Text>
      </Group>

      <Group justify="flex-end" pt={4}>
        <Button
          leftSection={submitting ? <LoaderCircle size={14} className="animate-spin" /> : <Send size={14} />}
          onClick={handleSubmit}
          loading={submitting}
        >
          Enviar chamado
        </Button>
      </Group>
    </Stack>
  );
}

// ── Tab switcher + container ─────────────────────────────────────────────────

function HelpModal({ isDark, pathname, onClose, messages, setMessages }: {
  isDark: boolean;
  pathname: string;
  onClose: () => void;
  messages: ChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
}) {
  const [tab, setTab] = useState<'ai' | 'ticket'>('ai');

  return (
    <Box style={{ display: 'flex', flexDirection: 'column', borderRadius: 12, overflow: 'hidden' }}>
      {/* Unified header — gradient with Saú + tabs + close */}
      <Box style={{
        background: 'linear-gradient(90deg, #1a2f6e 0%, #1565c0 60%, #0ea5e9 100%)',
        padding: '14px 16px',
        display: 'flex', alignItems: 'center', gap: 12,
        flexShrink: 0,
      }}>
        {/* Saú identity */}
        <img src="/sau.png" alt="Saú" style={{ width: 38, height: 38, borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(255,255,255,.35)', flexShrink: 0 }} />
        <Box style={{ flex: 1 }}>
          <Text fw={700} size="sm" style={{ color: '#fff', lineHeight: 1.2 }}>Saú</Text>
          <Text size="xs" style={{ color: 'rgba(255,255,255,.65)', lineHeight: 1.3 }}>Assistente Saudy</Text>
        </Box>

        {/* Tab pills */}
        <Group gap={4}>
          {([
            { value: 'ai',     label: 'Ajuda com IA',  icon: null },
            { value: 'ticket', label: 'Chamado',        icon: <Ticket size={12} /> },
          ] as const).map((t) => {
            const active = tab === t.value;
            return (
              <Box
                key={t.value}
                component="button"
                onClick={() => setTab(t.value)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '5px 12px', borderRadius: 20,
                  border: active ? 'none' : '1px solid rgba(255,255,255,.25)',
                  cursor: 'pointer', fontSize: 12, fontWeight: 600, lineHeight: 1,
                  transition: 'all 140ms ease',
                  background: active ? 'rgba(255,255,255,.95)' : 'transparent',
                  color: active ? '#1a2f6e' : 'rgba(255,255,255,.8)',
                }}
              >
                {t.icon}
                {t.label}
              </Box>
            );
          })}
        </Group>

        {/* Close */}
        <ActionIcon variant="transparent" color="white" size="sm" onClick={onClose} style={{ opacity: 0.7 }}>
          ✕
        </ActionIcon>
      </Box>

      {tab === 'ai' && <AiChatTab isDark={isDark} messages={messages} setMessages={setMessages} />}
      {tab === 'ticket' && (
        <ScrollArea style={{ height: 440 }} scrollbarSize={4}>
          <Box p="lg">
            <TicketFormTab isDark={isDark} pathname={pathname} onSuccess={onClose} />
          </Box>
        </ScrollArea>
      )}
    </Box>
  );
}

// ── Main FAB ─────────────────────────────────────────────────────────────────

export function TicketFab() {
  const location = useLocation();
  const [opened, { open, close }] = useDisclosure(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  const colorScheme = useComputedColorScheme('light');
  const isDark = colorScheme === 'dark';

  const hidden = useMemo(
    () => HIDDEN_PATH_PREFIXES.some((prefix) => location.pathname.startsWith(prefix)),
    [location.pathname],
  );

  if (!isAuthenticated() || hidden) return null;

  return (
    <>
      <Box style={{ position: 'fixed', right: 20, bottom: 20, zIndex: 210 }}>
        <Paper
          radius="xl"
          p={6}
          style={{
            border: '1px solid rgba(255,255,255,0.24)',
            background: 'linear-gradient(135deg, #132a63 0%, #1e3f95 100%)',
            boxShadow: '0 16px 42px rgba(19,42,99,0.38)',
          }}
        >
          <ActionIcon size={56} radius="xl" variant="transparent" color="white" onClick={open} aria-label="Abrir ajuda">
            <CircleHelp size={28} />
          </ActionIcon>
        </Paper>
      </Box>

      <Modal
        opened={opened}
        onClose={close}
        withCloseButton={false}
        centered
        size="lg"
        padding={0}
        radius="md"
      >
        <HelpModal isDark={isDark} pathname={location.pathname} onClose={close} messages={chatMessages} setMessages={setChatMessages} />
      </Modal>
    </>
  );
}
