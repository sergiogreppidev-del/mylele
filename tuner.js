// === MyLele · tuner.js ===
// Afinador: guía por cuerda y medidor.

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
