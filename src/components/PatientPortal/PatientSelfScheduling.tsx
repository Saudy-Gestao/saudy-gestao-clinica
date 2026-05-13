import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import 'dayjs/locale/pt-br';
import { Badge, Button, Group, Loader, SegmentedControl, Textarea } from '@mantine/core';
import {
  Activity, CalendarDays, CheckCircle, ChevronLeft, ChevronRight,
  Clock, MapPin, Moon, Stethoscope, Sun, Sunrise, User, Video,
} from 'lucide-react';
import patientPortalService, {
  type PatientPortalAvailableSlotDay,
  type PatientPortalCreatedAppointment,
  type PatientPortalSchedulingBranch,
  type PatientPortalSchedulingDoctor,
  type PatientPortalSchedulingProcedure,
} from '../../services/patientPortalService';
import { showErrorToast, showSuccessToast } from '../../lib/toast';

dayjs.locale('pt-br');

type Step = 'branch' | 'type' | 'procedure' | 'doctor' | 'slot' | 'confirm' | 'success';
type ApptType = 'CONSULTA' | 'EXAME';
type Modality = 'Presencial' | 'Teleconsulta';

type Sel = {
  branch: PatientPortalSchedulingBranch | null;
  apptType: ApptType | null;
  procedure: PatientPortalSchedulingProcedure | null;
  doctor: PatientPortalSchedulingDoctor | null;
  date: string; time: string;
  modality: Modality;
  obs: string;
};

const INIT: Sel = { branch: null, apptType: null, procedure: null, doctor: null, date: '', time: '', modality: 'Presencial', obs: '' };

const MONTHS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
const MONTHS_FULL = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const WD = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];

const toMin = (t: string) => { const [h,m] = t.split(':').map(Number); return h*60+m; };
const fmtBR = (d: string) => dayjs(d).format('DD/MM/YYYY');
const fmtLong = (d: string) => {
  const day = dayjs(d);
  const wd = day.format('dddd');
  return `${wd[0].toUpperCase()}${wd.slice(1)}, ${day.format('DD')} de ${MONTHS_FULL[day.month()]}`;
};
const initials = (n: string) => n.split(' ').filter(Boolean).slice(0,2).map(w=>w[0].toUpperCase()).join('');

function groupSlots(slots: string[]) {
  const g = [
    { label: 'Manhã',  icon: <Sunrise size={12}/>, slots: [] as string[] },
    { label: 'Tarde',  icon: <Sun size={12}/>,     slots: [] as string[] },
    { label: 'Noite',  icon: <Moon size={12}/>,    slots: [] as string[] },
  ];
  slots.forEach(s => {
    const m = toMin(s);
    if (m < 720) g[0].slots.push(s);
    else if (m < 1080) g[1].slots.push(s);
    else g[2].slots.push(s);
  });
  return g.filter(x => x.slots.length > 0);
}

// ---------- tiny style helpers ----------
const row = (extra?: React.CSSProperties): React.CSSProperties => ({
  display: 'flex', alignItems: 'center', ...extra,
});
const col = (extra?: React.CSSProperties): React.CSSProperties => ({
  display: 'flex', flexDirection: 'column', ...extra,
});

const STEP_ORDER: Step[] = ['branch','type','procedure','doctor','slot','confirm'];
const STEP_SHORT: Record<Step, string> = {
  branch: 'Unidade', type: 'Tipo', procedure: 'Proc.', doctor: 'Prof.', slot: 'Horário', confirm: 'Confirmar', success: '',
};

