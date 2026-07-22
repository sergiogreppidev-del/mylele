"use strict";
/* ===================================================================
   NALU · SPIKE DE DETECCIÓN DE UKELELE (afinador + nota + acordes)
   Un solo archivo, sin dependencias. Procesa TODO en el dispositivo.
   El audio nunca sale del navegador.
   =================================================================== */

const NOTE_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];

// Cuerdas del ukelele en afinación estándar GCEA (G reentrante / agudo)
const UKE_STRINGS = [
  {name:'G', freq:392.00},
  {name:'C', freq:261.63},
  {name:'E', freq:329.63},
  {name:'A', freq:440.00},
];

// Detección RESTRINGIDA: solo estos 4 acordes (el set de principiante).
// pcs = [raíz, tercera, quinta].  w = peso de cada una en la plantilla.
// Clave (validada con datos reales): el G exige su tercera (B/Si) y baja el peso
// del D, porque el ukelele reentrante mete mucho "D fantasma" en la C y el G se la robaba.
const CHORDS = [
  {name:'C',  sub:'Do mayor',  pcs:[0,4,7],  w:[1.3,1.0,1.0], frets:[0,0,0,3], fingers:[0,0,0,3]},  // C E G
  {name:'Am', sub:'La menor',  pcs:[9,0,4],  w:[1.3,1.0,1.0], frets:[2,0,0,0], fingers:[2,0,0,0]},  // A C E
  {name:'F',  sub:'Fa mayor',  pcs:[5,9,0],  w:[1.3,1.0,1.0], frets:[2,0,1,0], fingers:[2,0,1,0]},  // F A C
  {name:'G',  sub:'Sol mayor', pcs:[7,11,2], w:[1.0,1.6,0.5], frets:[0,2,3,2], fingers:[0,1,3,2]},  // G B D
];
// Vectores plantilla normalizados
function buildChordTemplate(c){
  const v=new Array(12).fill(0);
  c.pcs.forEach((pc,i)=>{ v[pc] = c.w[i]; });
  const norm=Math.hypot(...v);
  c.tpl=v.map(x=>x/norm);
}
CHORDS.forEach(buildChordTemplate);

// ---------- Contenido desde Supabase (MyLele) ----------
const SUPA_URL='https://duvflmqbagnlhznuqjhr.supabase.co';
const SUPA_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR1dmZsbXFiYWdubGh6bnVxamhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ3MzI0OTcsImV4cCI6MjEwMDMwODQ5N30.grvye06MRNefUiIDTf9VzgW6AnJBeh1lS3aqJP6eqJY';
const DEFAULT_EVENTS=[{t:0,chord:'C',dur:4},{t:4,chord:'Am',dur:4},{t:8,chord:'F',dur:4},{t:12,chord:'G',dur:4},{t:16,chord:'C',dur:4},{t:20,chord:'Am',dur:4},{t:24,chord:'F',dur:4},{t:28,chord:'G',dur:4}];
let songEvents=[], songMeta=null, songMode='chords', levelsList=[], curSlug=null;

async function supaGet(path){
  const r=await fetch(SUPA_URL+'/rest/v1/'+path, {headers:{apikey:SUPA_KEY, Authorization:'Bearer '+SUPA_KEY}});
  if(!r.ok) throw new Error('supa '+r.status);
  return r.json();
}
function setContentStatus(txt,cls){ const el=document.getElementById('contentStatus'); if(el){ el.innerHTML=txt; el.className='content-status'+(cls?' '+cls:''); } }

async function loadContent(){
  try{
    // 1) acordes (con digitación) -> reconstruye las plantillas de detección
    const rows=await supaGet('chords?select=*');
    if(rows && rows.length){
      const order=['C','Am','F','G']; const byId={}; rows.forEach(r=>byId[r.id]=r);
      const built=order.filter(id=>byId[id]).map(id=>{ const r=byId[id];
        return {name:r.id, sub:r.name_es, pcs:r.pitch_classes, w:(r.id==='G'?[1.0,1.6,0.5]:[1.3,1.0,1.0]), frets:r.frets, fingers:r.fingers}; });
      if(built.length===4){ CHORDS.length=0; built.forEach(c=>{ buildChordTemplate(c); CHORDS.push(c); }); setTarget(0); }
    }
    // 2) lista de niveles (canciones ordenadas)
    const songs=await supaGet('songs?select=slug,title,level,bpm,charts(events,mode)&order=level.asc');
    if(songs && songs.length){
      levelsList=songs; buildLevelSelector();
      loadSong(songs[0]);            // arranca en el nivel 1
    }else{ throw new Error('sin niveles'); }
  }catch(e){
    console.warn('No se pudo cargar de Supabase, uso respaldo local.', e);
    songEvents=DEFAULT_EVENTS.slice(); songMode='chords';
    setContentStatus('⚠ Sin conexión con Supabase — usando progresión local (C·Am·F·G)','warn');
  }
}
function buildLevelSelector(){
  const cont=document.getElementById('levels'); if(!cont) return; cont.innerHTML='';
  levelsList.forEach(s=>{
    const b=document.createElement('button'); b.className='lvbtn'; b.dataset.slug=s.slug;
    const kind = (s.charts&&s.charts[0]&&s.charts[0].mode)||'chords';
    const desc = kind==='melody'?'Notas sueltas':(s.title.includes('rápid')?'Cambios veloces':kind==='chords'?'Acordes':'—');
    b.innerHTML='<b>'+s.title.replace('· ',' ')+'</b><span>'+desc+'</span>';
    b.addEventListener('click',()=>{ if(!rhythmActive) loadSong(s); });
    cont.appendChild(b);
  });
}
function loadSong(s){
  curSlug=s.slug; songMeta=s;
  bpm=Number(s.bpm)||80; document.getElementById('bpmVal').textContent=bpm;
  const chart=(s.charts||[])[0];
  songMode=(chart&&chart.mode)||'chords';
  songEvents=(chart&&Array.isArray(chart.events))?chart.events:[];
  document.querySelectorAll('#levels .lvbtn').forEach(b=>b.classList.toggle('active', b.dataset.slug===s.slug));
  const tipo = songMode==='melody'?'notas':'acordes';
  setContentStatus('🎵 <b>'+s.title+'</b> · '+songEvents.length+' '+tipo+' · desde Supabase ✓','ok');
  document.getElementById('rhythmFb').innerHTML = songMode==='melody'
    ? 'Tocá cada <b>nota</b> cuando llegue a la línea.'
    : 'Tocá cada <b>acorde</b> cuando llegue a la línea.';
}

// ---------- Estado de audio ----------
let audioCtx, analyserPitch, analyserChroma, sourceNode, stream;
let musicGain=null;
let timeBuf, freqBuf;
let running=false;

// ---------- Arranque ----------
document.getElementById('startBtn').addEventListener('click', start);

async function start(){
  try{
    stream = await navigator.mediaDevices.getUserMedia({
      audio:{ echoCancellation:false, noiseSuppression:false, autoGainControl:false }
    });
  }catch(e){
    alert('No pude acceder al micrófono. Revisá los permisos del navegador y volvé a intentar.\n\n('+e.name+')');
    return;
  }
  audioCtx = new (window.AudioContext||window.webkitAudioContext)();
  if(audioCtx.state==='suspended') await audioCtx.resume();
  musicGain = audioCtx.createGain(); musicGain.gain.value=1; musicGain.connect(audioCtx.destination);

  sourceNode = audioCtx.createMediaStreamSource(stream);

  analyserPitch = audioCtx.createAnalyser();
  analyserPitch.fftSize = 2048;                 // ~43 ms @48k: rápido para el tono
  timeBuf = new Float32Array(analyserPitch.fftSize);

  analyserChroma = audioCtx.createAnalyser();
  analyserChroma.fftSize = 8192;                // resolución vs. latencia: 8192 responde más rápido
  analyserChroma.smoothingTimeConstant = 0.2;
  freqBuf = new Float32Array(analyserChroma.frequencyBinCount);

  sourceNode.connect(analyserPitch);
  sourceNode.connect(analyserChroma);

  running=true;
  document.getElementById('start').style.display='none';
  document.getElementById('liveDot').classList.add('live');
  buildStringsUI();
  buildDebugUI();
  loop();
}

