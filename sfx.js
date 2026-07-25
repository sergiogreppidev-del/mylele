// === MyLele · sfx.js ===
// Efectos de sonido de los botones. No hay archivos de audio: se sintetizan, igual que
// el metrónomo de game.js. Un .mp3 por botón sería medio segundo de carga y un pedido
// de red más por sonido; esto pesa cero.

/* Contexto de audio PROPIO, a propósito — no reusa el de audio-engine.js:
   · `audioCtx` recién existe cuando el alumno da permiso de micrófono, y los botones
     de la pantalla de inicio suenan mucho antes que eso;
   · `musicGain` lo baja a cero el juego para que en la cuenta de entrada se escuche
     solo el metrónomo (game.js). Los clics de la interfaz no tienen que desaparecer
     con él: son respuesta al toque, no música. */
let sfxCtx = null, sfxGain = null;

function sfxReady(){
  if(sfxCtx){
    if(sfxCtx.state === 'suspended') sfxCtx.resume();   // el navegador lo suspende al volver de otra pestaña
    return true;
  }
  try{
    sfxCtx  = new (window.AudioContext || window.webkitAudioContext)();
    sfxGain = sfxCtx.createGain();
    sfxGain.gain.value = 0.22;        // discreto: acompaña al toque, no lo tapa
    sfxGain.connect(sfxCtx.destination);
  }catch(e){ sfxCtx = null; return false; }   // sin audio, los botones siguen andando
  return true;
}

/* Un tono con caída rápida. `desde`/`hasta` en Hz: si son distintos, el tono se desliza
   —es lo que le da el aire de arcade en vez de sonar a pitido de microondas. */
function sfxTono(desde, hasta, dur, tipo, pico, demora){
  const t0 = sfxCtx.currentTime + (demora || 0);
  const osc = sfxCtx.createOscillator(), g = sfxCtx.createGain();
  osc.type = tipo;
  osc.frequency.setValueAtTime(desde, t0);
  if(hasta !== desde) osc.frequency.exponentialRampToValueAtTime(hasta, t0 + dur);
  // Las rampas exponenciales no aceptan el cero: por eso 0.0001 y no 0.
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(pico, t0 + 0.006);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g); g.connect(sfxGain);
  osc.start(t0); osc.stop(t0 + dur + 0.02);
}

const SFX = {
  // El de todos los días: sube, corto y brillante.
  tap:     ()=>{ sfxTono(620, 900, 0.07, 'triangle', 0.50); },
  // Volver: el mismo gesto al revés, así se distingue sin mirar.
  back:    ()=>{ sfxTono(520, 320, 0.09, 'triangle', 0.42); },
  // Arrancar algo (jugar, empezar, siguiente nivel): dos notas para arriba, D5 → A5.
  confirm: ()=>{ sfxTono(587.33, 587.33, 0.07, 'triangle', 0.50, 0);
                 sfxTono(880,    880,    0.12, 'triangle', 0.45, 0.06); },
  // Nivel bloqueado: golpe sordo. No pasa nada y el sonido lo dice.
  locked:  ()=>{ sfxTono(180, 120, 0.14, 'square', 0.22); }
};

function sfx(nombre){
  if(introMuted) return;            // el 🔊 de la pantalla de inicio manda sobre todo
  if(!sfxReady()) return;
  try{ (SFX[nombre] || SFX.tap)(); }catch(e){}
}

/* Un solo oyente para toda la app, en vez de cablear botón por botón: los nodos del
   mapa de niveles se crean y destruyen cada vez que se arma la pantalla, y con
   listeners individuales habría que acordarse de sumarlos ahí también. */
const SFX_POR_SELECTOR = [
  ['#startBtn, #playBtn, #resNext, #resRetry, #calibBtn', 'confirm'],
  ['.back',                                               'back'   ],  // los «←», que llevan esa clase
  ['.node.locked',                                        'locked' ]
];

document.addEventListener('pointerdown', e=>{
  const b = e.target.closest && e.target.closest('button');
  if(!b) return;
  if(b.id === 'soundBtn') return;   // ese lo toca su propio handler, DESPUÉS de conmutar
  let voz = 'tap';
  for(const [sel, v] of SFX_POR_SELECTOR){ if(b.matches(sel)){ voz = v; break; } }
  sfx(voz);
});
