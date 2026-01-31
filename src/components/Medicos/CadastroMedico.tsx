import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Group,
  Text,
  Button,
  Select,
  Textarea,
  TextInput,
  NumberInput,
  MultiSelect,
  Switch,
  SimpleGrid,
  Stack,
  Paper,
  Title,
  Popover,
  ActionIcon,
  Modal,
  Center,
  ThemeIcon
} from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { ChevronLeft, Check, Calendar as CalendarIcon } from 'lucide-react';
import { showNotification } from '@mantine/notifications';
import { DARK_BLUE } from '../../themes/theme';
import { Header } from '../Header/Header';
import { DatePicker } from '@mantine/dates';
import { onlyDigits, formatCPF, formatCEP, formatPhone, formatDateInput } from '../../utils/formatters';
import doctorService from '../../services/doctorService';

type Gender = 'male' | 'female' | 'other' | '';

interface DoctorForm {
  nome: string;
  crm: string;
  crmState: string;
  email: string;
  phone: string;
  cellphone: string;
  birthDate: Date | null;
  gender: Gender;
  cpf: string;
  rg: string;
  specialty: string;
  specialties: string[];
  consultationFee: number | null;
  biography: string;
  address: string;
  addressNumber: string;
  addressComplement: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
  isActive: boolean;
  workingDays: string[];
  workingHoursStart: string;
  workingHoursEnd: string;
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <Title order={5} fw={600} c={DARK_BLUE} mb="sm" mt="md">
      {children}
    </Title>
  );
}

const INITIAL_DOCTOR_FORM: DoctorForm = {
  nome: '',
  crm: '',
  crmState: '',
  email: '',
  phone: '',
  cellphone: '',
  birthDate: null,
  gender: '',
  cpf: '',
  rg: '',
  specialty: '',
  specialties: [],
  consultationFee: null,
  biography: '',
  address: '',
  addressNumber: '',
  addressComplement: '',
  neighborhood: '',
  city: '',
  state: '',
  zipCode: '',
  isActive: true,
  workingDays: [],
  workingHoursStart: '',
  workingHoursEnd: '',
};