// ===================================================================
//  DETECCIÓN DE TONO  —  autocorrelación con interpolación parabólica
// ===================================================================
function detectPitch(buf, sampleRate){
  const SIZE = buf.length;
  let rms=0;
  for(let i=0;i<SIZE;i++){ rms += buf[i]*buf[i]; }
  rms = Math.sqrt(rms/SIZE);
  if(rms < 0.008) return {freq:-1, rms};        // demasiado silencio

  // recortar bordes silenciosos
  let r1=0, r2=SIZE-1;
  const thres=0.15;
  for(let i=0;i<SIZE/2;i++){ if(Math.abs(buf[i])<thres){ r1=i; break; } }
  for(let i=1;i<SIZE/2;i++){ if(Math.abs(buf[SIZE-i])<thres){ r2=SIZE-i; break; } }
  const b = buf.subarray(r1, r2);
  const N = b.length;
  if(N < 256) return {freq:-1, rms};

  const c = new Float32Array(N);
  for(let lag=0; lag<N; lag++){
    let sum=0;
    for(let i=0;i<N-lag;i++){ sum += b[i]*b[i+lag]; }
    c[lag]=sum;
  }
  // saltar el primer descenso
  let d=0; while(d<N-1 && c[d]>c[d+1]) d++;
  // pico máximo tras el descenso
  let maxval=-1, maxpos=-1;
  for(let i=d;i<N;i++){ if(c[i]>maxval){ maxval=c[i]; maxpos=i; } }
  if(maxpos<=0) return {freq:-1, rms};
  // interpolación parabólica para afinar el período
  let T0=maxpos;
  if(maxpos>0 && maxpos<N-1){
    const x1=c[maxpos-1], x2=c[maxpos], x3=c[maxpos+1];
    const a=(x1+x3-2*x2)/2, bb=(x3-x1)/2;
    if(a) T0 = maxpos - bb/(2*a);
  }
  const freq = sampleRate / T0;
  if(freq<70 || freq>1200) return {freq:-1, rms};   // fuera del rango útil del ukelele
  return {freq, rms};
}

function freqToNote(freq){
  const midi = Math.round(69 + 12*Math.log2(freq/440));
  const refFreq = 440 * Math.pow(2,(midi-69)/12);
  const cents = Math.round(1200*Math.log2(freq/refFreq));
  return {name:NOTE_NAMES[(midi%12+12)%12], midi, cents};
}

// --- Suavizado del tono: mediana (descarta saltos/errores de octava) ---
const PITCH_HIST=6;
let pitchHist=[];
function smoothPitchMedian(freq){
  pitchHist.push(freq);
  if(pitchHist.length>PITCH_HIST) pitchHist.shift();
  const s=[...pitchHist].sort((a,b)=>a-b);
  return s[Math.floor(s.length/2)];
}

// ===================================================================
//  CROMAGRAMA  —  reparte la energía del FFT en 12 clases de altura
// ===================================================================
function computeChroma(freqData, sampleRate, fftSize){
  const chroma=new Array(12).fill(0);
  const n=freqData.length;
  for(let i=0;i<n;i++){
    const freq = i*sampleRate/fftSize;
    if(freq<180 || freq>2200) continue;
    const mag = Math.pow(10, freqData[i]/20);   // dB -> lineal
    if(mag < 1e-4) continue;
    const midi = 69 + 12*Math.log2(freq/440);
    const pc = ((Math.round(midi)%12)+12)%12;
    chroma[pc] += mag;
  }
  const norm = Math.hypot(...chroma);
  if(norm>0) for(let i=0;i<12;i++) chroma[i]/=norm;
  return chroma;
}

function matchChord(chroma){
  let best=null, bestSim=-1, second=-1;
  for(const c of CHORDS){
    let dot=0;
    for(let i=0;i<12;i++) dot += chroma[i]*c.tpl[i];
    if(dot>bestSim){ second=bestSim; bestSim=dot; best=c; }
    else if(dot>second){ second=dot; }
  }
  return {chord:best, sim:bestSim, margin:bestSim-second};
}

// ===================================================================
//  BUCLE DE ANÁLISIS
// ===================================================================
let lastFrame=performance.now(), fps=0;
let lastChordT=performance.now();

// umbrales de confianza del acorde
const SIM_MIN=0.55;         // similitud mínima
const MARGIN_MIN=0.02;      // margen sobre el 2º mejor

// --- Log de diagnóstico (para tunear la detección con datos reales) ---
let lastRms=0;
let chromaRing=[]; const CHROMA_RING=12;   // ~200 ms de cromagramas recientes
let diagLog=[];
let autoCapture=false, lastAutoCapT=0;
const AUTO_CAP_MS=600;   // una muestra automática cada ~0,6 s mientras tocás
const MAX_LOG=80;        // tope de muestras

function loop(){
  if(!running) return;
  const t0=performance.now();

  analyserPitch.getFloatTimeDomainData(timeBuf);
  const {freq, rms} = detectPitch(timeBuf, audioCtx.sampleRate);

  // ---- Afinador / nota detectada ----
  if(freq>0){
    const medFreq = smoothPitchMedian(freq);   // mediana: descarta lecturas sueltas erróneas
    const note = freqToNote(medFreq);
    updateTuner(note, medFreq);
    detectedNoteName = (rms>0.02) ? note.name : detectedNoteName;
  }else{
    fadeTuner();
  }

  // ---- Acordes ----
  analyserChroma.getFloatFrequencyData(freqBuf);
  const chroma = computeChroma(freqBuf, audioCtx.sampleRate, analyserChroma.fftSize);
  const now = performance.now();
  const chordDt = Math.min(80, now - lastChordT);   // ms desde el cuadro anterior (cap por si hubo lag)
  lastChordT = now;
  const strongSignal = rms>0.015 || chroma.some(v=>v>0.08);   // umbral: ignora ruido mínimo
  lastRms = rms;
  if(strongSignal){ chromaRing.push(chroma); if(chromaRing.length>CHROMA_RING) chromaRing.shift(); }
  const match = matchChord(chroma);
  handleChordDetection(match, strongSignal, chordDt);

  // auto-captura para el log (solo con acorde estable, sin ruido)
  if(autoCapture && detectedChord
     && diagLog.length<MAX_LOG && (now-lastAutoCapT>AUTO_CAP_MS)){
    if(doCapture()) lastAutoCapT=now;
  }

  // ---- Ritmo: detección de golpes (onsets) ----
  detectOnset(rms);

  // ---- Debug ----
  const dt=performance.now()-t0;
  fps = 0.9*fps + 0.1*(1000/(performance.now()-lastFrame));
  lastFrame=performance.now();
  updateDebug(freq, rms, match, chroma, fps, dt);

  requestAnimationFrame(loop);
}

// ===================================================================
//  UI · AFINADOR
// ===================================================================
const elTtString=document.getElementById('ttString');
const elTtDir=document.getElementById('ttDir');
const elCents=document.getElementById('centsTxt');
const elNeedle=document.getElementById('needle');
const elStrings=document.getElementById('strings');
const elTunerStatus=document.getElementById('tunerStatus');
const STR_ES={G:'Sol', C:'Do', E:'Mi', A:'La'};

