// === MyLele · game.js ===
// Juego: pista arcade, ritmo/metrónomo, calibración, acompañamiento reggae, cableado de la UI e inicialización.

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
  const col=elemColor(nt.label), st=nt.state;
  const alpha = st==='pending'?1 : (st==='good'?0.95:0.30);
  ctx.save(); ctx.globalAlpha=alpha;
  if(st==='pending'){ ctx.shadowColor=col; ctx.shadowBlur=12; }
  if(nt.kind==='chord'){
    // ACORDE: columna vertical que cubre las 4 cuerdas
    const w=p.w, x=p.x-w/2, y=p.top, h=p.bottom-p.top;
    let f = st==='bad' ? '#4a4456' : null;
    if(!f){ const g=ctx.createLinearGradient(x,y,x+w,y); g.addColorStop(0,lighten(col,0.30)); g.addColorStop(0.5,col); g.addColorStop(1,darken(col,0.18)); f=g; }
    ctx.fillStyle=f; rr(ctx,x,y,w,h,8); ctx.fill();
    ctx.restore();
    // galones (chevrons) como en la referencia
    if(st!=='bad'){
      ctx.save(); ctx.globalAlpha=alpha*0.5; ctx.strokeStyle=lighten(col,0.55); ctx.lineWidth=Math.max(2,w*0.10); ctx.lineCap='round';
      const step=Math.max(16,h/6);
      for(let yy=y+step*0.7; yy<y+h-4; yy+=step){
        ctx.beginPath(); ctx.moveTo(x+w*0.18, yy-step*0.22); ctx.lineTo(x+w*0.5, yy+step*0.16); ctx.lineTo(x+w*0.82, yy-step*0.22); ctx.stroke();
      }
      ctx.restore();
    }
    // nombre del acorde, grande y centrado
    ctx.save(); ctx.globalAlpha=alpha;
    ctx.fillStyle= st==='bad'?'#9A93A6':'#ffffff';
    ctx.shadowColor='rgba(0,0,0,0.55)'; ctx.shadowBlur=6;
    ctx.font='bold '+Math.round(Math.min(34, Math.max(18, w*0.62)))+'px system-ui';
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText(nt.label, p.x, (p.top+p.bottom)/2);
    ctx.restore();
  }else{
    // NOTA: círculo en la cuerda que corresponde
    const R=17;
    let f = st==='bad' ? '#5b5468' : null;
    if(!f){ const g=ctx.createRadialGradient(p.x-R*0.3,p.y-R*0.3,1,p.x,p.y,R); g.addColorStop(0,lighten(col,0.6)); g.addColorStop(0.6,col); g.addColorStop(1,darken(col,0.3)); f=g; }
    ctx.fillStyle=f; ctx.beginPath(); ctx.arc(p.x,p.y,R,0,Math.PI*2); ctx.fill();
    ctx.restore();
    ctx.globalAlpha=alpha; ctx.fillStyle= st==='bad'?'#9A93A6':'#0b1a17';
    ctx.font='bold 15px system-ui'; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText(nt.label,p.x,p.y+1); ctx.globalAlpha=1;
  }
}

