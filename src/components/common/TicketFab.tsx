import React, { useEffect, useRef, useState } from 'react';
import {
  ActionIcon,
  Box,
  Button,
  Group,
  Modal,
  Paper,
  ScrollArea,
  Select,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
  ThemeIcon,
} from '@/components/ui';
import { useDisclosure } from '@/components/ui';
import { notifications } from '@/components/ui';
import { AlertTriangle, Bug, CircleHelp, Lightbulb, LoaderCircle, MapPin, Send, Ticket } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import ticketService, { type TicketType } from '../../services/ticketService';
import aiHelpService, { type ChatMessage } from '../../services/aiHelpService';
import { resolveApiErrorMessage } from '../../lib/apiError';
import './TicketFab.css';

const FLOW_OPTIONS = [
  { value: 'ATENDIMENTO_AGENDA', label: 'Atendimento e Agenda' },
  { value: 'EXAMES_LAUDO', label: 'Exames e Laudo' },
  { value: 'CADASTROS', label: 'Cadastros' },
  { value: 'FINANCEIRO_FATURAMENTO', label: 'Financeiro e Faturamento' },
  { value: 'TEA', label: 'Módulo Terapias' },
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
  { value: 'MODULO_TEA', label: 'Módulo Terapias' },
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
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/^(\d+)\. (.+)$/gm, '<div style="display:flex;gap:6px;margin:2px 0"><span style="font-weight:600;color:var(--ui-primary);flex-shrink:0">$1.</span><span>$2</span></div>')
    .replace(/^[-•] (.+)$/gm, '<div style="display:flex;gap:6px;margin:2px 0"><span style="color:var(--ui-primary);flex-shrink:0">•</span><span>$1</span></div>')
    .replace(/\n/g, '<br/>');
}

function TypingDots() {
  return (
    <span className="ticket-fab-typing-dots">
      {[0, 150, 300].map((delay) => (
        <span key={delay} className="ticket-fab-typing-dot" style={{ animationDelay: `${delay}ms` }} />
      ))}
    </span>
  );
}

// ── AI Chat Tab ──────────────────────────────────────────────────────────────