let selectedString=null;   // null = automático (más cercana)
function selectString(name){
  selectedString = (selectedString===name) ? null : name;   // tocar de nuevo = volver a automático
  refreshStringSel();
}
function refreshStringSel(){
  [...elStrings.children].forEach(ch=>{
    ch.classList.toggle('selected', ch.dataset.name===selectedString);
    if(ch.dataset.name===selectedString) ch.classList.remove('tuned');
  });
  const hint=document.getElementById('tuneMode');
  if(hint) hint.innerHTML = selectedString
    ? 'Afinando la cuerda <b>'+selectedString+' ('+STR_ES[selectedString]+')</b> — tocala de nuevo para volver a automático'
    : 'Tocá una cuerda abajo para fijarla, o afiná en automático.';
}
function buildStringsUI(){
  elStrings.innerHTML='';
  UKE_STRINGS.forEach(s=>{
    const d=document.createElement('div');
    d.className='string'; d.dataset.name=s.name;
    d.innerHTML=`<b>${s.name}</b><span>${STR_ES[s.name]}</span>`;
    d.addEventListener('click',()=>selectString(s.name));
    elStrings.appendChild(d);
  });
  refreshStringSel();
}

let needleEMA=50, centsEMA=0;
function updateTuner(note, freq){
  // Cuerda objetivo: la FIJADA si hay una; si no, la más cercana.
  let tgt=null, off=1e9;
  if(selectedString){
    tgt = UKE_STRINGS.find(s=>s.name===selectedString);
    off = 1200*Math.log2(freq/tgt.freq);
  }else{
    UKE_STRINGS.forEach(s=>{
      const c=1200*Math.log2(freq/s.freq);      // + = agudo, - = grave, respecto de esa cuerda
      if(Math.abs(c)<Math.abs(off)){ off=c; tgt=s; }
    });
  }
  centsEMA = centsEMA*0.7 + off*0.3;
  const c = Math.round(centsEMA);
  const inTune = Math.abs(c)<=8;               // verde SOLO si está en la nota correcta
  const close  = Math.abs(c)<=30;
  const far    = Math.abs(c)>60;

  elTtString.innerHTML = tgt.name+' <small>'+STR_ES[tgt.name]+'</small>';
  elTtString.style.color = inTune?'var(--ok)':'var(--text)';

  let dir, color;
  if(inTune){ dir='¡Afinada! ✓'; color='var(--ok)'; }
  else if(centsEMA>0){ dir = far?'Bajá ↓↓':'Bajá ↓'; color = close?'var(--warn)':'var(--off)'; }
  else            { dir = far?'Subí ↑↑':'Subí ↑'; color = close?'var(--warn)':'var(--off)'; }
  elTtDir.textContent = dir; elTtDir.style.color = color;
  elNeedle.style.background = color;

  elCents.textContent = (c>0?'+':'')+c+' cents respecto de '+tgt.name;

  // aguja: cents puede ser grande (cuerda muy lejos) -> se pega al borde
  const targetPos = Math.max(4, Math.min(96, 50 + centsEMA));
  needleEMA = needleEMA*0.7 + targetPos*0.3;
  elNeedle.style.left = needleEMA+'%';

  elTunerStatus.innerHTML = inTune
    ? '<b>'+tgt.name+' ('+STR_ES[tgt.name]+') afinada</b> 🎯'
    : (far ? 'Estás lejos de <b>'+tgt.name+'</b> — '+dir.replace(/[↑↓]/g,'').trim().toLowerCase()+' hasta que se ponga verde'
           : 'Casi… '+dir.replace(/[↑↓]/g,'').trim().toLowerCase());

  // marcar objetivo (solo en automático) y recordar cuáles quedaron afinadas
  [...elStrings.children].forEach(ch=>{
    const isT = ch.dataset.name===tgt.name;
    ch.classList.toggle('active', !selectedString && isT && !ch.classList.contains('tuned'));
    if(isT && inTune) ch.classList.add('tuned');
  });
}
let fadeT;
function fadeTuner(){
  pitchHist.length=0;                 // reiniciar mediana al quedarse sin señal
  clearTimeout(fadeT);
  fadeT=setTimeout(()=>{
    elTtString.textContent='–'; elTtString.style.color='var(--text)';
    elTtDir.textContent='Tocá una cuerda'; elTtDir.style.color='var(--muted)';
    elCents.textContent='esperando sonido…';
    elNeedle.style.background='var(--off)';
    [...elStrings.children].forEach(ch=>ch.classList.remove('active'));
  }, 400);
}

// ===================================================================
//  UI · ACORDES (ejercicio restringido)
// ===================================================================
const elTargetChord=document.getElementById('targetChord');
const elTargetSub=document.getElementById('targetSub');
const elDetectedTxt=document.getElementById('detectedTxt');
const elChipDet=document.getElementById('chipDet');
const elChipConf=document.getElementById('chipConf');
const elHoldFill=document.getElementById('holdFill');
const elChordDiagram=document.getElementById('chordDiagram');

let targetIdx=0;
let hits=0, attempts=0;
let holdMs=0;              // ms que se sostuvo el acorde correcto (continuo)
let graceMs=0;            // tolerancia a microcortes antes de reiniciar
const HOLD_MS_NEEDED=200; // hay que sostener el acorde ~0,2 s para que cuente
const GRACE_MS=120;       // un bache < 120 ms no reinicia el progreso

function currentTarget(){ return CHORDS[targetIdx]; }
function setTarget(i){
  targetIdx=i;
  const t=currentTarget();
  elTargetChord.textContent=t.name;
  elTargetSub.textContent=t.sub;
  drawChordDiagram(t);
  holdMs=0; graceMs=0; setHold(0);
  elDetectedTxt.textContent='Escuchando…';
}

// Dibuja el diagrama de digitación del acorde (cuerdas G C E A, trastes 1-4)
function drawChordDiagram(chord){
  const strings=['G','C','E','A'];
  const nStr=4, nFr=4;
  const W=200, H=152;
  const left=40, right=160, top=36, bottom=136;
  const sSpace=(right-left)/(nStr-1);   // 40 px entre cuerdas
  const fSpace=(bottom-top)/nFr;        // 25 px entre trastes
  let svg=`<svg viewBox="0 0 ${W} ${H}" width="100%" style="max-width:230px" xmlns="http://www.w3.org/2000/svg">`;
  // trastes (líneas horizontales); la cejuela (nut) más gruesa
  for(let f=0; f<=nFr; f++){
    const y=top+f*fSpace;
    const sw=(f===0)?4:1.4;
    svg+=`<line x1="${left}" y1="${y}" x2="${right}" y2="${y}" stroke="#3a3346" stroke-width="${sw}" stroke-linecap="round"/>`;
  }
  // cuerdas (líneas verticales)
  for(let s=0; s<nStr; s++){
    const x=left+s*sSpace;
    svg+=`<line x1="${x}" y1="${top}" x2="${x}" y2="${bottom}" stroke="#3a3346" stroke-width="1.4"/>`;
  }
  // marcadores por cuerda
  for(let s=0; s<nStr; s++){
    const x=left+s*sSpace;
    const fr=chord.frets[s];
    const fg=chord.fingers[s];
    if(fr===0){
      // cuerda al aire: "O" sobre la cejuela
      svg+=`<circle cx="${x}" cy="20" r="6" fill="none" stroke="#9A93A6" stroke-width="1.6"/>`;
    }else{
      const y=top+(fr-0.5)*fSpace;
      svg+=`<circle cx="${x}" cy="${y}" r="10" fill="#2DD4BF"/>`;
      if(fg>0) svg+=`<text x="${x}" y="${y+0.5}" fill="#05201d" font-size="12" font-weight="800" text-anchor="middle" dominant-baseline="central">${fg}</text>`;
    }
    // etiqueta de la cuerda abajo
    svg+=`<text x="${x}" y="150" fill="#9A93A6" font-size="11" font-weight="700" text-anchor="middle">${strings[s]}</text>`;
  }
  svg+=`</svg>`;
  elChordDiagram.innerHTML=svg;
}

