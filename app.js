'use strict';

const $ = id => document.getElementById(id);
const qsa = sel => [...document.querySelectorAll(sel)];
const CV_TO_KW = 0.7355;
// Potências nominais comerciais usuais de motores: não converter kW→cv apenas por divisão.
// A plataforma usa o par nominal de placa (kW / cv), evitando valores irreais como 25,2 cv.
const MOTOR_RATINGS = [
  {kw:1.5,cv:2},{kw:2.2,cv:3},{kw:3,cv:4},{kw:3.7,cv:5},{kw:4,cv:5.5},
  {kw:5.5,cv:7.5},{kw:7.5,cv:10},{kw:11,cv:15},{kw:15,cv:20},{kw:18.5,cv:25},
  {kw:22,cv:30},{kw:30,cv:40},{kw:37,cv:50},{kw:45,cv:60},{kw:55,cv:75},{kw:75,cv:100}
];
const nominalCvFromKw = kw => {
  const k=Number(kw);
  const exact=MOTOR_RATINGS.find(r=>Math.abs(r.kw-k)<0.001);
  if(exact) return exact.cv;
  // Para valores externos/importados, aproxima para a potência nominal comercial mais próxima.
  return MOTOR_RATINGS.reduce((best,r)=>Math.abs(r.kw-k)<Math.abs(best.kw-k)?r:best,MOTOR_RATINGS[0]).cv;
};
const STORAGE_KEY = 'pei_alunos_trios_v4_4';
const TRAFO_STD = [75,112.5,150,225,300];
const SUBSTATION_MAX_KVA = 300;

