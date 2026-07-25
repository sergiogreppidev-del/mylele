// === MyLele · ui.js ===
// Navegación entre pantallas, permiso de micrófono y mapa de niveles con desbloqueo.

let currentScreen='home', selectedMode='chords', micReady=false;

/* ---------- Música del inicio ----------
   El navegador no deja que un audio arranque sin que el usuario toque algo, así que
   empieza en el primer toque.

   Es la lista de las pantallas que la DEJAN sonar, no de las que la cortan. Antes era
   al revés y por eso la música se colaba en pantallas que nadie se acordó de sumar.
   Así una pantalla nueva nace en silencio en vez de heredar la música por olvido.

   Suena en la presentación, en «¿Qué practicamos?» y en el resultado. Se corta en
   todo lo que use el micrófono (jugar, afinar, calibrar, práctica libre) y en el mapa
   de niveles, que es la antesala del juego.

   Entre `home` y `mode` la música NO se reinicia: sigue de corrido, porque nunca se
   llega a pausar. En el resultado, en cambio, arranca siempre desde el principio —
   `stopIntro()` deja el tema en cero al salir, y a esa pantalla se entra después de
   haber pasado por el mapa de niveles y el juego, que lo cortaron. */
const MUSIC_SCREENS = ['home','mode','result'];
const introAudio = document.getElementById('introAudio');
let introMuted = false;
try{ introMuted = localStorage.getItem('mylele_music')==='off'; }catch(e){}

function updateSoundBtn(){
  const b=document.getElementById('soundBtn'); if(!b) return;
  b.textContent = introMuted ? '🔇' : '🔊';
  b.classList.toggle('muted', introMuted);
  b.setAttribute('aria-label', introMuted ? 'Activar la música' : 'Silenciar la música');
}
function playIntro(){
  if(!introAudio || introMuted || !MUSIC_SCREENS.includes(currentScreen)) return;
  introAudio.play().catch(()=>{});   // si el navegador todavía no deja, se reintenta al próximo toque
}
function stopIntro(){ if(introAudio){ introAudio.pause(); introAudio.currentTime=0; } }

document.getElementById('soundBtn')?.addEventListener('click', e=>{
  e.stopPropagation();
  introMuted=!introMuted;
  try{ localStorage.setItem('mylele_music', introMuted?'off':'on'); }catch(err){}
  updateSoundBtn();
  if(introMuted) stopIntro(); else { sfx('tap'); playIntro(); }   // el efecto confirma que volvió el sonido
});
document.addEventListener('pointerdown', playIntro, {once:false});
updateSoundBtn();

/* ---------- Router ---------- */
function go(name){
  const el=document.getElementById('screen-'+name); if(!el) return;
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('on'));
  el.classList.add('on'); currentScreen=name; el.scrollTop=0;
  if(rhythmActive) stopRhythm();          // salir de una pantalla corta el juego
  if(MUSIC_SCREENS.includes(name)) playIntro(); else stopIntro();
  if(name==='game') renderTrack();
}

/* ---------- Micrófono (se pide en el primer toque) ---------- */
/* `destino` es la pantalla a la que se va apenas haya permiso. La música se corta acá
   y no en go() porque pedir el permiso puede tardar (el cartel del navegador), y
   mientras tanto el micrófono ya está abierto escuchando la música por el parlante.
   Pero solo si el destino es una pantalla muda: yendo a «¿Qué practicamos?» la música
   tiene que seguir de corrido, y cortarla acá la haría volver a empezar. */
async function ensureMic(destino){
  if(!MUSIC_SCREENS.includes(destino)) stopIntro();
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
      if(!await ensureMic('game')) return;
      loadSong(s);
      document.getElementById('gameTitle').textContent=s.title.replace(/^Nivel \d+ · /,'');
      go('game');
    });
    cont.appendChild(b);
  });
}