function renderTrack(){
  const cv=document.getElementById('track'); if(!cv) return;
  const ctx=cv.getContext('2d'); const dpr=window.devicePixelRatio||1;
  const W=cv.clientWidth, H=cv.clientHeight;
  if(W===0){ trackRAF=requestAnimationFrame(renderTrack); return; }
  if(cv.width!==Math.round(W*dpr)){ cv.width=Math.round(W*dpr); cv.height=Math.round(H*dpr); }
  ctx.setTransform(dpr,0,0,dpr,0,0);

  // --- geometría RECTA (sin perspectiva): carriles paralelos ---
  const hitX=68, travel=2.4, LN=4;
  const padT=16, padB=22;
  const topY=padT, botY=H-padB, trackH=botY-topY;
  const laneGap=trackH/(LN-1);
  const laneY=(lane)=> topY + lane*laneGap;
  const pxPerSec=(W-hitX-14)/travel;      // velocidad constante
  const midY=(topY+botY)/2;
  const now=audioCtx?audioCtx.currentTime:0;
  const active=rhythmActive && !rhythmModeCalib;

  // fondo del rectángulo de la pista
  const bg=ctx.createLinearGradient(0,topY,0,botY);
  bg.addColorStop(0,'#141c28'); bg.addColorStop(0.5,'#1b2433'); bg.addColorStop(1,'#141c28');
  ctx.fillStyle='#0e1420'; ctx.fillRect(0,0,W,H);
  ctx.fillStyle=bg; rr(ctx,0,topY-8,W,trackH+16,10); ctx.fill();

  // cuerdas: 4 líneas rectas paralelas
  for(let lane=0;lane<LN;lane++){
    const y=laneY(lane);
    ctx.strokeStyle='rgba(255,255,255,0.16)'; ctx.lineWidth=(lane===0||lane===LN-1)?1.6:1.1;
    ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke();
  }

  // pulso del beat
  let pulse=0;
  if(active){ const bp=(now-startTime)/beatDur; const fr=bp-Math.floor(bp); pulse=Math.max(0,1-(fr*beatDur)/0.18); }

  // líneas de compás que se desplazan
  if(active){
    ctx.strokeStyle='rgba(255,255,255,0.05)'; ctx.lineWidth=1;
    const firstBeat=Math.floor((now-startTime)/beatDur);
    for(let k=0;k<=Math.ceil(travel/beatDur)+1;k++){
      const bt=startTime+(firstBeat+k)*beatDur, x=hitX+(bt-now)*pxPerSec;
      if(x<hitX||x>W) continue;
      ctx.beginPath(); ctx.moveTo(x,topY); ctx.lineTo(x,botY); ctx.stroke();
    }
  }

  // zona de impacto: banda vertical + línea
  ctx.fillStyle='rgba(45,212,191,'+(0.07+pulse*0.06)+')';
  ctx.fillRect(hitX-24,topY-8,48,trackH+16);
  ctx.save(); ctx.shadowColor='#2DD4BF'; ctx.shadowBlur=10+pulse*16;
  ctx.strokeStyle='#2DD4BF'; ctx.lineWidth=3;
  ctx.beginPath(); ctx.moveTo(hitX,topY-8); ctx.lineTo(hitX,botY+8); ctx.stroke(); ctx.restore();
  for(let lane=0;lane<LN;lane++){
    const y=laneY(lane);
    ctx.save(); ctx.shadowColor='#2DD4BF'; ctx.shadowBlur=5+pulse*10;
    ctx.strokeStyle='rgba(200,255,246,'+(0.4+pulse*0.5)+')'; ctx.lineWidth=2;
    ctx.beginPath(); ctx.arc(hitX,y,11+pulse*3,0,Math.PI*2); ctx.stroke(); ctx.restore();
  }

  if(active){
    // posiciones (velocidad constante, sin escalado)
    const pos=[];
    for(let i=0;i<songNotes.length;i++){
      const nt=songNotes[i], tr=nt.t-now;
      if(tr>travel+0.4 || tr<-0.6){ pos.push(null); continue; }
      const x=hitX+tr*pxPerSec;
      pos.push({x, y:laneY(elemLane(nt.kind,nt.label)), w:Math.max(30,Math.min(64,beatDur*pxPerSec*0.5)), top:topY-6, bottom:botY+6});
    }
    // estela punteada (solo para notas sueltas)
    if(songNotes.length && songNotes[0].kind==='note'){
      ctx.strokeStyle='rgba(255,255,255,0.22)'; ctx.lineWidth=2; ctx.setLineDash([2,6]);
      ctx.beginPath(); let started=false;
      for(let i=0;i<pos.length;i++){ if(!pos[i]){ started=false; continue; } if(!started){ ctx.moveTo(pos[i].x,pos[i].y); started=true; } else ctx.lineTo(pos[i].x,pos[i].y); }
      ctx.stroke(); ctx.setLineDash([]);
    }

    // scoring + dibujo
    for(let i=songNotes.length-1;i>=0;i--){
      const nt=songNotes[i];
      if(nt.state==='pending'){
        const comp=(latencyMs||0)/1000, dtc=(now-comp)-nt.t;
        const acierta = nt.kind==='note' ? (detectedNoteName===nt.label) : (detectedChord && detectedChord.name===nt.label);
        if(Math.abs(dtc)<=GOOD_S && acierta){
          nt.state='good'; const perfect=Math.abs(dtc)<=PERFECT_S;
          if(perfect) rScore.perfect++; else rScore.good++;
          combo++; bestCombo=Math.max(bestCombo,combo);
          spawnBurst(true, nt.kind==='chord'?midY:laneY(elemLane(nt.kind,nt.label))); feedbackBlip(true); updateRScore();
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
    if(popup){ const age=now-popup.t0; if(age>0.7){ popup=null; } else { const pr=age/0.7; ctx.save(); ctx.globalAlpha=1-pr; ctx.fillStyle=popup.color; ctx.shadowColor=popup.color; ctx.shadowBlur=14; ctx.font='bold '+(26+pr*12)+'px system-ui'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText(popup.text, hitX+92, topY+18); ctx.restore(); } }

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
    ctx.fillText('Elegí un nivel y tocá Empezar · tocá cuando lleguen a la línea →', W/2, midY);
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