const money = n => Number(n||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const fmt = (n,d=1) => Number(n||0).toLocaleString('pt-BR',{minimumFractionDigits:d,maximumFractionDigits:d});
const num = v => { const n=parseFloat(String(v??'').replace(',','.')); return Number.isFinite(n)?n:0; };
const clamp = (v,min,max) => Math.min(max,Math.max(min,v));
const escapeHtml = s => String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
const deepGet = (obj,path) => path.split('.').reduce((o,k)=>o?.[k],obj);
const deepSet = (obj,path,value) => { const keys=path.split('.'); let cur=obj; keys.slice(0,-1).forEach(k=>{ if(!cur[k]||typeof cur[k]!=='object')cur[k]={}; cur=cur[k]; }); cur[keys.at(-1)]=value; };

function xmur3(str){let h=1779033703^str.length;for(let i=0;i<str.length;i++){h=Math.imul(h^str.charCodeAt(i),3432918353);h=h<<13|h>>>19;}return function(){h=Math.imul(h^h>>>16,2246822507);h=Math.imul(h^h>>>13,3266489909);return (h^h>>>16)>>>0;}}
function mulberry32(a){return function(){let t=a+=0x6D2B79F5;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296;}}
const pick=(r,a)=>a[Math.floor(r()*a.length)];
const between=(r,min,max,step=1)=>Math.round((min+r()*(max-min))/step)*step;

const motorProfiles = [
  {tag:'M01',name:'Esteira de alimentação'},
  {tag:'M02',name:'Esteira de transporte'},
  {tag:'M03',name:'Bomba de processo'},
  {tag:'M04',name:'Exaustor industrial'},
  {tag:'M05',name:'Misturador industrial'},
  {tag:'M06',name:'Bomba de circulação'},
  {tag:'M07',name:'Compressor de ar'},
  {tag:'M08',name:'Triturador'},
  {tag:'M09',name:'Sistema de ventilação'},
  {tag:'M10',name:'Esteira de embalagem'}
];

const lightingBase = [
  {name:'Recebimento',area:120,lux:150},{name:'Produção',area:420,lux:300},{name:'Sala elétrica',area:42,lux:300},
  {name:'Expedição',area:110,lux:200},{name:'Manutenção',area:90,lux:500},{name:'Utilidades',area:72,lux:200},{name:'Escritório/Controle',area:95,lux:500}
];

function initialState(){
  return {
    schema:'PEI-PROJETISTA-INTEGRADO-4.4-TRIOS-NDU',
    meta:{code:'',generated:false,generatedAt:'',voltage:380,primary:13800,frequency:60,ambient:35,grouping:3,tempFactor:.96,groupFactor:.70,reserve:20,trafoZ:5,subToQgbt:30,qgbtToCcm:20,validation:''},
    identity:{studentName:'',studentClass:'',studentNumber:''},
    team:{companyName:'',tradeName:'',cnpj:'',className:'',city:'Rio Branco - AC',email:'',responsibleIndex:0,members:[
      {name:'',number:'',role:'Coordenação técnica e QGBT',participation:34,responsibilities:''},
      {name:'',number:'',role:'CCM e acionamentos',participation:33,responsibilities:''},
      {name:'',number:'',role:'Subestação, SPDA e documentação',participation:33,responsibilities:''}
    ]},
    client:{name:'',cnpj:'',contact:'',address:'',city:'',activity:'',need:''},
    motors:[],
    driveAssessment:{lastBatchAt:'',serverAvailable:null},
    auxiliaries:[],
    qgbt:{manufacturer:'',model:'',source:'',ib:'',breaker:'',icu:'',bus:'',cable:'',dps:'',neutral:'',pe:'',selectivity:'',notes:''},
    ccm:{manufacturer:'WEG',source:'',bus:'',icc:'',mainBreaker:'',ip:'',form:'',reserve:''},
    substation:{utility:'Energisa',type:'Aérea',nduVersion:'NDU 002 v5.2 — vigente até 28/09/2026',nduAnnex:'Anexo à NDU 002 — Subestação Aérea',nduDate:'2026-08-30',manufacturer:'',model:'',source:'',trafo:'',z:'',ip:'',is:'',icc:'',btBreaker:'',tc:'',tp:'',mtProtection:'',arrester:'',groundCable:'',rods:'',metering:'',notes:''},
    lighting:lightingBase.map(x=>({...x,flux:'',uf:'',mf:'',calc:0,adopted:'',watt:'',totalW:0,manufacturer:'',model:'',source:''})),
    spda:{class:'',method:'',captors:'',downs:'',downSection:'',gridSection:'',rods:'',rodLength:'2.4',rho:'',resistance:'',bepSection:'',dps:'',bonding:'',notes:''},
    materials:[],
    budget:{labor:'',other:''},
    calcLog:[],
    memdesc:{scope:'',characteristics:'',substation:'',qgbt:'',ccm:'',conductors:'',lighting:'',spda:'',materials:'',conclusion:''},
    revision:{number:'REV00',issueDate:new Date().toISOString().slice(0,10),description:'Emissão inicial do projeto.'}
  };
}
function normalizeState(data){
  const base=initialState(); const merged={...base,...(data||{})};
  merged.team={...base.team,...(data?.team||{})};
  merged.team.members=base.team.members.map((m,i)=>({...m,...(data?.team?.members?.[i]||{})}));
  merged.driveAssessment={...base.driveAssessment,...(data?.driveAssessment||{})};
  merged.qgbt={...base.qgbt,...(data?.qgbt||{})};
  merged.ccm={...base.ccm,...(data?.ccm||{})};
  merged.substation={...base.substation,...(data?.substation||{})};
  merged.lighting=(data?.lighting||base.lighting).map((r,i)=>({...base.lighting[i],...r,manufacturer:r?.manufacturer||'',source:r?.source||''}));
  merged.motors=(data?.motors||[]).map((m,i)=>({...m,cv:nominalCvFromKw(m.power),processCondition:m.processCondition||'Projeto importado de versão anterior: analise e registre a condição operacional.',speedRange:m.speedRange||'A definir',speedControl:m.speedControl??false,inertia:m.inertia||'A definir',startNeed:m.startNeed||'A definir',torqueDemand:m.torqueDemand||'A definir',objective:m.objective||'Revisar requisito do processo',justification:m.justification||'',driveConfig:m.driveConfig||{},driveEvaluation:m.driveEvaluation||null}));
  return merged;
}

let state = initialState();
let calcCache = {};

function directStartLimitCv(voltage){return Number(voltage)<=220?5:7.5;}
function directStartLimitKw(voltage){return directStartLimitCv(voltage)*CV_TO_KW;}
function motorCurrent(m){
  const p=num(m.power),v=num(m.voltage),eta=num(m.eta),pf=num(m.pf);
  return (p>0&&v>0&&eta>0&&pf>0)?p*1000/(Math.sqrt(3)*v*eta*pf):0;
}
function motorPowerCandidates(profile,voltage){
  const tag=profile.tag;
  const low = Number(voltage)<=220 ? [1.5,2.2,3,3.7,5.5,7.5] : [2.2,3,4,5.5,7.5,11,15];
  const medium=[7.5,11,15,18.5,22];
  const high=[18.5,22,30,37];
  if(['M01','M02','M10'].includes(tag)) return low;
  if(['M03','M04','M06','M09'].includes(tag)) return medium;
  return high;
}
function scenarioForMotor(profile,r,power,voltage){
  const scenarios={
    M01:[
      {processCondition:'A taxa de produção varia durante o turno e a velocidade da esteira deve acompanhar a alimentação do processo.',speedControl:true,speedRange:'35 a 60 Hz',inertia:'Média',startNeed:'Controlada',reversal:false,torqueDemand:'Médio',objective:'Ajustar continuamente a velocidade à produção.'},
      {processCondition:'Transporte contínuo em velocidade fixa, poucas partidas por hora e sem necessidade de sincronismo.',speedControl:false,speedRange:'60 Hz fixa',inertia:'Baixa',startNeed:'Normal',reversal:false,torqueDemand:'Baixo',objective:'Movimentação simples em velocidade constante.'}],
    M02:[
      {processCondition:'A esteira precisa sincronizar sua velocidade com outra etapa da linha para evitar acúmulo de produto.',speedControl:true,speedRange:'40 a 60 Hz',inertia:'Média',startNeed:'Controlada',reversal:false,torqueDemand:'Médio',objective:'Sincronismo de velocidade com o processo.'},
      {processCondition:'A velocidade é fixa e a carga é leve. O processo admite partida convencional quando tecnicamente permitida.',speedControl:false,speedRange:'60 Hz fixa',inertia:'Baixa',startNeed:'Normal',reversal:false,torqueDemand:'Baixo',objective:'Solução simples para velocidade fixa.'}],
    M03:[
      {processCondition:'A vazão do processo deve variar conforme a demanda, evitando estrangulamento mecânico da válvula.',speedControl:true,speedRange:'30 a 60 Hz',inertia:'Média',startNeed:'Controlada',reversal:false,torqueDemand:'Médio',objective:'Controle de vazão por variação de rotação.'},
      {processCondition:'A vazão é fixa, porém a partida brusca pode provocar golpe hidráulico e esforços na tubulação.',speedControl:false,speedRange:'60 Hz fixa',inertia:'Média',startNeed:'Suave',reversal:false,torqueDemand:'Médio',objective:'Reduzir esforços hidráulicos na partida e parada.'}],
    M04:[
      {processCondition:'O volume de ar deve ser ajustado ao longo do expediente conforme temperatura e ocupação da área.',speedControl:true,speedRange:'25 a 60 Hz',inertia:'Média',startNeed:'Controlada',reversal:false,torqueDemand:'Baixo',objective:'Controle de vazão de ar e consumo energético.'},
      {processCondition:'O exaustor opera sempre em rotação nominal, mas possui elevada corrente de partida e deve acelerar progressivamente.',speedControl:false,speedRange:'60 Hz fixa',inertia:'Média',startNeed:'Suave',reversal:false,torqueDemand:'Baixo',objective:'Reduzir corrente e esforço na aceleração.'}],
    M05:[
      {processCondition:'Receitas diferentes exigem velocidades distintas de mistura durante o ciclo produtivo.',speedControl:true,speedRange:'20 a 60 Hz',inertia:'Alta',startNeed:'Controlada',reversal:false,torqueDemand:'Alto',objective:'Ajustar rotação conforme a etapa da receita.'},
      {processCondition:'O misturador trabalha sempre em velocidade nominal, possui alta inércia e precisa de aceleração progressiva.',speedControl:false,speedRange:'60 Hz fixa',inertia:'Alta',startNeed:'Suave',reversal:false,torqueDemand:'Alto',objective:'Limitar esforços durante a partida.'}],
    M06:[
      {processCondition:'A pressão da linha deve permanecer estável mesmo com variação de consumo ao longo do processo.',speedControl:true,speedRange:'30 a 60 Hz',inertia:'Média',startNeed:'Controlada',reversal:false,torqueDemand:'Médio',objective:'Controle automático de pressão/vazão.'},
      {processCondition:'A circulação é constante, mas é necessário evitar transientes hidráulicos e partida agressiva.',speedControl:false,speedRange:'60 Hz fixa',inertia:'Média',startNeed:'Suave',reversal:false,torqueDemand:'Médio',objective:'Partida e parada suaves.'}],
    M07:[
      {processCondition:'A demanda de ar comprimido varia bastante e há interesse em modular a capacidade do compressor.',speedControl:true,speedRange:'35 a 60 Hz',inertia:'Alta',startNeed:'Controlada',reversal:false,torqueDemand:'Alto',objective:'Adequar a produção de ar à demanda.'},
      {processCondition:'O compressor opera em velocidade fixa e a prioridade é limitar pico de corrente e esforços mecânicos na partida.',speedControl:false,speedRange:'60 Hz fixa',inertia:'Alta',startNeed:'Suave',reversal:false,torqueDemand:'Alto',objective:'Reduzir corrente de partida e esforço mecânico.'}],
    M08:[
      {processCondition:'O triturador possui elevada inércia, velocidade fixa e o processo exige partida progressiva sem choque mecânico.',speedControl:false,speedRange:'60 Hz fixa',inertia:'Alta',startNeed:'Suave',reversal:false,torqueDemand:'Alto',objective:'Acelerar progressivamente a carga de alta inércia.'},
      {processCondition:'O processo requer ajuste de rotação do triturador para diferentes granulometrias e matérias-primas.',speedControl:true,speedRange:'30 a 60 Hz',inertia:'Alta',startNeed:'Controlada',reversal:false,torqueDemand:'Alto',objective:'Adequar velocidade e torque ao material processado.'}],
    M09:[
      {processCondition:'A ventilação deve acompanhar a demanda térmica, com operação variável durante o turno.',speedControl:true,speedRange:'25 a 60 Hz',inertia:'Média',startNeed:'Controlada',reversal:false,torqueDemand:'Baixo',objective:'Controle de ventilação e economia de energia.'},
      {processCondition:'A ventilação opera em velocidade fixa, mas o motor não deve partir bruscamente devido ao porte do conjunto.',speedControl:false,speedRange:'60 Hz fixa',inertia:'Média',startNeed:'Suave',reversal:false,torqueDemand:'Baixo',objective:'Aceleração suave do conjunto.'}],
    M10:[
      {processCondition:'A velocidade da embalagem deve acompanhar a cadência de produção e pode ser alterada pelo operador.',speedControl:true,speedRange:'30 a 60 Hz',inertia:'Baixa',startNeed:'Controlada',reversal:false,torqueDemand:'Baixo',objective:'Ajustar a cadência da embalagem.'},
      {processCondition:'Pequena esteira de saída em velocidade fixa, poucas partidas e baixa inércia.',speedControl:false,speedRange:'60 Hz fixa',inertia:'Baixa',startNeed:'Normal',reversal:false,torqueDemand:'Baixo',objective:'Transporte simples no final da linha.'}]
  };
  const s=pick(r,scenarios[profile.tag]);
  return {...s,startsPerHour:s.startNeed==='Normal'?pick(r,[2,3,4]):s.speedControl?pick(r,[3,4,6,8]):pick(r,[2,3,4,6]),processId:`${profile.tag}-${s.speedControl?'VAR':'FIX'}-${s.startNeed.toUpperCase()}`};
}
function motorChars(r,p){
  let eta=p<=4?.86:p<=7.5?.88:p<=15?.90:p<=30?.92:p<=55?.93:.94;
  eta=clamp(eta+pick(r,[-.01,0,.005,.01]),.82,.96);
  let pf=p<=4?.78:p<=7.5?.81:p<=15?.84:p<=30?.86:p<=55?.87:.89;
  pf=clamp(pf+pick(r,[-.02,-.01,0,.01]),.72,.93);
  return{eta:+eta.toFixed(3),pf:+pf.toFixed(2)};
}

function generateFromCode(code){
  const clean=String(code||'').trim().toUpperCase();
  if(clean.length<6) throw new Error('Informe um código válido, por exemplo PEI-2026-A-007.');
  const seed=xmur3(clean)(); const r=mulberry32(seed);
  const voltage=pick(r,[380,380,380,220]);
  const ambient=pick(r,[30,35,40]);
  const grouping=pick(r,[2,3,4,5]);
  const tempFactor=ambient===30?1:ambient===35?.96:.91;
  const groupFactor=({2:.80,3:.70,4:.65,5:.60})[grouping];
  const reserve=pick(r,[10,15,15,20]);
  const trafoZ=pick(r,[4.5,5,5,5.5]);
  const motors=motorProfiles.map((profile,i)=>{
    const power=pick(r,motorPowerCandidates(profile,voltage));
    const chars=motorChars(r,power); const scenario=scenarioForMotor(profile,r,power,voltage);
    return {
      ...profile,...scenario,power,cv:nominalCvFromKw(power),voltage,eta:chars.eta,pf:chars.pf,
      use:pick(r,[.65,.70,.75,.80,.85,.90]),service:pick(r,[1,1,1.15]),distance:between(r,28,115,2),
      install:pick(r,['B1 — eletroduto aparente','B2 — eletroduto embutido','E — cabo multipolar em bandeja','F — cabos unipolares em bandeja']),
      method:'',justification:'',current:'',cable:'',breaker:'',device:'',overload:'',driveParams:'',notes:'',
      driveConfig:{model:'',currentRating:'',commandVoltage:'',currentLimit:'',rampUp:'',rampDown:'',bypass:'',fMin:'',fMax:'',controlMode:'',speedReference:'',braking:'',emc:''},driveEvaluation:null
    };
  });
  const auxiliaries=[
    {tag:'QDL',name:'Iluminação',power:pick(r,[12,14,16,18,20]),use:1,pf:.95,voltage:voltage===380?220:127,notes:''},
    {tag:'QTA',name:'Tomadas e serviços auxiliares',power:pick(r,[6,8,10,12]),use:.60,pf:.92,voltage:voltage===380?220:127,notes:''},
    {tag:'QAUT',name:'Automação e controle',power:pick(r,[2,3,4,5]),use:1,pf:.90,voltage:voltage===380?220:127,notes:''},
    {tag:'OUT',name:'Outras cargas',power:pick(r,[2,3,4,5]),use:.70,pf:.90,voltage:voltage===380?220:127,notes:''}
  ];
  const validation=(seed>>>0).toString(16).toUpperCase().padStart(8,'0');
  state.meta={code:clean,generated:true,generatedAt:new Date().toISOString(),voltage,primary:13800,frequency:60,ambient,grouping,tempFactor,groupFactor,reserve,trafoZ,subToQgbt:pick(r,[20,25,30,35,40]),qgbtToCcm:pick(r,[15,20,25,30]),validation};
  state.motors=motors; state.driveAssessment={lastBatchAt:'',serverAvailable:state.driveAssessment?.serverAvailable??null}; state.auxiliaries=auxiliaries;
  state.substation.z=String(trafoZ); state.revision.number=$('revision')?.value||'REV00';
  state.lighting=lightingBase.map(x=>({...x,area:+(x.area*pick(r,[.95,1,1.05])).toFixed(1),flux:'',uf:'',mf:'',calc:0,adopted:'',watt:'',totalW:0,manufacturer:'',model:'',source:''}));
  calcCache={};
  return state;
}

function calcDemand(){
  let pd=0,qd=0,installed=0;
  state.motors.forEach(m=>{
    const p=num(m.power); installed+=p; const pdm=p*num(m.use); pd+=pdm;
    const pf=clamp(num(m.pf)||.85,.01,.999); qd+=pdm*Math.tan(Math.acos(pf));
  });
  state.auxiliaries.forEach(a=>{
    const p=num(a.power); installed+=p; const pda=p*num(a.use); pd+=pda;
    const pf=clamp(num(a.pf)||.95,.01,.999); qd+=pda*Math.tan(Math.acos(pf));
  });
  const sd=Math.sqrt(pd*pd+qd*qd); const pf=pd/(sd||1); const req=sd*(1+num(state.meta.reserve)/100);
  const outOfScope=req>SUBSTATION_MAX_KVA;
  const suggested=outOfScope?SUBSTATION_MAX_KVA:(TRAFO_STD.find(x=>x>=req)||SUBSTATION_MAX_KVA);
  return{installed,pd,qd,sd,pf,req,suggested,outOfScope};
}
function calcTrafo(kva=0){
  const s=num(kva)||num(state.substation.trafo)||calcDemand().suggested; const vs=num(state.meta.voltage),vp=num(state.meta.primary),z=num(state.substation.z)||num(state.meta.trafoZ)||5;
  const ip=s*1000/(Math.sqrt(3)*vp); const is=s*1000/(Math.sqrt(3)*vs); const icc=is*100/z;
  return{s,ip,is,icc,iccKa:icc/1000,z};
}

function saveState(silent=true){
  state.revision.number=$('revision')?.value||state.revision.number;
  try{localStorage.setItem(STORAGE_KEY,JSON.stringify(state));if(!silent)alert('Projeto salvo neste navegador.');}catch(e){if(!silent)alert('Não foi possível salvar localmente.');}
}
function loadState(){
  try{const saved=JSON.parse(localStorage.getItem(STORAGE_KEY)||'null');if(saved?.schema?.startsWith('PEI-PROJETISTA-INTEGRADO'))state=normalizeState(saved);}catch(e){}
}
function resetProject(){if(confirm('Apagar todo o projeto salvo neste navegador e iniciar novamente?')){localStorage.removeItem(STORAGE_KEY);state=initialState();location.reload();}}

function bindStateFields(){
  qsa('[data-state]').forEach(el=>{
    const path=el.dataset.state; const current=deepGet(state,path); if(current!==undefined&&current!==null)el.value=current;
    const save=()=>{deepSet(state,path,el.value);saveState();refreshTeamUi();refreshComputedUI();};
    el.addEventListener('input',save);el.addEventListener('change',save);
  });
  refreshTeamUi(); if($('responsibleMember')){$('responsibleMember').value=String(state.team.responsibleIndex||0);$('responsibleMember').addEventListener('change',()=>{state.team.responsibleIndex=+$('responsibleMember').value;saveState();refreshTeamUi();refreshComputedUI();});}
  $('projectCode').value=state.meta.code||''; $('revision').value=state.revision.number||'REV00'; $('finalRevision').value=state.revision.number||'REV00';
  $('revision').addEventListener('change',()=>{state.revision.number=$('revision').value;$('finalRevision').value=state.revision.number;saveState();});
}

function switchPage(page){
  qsa('.page').forEach(p=>p.classList.remove('active')); $('page-'+page)?.classList.add('active');
  qsa('#nav button').forEach(b=>b.classList.toggle('active',b.dataset.page===page));
  if(page==='dashboard')renderDashboard(); if(page==='acionamentos')renderDriveEngineering(); if(page==='entrega')renderFinalChecklist(); if(page==='memcalc')renderCalcLog(); if(page==='materiais')renderMaterials(); if(page==='memdesc')bindStateFields();
  window.scrollTo({top:0,behavior:'smooth'});
}

function renderPremises(){
  const m=state.meta; const d=calcDemand();
  $('premiseCards').innerHTML=[
    ['Sistema BT',`${m.voltage} V`],['Primário',`${fmt(m.primary/1000,1)} kV`],['Ambiente',`${m.ambient} °C`],['Agrupamento',`${m.grouping} circuitos`],
    ['Kt',fmt(m.tempFactor,2)],['Kg',fmt(m.groupFactor,2)],['Reserva',`${fmt(m.reserve,0)}%`],['Validação',m.validation||'—']
  ].map(([a,b])=>`<div class="summary-card"><small>${a}</small><strong>${b}</strong></div>`).join('');
  $('generatedProjectInfo').innerHTML=state.meta.generated?`<span class="badge green">Projeto gerado</span> <strong>${escapeHtml(m.code)}</strong> • ${m.voltage} V • ${state.motors.length} motores • validação ${m.validation}`:'<span class="badge orange">Aguardando código</span>';
}

function renderLoadTable(){
  const body=$('loadTableBody');
  if(!state.motors.length){body.innerHTML='<tr><td colspan="18">Gere o projeto com o código do trio para carregar as cargas.</td></tr>';return;}
  body.innerHTML=state.motors.map((m,i)=>{
    const current=num(m.current); const limitViolation=m.method==='Partida direta'&&(num(m.cv)>directStartLimitCv(m.voltage)+.01||num(m.power)>directStartLimitKw(m.voltage)+.03);
    const complete=current>0&&m.method&&m.cable&&m.breaker&&m.device&&m.overload;
    const status=limitViolation?'<span class="badge red">REVER PARTIDA</span>':complete?'<span class="badge green">DIMENSIONADO</span>':m.method?'<span class="badge orange">PENDENTE</span>':'<span class="badge orange">ESCOLHER ACIONAMENTO</span>';
    return `<tr><td class="cell-tag">${m.tag}</td><td>${escapeHtml(m.name)}</td><td class="cell-readonly">${fmt(m.power,1)}</td><td>${fmt(m.cv,1)}</td><td>${m.voltage}</td><td>${fmt(m.eta,3)}</td><td>${fmt(m.pf,2)}</td><td>${fmt(m.use,2)}</td><td>${fmt(m.service,2)}</td><td>${fmt(m.distance,0)}</td><td>${m.startsPerHour}</td><td>${escapeHtml(m.method||'A definir')}</td>
      <td><input type="number" step=".01" data-motor="${i}" data-key="current" value="${escapeHtml(m.current)}"></td><td><input data-motor="${i}" data-key="cable" value="${escapeHtml(m.cable)}" placeholder="mm²"></td><td><input data-motor="${i}" data-key="breaker" value="${escapeHtml(m.breaker)}" placeholder="A / modelo"></td><td><input data-motor="${i}" data-key="device" value="${escapeHtml(m.device)}" placeholder="Contator / SS / VFD"></td><td><input data-motor="${i}" data-key="overload" value="${escapeHtml(m.overload)}" placeholder="Ajuste"></td><td>${status}</td></tr>`;
  }).join('');
  qsa('[data-motor]').forEach(el=>{const fn=()=>{state.motors[+el.dataset.motor][el.dataset.key]=el.value;saveState();renderCcmTable();refreshComputedUI();};el.addEventListener('input',fn);el.addEventListener('change',fn);});renderLoadSummary();
}
function renderAuxTable(){
  const body=$('auxTableBody');
  if(!state.auxiliaries.length){body.innerHTML='<tr><td colspan="7">As cargas auxiliares serão geradas junto com o código.</td></tr>';return;}
  body.innerHTML=state.auxiliaries.map((a,i)=>`<tr><td class="cell-tag">${a.tag}</td><td>${a.name}</td><td><input type="number" step=".1" data-aux="${i}" data-key="power" value="${a.power}"></td><td><input type="number" step=".01" data-aux="${i}" data-key="use" value="${a.use}"></td><td><input type="number" step=".01" data-aux="${i}" data-key="pf" value="${a.pf}"></td><td>${a.voltage} V</td><td><input data-aux="${i}" data-key="notes" value="${escapeHtml(a.notes)}"></td></tr>`).join('');
  qsa('[data-aux]').forEach(el=>{const fn=()=>{state.auxiliaries[+el.dataset.aux][el.dataset.key]=['power','use','pf'].includes(el.dataset.key)?num(el.value):el.value;saveState();refreshComputedUI();};el.addEventListener('input',fn);el.addEventListener('change',fn);});
}
function renderLoadSummary(){
  const d=calcDemand(); const completed=state.motors.filter(m=>m.method&&num(m.current)>0&&m.cable&&m.breaker&&m.device).length;
  $('loadSummary').innerHTML=[['Potência instalada',`${fmt(d.installed,1)} kW`],['Demanda ativa',`${fmt(d.pd,1)} kW`],['Demanda aparente',`${fmt(d.sd,1)} kVA`],['Motores dimensionados',`${completed}/${state.motors.length}`]].map(([a,b])=>`<div class="summary-card"><small>${a}</small><strong>${b}</strong></div>`).join('');
}


function driveConfigFields(m,i){const c=m.driveConfig||{};const common=`<div class="field"><label>Fabricante / modelo</label><input data-drive-config="${i}" data-key="model" value="${escapeHtml(c.model||'')}" placeholder="Referência pesquisada pela equipe"></div><div class="field"><label>Corrente nominal do dispositivo (A)</label><input type="number" step=".01" data-drive-config="${i}" data-key="currentRating" value="${escapeHtml(c.currentRating||'')}"></div>`;if(m.method==='Partida direta')return common+`<div class="field"><label>Tensão de comando</label><input data-drive-config="${i}" data-key="commandVoltage" value="${escapeHtml(c.commandVoltage||'')}"></div><div class="field"><label>Ip/In / observação</label><input data-drive-config="${i}" data-key="currentLimit" value="${escapeHtml(c.currentLimit||'')}"></div>`;if(m.method==='Soft-starter')return common+`<div class="field"><label>Limite de corrente (%)</label><input type="number" data-drive-config="${i}" data-key="currentLimit" value="${escapeHtml(c.currentLimit||'')}"></div><div class="field"><label>Rampa aceleração (s)</label><input type="number" step=".1" data-drive-config="${i}" data-key="rampUp" value="${escapeHtml(c.rampUp||'')}"></div><div class="field"><label>Rampa desaceleração (s)</label><input type="number" step=".1" data-drive-config="${i}" data-key="rampDown" value="${escapeHtml(c.rampDown||'')}"></div><div class="field"><label>Bypass</label><select data-drive-config="${i}" data-key="bypass"><option value="">Selecione</option><option ${c.bypass==='Interno'?'selected':''}>Interno</option><option ${c.bypass==='Externo'?'selected':''}>Externo</option></select></div>`;if(m.method==='Inversor de frequência')return common+`<div class="field"><label>Frequência mínima (Hz)</label><input type="number" step=".1" data-drive-config="${i}" data-key="fMin" value="${escapeHtml(c.fMin||'')}"></div><div class="field"><label>Frequência máxima (Hz)</label><input type="number" step=".1" data-drive-config="${i}" data-key="fMax" value="${escapeHtml(c.fMax||'')}"></div><div class="field"><label>Aceleração (s)</label><input type="number" step=".1" data-drive-config="${i}" data-key="rampUp" value="${escapeHtml(c.rampUp||'')}"></div><div class="field"><label>Desaceleração (s)</label><input type="number" step=".1" data-drive-config="${i}" data-key="rampDown" value="${escapeHtml(c.rampDown||'')}"></div><div class="field"><label>Modo de controle</label><input data-drive-config="${i}" data-key="controlMode" value="${escapeHtml(c.controlMode||'')}"></div><div class="field"><label>Referência de velocidade</label><input data-drive-config="${i}" data-key="speedReference" value="${escapeHtml(c.speedReference||'')}"></div>`;return '<div class="callout">Escolha o acionamento para abrir os parâmetros específicos.</div>';}
function driveEvaluationSummary(){const decided=state.motors.filter(m=>m.method&&String(m.justification||'').trim().length>=20).length,evaluated=state.motors.filter(m=>m.driveEvaluation).length,scores=state.motors.filter(m=>m.driveEvaluation).map(m=>num(m.driveEvaluation.score)),avg=scores.length?scores.reduce((a,b)=>a+b,0)/scores.length:0,review=state.motors.filter(m=>['fail','warn'].includes(m.driveEvaluation?.level)).length;return{decided,evaluated,avg,pts20:avg*2,review};}
function renderDriveSummary(){
  const s=driveEvaluationSummary();
  const el=$('driveSummary');if(!el)return;
  el.innerHTML=[
    ['Decisões justificadas',`${s.decided}/${state.motors.length||10}`],
    ['Verificações realizadas',`${s.evaluated}/${state.motors.length||10}`],
    ['Decisões sem ressalvas',String(state.motors.filter(m=>m.driveEvaluation?.level==='ok').length)],
    ['Pontos para revisar',String(s.review)]
  ].map(([a,b])=>`<div class="summary-card"><small>${a}</small><strong>${b}</strong></div>`).join('');
}
function renderDriveEngineering(){const box=$('driveEngineeringList');if(!box)return;if(!state.motors.length){box.innerHTML='<div class="section"><div class="callout orange">Gere o projeto pelo código da equipe antes de iniciar.</div></div>';renderDriveSummary();return;}box.innerHTML=state.motors.map((m,i)=>{const ev=m.driveEvaluation,evalHtml=ev?`<div class="evaluation-box ${ev.level||'pending'}"><div class="evaluation-title"><strong>${ev.level==='ok'?'Coerente':ev.level==='warn'?'Coerente com ressalvas':'Rever decisão'}</strong><span class="badge ${ev.level==='ok'?'green':ev.level==='warn'?'orange':'red'}">${ev.level==='ok'?'OK':ev.level==='warn'?'REVISAR':'REVER'}</span></div><p>${escapeHtml(ev.feedback||'')}</p>${Array.isArray(ev.evidence)&&ev.evidence.length?`<ul>${ev.evidence.map(x=>`<li>${escapeHtml(x)}</li>`).join('')}</ul>`:''}<small>Verificação técnica • ${ev.source==='server'?'servidor Vercel':'pré-validação local'}</small></div>`:'<div class="evaluation-box pending"><strong>Aguardando avaliação</strong><p>Escolha, justifique e preencha os principais parâmetros.</p></div>';return `<section class="section drive-card"><div class="drive-card-head"><div><span class="badge">${m.tag}</span><h2>${escapeHtml(m.name)}</h2><p>${fmt(m.power,1)} kW • ${fmt(m.cv,1)} cv • ${m.voltage} V • ${m.startsPerHour} partidas/h</p></div><button class="btn primary" data-evaluate-drive="${i}">Avaliar decisão</button></div><div class="scenario-grid"><div class="scenario-item"><small>Condição do processo</small><strong>${escapeHtml(m.processCondition)}</strong></div><div class="scenario-item"><small>Velocidade</small><strong>${escapeHtml(m.speedRange)}</strong></div><div class="scenario-item"><small>Controle durante operação</small><strong>${m.speedControl?'Necessário':'Não necessário'}</strong></div><div class="scenario-item"><small>Inércia / torque</small><strong>${escapeHtml(m.inertia)} / ${escapeHtml(m.torqueDemand)}</strong></div><div class="scenario-item"><small>Partida requerida</small><strong>${escapeHtml(m.startNeed)}</strong></div><div class="scenario-item"><small>Objetivo</small><strong>${escapeHtml(m.objective)}</strong></div></div><div class="decision-grid"><div class="field"><label>Acionamento escolhido</label><select data-drive-method="${i}"><option value="">Selecione</option><option ${m.method==='Partida direta'?'selected':''}>Partida direta</option><option ${m.method==='Soft-starter'?'selected':''}>Soft-starter</option><option ${m.method==='Inversor de frequência'?'selected':''}>Inversor de frequência</option></select></div><div class="field justification-field"><label>Justificativa técnica</label><textarea data-drive-justification="${i}" placeholder="Relacione a escolha ao processo, à partida e à operação...">${escapeHtml(m.justification||'')}</textarea></div></div><h3>Especificação / parametrização</h3><div class="config-grid">${driveConfigFields(m,i)}</div>${evalHtml}</section>`;}).join('');qsa('[data-drive-method]').forEach(el=>el.addEventListener('change',()=>{const m=state.motors[+el.dataset.driveMethod];m.method=el.value;m.driveEvaluation=null;saveState();renderDriveEngineering();renderLoadTable();renderCcmTable();refreshComputedUI();}));qsa('[data-drive-justification]').forEach(el=>el.addEventListener('input',()=>{const m=state.motors[+el.dataset.driveJustification];m.justification=el.value;m.driveEvaluation=null;saveState();renderDriveSummary();}));qsa('[data-drive-config]').forEach(el=>{const fn=()=>{const m=state.motors[+el.dataset.driveConfig];m.driveConfig=m.driveConfig||{};m.driveConfig[el.dataset.key]=el.value;m.driveEvaluation=null;saveState();};el.addEventListener('input',fn);el.addEventListener('change',fn);});qsa('[data-evaluate-drive]').forEach(b=>b.addEventListener('click',()=>evaluateDrive(+b.dataset.evaluateDrive)));renderDriveSummary();}
function localDrivePrecheck(m){if(!m.method)return{level:'fail',score:0,feedback:'Selecione um acionamento.',evidence:[],source:'local'};if(String(m.justification||'').trim().length<20)return{level:'warn',score:3,feedback:'A justificativa está muito curta. Relacione a escolha à condição do processo.',evidence:['Explique operação, partida e necessidade do processo.'],source:'local'};if(m.method==='Partida direta'&&(num(m.cv)>directStartLimitCv(m.voltage)+.01||num(m.power)>directStartLimitKw(m.voltage)+.03))return{level:'fail',score:1,feedback:`Partida direta fora do limite didático para ${m.voltage} V.`,evidence:[`Motor ${fmt(m.cv,1)} cv; limite ${directStartLimitCv(m.voltage)} cv.`],source:'local'};return{level:'warn',score:5,feedback:'Pré-validação concluída. Na Vercel, a avaliação técnica completa é executada no servidor.',evidence:['A decisão está registrada e aguarda avaliação completa.'],source:'local'};}
async function evaluateDrive(i){const m=state.motors[i];if(!m)return;const basic=localDrivePrecheck(m);if(basic.level==='fail'||!m.method||String(m.justification||'').trim().length<20){m.driveEvaluation={...basic,evaluatedAt:new Date().toISOString()};saveState();renderDriveEngineering();refreshComputedUI();return;}try{const response=await fetch('/api/evaluate-drive',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({motor:{tag:m.tag,name:m.name,power:m.power,cv:m.cv,voltage:m.voltage,startsPerHour:m.startsPerHour},scenario:{processCondition:m.processCondition,speedControl:m.speedControl,speedRange:m.speedRange,inertia:m.inertia,startNeed:m.startNeed,reversal:m.reversal,torqueDemand:m.torqueDemand,objective:m.objective},choice:{method:m.method,justification:m.justification,config:m.driveConfig||{}}})});if(!response.ok)throw new Error();m.driveEvaluation={...(await response.json()),source:'server',evaluatedAt:new Date().toISOString()};state.driveAssessment.serverAvailable=true;}catch(e){m.driveEvaluation={...basic,evaluatedAt:new Date().toISOString()};state.driveAssessment.serverAvailable=false;}saveState();renderDriveEngineering();refreshComputedUI();}
async function evaluateAllDrives(){const filled=state.motors.map((m,i)=>({m,i})).filter(x=>x.m.method&&String(x.m.justification||'').trim().length>=20);if(!filled.length)return alert('Preencha pelo menos uma decisão e justificativa.');const btn=$('evaluateAllDrives');btn.disabled=true;for(const x of filled)await evaluateDrive(x.i);state.driveAssessment.lastBatchAt=new Date().toISOString();saveState();btn.disabled=false;renderDriveEngineering();renderDashboard();}
async function checkDriveApi(){const badge=$('driveApiStatus');if(!badge)return;try{const r=await fetch('/api/evaluate-drive');if(!r.ok)throw new Error();state.driveAssessment.serverAvailable=true;badge.className='badge green';badge.textContent='Avaliação Vercel: online';}catch(e){state.driveAssessment.serverAvailable=false;badge.className='badge orange';badge.textContent='Avaliação: modo local';}}