// --- estabilización de la detección (mata parpadeo y ruido, sin frenar el reconocimiento) ---
let detectedChord=null, candChord=null, candMs=0, lostMs=0;
let detectedNoteName=null;   // nota individual detectada (para el nivel de notas)
const CONFIRM_MS=90;   // hay que ver el MISMO acorde ~90 ms seguidos para darlo por detectado
const LOST_MS=160;     // si no hay señal por este tiempo, se borra lo detectado

function handleChordDetection(match, strongSignal, dt){
  const {chord,sim,margin}=match;
  const confident = strongSignal && chord && sim>=SIM_MIN && margin>=MARGIN_MIN;

  // confirmar el mismo acorde durante CONFIRM_MS antes de aceptarlo
  if(confident && chord===candChord){ candMs += dt; }
  else { candChord = confident?chord:null; candMs = 0; }
  if(candChord && candMs>=CONFIRM_MS){ detectedChord=candChord; lostMs=0; }

  // borrar lo detectado solo tras un silencio sostenido (evita que titile a '–')
  if(confident){ lostMs=0; }
  else { lostMs += dt; if(lostMs>=LOST_MS) detectedChord=null; }

  const shown = detectedChord;
  elChipDet.textContent = shown?shown.name:'–';
  elChipConf.textContent = Math.round(sim*100)+'%';

  const t=currentTarget();
  const onTarget = shown && shown.name===t.name;

  if(onTarget){
    holdMs += dt;                 // sumar TIEMPO sostenido
    graceMs = GRACE_MS;
    elChipDet.classList.add('ok');
    elDetectedTxt.innerHTML='Sostené <b>'+shown.name+'</b>… ✓';
    setHold(Math.min(1, holdMs/HOLD_MS_NEEDED));
    if(holdMs>=HOLD_MS_NEEDED){ scoreHit(); }
  }else{
    elChipDet.classList.remove('ok');
    if(graceMs>0 && holdMs>0){ graceMs -= dt; }
    else { holdMs = Math.max(0, holdMs - dt*2); }   // un ruidito no llega a acumular
    setHold(Math.min(1, holdMs/HOLD_MS_NEEDED));
    elDetectedTxt.innerHTML = shown ? ('Escuché <b>'+shown.name+'</b> — probá de nuevo') : 'Escuchando…';
  }
}

function scoreHit(){
  hits++; attempts++;
  updateScore();
  flashSuccess();
  // avanzar al siguiente acorde del ciclo
  const next=(targetIdx+1)%CHORDS.length;
  setTimeout(()=>setTarget(next), 550);
  holdMs=0; graceMs=0;
}

function setHold(p){
  elHoldFill.style.width = (p*100)+'%';
}
function flashSuccess(){
  elHoldFill.style.background='var(--ok)';
  elTargetChord.style.color='var(--ok)';
  setTimeout(()=>{ elHoldFill.style.background='var(--brand)'; elTargetChord.style.color='var(--text)'; }, 500);
}

const elScHit=document.getElementById('scHit');
const elScTot=document.getElementById('scTot');
const elScAcc=document.getElementById('scAcc');
function updateScore(){
  elScHit.textContent=hits; elScTot.textContent=attempts;
  elScAcc.textContent = attempts? Math.round(hits/attempts*100)+'%' : '–';
}
document.getElementById('resetScore').addEventListener('click',()=>{
  hits=0; attempts=0; updateScore(); setTarget(0);
});

// ===================================================================
//  LOG DE DIAGNÓSTICO
// ===================================================================
function simsFor(chroma){
  return CHORDS.map(c=>{
    let d=0; for(let i=0;i<12;i++) d+=chroma[i]*c.tpl[i];
    return {name:c.name, sim:d};
  });
}
function doCapture(){
  if(chromaRing.length<3) return false;
  // promediar los cromagramas recientes -> muestra estable
  const avg=new Array(12).fill(0);
  chromaRing.forEach(fr=>{ for(let i=0;i<12;i++) avg[i]+=fr[i]; });
  for(let i=0;i<12;i++) avg[i]/=chromaRing.length;
  const norm=Math.hypot(...avg); if(norm>0) for(let i=0;i<12;i++) avg[i]/=norm;

  const sims=simsFor(avg).sort((a,b)=>b.sim-a.sim);
  const simMap={}; CHORDS.forEach(c=>{ simMap[c.name]=+sims.find(s=>s.name===c.name).sim.toFixed(3); });
  diagLog.push({
    n: diagLog.length+1,
    target: currentTarget().name,
    best: sims[0].name,
    margin: +(sims[0].sim - sims[1].sim).toFixed(3),
    rms: +lastRms.toFixed(3),
    sims: simMap,
    chroma: avg.map(v=>+v.toFixed(3))
  });
  renderLog();
  return true;
}
function updateCaptureBtn(){
  const b=document.getElementById('captureBtn');
  b.classList.toggle('on', autoCapture);
  b.innerHTML = (autoCapture?'● Auto-captura: ON':'○ Auto-captura: OFF')
    +' · muestras: '+diagLog.length;
}
function renderLog(){
  updateCaptureBtn();
  const lines=diagLog.map(e=>{
    const s=CHORDS.map(c=>c.name+':'+e.sims[c.name]).join(' ');
    return `#${e.n} obj=${e.target} -> ${e.best} (margen ${e.margin}, rms ${e.rms}) | ${s}`;
  });
  const header='NALU chord log · '+new Date().toLocaleString();
  document.getElementById('logText').value =
    header+'\n'+lines.join('\n')+'\n\n--- JSON (para analisis) ---\n'+JSON.stringify(diagLog);
}
async function copyLog(){
  const t=document.getElementById('logText');
  if(!t.value){ alert('El log está vacío. Activá la auto-captura y tocá algunos acordes.'); return; }
  const btn=document.getElementById('copyLogBtn');
  try{
    await navigator.clipboard.writeText(t.value);
    btn.textContent='Copiado ✓';
  }catch(e){
    t.focus(); t.select();
    try{ document.execCommand('copy'); btn.textContent='Copiado ✓'; }
    catch(_){ btn.textContent='Seleccioná y copiá'; }
  }
  setTimeout(()=>btn.textContent='Copiar log', 1500);
}
document.getElementById('captureBtn').addEventListener('click',()=>{
  autoCapture=!autoCapture;
  updateCaptureBtn();
});
document.getElementById('copyLogBtn').addEventListener('click', copyLog);
document.getElementById('clearLogBtn').addEventListener('click',()=>{
  diagLog=[]; renderLog();
});

// ===================================================================
//  UI · DEBUG
// ===================================================================
const dFreq=document.getElementById('dFreq'), dRms=document.getElementById('dRms'),
      dChord=document.getElementById('dChord'), dSim=document.getElementById('dSim'),
      dMargin=document.getElementById('dMargin'), dFps=document.getElementById('dFps'),
      dMs=document.getElementById('dMs');