export function CadastroMedico() {
  const navigate = useNavigate();
  const isMobile = useMediaQuery('(max-width: 799px)');
  const isTablet = useMediaQuery('(max-width: 1279px)');

  const formatDate = (d: Date | null) => {
    if (!d) return '';
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const parseDate = (s: string) => {
    if (!s) return null;
    const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (!m) return null;
    const day = Number(m[1]);
    const month = Number(m[2]) - 1;
    const year = Number(m[3]);
    const date = new Date(year, month, day);
    if (date.getFullYear() !== year || date.getMonth() !== month || date.getDate() !== day) return null;
    return date;
  };

  const [form, setForm] = useState<DoctorForm>({ ...INITIAL_DOCTOR_FORM });

  const [datePopoverOpened, setDatePopoverOpened] = useState(false);
  const [birthDateInput, setBirthDateInput] = useState('');
  useEffect(() => setBirthDateInput(formatDate(form.birthDate)), [form.birthDate]);
  const [saving, setSaving] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [lastCreatedName, setLastCreatedName] = useState<string | null>(null);

  const statesOptions = [
    'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'
  ].map((s) => ({ value: s, label: s }));

  const specialtyOptions = [
    { value: 'clinico', label: 'Clínico Geral' },
    { value: 'cardiologista', label: 'Cardiologia' },
    { value: 'ortopedista', label: 'Ortopedia' },
    { value: 'ginecologista', label: 'Ginecologia' },
  ];

  const daysOptions = [
    { value: 'Segunda', label: 'Segunda' },
    { value: 'Terca', label: 'Terça' },
    { value: 'Quarta', label: 'Quarta' },
    { value: 'Quinta', label: 'Quinta' },
    { value: 'Sexta', label: 'Sexta' },
    { value: 'Sabado', label: 'Sábado' },
    { value: 'Domingo', label: 'Domingo' },
  ];

  const validate = (data: DoctorForm) => {
    if (!data.nome.trim()) return 'Nome é obrigatório';
    if (!data.crm.trim()) return 'CRM é obrigatório';
    if (!data.crmState) return 'UF do CRM é obrigatório';
    if (!/^[\w-.]+@[\w-]+\.[\w-.]+$/.test(data.email)) return 'Email inválido';
    if (!/^\d{11}$/.test(data.cpf)) return 'CPF deve conter 11 dígitos numéricos';
    if (!data.birthDate) return 'Data de nascimento é obrigatória';
    if (data.birthDate && data.birthDate > new Date()) return 'Data de nascimento inválida';
    if (data.consultationFee !== null && data.consultationFee < 0) return 'Valor da consulta inválido';
    if (data.workingHoursStart && !/^\d{2}:\d{2}$/.test(data.workingHoursStart)) return 'Formato de início do horário inválido (HH:MM)';
    if (data.workingHoursEnd && !/^\d{2}:\d{2}$/.test(data.workingHoursEnd)) return 'Formato de fim do horário inválido (HH:MM)';
    return null;
  };

  const handleSave = async () => {
    const err = validate(form);
    if (err) {
      showNotification({ title: 'Erro', message: err, color: 'red' });
      return;
    }

    setSaving(true);

    try {
      const payload = {
        crm: form.crm.trim(),
        crmState: form.crmState.trim().toUpperCase(),
        name: form.nome.trim(),
        email: form.email?.trim() || undefined,
        phone: form.phone || undefined,
        cellphone: form.cellphone || undefined,
        birthDate: form.birthDate ? form.birthDate.toISOString().slice(0, 10) : undefined,
        gender: form.gender ? form.gender.toUpperCase() : undefined,
        cpf: form.cpf,
        rg: form.rg?.trim() || undefined,
        specialty: form.specialty || undefined,
        specialties: form.specialties || [],
        consultationFee: form.consultationFee ?? undefined,
        biography: form.biography || undefined,
        address: form.address || undefined,
        addressNumber: form.addressNumber || undefined,
        addressComplement: form.addressComplement || undefined,
        neighborhood: form.neighborhood || undefined,
        city: form.city || undefined,
        state: form.state || undefined,
        zipCode: form.zipCode || undefined,
        workingDays: form.workingDays || [],
        workingHoursStart: form.workingHoursStart || undefined,
        workingHoursEnd: form.workingHoursEnd || undefined,
      };

      await doctorService.createDoctor(payload);

      setLastCreatedName(payload.name);
      setShowSuccessModal(true);
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || 'Erro ao registrar médico';
      showNotification({ title: 'Erro', message: msg, color: 'red' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box bg="#f8f9fa" style={{ minHeight: '100vh' }}>
      <Header />

      <Box p={isMobile ? 'sm' : isTablet ? 'md' : 'xl'} maw={isMobile ? '100%' : 1000} mx="auto">
        {/* Header da página */}
        <Group mb={isMobile ? 20 : 30} justify="space-between" align="center">
          <Group align="center">
            <ActionIcon variant="default" size="xl" onClick={() => navigate('/dashboard')}>
              <ChevronLeft size={28} />
            </ActionIcon>

            <Box>
              <Text fw={600} size={isMobile ? 'md' : 'lg'} style={{ color: DARK_BLUE }}>
                Cadastro de Médico
              </Text>
              <Text size="sm" style={{ color: DARK_BLUE, opacity: 0.7 }}>
                Registro de médicos
              </Text>
            </Box>
          </Group>

          <Group>
            <Button bg={DARK_BLUE} c="white" leftSection={<Check size={16} />} onClick={handleSave} loading={saving} disabled={saving} size={isMobile ? 'sm' : 'md'} fw={600}>
              Salvar
            </Button>
          </Group>
        </Group>

        <Stack gap="md">
          {/* Dados Pessoais */}
          <Paper p="md" withBorder radius="md">
            <SectionTitle>Dados Pessoais</SectionTitle>
            <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
              <TextInput label="Nome completo" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.currentTarget.value })} required />
              <TextInput label="CPF" value={formatCPF(form.cpf)} onChange={(e) => setForm({ ...form, cpf: onlyDigits(e.currentTarget.value) })} maxLength={14} required />
              <TextInput label="RG" value={form.rg} onChange={(e) => setForm({ ...form, rg: e.currentTarget.value })} />

              <Popover opened={datePopoverOpened} onClose={() => setDatePopoverOpened(false)} position="bottom-start" withArrow>
                <Popover.Target>
                  <TextInput
                    label="Data de nascimento"
                    placeholder="dd/mm/aaaa"
                    value={birthDateInput}
                    onChange={(e) => setBirthDateInput(formatDateInput(e.currentTarget.value))}
                    onBlur={() => {
                      if (!birthDateInput) {
                        setForm({ ...form, birthDate: null });
                        return;
                      }
                      const d = parseDate(birthDateInput);
                      if (!d) {
                        showNotification({ title: 'Erro', message: 'Data de nascimento inválida', color: 'red' });
                        setForm({ ...form, birthDate: null });
                      } else {
                        setForm({ ...form, birthDate: d });
                      }
                    }}
                    required
                    rightSection={
                      <ActionIcon size="sm" variant="subtle" onClick={() => setDatePopoverOpened((o) => !o)}>
                        <CalendarIcon size={16} />
                      </ActionIcon>
                    }
                    onClick={() => setDatePopoverOpened(true)}
                    style={{ cursor: 'text' }}
                  />
                </Popover.Target>
                <Popover.Dropdown>
                  <DatePicker
                    value={form.birthDate}
                    onChange={(d) => {
                      setForm({ ...form, birthDate: d });
                      setBirthDateInput(formatDate(d));
                      setDatePopoverOpened(false);
                    }}
                    maxDate={new Date()}
                  />
                </Popover.Dropdown>
              </Popover>

              <Select
                label="Gênero"
                placeholder="Selecione"
                data={[{ value: 'male', label: 'Masculino' }, { value: 'female', label: 'Feminino' }, { value: 'other', label: 'Outro' }]}
                value={form.gender}
                onChange={(v) => setForm({ ...form, gender: (v as Gender) || '' })}
              />

              <TextInput label="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.currentTarget.value })} required />
              <TextInput label="Telefone" value={formatPhone(form.phone)} onChange={(e) => setForm({ ...form, phone: onlyDigits(e.currentTarget.value) })} />
              <TextInput label="Celular" value={formatPhone(form.cellphone)} onChange={(e) => setForm({ ...form, cellphone: onlyDigits(e.currentTarget.value) })} />
            </SimpleGrid>
          </Paper>

          {/* Dados Profissionais */}
          <Paper p="md" withBorder radius="md">
            <SectionTitle>Dados Profissionais</SectionTitle>
            <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
              <TextInput label="CRM" value={form.crm} onChange={(e) => setForm({ ...form, crm: e.currentTarget.value })} required />
              <Select
                label="UF do CRM"
                placeholder="Selecione"
                data={statesOptions}
                value={form.crmState}
                onChange={(v) => setForm({ ...form, crmState: v || '' })}
                required
              />
              <Select
                label="Especialidade principal"
                placeholder="Escolha uma"
                data={specialtyOptions}
                value={form.specialty}
                onChange={(v) => setForm({ ...form, specialty: v || '' })}
              />
              <MultiSelect
                label="Outras especialidades"
                placeholder="Adicionar"
                data={specialtyOptions}
                value={form.specialties}
                onChange={(v) => setForm({ ...form, specialties: v })}
              />
              <NumberInput
                label="Valor da consulta (R$)"
                placeholder="0,00"
                value={form.consultationFee ?? undefined}
                onChange={(v) => setForm({ ...form, consultationFee: typeof v === 'number' ? v : null })}
                decimalScale={2}
                min={0}
                prefix="R$ "
              />
            </SimpleGrid>
            <Textarea
              label="Biografia"
              placeholder="Breve descrição profissional"
              value={form.biography}
              onChange={(e) => setForm({ ...form, biography: e.currentTarget.value })}
              minRows={3}
              mt="md"
            />
          </Paper>

          {/* Endereço */}
          <Paper p="md" withBorder radius="md">
            <SectionTitle>Endereço</SectionTitle>
            <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="md">
              <TextInput label="CEP" value={formatCEP(form.zipCode)} onChange={(e) => setForm({ ...form, zipCode: onlyDigits(e.currentTarget.value) })} maxLength={9} style={{ gridColumn: 'span 1' }} />
              <TextInput label="Endereço" value={form.address} onChange={(e) => setForm({ ...form, address: e.currentTarget.value })} style={{ gridColumn: isMobile ? 'span 1' : 'span 2' }} />
              <TextInput label="Número" value={form.addressNumber} onChange={(e) => setForm({ ...form, addressNumber: e.currentTarget.value })} />
            </SimpleGrid>
            <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="md" mt="md">
              <TextInput label="Complemento" value={form.addressComplement} onChange={(e) => setForm({ ...form, addressComplement: e.currentTarget.value })} />
              <TextInput label="Bairro" value={form.neighborhood} onChange={(e) => setForm({ ...form, neighborhood: e.currentTarget.value })} />
              <TextInput label="Cidade" value={form.city} onChange={(e) => setForm({ ...form, city: e.currentTarget.value })} />
              <Select
                label="Estado"
                placeholder="UF"
                data={statesOptions}
                value={form.state}
                onChange={(v) => setForm({ ...form, state: v || '' })}
              />
            </SimpleGrid>
          </Paper>

          {/* Horário de Trabalho */}
          <Paper p="md" withBorder radius="md">
            <SectionTitle>Horário de Trabalho</SectionTitle>
            <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
              <MultiSelect
                label="Dias de trabalho"
                placeholder="Selecione os dias"
                data={daysOptions}
                value={form.workingDays}
                onChange={(v) => setForm({ ...form, workingDays: v })}
              />
              <TextInput
                label="Horário início"
                placeholder="08:00"
                value={form.workingHoursStart}
                onChange={(e) => setForm({ ...form, workingHoursStart: e.currentTarget.value })}
              />
              <TextInput
                label="Horário fim"
                placeholder="18:00"
                value={form.workingHoursEnd}
                onChange={(e) => setForm({ ...form, workingHoursEnd: e.currentTarget.value })}
              />
            </SimpleGrid>
          </Paper>

          {/* Botões finais */}
          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={() => navigate('/dashboard')}>Cancelar</Button>
            <Button bg={DARK_BLUE} onClick={handleSave} loading={saving} disabled={saving} size="md" c="white">Salvar</Button>
          </Group>
        </Stack>

        <Modal opened={showSuccessModal} onClose={() => setShowSuccessModal(false)} withCloseButton={false} centered size={420} closeOnEscape={true} closeOnClickOutside={false}>
          <Center style={{ flexDirection: 'column', gap: 16, padding: 8 }}>
            <ThemeIcon size={64} radius="xl" color="teal" variant="filled">
              <Check size={34} />
            </ThemeIcon>
            <Text fw={700} size="lg">Médico cadastrado</Text>
            <Text c="dimmed" align="center">{lastCreatedName ? `${lastCreatedName} foi cadastrado com sucesso.` : 'Médico cadastrado com sucesso.'}</Text>

            <Group mt={8} justify="center" gap="lg">
              <Button variant="default" onClick={() => { setShowSuccessModal(false); navigate('/dashboard'); }} style={{ minWidth: 180 }}>
                Voltar para o dashboard
              </Button>
              <Button bg={DARK_BLUE} c="white" onClick={() => { setForm({ ...INITIAL_DOCTOR_FORM }); setShowSuccessModal(false); }} style={{ minWidth: 180 }}>
                Cadastrar novo
              </Button>
            </Group>
          </Center>
        </Modal>
      </Box>
    </Box>
  );
}