function teamParticipation(){const members=state.team?.members||[];return members.reduce((s,m)=>s+num(m.participation),0);}
function responsibleMember(){return state.team?.members?.[num(state.team?.responsibleIndex)]||state.team?.members?.[0]||{};}
function refreshTeamUi(){const total=teamParticipation(),label=$('teamParticipationTotal'),box=$('teamParticipationStatus');if(label)label.textContent=fmt(total,0)+'%';if(box){const ok=Math.abs(total-100)<.01;box.className='callout '+(ok?'green':'orange');box.innerHTML=ok?'<strong>Participação fechada em 100%.</strong>':'<strong>Revisar participação.</strong> A soma deve totalizar 100%.';}const sel=$('responsibleMember');if(sel){sel.innerHTML=(state.team.members||[]).map((m,i)=>`<option value="${i}">${escapeHtml(m.name||`Integrante ${i+1}`)}</option>`).join('');sel.value=String(state.team.responsibleIndex||0);}const owner=$('calcOwnerSelect');if(owner){const cur=owner.value;owner.innerHTML='<option value="">Selecione o integrante</option>'+(state.team.members||[]).map((m,i)=>`<option value="${i}">${escapeHtml(m.name||`Integrante ${i+1}`)}</option>`).join('');if(cur)owner.value=cur;}}
function renderMotorSelectors(){
  const opts=state.motors.map((m,i)=>`<option value="${i}">${m.tag} • ${escapeHtml(m.name)} • ${fmt(m.power,1)} kW</option>`).join('');
  $('calcMotorSelect').innerHTML=opts||'<option value="">Gere o projeto</option>'; if(state.motors.length)fillMotorCalc(0);
}
function fillMotorCalc(i){
  const m=state.motors[i]; if(!m)return; $('cmP').value=m.power;$('cmV').value=m.voltage;$('cmEta').value=m.eta;$('cmPf').value=m.pf;
}