let chromaBars=[];
function buildDebugUI(){
  const cont=document.getElementById('chromabars');
  const lbls=document.getElementById('chromaLbls');
  cont.innerHTML=''; lbls.innerHTML='';
  for(let i=0;i<12;i++){
    const b=document.createElement('div'); b.className='b'; cont.appendChild(b); chromaBars.push(b);
    const s=document.createElement('span'); s.textContent=NOTE_NAMES[i]; lbls.appendChild(s);
  }
}
function updateDebug(freq,rms,match,chroma,fps,ms){
  if(document.getElementById('debug').style.display==='none') return;
  dFreq.textContent = freq>0?freq.toFixed(1):'–';
  dRms.textContent = rms.toFixed(3);
  dChord.textContent = match.chord?match.chord.name:'–';
  dSim.textContent = match.sim.toFixed(3);
  dMargin.textContent = match.margin.toFixed(3);
  dFps.textContent = fps.toFixed(0);
  dMs.textContent = ms.toFixed(1);
  const tpl = currentTarget().tpl;
  const max=Math.max(...chroma, 0.001);
  chromaBars.forEach((b,i)=>{
    b.style.height=(chroma[i]/max*100)+'%';
    b.classList.toggle('tpl', tpl[i]>0.2);
  });
}
document.getElementById('debugtoggle').addEventListener('click',()=>{
  const d=document.getElementById('debug');
  d.style.display = d.style.display==='none'||!d.style.display ? 'block':'none';
});

// ---------- Tabs ----------
document.querySelectorAll('.tab').forEach(tab=>{
  tab.addEventListener('click',()=>{
    document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
    document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById('view-'+tab.dataset.view).classList.add('active');
  });
});

// ===================================================================
//  MÓDULO DE RITMO (metrónomo + rasgueo + calibración de latencia)
// ===================================================================
let bpm=80;
let latencyMs=null;              // compensación de latencia calibrada (ms)
// persistencia (en Vercel guarda entre sesiones; en el preview puede no estar disponible)
function saveLatency(){ try{ localStorage.setItem('mylele_lat', String(latencyMs)); }catch(e){} }
function loadLatency(){ try{ const v=localStorage.getItem('mylele_lat'); if(v!==null && v!==''){ latencyMs=parseInt(v); const el=document.getElementById('latVal'); if(el) el.textContent=latencyMs+' ms'; } }catch(e){} }
let rhythmActive=false;
let rhythmModeCalib=false;       // true = estamos calibrando
let clickMuted=false;

const COUNT_IN=4;                // pulsos de preparación (con sonido)
const REG_BEATS=12;             // pulsos que se registran en la calibración (más = más muestras)
const PERFECT_S=0.13, GOOD_S=0.24;  // ventanas amplias (arcade): premia la intención, no el milisegundo

let beatDur=60/bpm;
let startTime=0;                 // audioCtx time del pulso 0
let totalBeats=COUNT_IN+REG_BEATS;
let expected=[];                 // tiempos esperados de los pulsos registrados
let matched=[];                  // offset detectado por cada pulso registrado (o null)
let noteState=[];                // (modo rasgueo) estado por nota
let songNotes=[];                // (modo canción) [{t, chord, state}]
let bursts=[], combo=0, bestCombo=0, popup=null;   // efectos, combo y cartel
let lastBeatShown=-1;
let rScore={perfect:0,good:0,miss:0};

// --- detección de onsets (golpes) ---
let energyEMA=0, lastOnsetT=0, onsetArmed=true;
const ONSET_REFRACTORY=0.20;   // 200 ms: un rasgueo (varias cuerdas) cuenta como UN solo golpe
function detectOnset(rms){
  // baseline lento de energía
  energyEMA = energyEMA*0.85 + rms*0.15;
  const t = audioCtx ? audioCtx.currentTime : 0;
  const isPeak = rms > energyEMA*1.8 + 0.02 && rms > 0.03;
  if(isPeak && onsetArmed && (t-lastOnsetT)>ONSET_REFRACTORY){
    lastOnsetT=t; onsetArmed=false;
    if(rhythmActive) registerHit(t);
  }
  if(rms < energyEMA*1.2){ onsetArmed=true; }        // rearmar cuando baja la energía
}

// --- clic del metrónomo (programado con precisión) ---
function scheduleClick(time, accent){
  if(clickMuted) return;
  const osc=audioCtx.createOscillator();
  const g=audioCtx.createGain();
  osc.frequency.value = accent?1200:850;
  g.gain.setValueAtTime(0.0001, time);
  g.gain.exponentialRampToValueAtTime(accent?0.5:0.32, time+0.001);
  g.gain.exponentialRampToValueAtTime(0.0001, time+0.05);
  osc.connect(g); g.connect(musicGain||audioCtx.destination);
  osc.start(time); osc.stop(time+0.06);
}
// --- blip de confirmación al pegar un golpe (necesita auriculares) ---
function feedbackBlip(good){
  if(clickMuted || !audioCtx) return;
  const t=audioCtx.currentTime;
  const osc=audioCtx.createOscillator(), g=audioCtx.createGain();
  osc.frequency.value = good?1600:380;
  g.gain.setValueAtTime(0.0001,t);
  g.gain.exponentialRampToValueAtTime(0.16,t+0.001);
  g.gain.exponentialRampToValueAtTime(0.0001,t+0.04);
  osc.connect(g); g.connect(musicGain||audioCtx.destination);
  osc.start(t); osc.stop(t+0.05);
}

// --- acompañamiento REGGAE/ISLAND sintetizado (bajo + chop + percusión) ---
function playSynth(time, freq, dur, type, peak){
  if(clickMuted || !audioCtx) return;
  const osc=audioCtx.createOscillator(), g=audioCtx.createGain();
  osc.type=type; osc.frequency.value=freq;
  g.gain.setValueAtTime(0.0001, time);
  g.gain.exponentialRampToValueAtTime(peak, time+0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, time+dur);
  osc.connect(g); g.connect(musicGain||audioCtx.destination);
  osc.start(time); osc.stop(time+dur+0.03);
}
function chordFreqs(name, octave){
  const c=CHORDS.find(x=>x.name===name); if(!c) return [];
  return c.pcs.map(pc=>261.63*Math.pow(2, pc/12 + (octave-4)));
}
function scheduleBacking(){
  if(clickMuted) return;
  const evs = songEvents.length ? songEvents : DEFAULT_EVENTS;
  for(const e of evs){
    const c=CHORDS.find(x=>x.name===e.chord); if(!c) continue;
    const rootPc=c.pcs[0], dur=e.dur||4;
    const barStart = startTime + (COUNT_IN + e.t)*beatDur;
    const chopFreqs = chordFreqs(e.chord,5);     // acordes brillantes arriba
    for(let b=0;b<dur;b++){
      const bt = barStart + b*beatDur;
      // bajo grave relajado en tiempos 1 y 3 (one drop)
      if(b%2===0){
        const bf = 261.63*Math.pow(2, rootPc/12 - 2);   // octava 2
        playSynth(bt, bf, beatDur*0.55, 'sine', 0.24);
      }
      // el "chop" reggae en el contratiempo (la corchea del "y")
      const up = bt + beatDur*0.5;
      chopFreqs.forEach(f=>playSynth(up, f, 0.13, 'triangle', 0.06));
      // golpe de percusión suave en el 3
      if(b===2) playSynth(bt, 160, 0.09, 'square', 0.05);
    }
  }
}

