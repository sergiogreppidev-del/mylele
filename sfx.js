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
    /* Volumen general de los efectos. El pico real de cada sonido es este número por
       el `pico` de su voz (abajo): con 0.22 daba ~0.11 de amplitud y no se escuchaba.
       0.9 es el techo sano — más arriba las dos notas de `confirm`, que se pisan un
       instante, sumarían más de 1 y el sonido saldría distorsionado. */
    sfxGain.gain.value = 0.9;
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
  tap:     ()=>{ sfxTono(620, 900, 0.07, 'triangle', 0.55); },
  // Volver: el mismo gesto al revés, así se distingue sin mirar.
  back:    ()=>{ sfxTono(520, 320, 0.09, 'triangle', 0.50); },
  // Arrancar algo (jugar, empezar, siguiente nivel): dos notas para arriba, D5 → A5.
  confirm: ()=>{ sfxTono(587.33, 587.33, 0.07, 'triangle', 0.55, 0);
                 sfxTono(880,    880,    0.12, 'triangle', 0.50, 0.06); },
  /* Nivel bloqueado: golpe sordo. Va más bajo que el resto a propósito — es onda
     cuadrada y grave, que a igual número suena bastante más fuerte y áspera. */
  locked:  ()=>{ sfxTono(180, 120, 0.14, 'square', 0.30); },
  /* Elegir de una lista (modo de práctica, nivel del mapa). Se distingue del `tap`
     por el brillo de arriba: la nota aguda en `sine` suena a campanita y le da el
     aire de «marcaste una opción» en vez de «apretaste un botón». */
  select:  ()=>{ sfxTono(740,  1050, 0.06, 'triangle', 0.50, 0);
                 sfxTono(1480, 1480, 0.06, 'sine',     0.20, 0.035); }
};

/* Cada estrella del resultado tiene su nota, y suben: A5 · C#6 · E6 es un acorde
   de La mayor desarmado, así que las tres juntas suenan a fanfarria aunque cada
   una llegue por su lado. Va suelto y no en SFX porque necesita saber cuál de las
   tres es — el oyente de botones llama sin argumentos. */
const SFX_ESTRELLAS = [880, 1108.73, 1318.51];
function sfxStar(i){
  if(!sfxReady()) return;
  const f = SFX_ESTRELLAS[i] || SFX_ESTRELLAS[0];
  try{
    sfxTono(f,     f * 1.5, 0.22, 'triangle', 0.50);
    sfxTono(f * 2, f * 3,   0.16, 'sine',     0.16, 0.02);   // el destello de arriba
  }catch(e){}
}

/* Fanfarria del resultado: Do · Mi · Sol · Do, más notas cuantas más estrellas.
   No la silencia el 🔊 por la misma razón que los clics: es la respuesta a lo que
   acabás de hacer, no música ambiente. */
const SFX_FANFARRIA = [523.25, 659.25, 783.99, 1046.50];
function sfxFanfarria(estrellas){
  if(!sfxReady()) return;
  const n = Math.max(2, Math.min(4, (estrellas || 0) + 1));
  try{
    for(let i = 0; i < n; i++){
      sfxTono(SFX_FANFARRIA[i], SFX_FANFARRIA[i], 0.26, 'triangle', 0.42, i * 0.11);
    }
  }catch(e){}
}

/* El botón 🔊 NO silencia esto: apaga la música y nada más. Son cosas distintas —
   la música es ambiente y se apaga por gusto o por respeto al de al lado; el efecto
   es la respuesta al toque, y sin él los botones se sienten muertos. */
function sfx(nombre){
  if(!sfxReady()) return;
  try{ (SFX[nombre] || SFX.tap)(); }catch(e){}
}

/* Un solo oyente para toda la app, en vez de cablear botón por botón: los nodos del
   mapa de niveles se crean y destruyen cada vez que se arma la pantalla, y con
   listeners individuales habría que acordarse de sumarlos ahí también. */
/* El orden importa: se queda con la PRIMERA que coincida. Por eso `.node.locked`
   va antes que `.node`, si no el nivel bloqueado sonaría a selección válida. */
const SFX_POR_SELECTOR = [
  ['#startBtn, #playBtn, #resNext, #resRetry, #calibBtn', 'confirm'],
  ['.back',                                               'back'   ],  // los «←», que llevan esa clase
  ['.node.locked',                                        'locked' ],
  ['.mode, .node, .string',                               'select' ]
];

/* `.string` (el afinador) va aparte porque son `<div>`, no `<button>`: se tocan
   igual y tienen que sonar igual. fx.js usa este mismo selector para las chispas. */
const SFX_TOCABLE = 'button, .string';

document.addEventListener('pointerdown', e=>{
  const b = e.target.closest && e.target.closest(SFX_TOCABLE);
  if(!b || b.disabled) return;
  let voz = 'tap';
  for(const [sel, v] of SFX_POR_SELECTOR){ if(b.matches(sel)){ voz = v; break; } }
  sfx(voz);
});