function setCalcResult(id,html){$(id).innerHTML=html;}
function addCalcLog(title,formula,substitution,result,unit='',category='Geral'){
  const ownerIndex=$('calcOwnerSelect')?.value??''; const owner=ownerIndex!==''?state.team.members?.[+ownerIndex]:null;
  state.calcLog.push({id:Date.now()+Math.random(),title,formula,substitution,result,unit,category,ownerIndex:ownerIndex===''?null:+ownerIndex,ownerName:owner?.name||'',createdAt:new Date().toISOString()}); saveState(); renderCalcLog(); refreshComputedUI();
}
function renderCalcLog(){
  const box=$('calcLogList'); if(!box)return;
  if(!state.calcLog.length){box.innerHTML='<div class="callout">Nenhum cálculo registrado ainda. Use a Calculadora Industrial e clique em “Adicionar ao Memorial”.</div>';return;}
  box.innerHTML=state.calcLog.map((c,i)=>`<article class="calc-log-item"><div class="head"><div><span class="badge">${escapeHtml(c.category)}</span><h3>${i+1}. ${escapeHtml(c.title)}</h3></div><button class="btn danger" data-del-calc="${c.id}">Excluir</button></div><div class="equation">${escapeHtml(c.formula)}</div><p><strong>Responsável:</strong> ${escapeHtml(c.ownerName||'Não informado')}</p><p><strong>Substituição:</strong> ${escapeHtml(c.substitution)}</p><p><strong>Resultado:</strong> ${escapeHtml(c.result)} ${escapeHtml(c.unit)}</p></article>`).join('');
  qsa('[data-del-calc]').forEach(b=>b.addEventListener('click',()=>{state.calcLog=state.calcLog.filter(c=>String(c.id)!==b.dataset.delCalc);saveState();renderCalcLog();refreshComputedUI();}));
}

function setupCalculators(){
  $('calcMotorSelect').addEventListener('change',e=>fillMotorCalc(+e.target.value));
  $('cmCalc').addEventListener('click',()=>{const p=num($('cmP').value),v=num($('cmV').value),eta=num($('cmEta').value),pf=num($('cmPf').value);const I=p&&v&&eta&&pf?p*1000/(Math.sqrt(3)*v*eta*pf):0;calcCache.cm={I,p,v,eta,pf};setCalcResult('cmResult',I?`I = <strong>${fmt(I,2)} A</strong>`:'Revise os dados.');});
  $('cmApply').addEventListener('click',()=>{const i=+$('calcMotorSelect').value;if(calcCache.cm?.I&&state.motors[i]){state.motors[i].current=+calcCache.cm.I.toFixed(2);saveState();renderLoadTable();renderCcmTable();alert('Corrente aplicada ao '+state.motors[i].tag+'.');}});
  $('cmLog').addEventListener('click',()=>{const c=calcCache.cm;if(!c?.I)return alert('Calcule primeiro.');const m=state.motors[+$('calcMotorSelect').value];addCalcLog(`Corrente nominal ${m?.tag||''}`,'I = P / (√3 × V × η × cosφ)',`${fmt(c.p,2)}×1000 / (1,732 × ${fmt(c.v,0)} × ${fmt(c.eta,3)} × ${fmt(c.pf,2)})`,fmt(c.I,2),'A','Motores');});

  $('cpCalc').addEventListener('click',()=>{const p=num($('cpP').value),pf=clamp(num($('cpPf').value),.01,.999);const s=p/pf,q=p*Math.tan(Math.acos(pf));calcCache.cp={p,pf,s,q};setCalcResult('cpResult',p?`S = <strong>${fmt(s,2)} kVA</strong> • Q = <strong>${fmt(q,2)} kvar</strong>`:'Revise os dados.');});
  $('cpLog').addEventListener('click',()=>{const c=calcCache.cp;if(!c?.p)return alert('Calcule primeiro.');addCalcLog('Potências ativa, aparente e reativa','S = P/cosφ | Q = P × tan(arccos cosφ)',`P=${fmt(c.p,2)} kW; cosφ=${fmt(c.pf,2)}`,`S=${fmt(c.s,2)} kVA; Q=${fmt(c.q,2)}`,'kvar','Potências');});

  $('cdCalc').addEventListener('click',()=>{state.meta.reserve=num($('cdReserve').value)||state.meta.reserve;const d=calcDemand();calcCache.cd=d;setCalcResult('cdResult',`Pd=<strong>${fmt(d.pd,1)} kW</strong> • Qd=<strong>${fmt(d.qd,1)} kvar</strong> • Sd=<strong>${fmt(d.sd,1)} kVA</strong> • Sproj=<strong>${fmt(d.req,1)} kVA</strong> • comercial: <strong>${d.outOfScope?'FORA DO ESCOPO (>300 kVA)':fmt(d.suggested,1)+' kVA'}</strong>`);saveState();refreshComputedUI();});
  $('cdApply').addEventListener('click',()=>{const d=calcCache.cd||calcDemand();if(d.outOfScope)return alert('Potência requerida acima de 300 kVA. O projeto está fora do escopo da subestação aérea desta atividade. Revise demanda/reserva.');state.substation.trafo=d.suggested;state.substation.z=state.meta.trafoZ;const t=calcTrafo(d.suggested);state.substation.ip=+t.ip.toFixed(2);state.substation.is=+t.is.toFixed(2);state.substation.icc=+t.iccKa.toFixed(2);syncFormFromState();saveState();refreshComputedUI();alert('Dados principais aplicados à subestação.');});
  $('cdLog').addEventListener('click',()=>{const d=calcCache.cd||calcDemand();addCalcLog('Demanda e potência do transformador','Sd = √(Pd² + Qd²); Sproj = Sd × (1+reserva)',`Pd=${fmt(d.pd,2)} kW; Qd=${fmt(d.qd,2)} kvar; reserva=${fmt(state.meta.reserve,0)}%`,`Sd=${fmt(d.sd,2)} kVA; Sproj=${fmt(d.req,2)} kVA; transformador comercial=${d.outOfScope?'FORA DO ESCOPO (>300 kVA)':fmt(d.suggested,1)}`,'kVA','Subestação');});

  $('caCalc').addEventListener('click',()=>{const ib=num($('caIb').value),kt=num($('caKt').value),kg=num($('caKg').value),ko=num($('caKo').value)||1;const iz=ib&&kt&&kg?ib/(kt*kg*ko):0;calcCache.ca={ib,kt,kg,ko,iz};setCalcResult('caResult',iz?`Iz,tabela requerida ≥ <strong>${fmt(iz,2)} A</strong>`:'Revise os dados.');});
  $('caLog').addEventListener('click',()=>{const c=calcCache.ca;if(!c?.iz)return alert('Calcule primeiro.');addCalcLog('Ampacidade corrigida requerida','Iz,tabela ≥ Ib / (Kt × Kg × Koutros)',`${fmt(c.ib,2)} / (${fmt(c.kt,2)} × ${fmt(c.kg,2)} × ${fmt(c.ko,2)})`,fmt(c.iz,2),'A','Condutores');});

  $('cvCalc').addEventListener('click',()=>{const I=num($('cvI').value),L=num($('cvL').value)/1000,V=num($('cvV').value),R=num($('cvR').value),X=num($('cvX').value),pf=clamp(num($('cvPf').value),.01,.999);const sin=Math.sqrt(1-pf*pf),dv=Math.sqrt(3)*I*L*(R*pf+X*sin),pct=V?100*dv/V:0;calcCache.cv={I,L,V,R,X,pf,dv,pct};setCalcResult('cvResult',dv?`ΔV=<strong>${fmt(dv,2)} V</strong> • <strong>${fmt(pct,2)}%</strong>`:'Revise os dados.');});
  $('cvLog').addEventListener('click',()=>{const c=calcCache.cv;if(!c?.dv)return alert('Calcule primeiro.');addCalcLog('Queda de tensão trifásica','ΔV = √3 × I × L × (R cosφ + X senφ)',`I=${fmt(c.I,2)} A; L=${fmt(c.L,3)} km; R=${fmt(c.R,3)} Ω/km; X=${fmt(c.X,3)} Ω/km; cosφ=${fmt(c.pf,2)}`,`ΔV=${fmt(c.dv,2)} V = ${fmt(c.pct,2)}%`,'','Condutores');});

  $('ctCalc').addEventListener('click',()=>{const s=num($('ctS').value),v=num($('ctV').value),z=num($('ctZ').value);const In=s&&v?s*1000/(Math.sqrt(3)*v):0,icc=z?In*100/z:0;calcCache.ct={s,v,z,In,icc};setCalcResult('ctResult',In?`In=<strong>${fmt(In,2)} A</strong> • Icc≈<strong>${fmt(icc/1000,2)} kA</strong>`:'Revise os dados.');});
  $('ctApply').addEventListener('click',()=>{const c=calcCache.ct;if(!c?.In)return alert('Calcule primeiro.');if(num(c.s)>SUBSTATION_MAX_KVA)return alert('Transformador acima de 300 kVA: fora do escopo desta atividade.');state.substation.trafo=c.s;state.substation.z=c.z;state.substation.is=+c.In.toFixed(2);state.substation.icc=+(c.icc/1000).toFixed(2);state.qgbt.icu=Math.ceil(c.icc/1000);syncFormFromState();saveState();refreshComputedUI();});
  $('ctLog').addEventListener('click',()=>{const c=calcCache.ct;if(!c?.In)return alert('Calcule primeiro.');addCalcLog('Corrente nominal e curto-circuito do transformador','In = S/(√3×V); Icc ≈ In×100/Z%',`S=${fmt(c.s,1)} kVA; V=${fmt(c.v,0)} V; Z=${fmt(c.z,1)}%`,`In=${fmt(c.In,2)} A; Icc≈${fmt(c.icc/1000,2)} kA`,'','Curto-circuito');});

  $('cfCalc').addEventListener('click',()=>{const p=num($('cfP').value),f1=clamp(num($('cf1').value),.01,.999),f2=clamp(num($('cf2').value),.01,.999);const q=p*(Math.tan(Math.acos(f1))-Math.tan(Math.acos(f2)));calcCache.cf={p,f1,f2,q:Math.max(0,q)};setCalcResult('cfResult',p?`Qc ≈ <strong>${fmt(Math.max(0,q),2)} kvar</strong>`:'Revise os dados.');});
  $('cfLog').addEventListener('click',()=>{const c=calcCache.cf;if(!c?.p)return alert('Calcule primeiro.');addCalcLog('Correção do fator de potência','Qc = P × [tan(arccos fp1) − tan(arccos fp2)]',`P=${fmt(c.p,2)} kW; fp1=${fmt(c.f1,2)}; fp2=${fmt(c.f2,2)}`,fmt(c.q,2),'kvar','Fator de potência');});

  $('clCalc').addEventListener('click',()=>{const E=num($('clE').value),A=num($('clA').value),flux=num($('clFlux').value),uf=num($('clUf').value),mf=num($('clMf').value),n=flux&&uf&&mf?E*A/(flux*uf*mf):0;calcCache.cl={E,A,flux,uf,mf,n};setCalcResult('clResult',n?`Ncalc=<strong>${fmt(n,2)}</strong> • adotar no mínimo <strong>${Math.ceil(n)} luminárias</strong>`:'Revise os dados.');});
  $('clLog').addEventListener('click',()=>{const c=calcCache.cl;if(!c?.n)return alert('Calcule primeiro.');addCalcLog('Cálculo luminotécnico — método dos lúmens','N = E×A/(Φ×UF×MF)',`${fmt(c.E,0)}×${fmt(c.A,1)}/(${fmt(c.flux,0)}×${fmt(c.uf,2)}×${fmt(c.mf,2)})`,`Ncalc=${fmt(c.n,2)}; Nadotado=${Math.ceil(c.n)}`,'luminárias','Iluminação');});

  $('csCalc').addEventListener('click',()=>{const I=num($('csI').value),t=num($('csT').value),k=num($('csK').value),S=k?I*Math.sqrt(t)/k:0;calcCache.cs={I,t,k,S};setCalcResult('csResult',S?`S mínima ≈ <strong>${fmt(S,2)} mm²</strong>`:'Revise os dados.');});
  $('csLog').addEventListener('click',()=>{const c=calcCache.cs;if(!c?.S)return alert('Calcule primeiro.');addCalcLog('Seção mínima por curto-circuito','S ≥ Icc × √t / k',`${fmt(c.I,0)}×√${fmt(c.t,2)}/${fmt(c.k,0)}`,fmt(c.S,2),'mm²','Condutores');});

  $('cgCalc').addEventListener('click',()=>{const rho=num($('cgRho').value),L=num($('cgL').value),d=num($('cgD').value),R=rho&&L&&d?rho/(2*Math.PI*L)*(Math.log(4*L/d)-1):0;calcCache.cg={rho,L,d,R};setCalcResult('cgResult',R?`R aproximada ≈ <strong>${fmt(R,2)} Ω</strong>`:'Revise os dados.');});
  $('cgLog').addEventListener('click',()=>{const c=calcCache.cg;if(!c?.R)return alert('Calcule primeiro.');addCalcLog('Resistência aproximada de uma haste','R ≈ ρ/(2πL) × [ln(4L/d) − 1]',`ρ=${fmt(c.rho,1)} Ω·m; L=${fmt(c.L,2)} m; d=${fmt(c.d,3)} m`,fmt(c.R,2),'Ω','Aterramento');});
}

