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
import patientService from '../../services/patientService';

type Gender = 'male' | 'female' | 'other' | '';
type MaritalStatus = 'single' | 'married' | 'divorced' | 'widowed' | '';

type BloodType = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-' | '';

interface PatientForm {
  name: string;
  email: string;
  phone: string;
  cellphone: string;
  birthDate: Date | null;
  gender: Gender;
  cpf: string;
  rg: string;
  maritalStatus: MaritalStatus;
  occupation: string;
  address: string;
  addressNumber: string;
  addressComplement: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  emergencyContactRelationship: string;
  hasGuardian: boolean;
  guardianName: string;
  guardianCpf: string;
  guardianPhone: string;
  guardianRelationship: string;
  hasHealthInsurance: boolean;
  healthInsuranceName: string;
  healthInsuranceNumber: string;
  healthInsuranceExpiry: Date | null;
  bloodType: BloodType;
  allergies: string[];
  chronicConditions: string[];
  currentMedications: string[];
  observations: string;
  isActive: boolean;
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <Title order={5} fw={600} c={DARK_BLUE} mb="sm" mt="md">
      {children}
    </Title>
  );
}

export function CadastroPaciente() {
  const navigate = useNavigate();
  const isMobile = useMediaQuery('(max-width: 799px)');
  const isTablet = useMediaQuery('(max-width: 1279px)');

  // Ensure the page starts at the top (header) when this route/component mounts
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, []);

  const formatDate = (d: Date | null) => {
    if (!d) return '';
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const [datePopoverOpened, setDatePopoverOpened] = useState(false);
  const [birthDateInput, setBirthDateInput] = useState('');

  const [saving, setSaving] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [lastCreatedName, setLastCreatedName] = useState<string | null>(null);

  const [healthInsuranceInput, setHealthInsuranceInput] = useState('');
  const [, setHealthInsurancePopover] = useState(false);

  // Inputs temporários para campos que representam arrays — mantêm texto livre durante a digitação
  const [allergiesInput, setAllergiesInput] = useState('');
  const [chronicInput, setChronicInput] = useState('');
  const [medsInput, setMedsInput] = useState('');

  const INITIAL_PATIENT_FORM: PatientForm = {
    name: '',
    email: '',
    phone: '',
    cellphone: '',
    birthDate: null,
    gender: '',
    cpf: '',
    rg: '',
    maritalStatus: '',
    occupation: '',
    address: '',
    addressNumber: '',
    addressComplement: '',
    neighborhood: '',
    city: '',
    state: '',
    zipCode: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    emergencyContactRelationship: '',
    hasGuardian: false,
    guardianName: '',
    guardianCpf: '',
    guardianPhone: '',
    guardianRelationship: '',
    hasHealthInsurance: false,
    healthInsuranceName: '',
    healthInsuranceNumber: '',
    healthInsuranceExpiry: null,
    bloodType: '',
    allergies: [],
    chronicConditions: [],
    currentMedications: [],
    observations: '',
    isActive: true,
  };

  const [form, setForm] = useState<PatientForm>({ ...INITIAL_PATIENT_FORM });

  // Sincroniza os inputs temporários com os arrays do form
  useEffect(() => {
    setAllergiesInput(form.allergies.join(', '));
  }, [form.allergies]);

  useEffect(() => {
    setChronicInput(form.chronicConditions.join(', '));
  }, [form.chronicConditions]);

  useEffect(() => {
    setMedsInput(form.currentMedications.join(', '));
  }, [form.currentMedications]);

  useEffect(() => setBirthDateInput(formatDate(form.birthDate)), [form.birthDate]);
  useEffect(() => setHealthInsuranceInput(formatDate(form.healthInsuranceExpiry)), [form.healthInsuranceExpiry]);

  const statesOptions = [
    'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'
  ].map((s) => ({ value: s, label: s }));

  const genderOptions = [
    { value: 'male', label: 'Masculino' },
    { value: 'female', label: 'Feminino' },
    { value: 'other', label: 'Outro' },
  ];

  const maritalOptions = [
    { value: 'single', label: 'Solteiro(a)' },
    { value: 'married', label: 'Casado(a)' },
    { value: 'divorced', label: 'Divorciado(a)' },
    { value: 'widowed', label: 'Viúvo(a)' },
    { value: 'other', label: 'Outro' },
  ];

  const bloodTypes = [
    { value: 'A+', label: 'A+' }, { value: 'A-', label: 'A-' }, { value: 'B+', label: 'B+' }, { value: 'B-', label: 'B-' },
    { value: 'AB+', label: 'AB+' }, { value: 'AB-', label: 'AB-' }, { value: 'O+', label: 'O+' }, { value: 'O-', label: 'O-' },
  ];

  const validate = (data: PatientForm) => {
    if (!data.name.trim()) return 'Nome é obrigatório';
    if (!/^\d{11}$/.test(data.cpf)) return 'CPF deve conter 11 dígitos numéricos';
    if (!data.birthDate) return 'Data de nascimento é obrigatória';
    if (data.birthDate && data.birthDate > new Date()) return 'Data de nascimento inválida';
    if (data.hasHealthInsurance && !data.healthInsuranceName.trim()) return 'Nome do convênio é obrigatório';
    
    // Valida apenas limites máximos razoáveis
    if (data.phone && data.phone.length > 15) return 'Telefone muito longo';
    if (data.cellphone && data.cellphone.length > 15) return 'Celular muito longo';
    if (data.emergencyContactPhone && data.emergencyContactPhone.length > 15) return 'Telefone de emergência muito longo';
    if (data.guardianCpf && data.guardianCpf.length > 11) return 'CPF do responsável muito longo';
    if (data.guardianPhone && data.guardianPhone.length > 15) return 'Telefone do responsável muito longo';
    if (data.zipCode && data.zipCode.length > 8) return 'CEP muito longo';
    
    return null;
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

  const handleSave = async () => {
    const err = validate(form);
    if (err) {
      showNotification({ title: 'Erro', message: err, color: 'red' });
      return;
    }

    setSaving(true);
    try {
      // Converte tipo sanguíneo para o formato enum do backend
      const bloodTypeMap: Record<string, string> = {
        'A+': 'A_POSITIVE',
        'A-': 'A_NEGATIVE',
        'B+': 'B_POSITIVE',
        'B-': 'B_NEGATIVE',
        'AB+': 'AB_POSITIVE',
        'AB-': 'AB_NEGATIVE',
        'O+': 'O_POSITIVE',
        'O-': 'O_NEGATIVE',
      };

      const payload = {
        name: form.name.trim(),
        email: form.email?.trim() || undefined,
        phone: form.phone || undefined,
        cellphone: form.cellphone || undefined,
        birthDate: form.birthDate ? form.birthDate.toISOString().slice(0,10) : undefined,
        gender: form.gender ? form.gender.toUpperCase() : undefined,
        cpf: form.cpf,
        rg: form.rg?.trim() || undefined,
        maritalStatus: form.maritalStatus ? form.maritalStatus.toUpperCase() : undefined,
        occupation: form.occupation || undefined,
        address: form.address || undefined,
        addressNumber: form.addressNumber || undefined,
        addressComplement: form.addressComplement || undefined,
        neighborhood: form.neighborhood || undefined,
        city: form.city || undefined,
        state: form.state || undefined,
        zipCode: form.zipCode || undefined,
        emergencyContactName: form.emergencyContactName || undefined,
        emergencyContactPhone: form.emergencyContactPhone || undefined,
        emergencyContactRelationship: form.emergencyContactRelationship || undefined,
        hasGuardian: !!form.hasGuardian,
        guardianName: form.guardianName || undefined,
        guardianCpf: form.guardianCpf || undefined,
        guardianPhone: form.guardianPhone || undefined,
        guardianRelationship: form.guardianRelationship || undefined,
        hasHealthInsurance: !!form.hasHealthInsurance,
        healthInsuranceName: form.healthInsuranceName || undefined,
        healthInsuranceNumber: form.healthInsuranceNumber || undefined,
        healthInsuranceExpiry: form.healthInsuranceExpiry ? form.healthInsuranceExpiry.toISOString().slice(0,10) : undefined,
        bloodType: form.bloodType ? bloodTypeMap[form.bloodType] : undefined,
        allergies: form.allergies || [],
        chronicConditions: form.chronicConditions || [],
        currentMedications: form.currentMedications || [],
        observations: form.observations || undefined,
      };

      await patientService.createPatient(payload);

      setLastCreatedName(payload.name);
      setShowSuccessModal(true);
    } catch (e: unknown) {
      const anyErr = e as { response?: { data?: { message?: string } }; message?: string };
      const msg = anyErr?.response?.data?.message || anyErr?.message || 'Erro ao registrar paciente';
      showNotification({ title: 'Erro', message: msg, color: 'red' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box bg="#f8f9fa" style={{ minHeight: '100vh' }}>
      <Header />

      <Box p={isMobile ? 'sm' : isTablet ? 'md' : 'xl'} maw={isMobile ? '100%' : 1000} mx="auto">
        {/* Header */}
        <Group mb={isMobile ? 20 : 30} justify="space-between" align="center">
          <Group align="center">
            <ActionIcon variant="default" size="xl" onClick={() => navigate('/dashboard')}>
              <ChevronLeft size={28} />
            </ActionIcon>

            <Box>
              <Text fw={600} size={isMobile ? 'md' : 'lg'} style={{ color: DARK_BLUE }}>
                Cadastro de Paciente
              </Text>
              <Text size="sm" style={{ color: DARK_BLUE, opacity: 0.7 }}>
                Registro de pacientes
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
          <Paper p="md" withBorder radius="md">
            <SectionTitle>Dados Pessoais</SectionTitle>
            <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
              <TextInput label="Nome completo" value={form.name} onChange={(e) => setForm({ ...form, name: e.currentTarget.value })} required />
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
                data={genderOptions}
                value={form.gender}
                onChange={(v) => setForm({ ...form, gender: (v as Gender) || '' })}
              />

              <Select
                label="Estado civil"
                placeholder="Selecione"
                data={maritalOptions}
                value={form.maritalStatus}
                onChange={(v) => setForm({ ...form, maritalStatus: (v as MaritalStatus) || '' })}
              />

              <TextInput label="Ocupação/Profissão" value={form.occupation} onChange={(e) => setForm({ ...form, occupation: e.currentTarget.value })} />

              <TextInput label="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.currentTarget.value })} />
              <TextInput label="Telefone" value={formatPhone(form.phone)} onChange={(e) => setForm({ ...form, phone: onlyDigits(e.currentTarget.value) })} />
              <TextInput label="Celular" value={formatPhone(form.cellphone)} onChange={(e) => setForm({ ...form, cellphone: onlyDigits(e.currentTarget.value) })} />
            </SimpleGrid>
          </Paper>

          <Paper p="md" withBorder radius="md">
            <SectionTitle>Contato de Emergência / Responsáveis</SectionTitle>
            <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
              <TextInput label="Nome contato" value={form.emergencyContactName} onChange={(e) => setForm({ ...form, emergencyContactName: e.currentTarget.value })} />
              <TextInput label="Telefone contato" value={formatPhone(form.emergencyContactPhone)} onChange={(e) => setForm({ ...form, emergencyContactPhone: onlyDigits(e.currentTarget.value) })} />
              <TextInput label="Parentesco" value={form.emergencyContactRelationship} onChange={(e) => setForm({ ...form, emergencyContactRelationship: e.currentTarget.value })} />
            </SimpleGrid>

            <Group align="center" mt="md" mb="sm" gap="sm">
              <Switch label="Possui responsável legal" checked={form.hasGuardian} onChange={(e) => setForm({ ...form, hasGuardian: e.currentTarget.checked })} />
              <Text size="sm" c="dimmed">Preencha os dados do responsável, se aplicável.</Text>
            </Group>

            {form.hasGuardian && (
              <Box style={{ border: '1px solid #e9ecef', borderRadius: 8, padding: 12 }}>
                <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
                  <TextInput label="Nome do responsável" value={form.guardianName} onChange={(e) => setForm({ ...form, guardianName: e.currentTarget.value })} />
                  <TextInput label="CPF do responsável" value={formatCPF(form.guardianCpf)} onChange={(e) => setForm({ ...form, guardianCpf: onlyDigits(e.currentTarget.value) })} maxLength={14} />
                  <TextInput label="Telefone do responsável" value={formatPhone(form.guardianPhone)} onChange={(e) => setForm({ ...form, guardianPhone: onlyDigits(e.currentTarget.value) })} maxLength={15} />
                  <TextInput label="Parentesco" value={form.guardianRelationship} onChange={(e) => setForm({ ...form, guardianRelationship: e.currentTarget.value })} />
                </SimpleGrid>
              </Box>
            )}
          </Paper>

          <Paper p="md" withBorder radius="md">
            <SectionTitle>Convênio</SectionTitle>

            <Group align="center" mt="md" mb="sm">
              <Switch label="Possui convênio" checked={form.hasHealthInsurance} onChange={(e) => setForm({ ...form, hasHealthInsurance: e.currentTarget.checked })} />
            </Group>

            {form.hasHealthInsurance && (
              <Box style={{ border: '1px solid #e9ecef', borderRadius: 8, padding: 12 }}>
                <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
                  <TextInput label="Nome do convênio" value={form.healthInsuranceName} onChange={(e) => setForm({ ...form, healthInsuranceName: e.currentTarget.value })} />
                  <TextInput label="Número do convênio" value={form.healthInsuranceNumber} onChange={(e) => setForm({ ...form, healthInsuranceNumber: e.currentTarget.value })} />

                  <Popover position="bottom-start" withArrow>
                    <Popover.Target>
                      <TextInput
                        label="Validade"
                        placeholder="dd/mm/aaaa"
                        value={healthInsuranceInput}
                        onChange={(e) => setHealthInsuranceInput(formatDateInput(e.currentTarget.value))}
                        onBlur={() => {
                          if (!healthInsuranceInput) {
                            setForm({ ...form, healthInsuranceExpiry: null });
                            return;
                          }
                          const m = healthInsuranceInput.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
                          if (!m) {
                            showNotification({ title: 'Erro', message: 'Validade do convênio inválida', color: 'red' });
                            setForm({ ...form, healthInsuranceExpiry: null });
                          } else {
                            const day = Number(m[1]);
                            const month = Number(m[2]) - 1;
                            const year = Number(m[3]);
                            const date = new Date(year, month, day);
                            if (date.getFullYear() !== year || date.getMonth() !== month || date.getDate() !== day) {
                              showNotification({ title: 'Erro', message: 'Validade do convênio inválida', color: 'red' });
                              setForm({ ...form, healthInsuranceExpiry: null });
                            } else {
                              setForm({ ...form, healthInsuranceExpiry: date });
                            }
                          }
                        }}
                        rightSection={<ActionIcon size="sm" variant="subtle" onClick={() => setHealthInsurancePopover((s) => !s)}><CalendarIcon size={16} /></ActionIcon>}
                        onClick={() => setHealthInsurancePopover(true)}
                        style={{ cursor: 'text' }}
                      />
                    </Popover.Target>
                    <Popover.Dropdown>
                      <DatePicker value={form.healthInsuranceExpiry} onChange={(d) => setForm({ ...form, healthInsuranceExpiry: d })} />
                    </Popover.Dropdown>
                  </Popover>
                </SimpleGrid>
              </Box>
            )}
          </Paper>

          <Paper p="md" withBorder radius="md">
            <SectionTitle>Saúde</SectionTitle>
            <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
              <Select label="Tipo sanguíneo" placeholder="Selecione" data={bloodTypes} value={form.bloodType} onChange={(v) => setForm({ ...form, bloodType: (v as BloodType) || '' })} />

              <TextInput
                label="Alergias"
                placeholder="Separe por vírgula"
                value={allergiesInput}
                onChange={(e) => setAllergiesInput(e.currentTarget.value)}
                onBlur={() => setForm({ ...form, allergies: allergiesInput.split(',').map(s => s.trim()).filter(Boolean) })}
              />

              <TextInput
                label="Doenças crônicas"
                placeholder="Separe por vírgula"
                value={chronicInput}
                onChange={(e) => setChronicInput(e.currentTarget.value)}
                onBlur={() => setForm({ ...form, chronicConditions: chronicInput.split(',').map(s => s.trim()).filter(Boolean) })}
              />

              <TextInput
                label="Medicamentos em uso"
                placeholder="Separe por vírgula"
                value={medsInput}
                onChange={(e) => setMedsInput(e.currentTarget.value)}
                onBlur={() => setForm({ ...form, currentMedications: medsInput.split(',').map(s => s.trim()).filter(Boolean) })}
              />
            </SimpleGrid>
            <Textarea label="Observações" placeholder="Observações clínicas" value={form.observations} onChange={(e) => setForm({ ...form, observations: e.currentTarget.value })} minRows={3} mt="md" />
          </Paper>

          <Paper p="md" withBorder radius="md">
            <SectionTitle>Endereço</SectionTitle>
            <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="md">
              <TextInput label="CEP" value={formatCEP(form.zipCode)} onChange={(e) => setForm({ ...form, zipCode: onlyDigits(e.currentTarget.value) })} maxLength={9} />
              <TextInput label="Endereço" value={form.address} onChange={(e) => setForm({ ...form, address: e.currentTarget.value })} />
              <TextInput label="Número" value={form.addressNumber} onChange={(e) => setForm({ ...form, addressNumber: e.currentTarget.value })} />
              <TextInput label="Complemento" value={form.addressComplement} onChange={(e) => setForm({ ...form, addressComplement: e.currentTarget.value })} />

              <TextInput label="Bairro" value={form.neighborhood} onChange={(e) => setForm({ ...form, neighborhood: e.currentTarget.value })} />
              <TextInput label="Cidade" value={form.city} onChange={(e) => setForm({ ...form, city: e.currentTarget.value })} />
              <Select label="Estado" data={statesOptions} value={form.state} onChange={(v) => setForm({ ...form, state: v || '' })} />
            </SimpleGrid>
          </Paper>

          <Group justify="right">
            <Button variant="default" onClick={() => navigate('/dashboard')}>Cancelar</Button>
            <Button bg={DARK_BLUE} onClick={handleSave} loading={saving} disabled={saving} size="md" c="white">Salvar</Button>
          </Group>

          <Modal opened={showSuccessModal} onClose={() => setShowSuccessModal(false)} withCloseButton={false} centered size={420} closeOnEscape={true} closeOnClickOutside={false}>
            <Center style={{ flexDirection: 'column', gap: 16, padding: 8 }}>
              <ThemeIcon size={64} radius="xl" color="teal" variant="filled">
                <Check size={34} />
              </ThemeIcon>
              <Text fw={700} size="lg">Paciente cadastrado</Text>
              <Text c="dimmed" align="center">{lastCreatedName ? `${lastCreatedName} foi cadastrado com sucesso.` : 'Paciente cadastrado com sucesso.'}</Text>

              <Group mt={8} justify="center" gap="lg">
                <Button variant="default" onClick={() => { setShowSuccessModal(false); navigate('/dashboard'); }} style={{ minWidth: 180 }}>
                  Voltar para o dashboard
                </Button>
                <Button bg={DARK_BLUE} c="white" onClick={() => { setForm({ ...INITIAL_PATIENT_FORM }); setShowSuccessModal(false); }} style={{ minWidth: 180 }}>
                  Cadastrar novo
                </Button>
              </Group>
            </Center>
          </Modal>
        </Stack>
      </Box>
    </Box>
  );
}
