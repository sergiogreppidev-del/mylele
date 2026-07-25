// === MyLele · chords.js ===
// Detección de acordes, ejercicio, diagrama y puntaje. Registro/copia del log de diagnóstico.

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

// Dibuja el diagrama de digitación del acorde (cuerdas G C E A, ventana de 4 trastes)
function drawChordDiagram(chord){
  const strings=['G','C','E','A'];
  const nStr=4, nFr=4;
  const W=200, H=152;
  const left=40, right=160, top=36, bottom=136;
  const sSpace=(right-left)/(nStr-1);   // 40 px entre cuerdas
  const fSpace=(bottom-top)/nFr;        // 25 px entre trastes

  // Si el acorde no entra en los primeros 4 trastes, la ventana se corre hacia
  // arriba del mástil y se rotula la posición (como en cualquier diagrama).
  const pressed=(chord.frets||[]).filter(f=>f>0);
  const maxFret=pressed.length?Math.max(...pressed):0;
  const base=(maxFret>nFr)?Math.min(...pressed)-1:0;

  let svg=`<svg viewBox="0 0 ${W} ${H}" width="100%" style="max-width:230px" xmlns="http://www.w3.org/2000/svg">`;
  // trastes (líneas horizontales); la cejuela (nut) más gruesa, solo en la posición 1
  for(let f=0; f<=nFr; f++){
    const y=top+f*fSpace;
    const sw=(f===0&&base===0)?4:1.4;
    svg+=`<line x1="${left}" y1="${y}" x2="${right}" y2="${y}" stroke="#3A2A63" stroke-width="${sw}" stroke-linecap="round"/>`;
  }
  if(base>0){
    svg+=`<text x="${left-12}" y="${top+fSpace*0.5}" fill="#6B5A93" font-size="11" font-weight="800" text-anchor="middle" dominant-baseline="central">${base+1}ª</text>`;
  }
  // cuerdas (líneas verticales)
  for(let s=0; s<nStr; s++){
    const x=left+s*sSpace;
    svg+=`<line x1="${x}" y1="${top}" x2="${x}" y2="${bottom}" stroke="#3A2A63" stroke-width="1.4"/>`;
  }
  // marcadores por cuerda
  for(let s=0; s<nStr; s++){
    const x=left+s*sSpace;
    const fr=chord.frets[s];
    const fg=chord.fingers[s];
    if(fr===0){
      // cuerda al aire: "O" sobre la cejuela
      svg+=`<circle cx="${x}" cy="20" r="6" fill="none" stroke="#6B5A93" stroke-width="1.6"/>`;
    }else{
      const y=top+(fr-base-0.5)*fSpace;
      svg+=`<circle cx="${x}" cy="${y}" r="10" fill="#FF5F7E"/>`;
      if(fg>0) svg+=`<text x="${x}" y="${y+0.5}" fill="#FFFFFF" font-size="12" font-weight="800" text-anchor="middle" dominant-baseline="central">${fg}</text>`;
    }
    // etiqueta de la cuerda abajo
    svg+=`<text x="${x}" y="150" fill="#6B5A93" font-size="11" font-weight="700" text-anchor="middle">${strings[s]}</text>`;
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