function renderQgbtSummary(){
  const d=calcDemand(); const t=calcTrafo(); const ib=d.sd*1000/(Math.sqrt(3)*num(state.meta.voltage));
  $('qgbtSummary').innerHTML=[['Fabricante / modelo',`${escapeHtml(state.qgbt.manufacturer||'A definir')} ${escapeHtml(state.qgbt.model||'')}`],['Demanda aparente',`${fmt(d.sd,1)} kVA`],['Corrente equivalente',`${fmt(ib,1)} A`],['Icc aproximada SE',`${fmt(t.iccKa,1)} kA`],['Tensão do QGBT',`${state.meta.voltage} V`]].map(([a,b])=>`<div class="summary-card"><small>${a}</small><strong>${b}</strong></div>`).join('');
}
function renderSubstationSummary(){
  const d=calcDemand(),t=calcTrafo(state.substation.trafo||d.suggested);
  $('substationSummary').innerHTML=[['NDU / tipo',`${escapeHtml(state.substation.nduVersion||'NDU 002')} • Aérea`],['Transformador / modelo',`${escapeHtml(state.substation.trafo||'—')} kVA • ${escapeHtml(state.substation.manufacturer||'fabricante a definir')} ${escapeHtml(state.substation.model||'')}`],['Pd',`${fmt(d.pd,1)} kW`],['Sd',`${fmt(d.sd,1)} kVA`],['S requerida c/ reserva',`${fmt(d.req,1)} kVA`],['Enquadramento',d.outOfScope?'<span style="color:#b42318">FORA DO ESCOPO &gt; 300 kVA</span>':`${fmt(d.suggested,1)} kVA • ≤ 300 kVA`]].map(([a,b])=>`<div class="summary-card"><small>${a}</small><strong>${b}</strong></div>`).join('');
}

function renderCcmTable(){
  const body=$('ccmTableBody'); if(!body)return;
  if(!state.motors.length){body.innerHTML='<tr><td colspan="10">Gere as cargas primeiro.</td></tr>';return;}
  body.innerHTML=state.motors.map((m,i)=>`<tr><td class="cell-tag">${m.tag}</td><td>${escapeHtml(m.name)}</td><td>${fmt(m.power,1)}</td><td>${m.current?fmt(m.current,2):'—'}</td><td>${escapeHtml(m.method||'A definir')}</td><td><input data-ccm-m="${i}" data-key="cable" value="${escapeHtml(m.cable)}"></td><td><input data-ccm-m="${i}" data-key="breaker" value="${escapeHtml(m.breaker)}"></td><td><input data-ccm-m="${i}" data-key="device" value="${escapeHtml(m.device)}"></td><td><input data-ccm-m="${i}" data-key="overload" value="${escapeHtml(m.overload)}"></td><td><input data-ccm-m="${i}" data-key="driveParams" value="${escapeHtml(m.driveParams)}" placeholder="rampa / frequência / limites"></td></tr>`).join('');
  qsa('[data-ccm-m]').forEach(el=>{const fn=()=>{state.motors[+el.dataset.ccmM][el.dataset.key]=el.value;saveState();renderLoadTable();refreshComputedUI();};el.addEventListener('input',fn);el.addEventListener('change',fn);});
}

function renderLighting(){
  const body=$('lightingTableBody');
  body.innerHTML=state.lighting.map((r,i)=>`<tr><td class="cell-tag">${r.name}</td><td><input type="number" step=".1" data-light="${i}" data-key="area" value="${r.area}"></td><td><input type="number" data-light="${i}" data-key="lux" value="${r.lux}"></td><td><input type="number" data-light="${i}" data-key="flux" value="${r.flux}"></td><td><input type="number" step=".01" data-light="${i}" data-key="uf" value="${r.uf}"></td><td><input type="number" step=".01" data-light="${i}" data-key="mf" value="${r.mf}"></td><td id="lcalc${i}">${fmt(r.calc,2)}</td><td><input type="number" data-light="${i}" data-key="adopted" value="${r.adopted}"></td><td><input type="number" data-light="${i}" data-key="watt" value="${r.watt}"></td><td id="ltotal${i}">${fmt(r.totalW,0)}</td><td><input data-light="${i}" data-key="manufacturer" value="${escapeHtml(r.manufacturer||'')}"></td><td><input data-light="${i}" data-key="model" value="${escapeHtml(r.model)}"></td><td><input data-light="${i}" data-key="source" value="${escapeHtml(r.source||'')}"></td></tr>`).join('');
  qsa('[data-light]').forEach(el=>{const fn=()=>{const r=state.lighting[+el.dataset.light],k=el.dataset.key;r[k]=['area','lux','flux','uf','mf','adopted','watt'].includes(k)?num(el.value):el.value;recalcLightingRow(r);saveState();renderLighting();refreshComputedUI();};el.addEventListener('change',fn);});
}
function recalcLightingRow(r){r.calc=(num(r.flux)&&num(r.uf)&&num(r.mf))?num(r.lux)*num(r.area)/(num(r.flux)*num(r.uf)*num(r.mf)):0;r.totalW=num(r.adopted)*num(r.watt);}