function startRhythm(calibrate){
  if(rhythmActive || !audioCtx) return;
  if(musicGain){ musicGain.gain.cancelScheduledValues(audioCtx.currentTime); musicGain.gain.setValueAtTime(1, audioCtx.currentTime); }
  rhythmModeCalib=calibrate;
  rhythmActive=true;
  beatDur=60/bpm;
  startTime=audioCtx.currentTime + 0.3;
  rScore={perfect:0,good:0,miss:0}; updateRScore();
  lastBeatShown=-1;
  matched=[];

  if(calibrate){
    totalBeats=COUNT_IN+REG_BEATS;
    expected=[];
    for(let k=0;k<REG_BEATS;k++){ expected.push(startTime+(COUNT_IN+k)*beatDur); matched.push(null); }
    for(let i=0;i<totalBeats;i++){ scheduleClick(startTime+i*beatDur, (i%4)===0); }
    document.getElementById('calibBtn').textContent='● Calibrando…';
    const d=document.getElementById('calibDot'); d.classList.remove('count','beat','pulse');
  }else{
    // MODO CANCIÓN: notas de la pista tomadas del chart (Supabase)
    const evs = songEvents.length ? songEvents : DEFAULT_EVENTS;
    songNotes = evs.map(e=>({
      t: startTime + (COUNT_IN + e.t)*beatDur,
      kind: (e.note!==undefined ? 'note' : 'chord'),
      label: (e.note!==undefined ? e.note : e.chord),
      state:'pending'
    }));
    const lastBeat = evs.reduce((m,e)=>Math.max(m, e.t + (e.dur||1)), 0);
    totalBeats = COUNT_IN + Math.ceil(lastBeat) + 1;
    expected=[];                        // en modo acordes no usamos onsets
    for(let i=0;i<totalBeats;i++){ scheduleClick(startTime+i*beatDur, (i%4)===0); }
    scheduleBacking();                  // 🎵 groove reggae sincronizado
    combo=0; bestCombo=0; bursts=[];
    startTrackLoop();
    document.getElementById('playBtn').textContent='⏹ Detener';
  }
  requestAnimationFrame(rhythmTick);
}

function stopRhythm(){
  rhythmActive=false;
  if(musicGain){ musicGain.gain.cancelScheduledValues(audioCtx.currentTime); musicGain.gain.setValueAtTime(0.0001, audioCtx.currentTime); }
  document.getElementById('playBtn').textContent='▶ Empezar';
  document.getElementById('calibBtn').textContent='🎯 Calibrar latencia';
  if(rhythmModeCalib){
    let offs = matched.filter(m=>m!==null).map(m=>m*1000).sort((a,b)=>a-b);
    if(offs.length>=3){
      let med = offs[Math.floor(offs.length/2)];
      // 2ª pasada: quedarse con los golpes cerca de la mediana (descarta dispersos) y recalcular
      const near = offs.filter(v=>Math.abs(v-med)<=150);
      if(near.length>=3){ near.sort((a,b)=>a-b); med = near[Math.floor(near.length/2)]; }
      latencyMs = Math.round(med);
      saveLatency();
      document.getElementById('latVal').textContent = latencyMs+' ms';
      document.getElementById('calibFb').innerHTML='Latencia detectada: <b>'+latencyMs+' ms</b> (de '+offs.length+' golpes). Ya queda compensada y guardada.';
    }else{
      document.getElementById('calibFb').textContent='Junté pocos golpes ('+offs.length+'). Probá de nuevo golpeando junto a cada clic.';
    }
    const d=document.getElementById('calibDot'); d.classList.remove('count','beat','pulse');
  }else{
    const tot=rScore.perfect+rScore.good+rScore.miss;
    const acc = tot? Math.round((rScore.perfect+rScore.good)/tot*100):0;
    document.getElementById('rhythmFb').innerHTML='¡Listo! Precisión: <b>'+acc+'%</b> · Mejor combo: <b>x'+bestCombo+'</b>';
    stopTrackLoop(); renderTrack();
  }
}

function registerHit(t){
  // ignorar golpes durante la cuenta regresiva (todavía no se registra)
  const regStart = startTime + COUNT_IN*beatDur;
  if(t < regStart - beatDur*0.5) return;

  // pulso esperado más cercano
  let bi=-1, best=1e9;
  for(let k=0;k<expected.length;k++){
    const d=Math.abs(t-expected[k]);
    if(d<best){ best=d; bi=k; }
  }
  if(bi<0) return;
  // descartar golpes demasiado lejos. En calibración la ventana es amplia
  // (la latencia puede ser grande, ej. 303 ms); en el juego es más ajustada.
  const rejectWin = rhythmModeCalib ? Math.min(beatDur*0.9, 0.6) : beatDur*0.45;
  if(best > rejectWin) return;

  const rawOff = t - expected[bi];             // + = tarde, - = temprano
  const comp = (latencyMs||0)/1000;
  const off = rawOff - comp;                    // compensado por latencia

  if(matched[bi]===null){
    matched[bi] = rhythmModeCalib ? rawOff : off;
    if(!rhythmModeCalib){
      const a=Math.abs(off);
      let cls,txt;
      if(a<=PERFECT_S){ cls='ok'; txt='¡Justo! 🎯'; rScore.perfect++; }
      else if(a<=GOOD_S){ cls='ok'; txt=(off<0?'Cerca (un toque temprano)':'Cerca (un toque tarde)'); rScore.good++; }
      else { cls='off'; txt=(off<0?'Temprano ⏪':'Tarde ⏩'); rScore.miss++; }
      document.getElementById('rhythmFb').innerHTML='<b>'+txt+'</b>';
      updateRScore();
      feedbackBlip(cls==='ok');
      noteState[bi] = (cls==='ok') ? 'good' : 'bad';
      if(cls==='ok'){ combo++; bestCombo=Math.max(bestCombo,combo); } else { combo=0; }
      spawnBurst(cls==='ok');
    }
    if(rLogOn){ rLog.push({beat:bi+1, ms:Math.round(rawOff*1000), comp_ms:Math.round(off*1000)}); renderRLog(); }
  }
}

// --- PISTA HORIZONTAL (estilo Guitar Hero) ---
let trackRAF=null;
function startTrackLoop(){ cancelAnimationFrame(trackRAF); trackRAF=requestAnimationFrame(renderTrack); }
function stopTrackLoop(){ cancelAnimationFrame(trackRAF); }
function spawnBurst(good, y){
  const parts=[]; for(let i=0;i<9;i++) parts.push({a:Math.random()*Math.PI*2, s:0.7+Math.random()*0.6});
  bursts.push({t0:audioCtx.currentTime, good, parts, y});
}

// --- paleta / carriles / helpers de dibujo ---
const ELEM_COLORS={C:'#4ADE80',Am:'#FB923C',F:'#3B82F6',G:'#A855F7',E:'#FB923C',A:'#38BDF8',D:'#F472B6',B:'#FBBF24'};
const CHORD_LANE={C:0,Am:1,F:2,G:3};
const NOTE_LANE={A:0,G:1,E:2,C:3};
function elemColor(l){ return ELEM_COLORS[l]||'#2DD4BF'; }
function elemLane(kind,l){ const m=(kind==='note')?NOTE_LANE:CHORD_LANE; return (m[l]!==undefined?m[l]:1); }
function hexRgb(h){ const n=parseInt(h.slice(1),16); return [n>>16&255,(n>>8)&255,n&255]; }
function lighten(h,f){ f=f||0.5; return 'rgb('+hexRgb(h).map(v=>Math.round(v+(255-v)*f)).join(',')+')'; }
function darken(h,f){ f=f||0.35; return 'rgb('+hexRgb(h).map(v=>Math.round(v*(1-f))).join(',')+')'; }
function rr(ctx,x,y,w,h,r){ ctx.beginPath(); ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r); ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath(); }

