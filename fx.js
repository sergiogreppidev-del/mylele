// === MyLele · fx.js ===
// Efectos visuales de adorno. Es el compañero de sfx.js: aquel pone lo que se
// escucha al tocar un botón, este pone lo que se ve.
//
// Casi todo el movimiento de la app vive en styles.css (bloque «JUGO»), que es
// donde tiene que estar: las animaciones de CSS las mueve la placa de video del
// teléfono sola. Acá quedan solo las tres cosas que el CSS no puede hacer por
// su cuenta, porque dependen de algo que pasa en el momento:
//
//   1. las notas de fondo — hay que crear los elementos y darles a cada una su
//      posición y su velocidad, para que no vayan todas juntas;
//   2. las chispas al tocar — nacen donde apoyaste el dedo, y eso el CSS no lo
//      sabe;
//   3. fxBump() — el saltito de un número que acaba de cambiar, que lo dispara
//      el juego cuando cambia.
//
// Si este archivo no carga, la app funciona igual: pierde adornos, nada más.

/* ---------- 1. Notas musicales flotando de fondo ----------
   En vez de caramelos (que serían de otro juego), sube música: es el tema de
   la app y se lee igual de festivo.

   Se crean UNA vez al cargar y quedan girando en bucle para siempre. La
   alternativa —crear una nota nueva cada tanto con un temporizador— termina
   dejando basura si el teléfono se traba, y no se ve mejor. */
const FX_NOTAS = ['♪','♫','♬','♩','♪','♫'];
const FX_CANTIDAD = 14;      // suficiente para que se vea vivo sin ensuciar la pantalla

function fxCrearFlotantes(){
  const cont = document.getElementById('floaters');
  if(!cont) return;
  let html = '';
  for(let i = 0; i < FX_CANTIDAD; i++){
    const izq   = Math.round(Math.random() * 96);          // % de ancho
    const tam   = 15 + Math.round(Math.random() * 22);     // px
    const dur   = 13 + Math.random() * 12;                 // segundos de subida
    /* Los retrasos negativos arrancan la animación «ya empezada»: sin esto la
       pantalla de inicio arranca vacía y las notas recién aparecen a los 15
       segundos, justo cuando el alumno ya se fue a otra pantalla. */
    const demora = -Math.random() * dur;
    html += '<b style="left:' + izq + '%;font-size:' + tam + 'px;'
          + 'animation-duration:' + dur.toFixed(1) + 's;'
          + 'animation-delay:' + demora.toFixed(1) + 's">'
          + FX_NOTAS[i % FX_NOTAS.length] + '</b>';
  }
  cont.innerHTML = html;
}
fxCrearFlotantes();

/* ---------- 2. Chispas al tocar ----------
   Es el detalle que más cambia la sensación al tacto: sin él el botón se hunde
   y no pasa nada más; con él, el toque «explota». */
const FX_COLORES = ['#FFC42E','#FF5F7E','#7FD94C','#4FC9F5','#A263FF','#FFFFFF'];
const FX_CHISPAS = 7;

function fxChispas(x, y){
  const frag = document.createDocumentFragment();
  for(let i = 0; i < FX_CHISPAS; i++){
    /* Repartidas en círculo con un poco de azar: en ángulos exactos se ve una
       estrellita de dibujo técnico en vez de una salpicadura. */
    const ang  = (i / FX_CHISPAS) * Math.PI * 2 + Math.random() * 0.6;
    const dist = 26 + Math.random() * 26;
    const p = document.createElement('i');
    p.className = 'spark';
    p.style.left = x + 'px';
    p.style.top  = y + 'px';
    p.style.background = FX_COLORES[i % FX_COLORES.length];
    p.style.setProperty('--dx', Math.round(Math.cos(ang) * dist) + 'px');
    p.style.setProperty('--dy', Math.round(Math.sin(ang) * dist) + 'px');
    /* `animationend` y no un setTimeout: si el teléfono suspende la pestaña, el
       temporizador puede no llegar nunca y las chispas se acumularían en el DOM. */
    p.addEventListener('animationend', () => p.remove());
    frag.appendChild(p);
  }
  document.body.appendChild(frag);
}

/* Un solo oyente para toda la app, igual que en sfx.js y por el mismo motivo:
   los botones del mapa de niveles se crean y se destruyen cada vez que se arma
   la pantalla, y cablearlos uno por uno se olvida siempre. */
document.addEventListener('pointerdown', e => {
  if(!e.target.closest) return;
  /* Mismo selector que sfx.js (ahí está el porqué de `.string`): lo que suena al
     tocarlo tiene que chispear también, o el gesto sale a medias. */
  const b = e.target.closest('button, .string');
  if(!b || b.disabled) return;
  fxChispas(e.clientX, e.clientY);
});

/* ---------- 3. Saltito de un valor que cambió ----------
   Quitar y reponer la clase no alcanza: el navegador junta los dos cambios y no
   ve ninguna diferencia, así que la animación no se relanza. Leer `offsetWidth`
   en el medio lo obliga a mirar cómo quedó, y ahí sí la vuelve a disparar. */
function fxBump(el){
  if(!el) return;
  el.classList.remove('bump');
  void el.offsetWidth;
  el.classList.add('bump');
}