function suggestedMaterials(){
  const list=[];let item=1;const add=(tag,desc,qty=1,unit='un',key='')=>list.push({id:crypto.randomUUID?crypto.randomUUID():String(Date.now()+Math.random()),item:item++,tag,description:desc,qty,unit,unitPrice:'',notes:'',autoKey:key});
  if(state.substation.trafo)add('TR-01',`Transformador trifásico ${state.substation.trafo} kVA, ${fmt(state.meta.primary/1000,1)} kV / ${state.meta.voltage} V — ${state.substation.manufacturer||'fabricante a definir'} ${state.substation.model||''}`,1,'un','trafo');
  add('QGBT-01',`Quadro Geral de Baixa Tensão — ${state.qgbt.manufacturer||'fabricante a definir'} ${state.qgbt.model||''} — barramento ${state.qgbt.bus||'___'} A`,1,'un','qgbt');
  add('CCM-01',`Centro de Controle de Motores — ${state.ccm.manufacturer||'fabricante a definir'} — barramento ${state.ccm.bus||'___'} A`,1,'un','ccm');
  if(state.qgbt.breaker)add('DJ-QGBT',`Disjuntor geral QGBT ${state.qgbt.breaker} A, Icu ${state.qgbt.icu||'___'} kA`,1,'un','qgbt-breaker');
  if(state.qgbt.dps)add('DPS-QGBT',`DPS QGBT — ${state.qgbt.dps}`,1,'cj','dps');
  state.motors.forEach(m=>{
    if(m.breaker)add(`DJ-${m.tag}`,`Proteção ${m.tag} — ${m.breaker}`,1,'un',`br-${m.tag}`);
    if(m.device)add(`AC-${m.tag}`,`${m.method} ${m.tag} — ${m.device}`,1,'un',`dev-${m.tag}`);
    if(m.overload)add(`OL-${m.tag}`,`Relé / proteção de sobrecarga ${m.tag} — ${m.overload}`,1,'un',`ol-${m.tag}`);
    if(m.cable)add(`CB-${m.tag}`,`Cabo de potência ${m.tag} — ${m.cable} mm²`,Math.ceil(num(m.distance)*1.10),'m',`cb-${m.tag}`);
  });
  state.lighting.forEach((r,i)=>{if(num(r.adopted)>0)add(`LUM-${i+1}`,`Luminária ${r.name} — ${r.manufacturer||''} ${r.model||`${r.watt||'___'} W`}`,num(r.adopted),'un',`lum-${i}`);});
  if(state.spda.rods)add('HASTE',`Haste de aterramento ${state.spda.rodLength||'___'} m`,num(state.spda.rods),'un','rods');
  if(state.spda.gridSection)add('MALHA',`Condutor da malha de aterramento ${state.spda.gridSection} mm²`,1,'lote','grid');
  return list;
}
function autoUpdateMaterials(){
  const suggested=suggestedMaterials(); const oldMap=new Map(state.materials.filter(x=>x.autoKey).map(x=>[x.autoKey,x])); const manual=state.materials.filter(x=>!x.autoKey);
  state.materials=suggested.map(s=>oldMap.has(s.autoKey)?{...s,unitPrice:oldMap.get(s.autoKey).unitPrice,notes:oldMap.get(s.autoKey).notes,qty:oldMap.get(s.autoKey).qty||s.qty}:s).concat(manual);
  renumberMaterials();saveState();renderMaterials();refreshComputedUI();
}
function renumberMaterials(){state.materials.forEach((m,i)=>m.item=i+1);}
function addMaterial(){state.materials.push({id:crypto.randomUUID?crypto.randomUUID():String(Date.now()+Math.random()),item:state.materials.length+1,tag:'',description:'',qty:1,unit:'un',unitPrice:'',notes:'',autoKey:''});saveState();renderMaterials();}
function renderMaterials(){
  const body=$('materialsBody');if(!body)return;
  if(!state.materials.length){body.innerHTML='<tr><td colspan="9">Clique em “Atualizar do projeto” para criar a lista-base ou adicione um item manualmente.</td></tr>';updateBudget();return;}
  body.innerHTML=state.materials.map((m,i)=>`<tr><td>${i+1}</td><td><input data-mat="${i}" data-key="tag" value="${escapeHtml(m.tag)}"></td><td><input data-mat="${i}" data-key="description" value="${escapeHtml(m.description)}"></td><td><input type="number" step=".01" data-mat="${i}" data-key="qty" value="${m.qty}"></td><td><input data-mat="${i}" data-key="unit" value="${escapeHtml(m.unit)}"></td><td><input type="number" step=".01" data-mat="${i}" data-key="unitPrice" value="${m.unitPrice}"></td><td>${money(num(m.qty)*num(m.unitPrice))}</td><td><input data-mat="${i}" data-key="notes" value="${escapeHtml(m.notes)}"></td><td><button class="btn danger" data-del-mat="${i}">×</button></td></tr>`).join('');
  qsa('[data-mat]').forEach(el=>{const fn=()=>{const k=el.dataset.key;state.materials[+el.dataset.mat][k]=['qty','unitPrice'].includes(k)?num(el.value):el.value;saveState();renderMaterials();refreshComputedUI();};el.addEventListener('change',fn);});
  qsa('[data-del-mat]').forEach(b=>b.addEventListener('click',()=>{state.materials.splice(+b.dataset.delMat,1);renumberMaterials();saveState();renderMaterials();refreshComputedUI();}));
  updateBudget();
}
function updateBudget(){
  const subtotal=state.materials.reduce((s,m)=>s+num(m.qty)*num(m.unitPrice),0),total=subtotal+num(state.budget.labor)+num(state.budget.other);
  if($('materialsSubtotal'))$('materialsSubtotal').textContent=money(subtotal);if($('projectGrandTotal'))$('projectGrandTotal').textContent=money(total);if($('heroTotal'))$('heroTotal').textContent=money(subtotal);
  return{subtotal,total};
}

function generateMemorialText(force=true){
  if(!state.meta.generated)return alert('Gere o projeto pelo código da equipe antes de montar o memorial.');
  const d=calcDemand(),t=calcTrafo(state.substation.trafo||d.suggested),b=updateBudget(),methods=[...new Set(state.motors.map(m=>m.method).filter(Boolean))].join(', ')||'[ACIONAMENTOS A DEFINIR]';
  const teamNames=(state.team.members||[]).map(m=>m.name).filter(Boolean).join(', ')||'[PREENCHER INTEGRANTES]'; const resp=responsibleMember();
  const generated={
    scope:`A empresa projetista fictícia ${state.team.companyName||'[EMPRESA DO TRIO]'}, formada pelos alunos ${teamNames}, apresenta o Projeto Elétrico Industrial para ${state.client.name||'[CLIENTE FICTÍCIO]'}. O responsável técnico didático indicado pela equipe é ${resp.name||'[PREENCHER]'} (${resp.role||'função a definir'}). O projeto contempla subestação, QGBT, CCM, acionamentos, alimentadores, iluminação, aterramento, BEP, SPDA, memoriais, quadro de cargas e lista de materiais.`,
    characteristics:`O cliente atua em ${state.client.activity||'[ATIVIDADE]'}, no endereço ${state.client.address||'[ENDEREÇO]'}, ${state.client.city||'[CIDADE/UF]'}. A instalação foi desenvolvida para sistema ${state.meta.voltage} V, frequência ${state.meta.frequency} Hz, com alimentação primária em ${fmt(state.meta.primary/1000,1)} kV. Demanda aparente calculada: ${fmt(d.sd,1)} kVA; potência de projeto com reserva de ${fmt(state.meta.reserve,0)}%: ${fmt(d.req,1)} kVA.`,
    substation:`A entrada de energia foi desenvolvida como subestação aérea da Energisa, limitada a 300 kVA, com base em ${state.substation.nduVersion||'NDU 002'} e no anexo/prancha ${state.substation.nduAnnex||'[PREENCHER]'}. Alimentação primária em ${fmt(state.meta.primary/1000,1)} kV e transformação para ${state.meta.voltage} V. Transformador adotado: ${state.substation.trafo||'[PREENCHER]'} kVA, fabricante ${state.substation.manufacturer||'[PREENCHER]'}, modelo ${state.substation.model||'[PREENCHER]'}, impedância ${state.substation.z||state.meta.trafoZ}%. Fonte/catálogo consultado: ${state.substation.source||'[PREENCHER]'}. A equipe deverá manter coerência entre demanda, medição, proteção MT, correntes, aterramento e a NDU aplicável.`,
    qgbt:`O QGBT recebe a alimentação do transformador e distribui os circuitos da instalação. Fabricante/linha pesquisada: ${state.qgbt.manufacturer||'[PREENCHER]'} ${state.qgbt.model||''}. Foram adotados disjuntor geral ${state.qgbt.breaker||'[PREENCHER]'} A, barramento ${state.qgbt.bus||'[PREENCHER]'} A e capacidade de interrupção ${state.qgbt.icu||'[PREENCHER]'} kA. Alimentador principal: ${state.qgbt.cable||'[PREENCHER]'} mm². Os barramentos L1, L2 e L3 são independentes e isolados entre si; N e PE são mantidos em barras distintas. Fonte consultada: ${state.qgbt.source||'[PREENCHER]'}.`,
    ccm:`O CCM reúne as saídas dos motores M01 a M10. Fabricante/linha do conjunto: ${state.ccm.manufacturer||'[PREENCHER]'}. Os métodos selecionados pela equipe são: ${methods}. Cada gaveta recebe derivações independentes das fases L1, L2 e L3, sem interligação entre fases. Barramento do CCM: ${state.ccm.bus||'[PREENCHER]'} A; Icc considerada: ${state.ccm.icc||'[PREENCHER]'} kA. Fonte/catálogo consultado: ${state.ccm.source||'[PREENCHER]'}.`,
    conductors:`Os condutores e proteções foram dimensionados com base em corrente de projeto, capacidade de condução, fatores de correção, queda de tensão, curto-circuito e coordenação com os dispositivos de proteção. Temperatura ambiente de referência: ${state.meta.ambient} °C, Kt=${fmt(state.meta.tempFactor,2)} e Kg=${fmt(state.meta.groupFactor,2)}.`,
    lighting:`O sistema de iluminação foi dimensionado por ambiente pelo método dos lúmens, considerando iluminância de projeto, área, fluxo luminoso, fator de utilização e fator de manutenção. As quantidades e modelos adotados constam na tabela luminotécnica e na lista de materiais.`,
    spda:`O projeto contempla SPDA, BEP e sistema de aterramento. Classe adotada: ${state.spda.class||'[PREENCHER]'}. Método de captação: ${state.spda.method||'[PREENCHER]'}. A malha, hastes, descidas, equipotencialização e DPS deverão permanecer coerentes com os cálculos e a prancha específica.`,
    materials:`A lista de materiais foi consolidada a partir das soluções adotadas para QGBT, CCM, subestação, acionamentos, iluminação, SPDA e aterramento. Valor estimado de materiais: ${money(b.subtotal)}. Valor global informado do projeto: ${money(b.total)}.`,
    conclusion:`O projeto foi desenvolvido de forma colaborativa pela empresa fictícia ${state.team.companyName||'[EMPRESA DO TRIO]'}. A participação declarada da equipe totaliza ${fmt(teamParticipation(),0)}%. Antes da emissão final, o trio deve conferir coerência entre memória de cálculo, memorial descritivo, quadro de cargas, lista de materiais, pranchas e revisão do projeto.`
  };
  state.memdesc=generated;saveState();syncFormFromState();alert('Memorial descritivo atualizado com os dados da empresa, equipe e projeto.');
}
function statusModel(){
  const teamDone=state.meta.generated&&state.team.companyName&&state.client.name&&state.team.members.every(m=>m.name&&m.role&&num(m.participation)>0)&&Math.abs(teamParticipation()-100)<.01;
  const driveDone=state.motors.length===10&&state.motors.every(m=>m.method&&String(m.justification||'').trim().length>=20);
  const motorsDone=state.motors.length===10&&state.motors.every(m=>m.method&&num(m.current)>0&&m.cable&&m.breaker&&m.device&&m.overload);
  const qgbtDone=state.qgbt.breaker&&state.qgbt.icu&&state.qgbt.bus&&state.qgbt.cable&&state.qgbt.manufacturer,ccmDone=state.ccm.bus&&state.ccm.icc&&state.ccm.mainBreaker&&motorsDone,seDone=state.substation.type==='Aérea'&&num(state.substation.trafo)>0&&num(state.substation.trafo)<=SUBSTATION_MAX_KVA&&state.substation.nduVersion&&state.substation.ip&&state.substation.is&&state.substation.icc&&state.substation.mtProtection;
  const lightDone=state.lighting.every(r=>num(r.flux)>0&&num(r.uf)>0&&num(r.mf)>0&&num(r.adopted)>0&&num(r.watt)>0),spdaDone=state.spda.class&&state.spda.method&&state.spda.downs&&state.spda.gridSection&&state.spda.rods&&state.spda.bepSection;
  const matDone=state.materials.length>0&&state.materials.every(m=>m.description&&num(m.qty)>0&&String(m.unitPrice).trim()!==''),calcDone=state.calcLog.length>=6,memDone=Object.values(state.memdesc).filter(v=>String(v).trim()).length>=8;
  return [{name:'Empresa / equipe',ok:!!teamDone,desc:teamDone?'Trio identificado e participação = 100%.':'Complete empresa, três integrantes, funções e participação.'},{name:'Engenharia de acionamentos',ok:!!driveDone,desc:driveDone?'10 decisões justificadas.':'Escolha e justifique os acionamentos.'},{name:'Quadro de cargas',ok:!!motorsDone,desc:motorsDone?'10 motores dimensionados.':'Complete corrente, cabo, proteção e componentes.'},{name:'QGBT',ok:!!qgbtDone,desc:qgbtDone?'Dados principais preenchidos.':'Complete QGBT.'},{name:'CCM',ok:!!ccmDone,desc:ccmDone?'CCM coerente.':'Complete CCM e gavetas.'},{name:'Subestação',ok:!!seDone,desc:seDone?'Transformação e proteção registradas.':'Complete subestação.'},{name:'Luminotécnico',ok:!!lightDone,desc:lightDone?'Ambientes dimensionados.':'Complete luminotécnico.'},{name:'SPDA / terra',ok:!!spdaDone,desc:spdaDone?'Parâmetros registrados.':'Complete SPDA/BEP/terra.'},{name:'Lista de materiais',ok:!!matDone,desc:matDone?'Lista pronta.':'Atualize itens, quantidades e preços.'},{name:'Memória de cálculo',ok:!!calcDone,desc:`${state.calcLog.length} cálculos registrados.`},{name:'Memorial descritivo',ok:!!memDone,desc:memDone?'Texto principal preenchido.':'Gere e revise o memorial.'}];
}
function technicalValidation(){const items=[],add=(level,title,detail)=>items.push({level,title,detail});if(!state.meta.generated)add('fail','Projeto não gerado','Informe o código da equipe.');else add('ok','Código da equipe válido',`${state.meta.code} • validação ${state.meta.validation}`);if(!state.team.companyName)add('warn','Empresa projetista sem nome','Defina a razão social fictícia da empresa formada pelo trio.');if(state.team.members.some(m=>!m.name))add('fail','Equipe incompleta','Cadastre os três integrantes.');if(Math.abs(teamParticipation()-100)>.01)add('fail','Participação diferente de 100%',`Total informado: ${fmt(teamParticipation(),0)}%.`);state.motors.forEach(m=>{if(!m.method)add('warn',`${m.tag} — acionamento não escolhido`,m.processCondition||'Analise o processo.');if(m.method&&String(m.justification||'').trim().length<20)add('warn',`${m.tag} — justificativa insuficiente`,'Explique tecnicamente a decisão.');if(m.method==='Partida direta'&&(num(m.cv)>directStartLimitCv(m.voltage)+.01||num(m.power)>directStartLimitKw(m.voltage)+.03))add('fail',`${m.tag} — partida direta fora do critério`,`Motor ${fmt(m.cv,1)} cv em ${m.voltage} V; limite ${directStartLimitCv(m.voltage)} cv.`);if(m.driveEvaluation?.level==='fail')add('fail',`${m.tag} — decisão deve ser revista`,m.driveEvaluation.feedback||'Verifique a escolha.');if(!num(m.current))add('warn',`${m.tag} — corrente não registrada`,'Calcule e aplique a corrente nominal.');if(num(m.current)&&(!m.cable||!m.breaker))add('warn',`${m.tag} — dimensionamento incompleto`,'Complete cabo e proteção.');});const d=calcDemand();if(d.outOfScope)add('fail','Subestação fora do escopo da prova',`Potência requerida ≈ ${fmt(d.req,1)} kVA. Limite da subestação aérea desta atividade: 300 kVA.`);if(state.substation.trafo&&num(state.substation.trafo)>SUBSTATION_MAX_KVA)add('fail','Transformador acima de 300 kVA','A atividade está limitada a subestação aérea Energisa até 300 kVA.');if(state.substation.trafo&&num(state.substation.trafo)<d.req)add('fail','Transformador abaixo da potência de projeto',`Adotado ${state.substation.trafo} kVA; requerido ≈ ${fmt(d.req,1)} kVA.`);if(state.substation.type!=='Aérea')add('fail','Tipo de subestação incorreto','O escopo da prova exige subestação aérea.');if(!String(state.substation.nduVersion||'').includes('NDU 002'))add('warn','NDU não identificada','Registre a versão da NDU 002 utilizada.');const t=calcTrafo(state.substation.trafo||d.suggested);if(state.qgbt.icu&&num(state.qgbt.icu)<t.iccKa)add('warn','Icu do QGBT inferior à Icc simplificada',`Icu ${state.qgbt.icu} kA; Icc ≈ ${fmt(t.iccKa,1)} kA.`);if(state.calcLog.length<6)add('warn','Poucos cálculos registrados',`Memória possui ${state.calcLog.length} registros.`);else add('ok','Memória de cálculo em desenvolvimento',`${state.calcLog.length} cálculos registrados.`);return items;}
function renderDashboard(){
  const models=statusModel(); const complete=models.filter(x=>x.ok).length; const pct=Math.round(100*complete/models.length);
  $('statusGrid').innerHTML=models.map(x=>`<div class="status-card"><div class="status-top"><strong>${x.name}</strong><span class="status-dot ${x.ok?'ok':'fail'}"></span></div><p>${x.desc}</p></div>`).join('');
  const vals=technicalValidation(); $('validationSummary').innerHTML=vals.slice(0,20).map(v=>`<div class="validation-item ${v.level}"><div class="validation-icon">${v.level==='ok'?'✓':v.level==='fail'?'×':'!'}</div><div><strong>${v.title}</strong><small>${v.detail}</small></div></div>`).join('');
  $('heroProgress').textContent=pct+'%';$('sideProgress').style.width=pct+'%';$('sideProgressLabel').textContent=pct+'% concluído';
}
function renderFinalChecklist(){
  const models=statusModel();$('finalChecklist').innerHTML=models.map(x=>`<div class="check-item"><strong>${x.name}</strong><span class="badge ${x.ok?'green':'red'}">${x.ok?'OK':'PENDENTE'}</span></div>`).join('');
  $('finalRevision').value=state.revision.number; const d=calcDemand(),b=updateBudget(); $('deliverySummary').innerHTML=`<div class="summary-grid"><div class="summary-card"><small>Empresa projetista</small><strong>${escapeHtml(state.team.companyName||'—')}</strong></div><div class="summary-card"><small>Código</small><strong>${escapeHtml(state.meta.code||'—')}</strong></div><div class="summary-card"><small>Demanda</small><strong>${fmt(d.sd,1)} kVA</strong></div><div class="summary-card"><small>Valor estimado</small><strong>${money(b.total)}</strong></div></div>`;
}

