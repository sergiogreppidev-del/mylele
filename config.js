// === MyLele · config.js ===
// Constantes base: notas, cuerdas del ukelele y acordes (con sus plantillas de detección).

"use strict";
/* ===================================================================
   MyLele · DETECCIÓN DE UKELELE (afinador + nota + acordes)
   Sin dependencias ni build. Procesa TODO en el dispositivo:
   el audio nunca sale del navegador.
   Primer script del orden de carga — ver index.html.
   =================================================================== */

const NOTE_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];

// Cuerdas del ukelele en afinación estándar GCEA (G reentrante / agudo)
const UKE_STRINGS = [
  {name:'G', freq:392.00},
  {name:'C', freq:261.63},
  {name:'E', freq:329.63},
  {name:'A', freq:440.00},
];

// Nota que produce cada cuerda al aire (MIDI) — para traducir traste → nota
const STRING_MIDI={G:67,C:60,E:64,A:69};
// Orden visual de las cuerdas en la pista (de arriba hacia abajo)
const STRING_LANE={G:0,C:1,E:2,A:3};
const STRING_COLORS={G:'#FFC42E',C:'#7FD94C',E:'#FF5F7E',A:'#4FC9F5'};
function fretToNoteName(str,fret){
  const m=(STRING_MIDI[str]!==undefined?STRING_MIDI[str]:60)+(fret||0);
  return NOTE_NAMES[((m%12)+12)%12];
}
// pcs = [raíz, tercera, quinta].  w = peso de cada una en la plantilla.
//
// Este es solo el RESPALDO: la app carga los pesos de verdad desde Supabase. Estos
// valores se usan si la base no responde, y tienen que quedar iguales a los de allá.
//
// Dos calibraciones, las dos medidas contra grabaciones reales. Las dos dicen lo
// mismo: la plantilla no refleja la teoría musical, refleja lo que el instrumento
// realmente produce.
//
//   G {1.0,1.6,0.5} — exige su tercera (B/Si) y baja el peso del D, porque el sol
//     reentrante mete mucho "re fantasma" en la C y el G se la robaba. 10/39 -> 38/39.
//
//   F {0.8,1.2,0.7} — el F se digita [2,0,1,0] y suena A4-C4-F4-A4: el LA en DOS
//     cuerdas y el fa en una sola, la más floja. Am comparte ese la duplicado y el do,
//     así que se llevaba las detecciones. Subirle el peso al fa (que es la fundamental)
//     lo EMPEORA; lo que funciona es reconocer que el la domina. 56% -> 96%.
const CHORDS = [
  {name:'C',  sub:'Do mayor',  pcs:[0,4,7],  w:[1.3,1.0,1.0], frets:[0,0,0,3], fingers:[0,0,0,3]},  // C E G
  {name:'Am', sub:'La menor',  pcs:[9,0,4],  w:[1.3,1.0,1.0], frets:[2,0,0,0], fingers:[2,0,0,0]},  // A C E
  {name:'F',  sub:'Fa mayor',  pcs:[5,9,0],  w:[0.8,1.2,0.7], frets:[2,0,1,0], fingers:[2,0,1,0]},  // F A C
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