function drawElem(ctx, nt, p){
  const s=p.scale, R=Math.max(8, 25*s);
  const col=elemColor(nt.label), st=nt.state;
  const alpha = st==='pending'?1 : (st==='good'?0.95:0.32);
  const fill = st==='bad' ? '#5b5468' : col;
  ctx.save(); ctx.globalAlpha=alpha;
  if(st==='pending'){ ctx.shadowColor=col; ctx.shadowBlur=10*s+6; }
  if(nt.kind==='chord'){
    const w=R*1.55, h=R*2.7;
    let f=fill; if(st!=='bad'){ const g=ctx.createLinearGradient(p.x,p.y-h/2,p.x,p.y+h/2); g.addColorStop(0,lighten(col,0.45)); g.addColorStop(1,col); f=g; }
    ctx.fillStyle=f; rr(ctx,p.x-w/2,p.y-h/2,w,h,R*0.5); ctx.fill();
    if(st==='pending'){ ctx.globalAlpha=0.85; ctx.fillStyle=lighten(col,0.7); rr(ctx,p.x-w/2+2,p.y-h/2+2,w-4,h*0.28,R*0.4); ctx.fill(); }
  }else{
    let f=fill; if(st!=='bad'){ const g=ctx.createRadialGradient(p.x-R*0.3,p.y-R*0.3,1,p.x,p.y,R); g.addColorStop(0,lighten(col,0.6)); g.addColorStop(0.6,col); g.addColorStop(1,darken(col,0.3)); f=g; }
    ctx.fillStyle=f; ctx.beginPath(); ctx.arc(p.x,p.y,R,0,Math.PI*2); ctx.fill();
  }
  ctx.restore();
  if(s>0.42){
    ctx.globalAlpha=alpha; ctx.fillStyle= st==='bad'?'#9A93A6':'#0b1a17';
    ctx.font='bold '+Math.round((nt.label.length>1?13:16)*Math.min(1.15,s+0.25))+'px system-ui';
    ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText(nt.label,p.x,p.y+1); ctx.globalAlpha=1;
  }
}

function renderTrack(){
  const cv=document.getElementById('track'); if(!cv) return;
  const ctx=cv.getContext('2d'); const dpr=window.devicePixelRatio||1;
  const W=cv.clientWidth, H=cv.clientHeight;
  if(W===0){ trackRAF=requestAnimationFrame(renderTrack); return; }
  if(cv.width!==Math.round(W*dpr)){ cv.width=Math.round(W*dpr); cv.height=Math.round(H*dpr); }
  ctx.setTransform(dpr,0,0,dpr,0,0);

  const hitX=68, midY=H*0.5, travel=2.4, z0=0.6, span=W-hitX-22, spread=H*0.30, LN=4;
  const now=audioCtx?audioCtx.currentTime:0;
  const active=rhythmActive && !rhythmModeCalib;
  const projScale=tr=> z0/(z0+Math.max(0,tr));
  const laneY=(lane,sc)=> midY + (lane-(LN-1)/2)*spread*sc;

  // fondo autopista
  const bg=ctx.createLinearGradient(0,0,0,H);
  bg.addColorStop(0,'#0e1420'); bg.addColorStop(0.5,'#171f2e'); bg.addColorStop(1,'#0e1420');
  ctx.fillStyle=bg; ctx.fillRect(0,0,W,H);

  const farS=projScale(travel), farX=hitX+span*(1-farS);
  // carriles en perspectiva
  for(let lane=0;lane<LN;lane++){
    ctx.strokeStyle=(lane===0||lane===LN-1)?'rgba(45,212,191,0.16)':'rgba(255,255,255,0.06)';
    ctx.lineWidth=(lane===0||lane===LN-1)?2:1;
    ctx.beginPath(); ctx.moveTo(hitX,laneY(lane,1)); ctx.lineTo(farX,laneY(lane,farS)); ctx.stroke();
  }

  // pulso del beat
  let pulse=0;
  if(active){ const bp=(now-startTime)/beatDur; const fr=bp-Math.floor(bp); pulse=Math.max(0,1-(fr*beatDur)/0.18); }

  // zona de impacto: aros por carril + línea vertical
  for(let lane=0;lane<LN;lane++){
    const y=laneY(lane,1);
    ctx.save(); ctx.shadowColor='#2DD4BF'; ctx.shadowBlur=6+pulse*14;
    ctx.strokeStyle='rgba(200,255,246,'+(0.45+pulse*0.5)+')'; ctx.lineWidth=2.5;
    ctx.beginPath(); ctx.arc(hitX,y,16+pulse*4,0,Math.PI*2); ctx.stroke(); ctx.restore();
  }
  ctx.save(); ctx.shadowColor='#2DD4BF'; ctx.shadowBlur=10+pulse*16;
  ctx.strokeStyle='#2DD4BF'; ctx.lineWidth=3;
  ctx.beginPath(); ctx.moveTo(hitX,laneY(0,1)-14); ctx.lineTo(hitX,laneY(LN-1,1)+14); ctx.stroke(); ctx.restore();

  if(active){
    // posiciones (para estela y dibujo)
    const pos=[];
    for(let i=0;i<songNotes.length;i++){
      const nt=songNotes[i], tr=nt.t-now;
      if(tr>travel+0.4 || tr<-0.6){ pos.push(null); continue; }
      let sc,x; if(tr>=0){ sc=projScale(tr); x=hitX+span*(1-sc); } else { sc=1; x=hitX+tr*300; }
      pos.push({x, y:laneY(elemLane(nt.kind,nt.label),sc), scale:sc});
    }
    // estela punteada (la "melodía")
    ctx.strokeStyle='rgba(255,255,255,0.22)'; ctx.lineWidth=2; ctx.setLineDash([2,6]);
    ctx.beginPath(); let started=false;
    for(let i=0;i<pos.length;i++){ if(!pos[i]){ started=false; continue; } if(!started){ ctx.moveTo(pos[i].x,pos[i].y); started=true; } else ctx.lineTo(pos[i].x,pos[i].y); }
    ctx.stroke(); ctx.setLineDash([]);

    // scoring + dibujo (de lejos a cerca)
    for(let i=songNotes.length-1;i>=0;i--){
      const nt=songNotes[i];
      if(nt.state==='pending'){
        const comp=(latencyMs||0)/1000, dtc=(now-comp)-nt.t;
        const acierta = nt.kind==='note' ? (detectedNoteName===nt.label) : (detectedChord && detectedChord.name===nt.label);
        if(Math.abs(dtc)<=GOOD_S && acierta){
          nt.state='good'; const perfect=Math.abs(dtc)<=PERFECT_S;
          if(perfect) rScore.perfect++; else rScore.good++;
          combo++; bestCombo=Math.max(bestCombo,combo);
          spawnBurst(true, laneY(elemLane(nt.kind,nt.label),1)); feedbackBlip(true); updateRScore();
          popup={t0:now, text:perfect?'¡Perfecto!':'¡Bien!', color:perfect?'#4ADE80':'#2DD4BF'};
        }else if(dtc>GOOD_S){ nt.state='bad'; rScore.miss++; combo=0; updateRScore(); }
      }
      if(pos[i]) drawElem(ctx, nt, pos[i]);
    }

    // bursts en el carril
    for(let b=bursts.length-1;b>=0;b--){
      const age=now-bursts[b].t0; if(age>0.5){ bursts.splice(b,1); continue; }
      const pr=age/0.5, cy=bursts[b].y||midY, rgb=bursts[b].good?'74,222,128':'130,130,150';
      ctx.strokeStyle='rgba('+rgb+','+(1-pr)+')'; ctx.lineWidth=3*(1-pr);
      ctx.beginPath(); ctx.arc(hitX,cy,10+pr*34,0,Math.PI*2); ctx.stroke();
      bursts[b].parts.forEach(pt=>{ const px=hitX+Math.cos(pt.a)*pr*40*pt.s, py=cy+Math.sin(pt.a)*pr*40*pt.s; ctx.fillStyle='rgba('+rgb+','+(1-pr)+')'; ctx.beginPath(); ctx.arc(px,py,2.6*(1-pr),0,Math.PI*2); ctx.fill(); });
    }

    // popup ¡Perfecto!
    if(popup){ const age=now-popup.t0; if(age>0.7){ popup=null; } else { const pr=age/0.7; ctx.save(); ctx.globalAlpha=1-pr; ctx.fillStyle=popup.color; ctx.shadowColor=popup.color; ctx.shadowBlur=14; ctx.font='bold '+(26+pr*12)+'px system-ui'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText(popup.text, hitX+70, laneY(0,1)-20); ctx.restore(); } }

    // cuenta regresiva
    const bp=(now-startTime)/beatDur;
    if(bp<COUNT_IN && bp>=0){ const n=COUNT_IN-Math.floor(bp), fr=bp-Math.floor(bp); ctx.save(); ctx.globalAlpha=Math.max(0.15,1-fr); ctx.fillStyle='#F2EDE9'; ctx.shadowColor='#2DD4BF'; ctx.shadowBlur=16; ctx.font='bold '+(56+(1-fr)*18)+'px system-ui'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText(n, W*0.5, midY); ctx.restore(); }

    // combo
    if(combo>=2){ ctx.save(); ctx.shadowColor='#FBBF24'; ctx.shadowBlur=8; ctx.fillStyle='#FBBF24'; ctx.font='bold 22px system-ui'; ctx.textAlign='right'; ctx.textBaseline='top'; ctx.fillText('x'+combo, W-12, 8); ctx.restore(); }

    // barra de progreso
    const songLen=totalBeats*beatDur, prog=Math.max(0,Math.min(1,(now-startTime)/songLen));
    ctx.fillStyle='rgba(255,255,255,0.12)'; rr(ctx,12,H-9,W-24,4,2); ctx.fill();
    ctx.fillStyle='#2DD4BF'; rr(ctx,12,H-9,(W-24)*prog,4,2); ctx.fill();

    trackRAF=requestAnimationFrame(renderTrack);
  }else{
    ctx.fillStyle='#9A93A6'; ctx.font='13px system-ui'; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText('Elegí un nivel y tocá Empezar · las notas vienen desde el fondo →', W/2, midY);
  }
}