function AiChatTab({ messages, setMessages }: {
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

  return (
    <Box className="ticket-fab-chat">
      {/* Messages */}
      <ScrollArea className="ticket-fab-chat-scroll" scrollbarSize={4}>
        {isEmpty ? (
          <Stack gap="sm">
            <Box className="ticket-fab-intro-bubble">
              <Text size="sm" lh={1.65}>
                Oi! Sou a <strong>Saú</strong>, assistente do Saudy. Pode me perguntar qualquer coisa sobre o sistema — estou aqui pra ajudar!
              </Text>
            </Box>
            <Text size="xs" className="ticket-fab-suggested-label">Perguntas frequentes:</Text>
            <Stack gap={6}>
              {SUGGESTED_QUESTIONS.map((q) => (
                <Box key={q} className="ticket-fab-suggestion" onClick={() => send(q)}>
                  {q}
                </Box>
              ))}
            </Stack>
          </Stack>
        ) : (
          <Stack gap={10} pb={4}>
            {messages.map((msg, i) => (
              <Box key={i} className={`ticket-fab-msg-row ticket-fab-msg-row--${msg.role}`}>
                {msg.role === 'assistant' && (
                  <img className="ticket-fab-msg-avatar" src="/sau.png" alt="Saú" />
                )}
                <Box className={`ticket-fab-bubble ticket-fab-bubble--${msg.role}`}>
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
      <Box className="ticket-fab-chat-input-wrap">
        <Box className="ticket-fab-chat-input-box">
          <textarea
            ref={textareaRef}
            className="ticket-fab-chat-textarea"
            value={input}
            onChange={(e) => setInput(e.currentTarget.value)}
            onKeyDown={handleKeyDown}
            placeholder="Escreva sua dúvida para a Saú..."
            rows={1}
            disabled={streaming}
          />
          <ActionIcon
            size={32} radius="md" color="darkBlue" variant="filled"
            onClick={() => send()} disabled={!input.trim() || streaming}
            style={{ flexShrink: 0, marginBottom: 1 }}
          >
            {streaming ? <LoaderCircle size={14} className="animate-spin" /> : <Send size={14} />}
          </ActionIcon>
        </Box>
        <Text size="xs" ta="center" mt={6} className="ticket-fab-chat-hint">Enter para enviar · Shift+Enter para nova linha</Text>
      </Box>
    </Box>
  );
}

// ── Ticket Form Tab ──────────────────────────────────────────────────────────

function TicketFormTab({ pathname, onSuccess }: { pathname: string; onSuccess: () => void }) {
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
      <Text size="sm" c="dimmed" lh={1.6}>
        Descreva o problema com detalhes. Nossa equipe analisa e responde em até 24h úteis.
      </Text>

      <Stack gap={6}>
        <Text size="xs" fw={600} c="dimmed" tt="uppercase" style={{ letterSpacing: '0.06em' }}>
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
                className={`ticket-fab-type-card${selected ? ' ticket-fab-type-card--selected' : ''}`}
                style={{ '--card-hue': `var(--ui-hue-${t.color})` } as React.CSSProperties}
              >
                <Stack gap={6} align="center">
                  <ThemeIcon color={t.color} variant={selected ? 'filled' : 'light'} size="lg" radius="md">
                    <t.icon size={16} />
                  </ThemeIcon>
                  <Text size="sm" fw={700} ta="center">{t.label}</Text>
                  <Text size="xs" c="dimmed" ta="center" lh={1.4}>{t.desc}</Text>
                </Stack>
              </Paper>
            );
          })}
        </SimpleGrid>
      </Stack>

      <SimpleGrid cols={2} spacing="sm">
        <Select label="Fluxo" placeholder="Selecione o fluxo" data={FLOW_OPTIONS} value={flow} onChange={setFlow} searchable required />
        <Select label="Módulo" placeholder="Selecione o módulo" data={MODULE_OPTIONS} value={moduleName} onChange={setModuleName} searchable required />
      </SimpleGrid>

      <Box style={{ position: 'relative' }}>
        <Textarea
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
          className="ticket-fab-char-count"
        >
          {description.length}/{MAX_DESC}
        </Text>
      </Box>

      <Group gap={6}>
        <MapPin size={12} className="ticket-fab-context-note" />
        <Text size="xs" className="ticket-fab-context-note">
          Contexto capturado:{' '}
          <Text span fw={600} c="dimmed">{readablePathname(pathname)}</Text>
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

function HelpModal({ pathname, onClose, messages, setMessages }: {
  pathname: string;
  onClose: () => void;
  messages: ChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
}) {
  const [tab, setTab] = useState<'ai' | 'ticket'>('ai');

  return (
    <Box className="ticket-fab-modal">
      {/* Unified header — gradient with Saú + tabs + close */}
      <Box className="ticket-fab-modal-header">
        {/* Saú identity */}
        <img className="ticket-fab-avatar" src="/sau.png" alt="Saú" />
        <Box style={{ flex: 1 }}>
          <Text fw={700} size="sm" className="ticket-fab-identity-name">Saú</Text>
          <Text size="xs" className="ticket-fab-identity-subtitle">Assistente Saudy</Text>
        </Box>

        {/* Tab pills */}
        <Group gap={4}>
          {([
            { value: 'ai',     label: 'Ajuda com IA',  icon: null },
            { value: 'ticket', label: 'Chamado',        icon: <Ticket size={12} /> },
          ] as const).map((t) => {
            const active = tab === t.value;
            return (
              <button
                key={t.value}
                type="button"
                onClick={() => setTab(t.value)}
                className={`ticket-fab-tab-pill${active ? ' ticket-fab-tab-pill--active' : ''}`}
              >
                {t.icon}
                {t.label}
              </button>
            );
          })}
        </Group>

        {/* Close */}
        <ActionIcon variant="transparent" size="sm" onClick={onClose} className="ticket-fab-close">
          ✕
        </ActionIcon>
      </Box>

      {tab === 'ai' && <AiChatTab messages={messages} setMessages={setMessages} />}
      {tab === 'ticket' && (
        <ScrollArea style={{ height: 440 }} scrollbarSize={4}>
          <Box p="lg">
            <TicketFormTab pathname={pathname} onSuccess={onClose} />
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

  const hidden = HIDDEN_PATH_PREFIXES.some((prefix) => location.pathname.startsWith(prefix));

  if (!isAuthenticated() || hidden) return null;

  return (
    <>
      <Box className="ticket-fab-container">
        <Paper radius="xl" className="ticket-fab-trigger-wrap">
          <ActionIcon size={44} radius="xl" variant="transparent" onClick={open} aria-label="Abrir ajuda" className="ticket-fab-trigger">
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
        <HelpModal pathname={location.pathname} onClose={close} messages={chatMessages} setMessages={setChatMessages} />
      </Modal>
    </>
  );
}