export default function PatientSelfScheduling() {
  const [step, setStep]   = useState<Step>('type');
  const [key, setKey]     = useState(0);
  const [sel, setSel]     = useState<Sel>(INIT);

  const [loadingBranches, setLoadingBranches] = useState(false);
  const [branches, setBranches]               = useState<PatientPortalSchedulingBranch[]>([]);
  const [loadingProcs, setLoadingProcs] = useState(false);
  const [procs, setProcs]               = useState<PatientPortalSchedulingProcedure[]>([]);
  const [branch, setBranch]             = useState<{ name: string; address: string } | null>(null);
  const [loadingDocs, setLoadingDocs]   = useState(false);
  const [docs, setDocs]                 = useState<PatientPortalSchedulingDoctor[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slotDays, setSlotDays]         = useState<PatientPortalAvailableSlotDay[]>([]);
  const [slotDur, setSlotDur]           = useState(30);
  const [dayIdx, setDayIdx]             = useState(0);
  const [saving, setSaving]             = useState(false);
  const [done, setDone]                 = useState<PatientPortalCreatedAppointment | null>(null);

  function go(s: Step) { setStep(s); setKey(k => k+1); }

  useEffect(() => {
    setLoadingBranches(true);
    patientPortalService.listSchedulingBranches()
      .then(d => {
        setBranches(d.branches);
        // Auto-select if only one branch
        if (d.branches.length === 1) {
          setSel(s => ({ ...s, branch: d.branches[0] }));
          go('type');
        } else if (d.defaultBranchId) {
          const def = d.branches.find(b => b.id === d.defaultBranchId);
          if (def) setSel(s => ({ ...s, branch: def }));
        }
      })
      .catch((error: unknown) => showErrorToast({
        title: 'Falha ao carregar unidades',
        error,
        fallback: 'Não foi possível carregar as unidades.',
      }))
      .finally(() => setLoadingBranches(false));
  }, []);

  useEffect(() => {
    if (!sel.branch) return;
    setLoadingProcs(true);
    patientPortalService.listSchedulingProcedures(sel.branch.id)
      .then(d => { setProcs(d.procedures); setBranch(d.branch); })
      .catch((error: unknown) => showErrorToast({
        title: 'Falha ao carregar procedimentos',
        error,
        fallback: 'Não foi possível carregar os procedimentos.',
      }))
      .finally(() => setLoadingProcs(false));
  }, [sel.branch]);

  useEffect(() => {
    if (!sel.procedure) return;
    setLoadingDocs(true);
    patientPortalService.listSchedulingDoctors(sel.procedure.id, sel.branch?.id)
      .then(d => setDocs(d.doctors))
      .catch((error: unknown) => showErrorToast({
        title: 'Falha ao carregar profissionais',
        error,
        fallback: 'Não foi possível carregar os profissionais.',
      }))
      .finally(() => setLoadingDocs(false));
  }, [sel.procedure]);

  useEffect(() => {
    if (!sel.doctor || !sel.procedure) return;
    setLoadingSlots(true);
    setSlotDays([]); setDayIdx(0);
    patientPortalService.getAvailableSlots({ doctorName: sel.doctor.name, procedureId: sel.procedure.id, branchId: sel.branch?.id })
      .then(d => { setSlotDays(d.availableSlots); setSlotDur(d.slotDurationMinutes); })
      .catch((error: unknown) => showErrorToast({
        title: 'Falha ao carregar horários',
        error,
        fallback: 'Não foi possível carregar os horários disponíveis.',
      }))
      .finally(() => setLoadingSlots(false));
  }, [sel.doctor, sel.procedure]);

  const filtered = procs.filter(p => {
    const t = (p.appointmentType||'').toUpperCase();
    if (sel.apptType === 'EXAME') return t === 'EXAME' || t === 'EXAM';
    return t !== 'EXAME' && t !== 'EXAM';
  });

  const currentDay = slotDays[dayIdx] || null;

  async function confirm() {
    if (!sel.procedure || !sel.doctor || !sel.date || !sel.time) return;
    setSaving(true);
    try {
      const r = await patientPortalService.createSelfScheduledAppointment({
        procedureId: sel.procedure.id, doctorName: sel.doctor.name,
        date: sel.date, time: sel.time,
        modalidadeAtendimento: sel.modality,
        observations: sel.obs || undefined,
        branchId: sel.branch?.id,
      });
      setDone(r);
      showSuccessToast({
        title: 'Agendamento confirmado',
        message: 'Você receberá uma notificação pelo WhatsApp.',
      });
      go('success');
    } catch (error: unknown) {
      showErrorToast({
        title: 'Falha ao confirmar',
        error,
        fallback: 'Não foi possível realizar o agendamento.',
      });
    } finally { setSaving(false); }
  }

  function reset() { setSel(INIT); setDocs([]); setSlotDays([]); setDone(null); go(branches.length > 1 ? 'branch' : 'type'); }

  // ---------- stepper ----------
  const stepIdx = STEP_ORDER.indexOf(step);

  const Progress = () => {
    if (step === 'success') return null;
    return (
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {STEP_ORDER.map((s, i) => {
            const done    = i < stepIdx;
            const current = i === stepIdx;
            const future  = i > stepIdx;
            const isLast  = i === STEP_ORDER.length - 1;

            const circleColor = done
              ? 'var(--mantine-color-blue-5)'
              : current
                ? 'var(--mantine-color-blue-5)'
                : 'var(--mantine-color-default-border)';

            const circleBg = done
              ? 'var(--mantine-color-blue-5)'
              : current
                ? 'var(--mantine-color-blue-0, rgba(34,139,230,0.08))'
                : 'transparent';

            return (
              <div key={s} style={{ display: 'flex', alignItems: 'center', flex: isLast ? 'none' : 1 }}>
                {/* circle */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                  <div style={{
                    width: 30, height: 30, borderRadius: '50%',
                    border: `2px solid ${circleColor}`,
                    background: circleBg,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                    transition: 'all 300ms cubic-bezier(.22,1,.36,1)',
                  }}>
                    {done ? (
                      <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                        <path d="M2 6.5L5.2 10L11 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    ) : (
                      <span style={{
                        fontSize: 11, fontWeight: 700,
                        color: current ? 'var(--mantine-color-blue-5)' : 'var(--mantine-color-dimmed)',
                        transition: 'color 300ms',
                      }}>{i + 1}</span>
                    )}
                  </div>
                  <span style={{
                    fontSize: 10, fontWeight: current ? 700 : 500,
                    color: future ? 'var(--mantine-color-dimmed)' : current ? 'var(--mantine-color-blue-5)' : 'var(--mantine-color-text)',
                    whiteSpace: 'nowrap',
                    transition: 'color 300ms',
                  }}>{STEP_SHORT[s]}</span>
                </div>
                {/* connector line */}
                {!isLast && (
                  <div style={{ flex: 1, height: 2, margin: '0 6px', marginBottom: 20, borderRadius: 99, background: 'var(--mantine-color-default-border)', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', borderRadius: 99,
                      background: 'var(--mantine-color-blue-5)',
                      width: done ? '100%' : '0%',
                      transition: 'width 400ms cubic-bezier(.22,1,.36,1)',
                    }}/>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const BackBtn = ({ to }: { to: Step }) => (
    <button
      onClick={() => go(to)}
      style={{ display:'inline-flex', alignItems:'center', gap:4, background:'none', border:'none', cursor:'pointer', padding:0, fontSize:13, fontWeight:600, color:'var(--mantine-color-dimmed)', marginBottom:20 }}
    >
      <ChevronLeft size={14}/> Voltar
    </button>
  );

  // ===================== SUCCESS =====================
  if (step === 'success' && done) return (
    <div key={key} style={{ animation: 'pp2In 280ms cubic-bezier(.22,1,.36,1) both', padding: '8px 0 40px' }}>
      <Progress />
      <div style={col({ alignItems:'center', gap: 0, paddingTop: 16 })}>
        <div style={{
          width: 96, height: 96, borderRadius: '50%',
          background: 'rgba(18,184,134,0.1)', border: '2px solid rgba(18,184,134,0.2)',
          display:'flex', alignItems:'center', justifyContent:'center',
          color: 'var(--mantine-color-teal-6)',
          animation: 'pp2Pop 500ms cubic-bezier(.175,.885,.32,1.275) both',
        }}>
          <CheckCircle size={44} strokeWidth={1.8}/>
        </div>
        <h2 style={{ margin:'20px 0 6px', fontSize:22, fontWeight:800, textAlign:'center' }}>Agendamento confirmado!</h2>
        <p style={{ margin:0, fontSize:14, color:'var(--mantine-color-dimmed)', textAlign:'center', maxWidth:320, lineHeight:1.5 }}>
          Uma notificação com os detalhes foi enviada para o seu WhatsApp.
        </p>
        <div style={{ width:'100%', maxWidth:380, marginTop:28, border:'1.5px solid var(--mantine-color-default-border)', borderRadius:16, overflow:'hidden' }}>
          {[
            ['Procedimento', done.specialty ?? '-'],
            ['Profissional',  done.doctorName ?? '-'],
            ['Data',          done.date ? fmtBR(done.date) : '-'],
            ['Horário',       done.time ?? '-'],
            ...(done.branchName ? [['Local', done.branchName]] : []),
          ].map(([label, value], i, arr) => (
            <div key={label} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'13px 18px', borderBottom: i < arr.length-1 ? '1px solid var(--mantine-color-default-border)' : 'none' }}>
              <span style={{ fontSize:13, color:'var(--mantine-color-dimmed)' }}>{label}</span>
              <span style={{ fontSize:13, fontWeight:600 }}>{value}</span>
            </div>
          ))}
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'13px 18px' }}>
            <span style={{ fontSize:13, color:'var(--mantine-color-dimmed)' }}>Status</span>
            <Badge variant="dot" color="teal" size="sm">Agendado</Badge>
          </div>
        </div>
        <Button mt={32} variant="subtle" radius="xl" onClick={reset} rightSection={<ChevronRight size={14}/>}>
          Fazer outro agendamento
        </Button>
      </div>
    </div>
  );

  // ===================== BRANCH =====================
  if (step === 'branch') return (
    <div key={key} style={{ animation:'pp2In 280ms cubic-bezier(.22,1,.36,1) both', padding:'8px 0 40px' }}>
      <Progress />
      <h2 style={{ margin:'0 0 6px', fontSize:22, fontWeight:800, letterSpacing:'-0.4px' }}>Qual unidade?</h2>
      <p style={{ margin:'0 0 28px', fontSize:14, color:'var(--mantine-color-dimmed)' }}>Escolha onde deseja ser atendido</p>
      {loadingBranches
        ? <CenterLoader/>
        : branches.length === 0
          ? <p style={{ color:'var(--mantine-color-dimmed)', fontSize:14 }}>Nenhuma unidade disponível.</p>
          : <ListBox>
              {branches.map((b, i) => (
                <ListRow key={b.id} delay={i*35}
                  left={<>
                    <span style={{ fontWeight:600, fontSize:14 }}>{b.tradeName}</span>
                    {b.address && <span style={{ fontSize:12, color:'var(--mantine-color-dimmed)', marginTop:2 }}>{b.address}</span>}
                  </>}
                  onClick={() => { setSel(s=>({...s, branch:b, apptType:null, procedure:null, doctor:null, date:'', time:''})); go('type'); }}
                />
              ))}
            </ListBox>
      }
    </div>
  );

  // ===================== TYPE =====================
  if (step === 'type') return (
    <div key={key} style={{ animation:'pp2In 280ms cubic-bezier(.22,1,.36,1) both', padding:'8px 0 40px' }}>
      <Progress />
      {branches.length > 1 && <BackBtn to="branch"/>}
      <h2 style={{ margin:'0 0 6px', fontSize:22, fontWeight:800, letterSpacing:'-0.4px' }}>O que você precisa?</h2>
      <p style={{ margin:'0 0 28px', fontSize:14, color:'var(--mantine-color-dimmed)' }}>
        {sel.branch ? <>Agendamento em <strong>{sel.branch.tradeName}</strong></> : 'Escolha o tipo de atendimento'}
      </p>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
        {([
          { type:'CONSULTA' as ApptType, label:'Consulta', desc:'Atendimento com médico ou especialista', icon:<Stethoscope size={30}/>, color:'var(--mantine-color-blue-6)', bg:'rgba(34,139,230,0.1)' },
          { type:'EXAME'    as ApptType, label:'Exame',    desc:'Exames laboratoriais ou de imagem',       icon:<Activity size={30}/>,    color:'var(--mantine-color-teal-6)',  bg:'rgba(18,184,134,0.1)'  },
        ] as const).map((opt, i) => (
          <TypeCard key={opt.type} {...opt} delay={i*60} onClick={() => {
            setSel(s => ({ ...s, apptType: opt.type, procedure: null, doctor: null, date:'', time:'' }));
            go('procedure');
          }}/>
        ))}
      </div>
    </div>
  );

  // ===================== PROCEDURE =====================
  if (step === 'procedure') return (
    <div key={key} style={{ animation:'pp2In 280ms cubic-bezier(.22,1,.36,1) both', padding:'8px 0 40px' }}>
      <Progress />
      <BackBtn to="type"/>
      <div style={row({ gap:10, marginBottom:20 })}>
        <h2 style={{ margin:0, fontSize:22, fontWeight:800, letterSpacing:'-0.4px' }}>Qual procedimento?</h2>
        <Badge variant="light" color={sel.apptType==='EXAME'?'teal':'blue'} radius="xl" size="sm">
          {sel.apptType==='EXAME'?'Exame':'Consulta'}
        </Badge>
      </div>
      {loadingProcs
        ? <CenterLoader/>
        : filtered.length === 0
          ? <p style={{ color:'var(--mantine-color-dimmed)', fontSize:14 }}>Nenhum procedimento disponível.</p>
          : <ListBox>
              {filtered.map((p, i) => (
                <ListRow key={p.id} delay={i*35}
                  left={<>
                    <span style={{ fontWeight:600, fontSize:14 }}>{p.name}</span>
                    {p.durationMinutes && <span style={{ fontSize:12, color:'var(--mantine-color-dimmed)', marginTop:2 }}>{p.durationMinutes} min de duração</span>}
                  </>}
                  onClick={() => { setSel(s=>({...s,procedure:p,doctor:null,date:'',time:''})); go('doctor'); }}
                />
              ))}
            </ListBox>
      }
    </div>
  );

  // ===================== DOCTOR =====================
  if (step === 'doctor') return (
    <div key={key} style={{ animation:'pp2In 280ms cubic-bezier(.22,1,.36,1) both', padding:'8px 0 40px' }}>
      <Progress />
      <BackBtn to="procedure"/>
      <div style={row({ gap:10, marginBottom:20 })}>
        <h2 style={{ margin:0, fontSize:22, fontWeight:800, letterSpacing:'-0.4px' }}>Escolha o profissional</h2>
        <Badge variant="light" color="blue" radius="xl" size="sm">{sel.procedure?.name}</Badge>
      </div>
      {loadingDocs
        ? <CenterLoader/>
        : docs.length === 0
          ? <p style={{ color:'var(--mantine-color-dimmed)', fontSize:14 }}>Nenhum profissional disponível.</p>
          : <ListBox>
              {docs.map((doc, i) => (
                <ListRow key={doc.id} delay={i*35}
                  left={<>
                    <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                      <div style={{ width:38, height:38, borderRadius:'50%', flexShrink:0, background:'linear-gradient(135deg,var(--mantine-color-blue-5),var(--mantine-color-violet-5))', color:'#fff', fontWeight:700, fontSize:13, display:'flex', alignItems:'center', justifyContent:'center' }}>
                        {initials(doc.name)}
                      </div>
                      <div style={col()}>
                        <span style={{ fontWeight:600, fontSize:14 }}>{doc.name}</span>
                        <span style={{ fontSize:12, color:'var(--mantine-color-dimmed)', marginTop:2 }}>{doc.crm}{doc.specialty ? ` · ${doc.specialty}`:''}</span>
                      </div>
                    </div>
                  </>}
                  onClick={() => { setSel(s=>({...s,doctor:doc,date:'',time:''})); go('slot'); }}
                />
              ))}
            </ListBox>
      }
    </div>
  );

  // ===================== SLOT =====================
  if (step === 'slot') {
    const groups = currentDay ? groupSlots(currentDay.slots) : [];
    return (
      <div key={key} style={{ animation:'pp2In 280ms cubic-bezier(.22,1,.36,1) both', padding:'8px 0 40px' }}>
        <Progress />
        <BackBtn to="doctor"/>
        <div style={row({ gap:10, marginBottom:20 })}>
          <h2 style={{ margin:0, fontSize:22, fontWeight:800, letterSpacing:'-0.4px' }}>Data e horário</h2>
          <Badge variant="light" color="violet" radius="xl" size="sm">{sel.doctor?.name}</Badge>
        </div>

        <SegmentedControl fullWidth radius="xl" size="sm" mb="lg"
          value={sel.modality}
          onChange={v => setSel(s=>({...s, modality: v as Modality}))}
          data={[
            { label: <Group gap={5} justify="center"><User size={13}/><span>Presencial</span></Group>, value:'Presencial' },
            { label: <Group gap={5} justify="center"><Video size={13}/><span>Teleconsulta</span></Group>, value:'Teleconsulta' },
          ]}
        />

        {loadingSlots
          ? <CenterLoader/>
          : slotDays.length === 0
            ? <p style={{ color:'var(--mantine-color-dimmed)', fontSize:14 }}>Nenhum horário disponível nos próximos 30 dias.</p>
            : <>
                <p style={{ margin:'0 0 10px', fontSize:11, fontWeight:700, color:'var(--mantine-color-dimmed)', textTransform:'uppercase', letterSpacing:1 }}>Selecione uma data</p>
                <div style={{ display:'flex', gap:8, overflowX:'auto', paddingBottom:4, marginBottom:24, scrollbarWidth:'none' }}>
                  {slotDays.map((day, idx) => {
                    const d = dayjs(day.date);
                    const on = idx === dayIdx;
                    return (
                      <button key={day.date}
                        onClick={() => { setDayIdx(idx); setSel(s=>({...s,date:day.date,time:''})); }}
                        style={{
                          display:'flex', flexDirection:'column', alignItems:'center',
                          minWidth:60, padding:'11px 8px', borderRadius:14, flexShrink:0, cursor:'pointer',
                          border: on ? '2px solid var(--mantine-color-blue-5)' : '1.5px solid var(--mantine-color-default-border)',
                          background: on ? 'var(--mantine-color-blue-5)' : 'var(--mantine-color-default)',
                          transition:'all 150ms', outline:'none',
                        }}
                      >
                        <span style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:0.5, color: on?'rgba(255,255,255,0.8)':'var(--mantine-color-dimmed)' }}>{WD[d.day()]}</span>
                        <span style={{ fontSize:21, fontWeight:800, lineHeight:1.1, color: on?'#fff':'var(--mantine-color-text)' }}>{d.format('DD')}</span>
                        <span style={{ fontSize:10, textTransform:'uppercase', color: on?'rgba(255,255,255,0.7)':'var(--mantine-color-dimmed)' }}>{MONTHS[d.month()]}</span>
                        {day.slots.length <= 3 && (
                          <span style={{ marginTop:4, fontSize:9, fontWeight:700, background: on?'rgba(255,255,255,0.25)':'var(--mantine-color-orange-5)', color: on?'#fff':'#fff', borderRadius:6, padding:'1px 5px' }}>
                            {day.slots.length}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {currentDay && (
                  <div key={currentDay.date} style={{ animation:'pp2In 220ms cubic-bezier(.22,1,.36,1) both', marginBottom:8 }}>
                    <p style={{ margin:'0 0 16px', fontSize:11, fontWeight:700, color:'var(--mantine-color-dimmed)', textTransform:'uppercase', letterSpacing:1 }}>{fmtLong(currentDay.date)}</p>
                    {groups.map(g => (
                      <div key={g.label} style={{ marginBottom:20 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:10, color:'var(--mantine-color-dimmed)' }}>
                          {g.icon}
                          <span style={{ fontSize:12, fontWeight:600 }}>{g.label}</span>
                        </div>
                        <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
                          {g.slots.map(slot => {
                            const on = sel.date===currentDay.date && sel.time===slot;
                            return (
                              <button key={slot}
                                onClick={() => setSel(s=>({...s,date:currentDay.date,time:slot}))}
                                style={{
                                  padding:'9px 18px', borderRadius:10, cursor:'pointer', outline:'none',
                                  fontSize:13, fontWeight:600, transition:'all 130ms',
                                  border: on ? '2px solid var(--mantine-color-blue-5)' : '1.5px solid var(--mantine-color-default-border)',
                                  background: on ? 'var(--mantine-color-blue-5)' : 'var(--mantine-color-default)',
                                  color: on ? '#fff' : 'var(--mantine-color-text)',
                                  boxShadow: on ? '0 3px 12px rgba(34,139,230,0.3)' : 'none',
                                  transform: on ? 'translateY(-1px)' : 'none',
                                }}
                              >{slot}</button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <Textarea label="Observações" radius="md" minRows={2} mb="lg"
                  description="Opcional — algo importante para o profissional saber?"
                  placeholder="Ex: tenho alergia a dipirona..."
                  value={sel.obs}
                  onChange={e => { const v = e.currentTarget.value; setSel(s=>({...s,obs:v})); }}
                />
                <Button fullWidth radius="xl" size="md" fw={700}
                  disabled={!sel.date||!sel.time}
                  rightSection={<ChevronRight size={16}/>}
                  onClick={() => go('confirm')}
                >
                  Revisar agendamento
                </Button>
              </>
        }
      </div>
    );
  }

  // ===================== CONFIRM =====================
  if (step === 'confirm') return (
    <div key={key} style={{ animation:'pp2In 280ms cubic-bezier(.22,1,.36,1) both', padding:'8px 0 40px' }}>
      <Progress />
      <BackBtn to="slot"/>
      <h2 style={{ margin:'0 0 6px', fontSize:22, fontWeight:800, letterSpacing:'-0.4px' }}>Confirmar agendamento</h2>
      <p style={{ margin:'0 0 24px', fontSize:14, color:'var(--mantine-color-dimmed)' }}>Tudo certo? Revise os dados abaixo.</p>

      <div style={{ border:'1.5px solid var(--mantine-color-default-border)', borderRadius:18, overflow:'hidden', maxWidth:520, marginBottom:16 }}>
        {/* hero */}
        <div style={{ padding:'22px 22px 18px', background:'linear-gradient(120deg,var(--mantine-color-blue-6),var(--mantine-color-blue-9))' }}>
          <p style={{ margin:0, fontSize:18, fontWeight:800, color:'#fff', letterSpacing:'-0.3px' }}>{sel.procedure?.name}</p>
          <p style={{ margin:'4px 0 0', fontSize:14, color:'rgba(255,255,255,0.8)' }}>{sel.doctor?.name}</p>
        </div>
        {/* rows */}
        {[
          { icon:<CalendarDays size={14}/>, label:'Data',      value: fmtLong(sel.date) },
          { icon:<Clock size={14}/>,       label:'Horário',   value: `${sel.time} · ${slotDur} min` },
          { icon: sel.modality==='Teleconsulta'?<Video size={14}/>:<User size={14}/>, label:'Modalidade', value: sel.modality },
          ...(branch ? [{ icon:<MapPin size={14}/>, label:'Local', value: branch.name + (branch.address ? ` — ${branch.address}` : '') }] : []),
          ...(sel.obs ? [{ icon:<Stethoscope size={14}/>, label:'Obs.', value: sel.obs }] : []),
        ].map((r, i, arr) => (
          <div key={r.label} style={{ display:'flex', alignItems:'flex-start', gap:12, padding:'14px 20px', borderBottom: i<arr.length-1 ? '1px solid var(--mantine-color-default-border)':'none' }}>
            <span style={{ color:'var(--mantine-color-dimmed)', marginTop:1, flexShrink:0 }}>{r.icon}</span>
            <span style={{ fontSize:13, color:'var(--mantine-color-dimmed)', minWidth:80, flexShrink:0 }}>{r.label}</span>
            <span style={{ fontSize:13, fontWeight:600 }}>{r.value}</span>
          </div>
        ))}
      </div>

      <p style={{ margin:'0 0 12px', fontSize:12, color:'var(--mantine-color-dimmed)', textAlign:'center' }}>
        Ao confirmar, você receberá uma notificação no WhatsApp com os detalhes.
      </p>
      <Button fullWidth radius="xl" size="md" fw={700} color="teal"
        loading={saving} leftSection={<CheckCircle size={16}/>}
        onClick={confirm}
      >
        Confirmar agendamento
      </Button>
    </div>
  );

  return null;
}

// ── Shared UI atoms ────────────────────────────────────────────────────────────

function TypeCard({ type: _type, label, desc, icon, color, bg, delay, onClick }: {
  type: ApptType; label: string; desc: string; icon: React.ReactNode;
  color: string; bg: string; delay: number; onClick: () => void;
}) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
        padding:'36px 20px 32px', borderRadius:20, cursor:'pointer', outline:'none',
        border: hover ? `2px solid ${color}` : '1.5px solid var(--mantine-color-default-border)',
        background: hover ? bg : 'var(--mantine-color-default)',
        boxShadow: hover ? `0 8px 28px ${color}30` : 'none',
        transform: hover ? 'translateY(-3px)' : 'none',
        transition:'all 200ms cubic-bezier(.22,1,.36,1)',
        animation:`pp2In 300ms ${delay}ms cubic-bezier(.22,1,.36,1) both`,
      }}
    >
      <div style={{ width:72, height:72, borderRadius:22, background: bg, color, display:'flex', alignItems:'center', justifyContent:'center', transform: hover ? 'scale(1.08)':'scale(1)', transition:'transform 200ms' }}>
        {icon}
      </div>
      <span style={{ display:'block', fontSize:17, fontWeight:800, marginTop:16, marginBottom:4 }}>{label}</span>
      <span style={{ fontSize:12, color:'var(--mantine-color-dimmed)', textAlign:'center', lineHeight:1.5 }}>{desc}</span>
    </button>
  );
}

function ListBox({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ border:'1.5px solid var(--mantine-color-default-border)', borderRadius:16, overflow:'hidden', maxWidth:520 }}>
      {children}
    </div>
  );
}

function ListRow({ left, delay, onClick }: { left: React.ReactNode; delay: number; onClick: () => void }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display:'flex', alignItems:'center', gap:12, padding:'16px 18px',
        width:'100%', textAlign:'left', cursor:'pointer', outline:'none',
        background: hover ? 'var(--mantine-color-default-hover)' : 'transparent',
        border:'none', borderBottom:'1px solid var(--mantine-color-default-border)',
        transition:'background 130ms',
        animation:`pp2In 280ms ${delay}ms cubic-bezier(.22,1,.36,1) both`,
      }}
    >
      <div style={{ flex:1, display:'flex', flexDirection:'column', minWidth:0 }}>{left}</div>
      <ChevronRight size={15} style={{ color:'var(--mantine-color-dimmed)', flexShrink:0, transform: hover?'translateX(3px)':'none', transition:'transform 130ms' }}/>
    </button>
  );
}

function CenterLoader() {
  return <div style={{ display:'flex', justifyContent:'center', padding:'48px 0' }}><Loader size="md"/></div>;
}
