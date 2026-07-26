// === MyLele · ui.js ===
// Navegación entre pantallas, permiso de micrófono y mapa de niveles con desbloqueo.

let currentScreen='home', selectedMode='chords', micReady=false;

/* ---------- Música del inicio ----------
   El navegador no deja que un audio arranque sin que el usuario toque algo, así que
   empieza en el primer toque.

   Es la lista de las pantallas que la DEJAN sonar, no de las que la cortan. Antes era
   al revés y por eso la música se colaba en pantallas que nadie se acordó de sumar.
   Así una pantalla nueva nace en silencio en vez de heredar la música por olvido.

   Suena en las pantallas donde se mira y se elige: presentación, «¿Qué practicamos?»,
   mapa de niveles y resultado. Se corta en todo lo que use el micrófono para tocar
   (jugar, afinar, calibrar, práctica libre).

   El mapa de niveles antes estaba mudo por ser la antesala del juego, y el silencio
   de golpe se sentía como si la app se hubiera colgado. Se puede sacar de la lista
   sin tocar nada más: no se le pide el micrófono al entrar (recién al elegir un
   nivel, y esa llamada a `ensureMic('game')` ya corta la música antes de abrirlo).

   Entre `home`, `mode` y `levels` la música NO se reinicia: sigue de corrido, porque
   nunca se llega a pausar. En el resultado, en cambio, arranca siempre desde el
   principio — `stopIntro()` deja el tema en cero al salir, y a esa pantalla se entra
   después de pasar por el juego, que lo cortó. */
const MUSIC_SCREENS = ['home','mode','levels','result'];
const introAudio = document.getElementById('introAudio');
let introMuted = false;
try{ introMuted = localStorage.getItem('mylele_music')==='off'; }catch(e){}

/* Sincroniza el botón con todo su estado: si se ve, y cómo se ve. Se llama al
   conmutarlo y en cada cambio de pantalla — es uno solo para toda la app, así que
   aparece justo en las pantallas que tienen música y en ninguna otra. */
function updateSoundBtn(){
  const b=document.getElementById('soundBtn'); if(!b) return;
  b.hidden = !MUSIC_SCREENS.includes(currentScreen);
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
  if(introMuted) stopIntro(); else playIntro();
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
  updateSoundBtn();                       // el botón se muestra solo donde hay música
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
  /* El primero abierto y sin terminar es «el que toca»: lleva la clase `next` y el
     CSS le pone el aro que late. Se calcula acá y no en el CSS porque depende del
     progreso guardado, no de la posición en la lista. */
  const proximo = list.findIndex((s,i)=> prog[s.slug]===undefined && (i===0 || prog[list[i-1].slug]!==undefined));
  list.forEach((s,i)=>{
    if(i) {
      const p=document.createElement('div'); p.className='path';
      p.style.animationDelay=(i*0.07)+'s';
      cont.appendChild(p);
    }
    const done = prog[s.slug]!==undefined;
    const unlocked = i===0 || prog[list[i-1].slug]!==undefined;
    const st = done?prog[s.slug]:0;
    const b=document.createElement('button');
    b.className='node'+(done?' done':'')+(unlocked?'':' locked')+(i===proximo?' next':'');
    /* Entran de a uno, de arriba hacia abajo. El retraso va por nodo y no por CSS
       (`nth-child`) porque la cantidad de niveles la decide la base de datos. */
    b.style.animationDelay=(i*0.07)+'s';
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

  /* Una nota por estrella, en el momento en que cada una aparece. Los 180 ms de
     separación son los mismos `animation-delay` que tienen las estrellas en el CSS
     (.res-star:nth-child(2)/(3)): si se cambian allá, hay que cambiarlos acá o el
     sonido deja de caer junto con el brillo, que es todo el efecto.
     Los 260 ms de arranque le dan tiempo a la pantalla a entrar. */
  for(let i=0;i<r.stars;i++) setTimeout(()=>sfxStar(i), 260+i*180);
  // Sin estrellas no hay fanfarria: sonaría a burla justo cuando no salió.
  if(r.stars>0) setTimeout(()=>sfxFanfarria(r.stars), 260+r.stars*180+120);

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