/* ---------- Al terminar una canción: guardar estrellas y mostrar el resultado ---------- */
const _stopRhythm=stopRhythm;
stopRhythm=function(){
  const wasPlaying = rhythmActive && !rhythmModeCalib;
  const finished = rhythmFinished;      // llegó al final solo, no lo cortó el alumno
  const slug=curSlug, meta=songMeta;
  _stopRhythm();
  if(wasPlaying && slug){
    const tot=rScore.perfect+rScore.good+rScore.miss;
    const acc = tot? Math.round((rScore.perfect+rScore.good)/tot*100) : 0;
    const st=starsFor(acc);
    if(tot>0 && st>0){ const p=getProgress(); if(!(p[slug]>=st)) { p[slug]=st; saveProgress(p); } }
    if(finished) showResult({slug, title:(meta&&meta.title)||'Nivel', acc, stars:st, combo:bestCombo,
                             perfect:rScore.perfect, good:rScore.good, miss:rScore.miss});
  }
};

/* ---------- Pantalla de resultado ---------- */
const TITULOS = ['Casi lo tenés','¡Bien ahí!','¡Muy bien!','¡Perfecto!'];
const CONFETTI_COLORS = ['#FFC42E','#FF5F7E','#7FD94C','#4FC9F5','#A263FF'];
let lastResultSlug=null;

function showResult(r){
  lastResultSlug=r.slug;
  document.getElementById('resTitle').textContent = TITULOS[r.stars] || TITULOS[0];
  document.getElementById('resLevel').textContent = r.title;
  document.getElementById('resAcc').textContent = r.acc;
  document.getElementById('resPerfect').textContent = r.perfect;
  document.getElementById('resGood').textContent = r.good;
  document.getElementById('resMiss').textContent = r.miss;
  document.getElementById('resCombo').textContent = 'x'+r.combo;

  // Las estrellas se encienden de a una (la animación está en el CSS).
  const stars=document.querySelectorAll('#resStars .res-star');
  stars.forEach(s=>s.classList.remove('on'));
  requestAnimationFrame(()=>{ stars.forEach((s,i)=>{ if(i<r.stars) s.classList.add('on'); }); });

  // Siguiente nivel: el que sigue en el mapa del modo actual, si está.
  const list=levelsForMode();
  const idx=list.findIndex(s=>s.slug===r.slug);
  const next=(idx>=0 && idx<list.length-1)?list[idx+1]:null;
  const btn=document.getElementById('resNext');
  if(next){ btn.style.display=''; btn.textContent='Siguiente nivel →'; btn.dataset.slug=next.slug; }
  else{ btn.style.display='none'; }

  dropConfetti(r.stars>0 ? 28+r.stars*14 : 0);
  go('result');
}

function dropConfetti(n){
  const c=document.getElementById('confetti'); if(!c) return;
  c.innerHTML='';
  for(let i=0;i<n;i++){
    const p=document.createElement('i');
    p.style.left=(Math.random()*100)+'%';
    p.style.background=CONFETTI_COLORS[i%CONFETTI_COLORS.length];
    p.style.animationDuration=(1.6+Math.random()*1.4)+'s';
    p.style.animationDelay=(Math.random()*0.7)+'s';
    c.appendChild(p);
  }
  // Se limpian solos: si no, quedan cientos de nodos tras varias partidas.
  setTimeout(()=>{ if(c) c.innerHTML=''; }, 4200);
}

document.getElementById('resRetry')?.addEventListener('click', async()=>{
  if(!await ensureMic('game')) return;
  go('game'); startRhythm(false);
});
document.getElementById('resNext')?.addEventListener('click', async e=>{
  const slug=e.currentTarget.dataset.slug;
  const s=levelsList.find(x=>x.slug===slug); if(!s) return;
  if(!await ensureMic('game')) return;
  loadSong(s); go('game');
});

/* ---------- Cableado ---------- */
document.querySelectorAll('[data-go]').forEach(b=>{
  b.addEventListener('click', async()=>{
    const dest=b.dataset.go;
    if(dest==='tuner'||dest==='calib'||dest==='practice'){ if(!await ensureMic(dest)) return; }
    if(dest==='levels') buildLevelSelector();
    go(dest);
  });
});
document.getElementById('startBtn').addEventListener('click', async()=>{
  if(!await ensureMic('mode')) return;   // 'mode' tiene música: no se corta al pedir el permiso
  go('mode');
});
document.querySelectorAll('.mode[data-mode]').forEach(b=>{
  b.addEventListener('click',()=>{
    selectedMode=b.dataset.mode;
    document.getElementById('levelsTitle').textContent = selectedMode==='melody'?'Notas y arpegios':'Acordes';
    buildLevelSelector(); go('levels');
  });
});