function refreshComputedUI(){
  renderPremises();renderLoadSummary();renderDriveSummary();refreshTeamUi();renderQgbtSummary();renderSubstationSummary();updateBudget();renderDashboard();
  $('heroCode').textContent=state.meta.code||'SEM CÓDIGO';$('heroStudent').textContent=state.team.companyName||state.team.tradeName||'Equipe';$('finalRevision').value=state.revision.number;
}
function syncFormFromState(){
  qsa('[data-state]').forEach(el=>{const v=deepGet(state,el.dataset.state);if(v!==undefined&&document.activeElement!==el)el.value=v??'';});
  $('projectCode').value=state.meta.code||'';$('revision').value=state.revision.number||'REV00';$('finalRevision').value=state.revision.number||'REV00';
}
function fullRender(){syncFormFromState();renderPremises();renderLoadTable();renderAuxTable();renderDriveEngineering();renderMotorSelectors();renderCcmTable();renderLighting();renderMaterials();renderCalcLog();refreshTeamUi();refreshComputedUI();renderFinalChecklist();}

function exportProject(){
  saveState();const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`PEI_${state.meta.code||'PROJETO'}_${state.revision.number}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
}

function exportSubmission(){
  if(!state.meta.generated)return alert('Gere o projeto pelo código da equipe antes da entrega.');
  const models=statusModel();
  const validation=technicalValidation();
  const payload={...state,submission:{type:'PEI-TRIO-ENTREGA',submittedAt:new Date().toISOString(),completion:Math.round(100*models.filter(x=>x.ok).length/models.length),status:models,validation}};
  const code=(state.meta.code||'EQUIPE').replace(/[^A-Za-z0-9_-]/g,'_');
  const name=(state.team.companyName||'TRIO').replace(/[^A-Za-z0-9À-ÿ_-]+/g,'_');
  downloadBlob(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}),`ENTREGA_${code}_${name}_${state.revision.number}.json`);
  alert('JSON de entrega gerado. Envie ao docente este arquivo JSON e o PDF final do projeto.');
}
function importProject(file){
  const reader=new FileReader();reader.onload=()=>{try{const data=JSON.parse(reader.result);if(!data?.schema?.startsWith('PEI-PROJETISTA-INTEGRADO'))throw new Error('Arquivo incompatível.');state=normalizeState(data);saveState();fullRender();alert('Projeto importado com sucesso.');}catch(e){alert('Não foi possível importar: '+e.message);}};reader.readAsText(file);
}
function exportLoadsCsv(){
  const h=['TAG','Equipamento','kW','cv','V','eta','cosphi','Fu','FS','Distancia_m','Partidas_h','Condicao_processo','Velocidade','Acionamento','Justificativa','Corrente_A','Cabo_mm2','Protecao','Contator_Drive','Rele_Ajuste'];
  const rows=state.motors.map(m=>[m.tag,m.name,m.power,m.cv,m.voltage,m.eta,m.pf,m.use,m.service,m.distance,m.startsPerHour,m.processCondition,m.speedRange,m.method,m.justification,m.current,m.cable,m.breaker,m.device,m.overload]);
  const q=v=>`"${String(v??'').replace(/"/g,'""')}"`;const csv='\ufeff'+[h,...rows].map(r=>r.map(q).join(';')).join('\n');const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));a.download=`Quadro_Cargas_${state.meta.code||'Equipe'}.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
}

