// === MyLele · config.js ===
// Constantes base: notas, cuerdas del ukelele y acordes (con sus plantillas de detección).

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
