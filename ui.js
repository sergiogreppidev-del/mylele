// === MyLele · ui.js ===
// Navegación entre pantallas, permiso de micrófono y mapa de niveles con desbloqueo.

let currentScreen='home', selectedMode='chords', micReady=false;

/* ---------- Router ---------- */
function go(name){
  const el=document.getElementById('screen-'+name); if(!el) return;
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('on'));
  el.classList.add('on'); currentScreen=name; el.scrollTop=0;
  if(rhythmActive) stopRhythm();          // salir de una pantalla corta el juego
  if(name==='game') renderTrack();
}

/* ---------- Micrófono (se pide en el primer toque) ---------- */
async function ensureMic(){
  if(micReady) return true;
  const ok=await start();
  if(ok){ micReady=true; document.getElementById('liveDot')?.classList.add('live'); }
  return ok;
}

/* ---------- Progreso ---------- */
function getProgress(){ try{ return JSON.parse(localStorage.getItem('mylele_progress')||'{}'); }catch(e){ return {}; } }
function saveProgress(p){ try{ localStorage.setItem('mylele_progress', JSON.stringify(p)); }catch(e){} }
function starsFor(acc){ return acc>=90?3 : acc>=70?2 : acc>=40?1 : 0; }

/* ---------- Mapa de niveles (reemplaza al selector viejo) ---------- */
function levelsForMode(){
  // chartModeOf ignora la capa de fondo: un nivel puede tener las dos.
  return levelsList.filter(s=>chartModeOf(s)===selectedMode);
}
function buildLevelSelector(){
  const cont=document.getElementById('levels'); if(!cont) return;
  const list=levelsForMode(), prog=getProgress();
  cont.innerHTML='';
  if(!list.length){ cont.innerHTML='<div class="hint">Todavía no hay niveles de este tipo.</div>'; return; }
  list.forEach((s,i)=>{
    if(i) { const p=document.createElement('div'); p.className='path'; cont.appendChild(p); }
    const done = prog[s.slug]!==undefined;
    const unlocked = i===0 || prog[list[i-1].slug]!==undefined;
    const st = done?prog[s.slug]:0;
    const b=document.createElement('button');
    b.className='node'+(done?' done':'')+(unlocked?'':' locked');
    b.innerHTML='<span class="disc">'+(unlocked?(i+1):'🔒')+'</span>'
      +'<span class="stars">'+(done?'⭐'.repeat(st)+'☆'.repeat(3-st):'')+'</span>'
      +'<span class="nm">'+s.title.replace(/^Nivel \d+ · /,'')+'</span>';
    if(unlocked) b.addEventListener('click',async()=>{
      if(!await ensureMic()) return;
      loadSong(s);
      document.getElementById('gameTitle').textContent=s.title.replace(/^Nivel \d+ · /,'');
      go('game');
    });
    cont.appendChild(b);
  });
}

/* ---------- Al terminar una canción: guardar estrellas ---------- */
const _stopRhythm=stopRhythm;
stopRhythm=function(){
  const wasPlaying = rhythmActive && !rhythmModeCalib;
  const slug=curSlug;
  _stopRhythm();
  if(wasPlaying && slug){
    const tot=rScore.perfect+rScore.good+rScore.miss;
    if(tot>0){
      const acc=Math.round((rScore.perfect+rScore.good)/tot*100);
      const st=starsFor(acc);
      if(st>0){ const p=getProgress(); if(!(p[slug]>=st)) { p[slug]=st; saveProgress(p); } }
    }
  }
};

/* ---------- Cableado ---------- */
document.querySelectorAll('[data-go]').forEach(b=>{
  b.addEventListener('click', async()=>{
    const dest=b.dataset.go;
    if(dest==='tuner'||dest==='calib'||dest==='practice'){ if(!await ensureMic()) return; }
    if(dest==='levels') buildLevelSelector();
    go(dest);
  });
});
document.getElementById('startBtn').addEventListener('click', async()=>{
  if(!await ensureMic()) return;
  go('mode');
});
document.querySelectorAll('.mode[data-mode]').forEach(b=>{
  b.addEventListener('click',()=>{
    selectedMode=b.dataset.mode;
    document.getElementById('levelsTitle').textContent = selectedMode==='melody'?'Notas y arpegios':'Acordes';
    buildLevelSelector(); go('levels');
  });
});