// --- animación / avance por cuadros ---
function rhythmTick(){
  if(!rhythmActive) return;
  const now=audioCtx.currentTime;
  const beat = Math.floor((now-startTime)/beatDur);
  if(beat>=totalBeats+1){ stopRhythm(); return; }

  if(beat!==lastBeatShown && beat>=0 && beat<totalBeats){
    lastBeatShown=beat;
    const inCount = beat<COUNT_IN;
    if(rhythmModeCalib){
      const d=document.getElementById('calibDot');
      d.classList.toggle('count', inCount);
      d.classList.toggle('beat', !inCount);
      d.classList.remove('pulse'); void d.offsetWidth; d.classList.add('pulse');
      if(inCount) document.getElementById('calibFb').innerHTML='Preparate… <b>'+(COUNT_IN-beat)+'</b>';
      else if(beat===COUNT_IN) document.getElementById('calibFb').innerHTML='¡Golpeá junto con cada clic! 🎧';
    }else{
      const dots=document.querySelectorAll('#beatbar .beatdot');
      dots.forEach(d=>d.classList.remove('on','count'));
      if(dots[beat]) dots[beat].classList.add(inCount?'count':'on');
      const pat=document.querySelectorAll('#pattern span');
      pat.forEach((s,i)=>s.classList.toggle('cur', !inCount && (beat-COUNT_IN)===i));
      if(inCount) document.getElementById('rhythmFb').innerHTML='Preparate… <b>'+(COUNT_IN-beat)+'</b>';
      else if(beat===COUNT_IN) document.getElementById('rhythmFb').innerHTML='¡Rasgueá ↓ junto con el clic! 🎧';
    }
  }
  requestAnimationFrame(rhythmTick);
}

function buildBeatbar(){
  const bb=document.getElementById('beatbar');
  bb.innerHTML='';
  for(let i=0;i<totalBeats;i++){
    const d=document.createElement('div'); d.className='beatdot';
    d.textContent = i<COUNT_IN ? (COUNT_IN-i) : '';
    bb.appendChild(d);
  }
  // patrón ↓ para los pulsos registrados
  const pat=document.getElementById('pattern');
  pat.innerHTML='';
  for(let k=0;k<REG_BEATS;k++){ const s=document.createElement('span'); s.textContent='↓'; pat.appendChild(s); }
}
function updateRScore(){
  document.getElementById('rPerfect').textContent=rScore.perfect;
  document.getElementById('rGood').textContent=rScore.good;
  document.getElementById('rMiss').textContent=rScore.miss;
}

// --- log de desfases ---
let rLog=[], rLogOn=false;
function updateRCaptureBtn(){
  const b=document.getElementById('rCaptureBtn');
  b.classList.toggle('on', rLogOn);
  b.textContent=(rLogOn?'● Registrar desfases: ON':'○ Registrar desfases: OFF')+' · muestras: '+rLog.length;
}
function renderRLog(){
  updateRCaptureBtn();
  const lines=rLog.map(e=>`pulso ${e.beat}: crudo ${e.ms>0?'+':''}${e.ms}ms (compensado ${e.comp_ms>0?'+':''}${e.comp_ms}ms)`);
  document.getElementById('rLogText').value =
    'NALU rhythm log · BPM '+bpm+' · latencia '+(latencyMs===null?'sin calibrar':latencyMs+'ms')+'\n'
    +lines.join('\n')+'\n\n--- JSON ---\n'+JSON.stringify({bpm,latencyMs,offsets:rLog});
}

// --- wiring ---
document.getElementById('bpmUp').addEventListener('click',()=>{ if(!rhythmActive){ bpm=Math.min(200,bpm+5); document.getElementById('bpmVal').textContent=bpm; }});
document.getElementById('bpmDown').addEventListener('click',()=>{ if(!rhythmActive){ bpm=Math.max(40,bpm-5); document.getElementById('bpmVal').textContent=bpm; }});
document.getElementById('muteClick').addEventListener('click',()=>{
  clickMuted=!clickMuted;
  const b=document.getElementById('muteClick');
  b.textContent = clickMuted?'🔇 Sonido':'🔊 Sonido'; b.classList.toggle('off',clickMuted);
});
document.getElementById('playBtn').addEventListener('click',()=>{
  if(rhythmActive && !rhythmModeCalib){ stopRhythm(); }
  else if(!rhythmActive){ startRhythm(false); }
});
document.getElementById('calibBtn').addEventListener('click',()=>{ if(!rhythmActive){ document.getElementById('rhythmFb').textContent='Calibrando: seguí el latido visual con golpes.'; startRhythm(true);} });
document.getElementById('resetLat').addEventListener('click',()=>{ latencyMs=null; try{localStorage.removeItem('mylele_lat');}catch(e){} document.getElementById('latVal').textContent='sin calibrar'; });
document.getElementById('rCaptureBtn').addEventListener('click',()=>{ rLogOn=!rLogOn; updateRCaptureBtn(); });
document.getElementById('rCopyLogBtn').addEventListener('click',async()=>{
  const t=document.getElementById('rLogText'); if(!t.value){ alert('Log vacío.'); return; }
  const b=document.getElementById('rCopyLogBtn');
  try{ await navigator.clipboard.writeText(t.value); b.textContent='Copiado ✓'; }
  catch(e){ t.focus(); t.select(); try{document.execCommand('copy');b.textContent='Copiado ✓';}catch(_){b.textContent='Seleccioná y copiá';} }
  setTimeout(()=>b.textContent='Copiar log',1500);
});
document.getElementById('rClearLogBtn').addEventListener('click',()=>{ rLog=[]; renderRLog(); });

// init
setTarget(0); updateScore(); updateCaptureBtn(); renderTrack(); updateRCaptureBtn(); loadLatency(); loadContent();