function reportTable(headers,rows){return `<table><thead><tr>${headers.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map(c=>`<td>${c??''}</td>`).join('')}</tr>`).join('')}</tbody></table>`;}
function buildReport(){
  const d=calcDemand(),b=updateBudget(),resp=responsibleMember();
  const teamRows=(state.team.members||[]).map((m,i)=>[i+1,escapeHtml(m.name),escapeHtml(m.number),escapeHtml(m.role),`${fmt(m.participation,0)}%`,escapeHtml(m.responsibilities)]);
  const motorRows=state.motors.map(m=>[m.tag,escapeHtml(m.name),fmt(m.power,1),fmt(m.cv,1),m.voltage,fmt(m.current,2),escapeHtml(m.method||'A definir'),escapeHtml(m.cable),escapeHtml(m.breaker),escapeHtml(m.device),escapeHtml(m.overload)]);
  const engineeringRows=state.motors.map(m=>[m.tag,escapeHtml(m.name),escapeHtml(m.processCondition),escapeHtml(m.speedRange),escapeHtml(m.method||'A definir'),escapeHtml(m.justification||'Não preenchida'),m.driveEvaluation?`${fmt(m.driveEvaluation.score,1)}/10`:'Não avaliada']);
  const calcHtml=state.calcLog.length?state.calcLog.map((c,i)=>`<h3>${i+1}. ${escapeHtml(c.title)}</h3><p><strong>Responsável:</strong> ${escapeHtml(c.ownerName||'Não informado')}</p><div class="formula-print">${escapeHtml(c.formula)}</div><p><strong>Substituição:</strong> ${escapeHtml(c.substitution)}</p><p><strong>Resultado:</strong> ${escapeHtml(c.result)} ${escapeHtml(c.unit)}</p>`).join(''):'<p>Nenhum cálculo registrado.</p>';
  const lightRows=state.lighting.map(r=>[r.name,fmt(r.area,1),fmt(r.lux,0),fmt(r.flux,0),fmt(r.uf,2),fmt(r.mf,2),fmt(r.calc,2),fmt(r.adopted,0),fmt(r.watt,0),fmt(r.totalW,0),escapeHtml(r.model)]);
  const matRows=state.materials.map((m,i)=>[i+1,escapeHtml(m.tag),escapeHtml(m.description),fmt(m.qty,2),escapeHtml(m.unit),money(m.unitPrice),money(num(m.qty)*num(m.unitPrice))]); const md=state.memdesc;
  const report=$('printReport');report.innerHTML=`
    <section class="report-page cover"><img src="assets/senai_logo.webp" alt="SENAI" style="width:150px;margin:0 auto 30px"><h1>PROJETO ELÉTRICO INDUSTRIAL</h1><h2>${escapeHtml(state.client.name||'Cliente fictício')}</h2><p><strong>Empresa projetista:</strong> ${escapeHtml(state.team.companyName||'Empresa do trio')}</p><p><strong>Equipe:</strong> ${(state.team.members||[]).map(m=>escapeHtml(m.name)).filter(Boolean).join(' • ')||'Não informada'}</p><p><strong>Responsável técnico didático:</strong> ${escapeHtml(resp.name||'Não informado')}</p><p class="code">${escapeHtml(state.meta.code||'SEM-CODIGO')} • ${escapeHtml(state.revision.number)}</p><p>Emissão: ${escapeHtml(state.revision.issueDate||'')}</p><p style="margin-top:55px">Projetos Elétricos Industriais • Projeto em trio</p></section>
    <section class="report-page"><h2>1. Empresa projetista, equipe técnica e cliente</h2>${reportTable(['Campo','Informação'],[['Empresa projetista',escapeHtml(state.team.companyName)],['Nome fantasia',escapeHtml(state.team.tradeName)],['CNPJ fictício',escapeHtml(state.team.cnpj)],['Turma',escapeHtml(state.team.className)],['Responsável técnico didático',escapeHtml(resp.name)],['Código da equipe',escapeHtml(state.meta.code)],['Cliente industrial',escapeHtml(state.client.name)],['Endereço do cliente',escapeHtml(state.client.address)],['Atividade',escapeHtml(state.client.activity)],['Necessidade',escapeHtml(state.client.need)]])}<h3>Participação da equipe</h3>${reportTable(['#','Aluno','Nº/Matrícula','Função','Participação','Responsabilidades'],teamRows)}<p><strong>Total declarado:</strong> ${fmt(teamParticipation(),0)}%</p><h3>Premissas do projeto</h3>${reportTable(['Grandeza','Valor'],[['Tensão primária',`${fmt(state.meta.primary/1000,1)} kV`],['Tensão secundária',`${state.meta.voltage} V`],['Frequência',`${state.meta.frequency} Hz`],['Temperatura ambiente',`${state.meta.ambient} °C`],['Kt',fmt(state.meta.tempFactor,2)],['Kg',fmt(state.meta.groupFactor,2)],['Reserva',`${fmt(state.meta.reserve,0)}%`],['Validação',state.meta.validation]])}</section>
    <section class="report-page"><h2>2. Memorial descritivo</h2>${Object.entries({Objetivo:md.scope,'Características da instalação':md.characteristics,'Fornecimento e subestação':md.substation,QGBT:md.qgbt,'CCM e acionamentos':md.ccm,'Condutores, proteção e infraestrutura':md.conductors,Iluminação:md.lighting,'SPDA, BEP e aterramento':md.spda,'Materiais e orçamento':md.materials,'Inspeção, testes e conclusão':md.conclusion}).map(([h,v])=>`<h3>${h}</h3><p class="section-text">${escapeHtml(v||'Não preenchido')}</p>`).join('')}</section>
    <section class="report-page"><h2>3. Memória de cálculo</h2>${calcHtml}</section>
    <section class="report-page"><h2>4. Engenharia de acionamentos</h2>${reportTable(['TAG','Carga','Condição do processo','Velocidade','Acionamento','Justificativa','Avaliação indicativa'],engineeringRows)}</section>
    <section class="report-page"><h2>5. Quadro de cargas</h2>${reportTable(['TAG','Carga','kW','cv','V','I A','Acionamento','Cabo','Proteção','Contator/Drive','Relé'],motorRows)}<h3>Resumo</h3>${reportTable(['Grandeza','Valor'],[['Potência instalada',`${fmt(d.installed,1)} kW`],['Demanda ativa',`${fmt(d.pd,1)} kW`],['Demanda reativa',`${fmt(d.qd,1)} kvar`],['Demanda aparente',`${fmt(d.sd,1)} kVA`],['FP global',fmt(d.pf,2)],['Potência com reserva',`${fmt(d.req,1)} kVA`]])}</section>
    <section class="report-page"><h2>6. QGBT e CCM</h2><h3>QGBT</h3>${reportTable(['Parâmetro','Valor'],[['Fabricante / modelo',`${escapeHtml(state.qgbt.manufacturer)} ${escapeHtml(state.qgbt.model)}`],['Fonte / catálogo',escapeHtml(state.qgbt.source)],['Disjuntor geral',`${escapeHtml(state.qgbt.breaker)} A`],['Icu',`${escapeHtml(state.qgbt.icu)} kA`],['Barramento',`${escapeHtml(state.qgbt.bus)} A`],['Alimentador',`${escapeHtml(state.qgbt.cable)} mm²`],['DPS',escapeHtml(state.qgbt.dps)],['Seletividade',escapeHtml(state.qgbt.selectivity)]])}<h3>CCM</h3>${reportTable(['Parâmetro','Valor'],[['Barramento',`${escapeHtml(state.ccm.bus)} A`],['Icc',`${escapeHtml(state.ccm.icc)} kA`],['Disjuntor geral',`${escapeHtml(state.ccm.mainBreaker)} A`],['Grau IP',escapeHtml(state.ccm.ip)],['Forma/segregação',escapeHtml(state.ccm.form)],['Reserva',escapeHtml(state.ccm.reserve)],['Fabricante / linha',escapeHtml(state.ccm.manufacturer)],['Fonte / catálogo',escapeHtml(state.ccm.source)]])}<h3>Prancha QGBT</h3><img src="assets/qgbt.webp" alt="QGBT"><h3>Prancha CCM</h3><img src="assets/ccm.webp" alt="CCM"></section>
    <section class="report-page"><h2>7. Subestação</h2>${reportTable(['Parâmetro','Valor'],[['Concessionária',escapeHtml(state.substation.utility)],['Tipo',escapeHtml(state.substation.type)],['NDU utilizada',escapeHtml(state.substation.nduVersion)],['Anexo/prancha',escapeHtml(state.substation.nduAnnex)],['Fabricante / modelo',`${escapeHtml(state.substation.manufacturer)} ${escapeHtml(state.substation.model)}`],['Fonte / catálogo',escapeHtml(state.substation.source)],['Transformador',`${escapeHtml(state.substation.trafo)} kVA`],['Z',`${escapeHtml(state.substation.z)}%`],['I primária',`${escapeHtml(state.substation.ip)} A`],['I secundária',`${escapeHtml(state.substation.is)} A`],['Icc secundária',`${escapeHtml(state.substation.icc)} kA`],['Disjuntor BT',`${escapeHtml(state.substation.btBreaker)} A`],['TC',escapeHtml(state.substation.tc)],['TP',escapeHtml(state.substation.tp)],['Proteção MT',escapeHtml(state.substation.mtProtection)],['Para-raios',escapeHtml(state.substation.arrester)],['SMF',escapeHtml(state.substation.metering)]])}<img src="assets/subestacao.webp" alt="Subestação"></section>
    <section class="report-page"><h2>8. Projeto luminotécnico</h2>${reportTable(['Ambiente','Área','Lux','Fluxo','UF','MF','N calc.','N adot.','W','Total W','Fabricante','Modelo','Fonte'],lightRows)}<img src="assets/luminotecnico.webp" alt="Luminotécnico"></section>
    <section class="report-page"><h2>9. SPDA, BEP e aterramento</h2>${reportTable(['Parâmetro','Valor'],[['Classe',escapeHtml(state.spda.class)],['Método',escapeHtml(state.spda.method)],['Captores',escapeHtml(state.spda.captors)],['Descidas',escapeHtml(state.spda.downs)],['Seção descidas',`${escapeHtml(state.spda.downSection)} mm²`],['Malha',`${escapeHtml(state.spda.gridSection)} mm²`],['Hastes',escapeHtml(state.spda.rods)],['Resistividade',`${escapeHtml(state.spda.rho)} Ω·m`],['R aterramento',`${escapeHtml(state.spda.resistance)} Ω`],['BEP',`${escapeHtml(state.spda.bepSection)} mm²`]])}<img src="assets/spda_aterramento.webp" alt="SPDA"></section>
    <section class="report-page"><h2>10. Lista de materiais e orçamento</h2>${reportTable(['Item','TAG','Descrição','Qtd.','Un.','Preço unit.','Total'],matRows)}${reportTable(['Resumo','Valor'],[['Materiais',money(b.subtotal)],['Mão de obra / serviços',money(state.budget.labor)],['Outros custos',money(state.budget.other)],['TOTAL DO PROJETO',money(b.total)]])}</section>
    <section class="report-page"><h2>11. Pranchas do projeto</h2><h3>Planta geral</h3><img src="assets/planta_geral.webp" alt="Planta geral"><h3>Fluxo produtivo e elétrico</h3><img src="assets/planta_fluxo.webp" alt="Fluxo"><h3>Infraestrutura de eletrocalhas e distâncias CCM → máquinas</h3><img src="assets/infraestrutura.webp" alt="Infraestrutura"></section>
    <section class="report-page"><h2>12. Revisão e declaração da equipe</h2>${reportTable(['Revisão','Data','Descrição'],[[escapeHtml(state.revision.number),escapeHtml(state.revision.issueDate),escapeHtml(state.revision.description)]])}<p>Projeto desenvolvido pela empresa fictícia <strong>${escapeHtml(state.team.companyName)}</strong>, formada pelos três integrantes identificados neste documento. Código da equipe: <strong>${escapeHtml(state.meta.code)}</strong>. Validação: <strong>${escapeHtml(state.meta.validation)}</strong>.</p><p>A equipe declara ter conferido a coerência entre memorial descritivo, memória de cálculo, quadro de cargas, lista de materiais e pranchas antes da entrega ao docente.</p></section>`;
  report.classList.remove('hidden');report.setAttribute('aria-hidden','false');return report;
}
async function generatePdf(){
  saveState();const report=buildReport();const filename=`PEI_EQUIPE_${(state.meta.code||'PROJETO').replace(/[^A-Z0-9_-]/gi,'_')}_${state.revision.number}.pdf`;
  if(window.html2pdf){try{await window.html2pdf().set({margin:0,filename,image:{type:'jpeg',quality:.94},html2canvas:{scale:1.35,useCORS:true},jsPDF:{unit:'mm',format:'a4',orientation:'portrait'},pagebreak:{mode:['css','legacy']}}).from(report).save();return;}catch(e){console.warn(e);}}
  window.print();
}

function setupEvents(){
  $('nav').addEventListener('click',e=>{const b=e.target.closest('button[data-page]');if(b)switchPage(b.dataset.page);});
  $('themeBtn').addEventListener('click',()=>{const next=document.documentElement.dataset.theme==='dark'?'light':'dark';document.documentElement.dataset.theme=next;localStorage.setItem('pei_theme_v4',next);});
  $('saveBtn').addEventListener('click',()=>saveState(false));$('exportBtn').addEventListener('click',exportProject);$('submitTeacherBtn').addEventListener('click',exportSubmission);$('importProject').addEventListener('change',e=>{if(e.target.files[0])importProject(e.target.files[0]);});
  $('pdfTopBtn').addEventListener('click',generatePdf);$('pdfFinalBtn').addEventListener('click',generatePdf);$('resetProjectBtn').addEventListener('click',resetProject);$('printBtn').addEventListener('click',()=>{buildReport();window.print();});$('previewReportBtn').addEventListener('click',()=>{buildReport();alert('Relatório atualizado com os dados atuais.');});
  $('generateProjectBtn').addEventListener('click',()=>{try{const code=$('projectCode').value.trim().toUpperCase();if(state.meta.generated&&state.meta.code===code&&!confirm('Este código já foi gerado. Regerar apagará os dimensionamentos atuais das cargas. Continuar?'))return;generateFromCode(code);state.revision.number=$('revision').value;saveState();fullRender();switchPage('cargas');}catch(e){alert(e.message);}});
  $('exportLoadsCsv').addEventListener('click',exportLoadsCsv);$('refreshDashboard').addEventListener('click',renderDashboard);$('evaluateAllDrives').addEventListener('click',evaluateAllDrives);
  $('autoMaterialsBtn').addEventListener('click',autoUpdateMaterials);$('addMaterialBtn').addEventListener('click',addMaterial);$('generateMemorialBtn').addEventListener('click',()=>generateMemorialText(true));
  $('clearCalcLog').addEventListener('click',()=>{if(confirm('Excluir todos os cálculos registrados no memorial?')){state.calcLog=[];saveState();renderCalcLog();refreshComputedUI();}});
  setupCalculators();
}

function initialize(){
  loadState();const theme=localStorage.getItem('pei_theme_v4');if(theme)document.documentElement.dataset.theme=theme;
  bindStateFields();setupEvents();fullRender();checkDriveApi();
  if(!$('issueDate').value){state.revision.issueDate=new Date().toISOString().slice(0,10);$('issueDate').value=state.revision.issueDate;}
  $('cdReserve').value=state.meta.reserve||20;
  const d=calcDemand();$('cfP').value=d.pd?d.pd.toFixed(2):'';$('cf1').value=d.pf?d.pf.toFixed(2):'';$('ctS').value=state.substation.trafo||d.suggested||'';$('ctV').value=state.meta.voltage;$('ctZ').value=state.substation.z||state.meta.trafoZ;$('cgRho').value=state.spda.rho||'';
}
initialize();
