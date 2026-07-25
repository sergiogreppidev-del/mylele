// === MyLele · content.js ===
// Contenido desde Supabase: carga de niveles, canciones y charts.

// ---------- Contenido desde Supabase (MyLele) ----------
const SUPA_URL='https://duvflmqbagnlhznuqjhr.supabase.co';
const SUPA_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR1dmZsbXFiYWdubGh6bnVxamhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ3MzI0OTcsImV4cCI6MjEwMDMwODQ5N30.grvye06MRNefUiIDTf9VzgW6AnJBeh1lS3aqJP6eqJY';
const DEFAULT_EVENTS=[{t:0,chord:'C',dur:4},{t:4,chord:'Am',dur:4},{t:8,chord:'F',dur:4},{t:12,chord:'G',dur:4},{t:16,chord:'C',dur:4},{t:20,chord:'Am',dur:4},{t:24,chord:'F',dur:4},{t:28,chord:'G',dur:4}];
let songEvents=[], songMeta=null, songMode='chords', levelsList=[], curSlug=null;
// Melodía de acompañamiento del nivel (la toca la app, el alumno no).
// Formato: [{t, pitch:'G4', dur}] — tiempos en beats, igual que el resto.
let backingNotes=[];

// Acompañamiento GRABADO (opcional, por nivel). Si el nivel tiene uno, reemplaza
// al sintetizado. El archivo vive en el bucket `backing` de Supabase Storage.
let songAudioUrl=null, songAudioOffset=0, songAudioBuffer=null;

// Tiempos por compás del nivel. Sin esto el acento del metrónomo cae cada 4 aunque
// la canción esté en 3/4, y un vals suena como si estuviera mal tocado.
let songBeatsPerBar=4;
function beatsPerBarOf(timeSig){
  const n=Number(String(timeSig||'4/4').split('/')[0]);
  return (Number.isFinite(n) && n>=1 && n<=16) ? n : 4;
}
function audioUrlFor(path){
  return path ? SUPA_URL+'/storage/v1/object/public/backing/'+String(path).split('/').map(encodeURIComponent).join('/') : null;
}

// Una canción puede traer VARIAS partituras: la jugable y la de fondo.
// Nunca agarrar charts[0] a ciegas: el orden que devuelve la base no está garantizado.
const BACKING_MODE='backing';
function playableChart(s){ return (s.charts||[]).find(c=>c && c.mode!==BACKING_MODE) || null; }
function backingChartOf(s){ return (s.charts||[]).find(c=>c && c.mode===BACKING_MODE) || null; }
function chartModeOf(s){ const c=playableChart(s); return (c&&c.mode)||'chords'; }

async function supaGet(path){
  const r=await fetch(SUPA_URL+'/rest/v1/'+path, {headers:{apikey:SUPA_KEY, Authorization:'Bearer '+SUPA_KEY}});
  if(!r.ok) throw new Error('supa '+r.status);
  return r.json();
}
function setContentStatus(txt,cls){ const el=document.getElementById('contentStatus'); if(el){ el.innerHTML=txt; el.className='status'+(cls==='warn'?' warn':''); } }

async function loadContent(){
  try{
    // 1) acordes (con digitación) -> reconstruye las plantillas de detección.
    // Se cargan TODOS los que haya en la base, en su orden: si acá se cablea una
    // lista fija, los acordes nuevos que se carguen desde el editor se ignoran y
    // los niveles que los usen no se dibujan ni se detectan.
    const rows=await supaGet('chords?select=*&order=sort_order.asc,id.asc');
    const built=(rows||[])
      .filter(r=>r && Array.isArray(r.pitch_classes) && r.pitch_classes.length)
      .map(r=>({
        name:r.id, sub:r.name_es, pcs:r.pitch_classes,
        // Un peso por pitch class. Si faltan (acorde viejo), se completa con 1.
        w:(Array.isArray(r.weights)&&r.weights.length===r.pitch_classes.length)
            ? r.weights.map(Number)
            : r.pitch_classes.map((_,i)=>i===0?1.3:1.0),
        frets:r.frets, fingers:r.fingers
      }));
    if(built.length){
      CHORDS.length=0; built.forEach(c=>{ buildChordTemplate(c); CHORDS.push(c); }); setTarget(0);
    }
    // 2) lista de niveles (canciones ordenadas)
    // Solo el chart PUBLICADO de cada canción: el editor deja borradores en la misma tabla
    // (published=false) y con !inner una canción sin chart publicado no aparece en el mapa.
    const songs=await supaGet('songs?select=slug,title,level,bpm,time_sig,audio_path,audio_offset_s,charts!inner(events,mode)&charts.published=is.true&order=level.asc');
    // Una canción que solo tenga fondo publicado no es un nivel jugable: se descarta.
    const jugables=(songs||[]).filter(playableChart);
    if(jugables.length){
      levelsList=jugables; buildLevelSelector();
      loadSong(jugables[0]);         // arranca en el nivel 1
    }else{ throw new Error('sin niveles'); }
  }catch(e){
    console.warn('No se pudo cargar de Supabase, uso respaldo local.', e);
    songEvents=DEFAULT_EVENTS.slice(); songMode='chords'; backingNotes=[];
    songAudioUrl=null; songAudioBuffer=null; songAudioOffset=0; songBeatsPerBar=4;
    setContentStatus('⚠ Sin conexión con Supabase — usando progresión local (C·Am·F·G)','warn');
  }
}
/* El audio se decodifica a un buffer en vez de usar una etiqueta <audio> porque hay
   que arrancarlo EN EL MISMO RELOJ que el metrónomo. Un play() común llega con
   decenas de milisegundos de error y la grabación se escucha corrida del chart. */
const _audioCache={};
async function preloadSongAudio(url){
  try{
    if(_audioCache[url]){ songAudioBuffer=_audioCache[url]; return; }
    const r=await fetch(url); if(!r.ok) throw new Error('audio '+r.status);
    const bytes=await r.arrayBuffer();
    const ctx=audioCtx || new (window.AudioContext||window.webkitAudioContext)();
    const buf=await ctx.decodeAudioData(bytes);
    _audioCache[url]=buf;
    if(songAudioUrl===url) songAudioBuffer=buf;
  }catch(e){
    console.warn('No se pudo cargar el acompañamiento grabado; se usa el sintetizado.', e);
    if(songAudioUrl===url){ songAudioUrl=null; songAudioBuffer=null; }
  }
}

function buildLevelSelector(){
  const cont=document.getElementById('levels'); if(!cont) return; cont.innerHTML='';
  levelsList.forEach(s=>{
    const b=document.createElement('button'); b.className='lvbtn'; b.dataset.slug=s.slug;
    const kind = (s.charts&&s.charts[0]&&s.charts[0].mode)||'chords';
    const desc = kind==='melody'?'Notas sueltas':(s.title.includes('rápid')?'Cambios veloces':kind==='chords'?'Acordes':'—');
    b.innerHTML='<b>'+s.title.replace('· ',' ')+'</b><span>'+desc+'</span>';
    b.addEventListener('click',()=>{ if(!rhythmActive) loadSong(s); });
    cont.appendChild(b);
  });
}
function loadSong(s){
  curSlug=s.slug; songMeta=s;
  bpm=Number(s.bpm)||80; document.getElementById('bpmVal').textContent=bpm;
  songBeatsPerBar=beatsPerBarOf(s.time_sig);
  const chart=playableChart(s);
  songMode=(chart&&chart.mode)||'chords';
  songEvents=(chart&&Array.isArray(chart.events))?chart.events:[];
  const bck=backingChartOf(s);
  backingNotes=(bck&&Array.isArray(bck.events))?bck.events:[];
  songAudioUrl=audioUrlFor(s.audio_path);
  songAudioOffset=Number(s.audio_offset_s)||0;
  songAudioBuffer=null;
  if(songAudioUrl) preloadSongAudio(songAudioUrl);   // se decodifica ya, para que Empezar no trabe
  document.querySelectorAll('#levels .lvbtn').forEach(b=>b.classList.toggle('active', b.dataset.slug===s.slug));
  const tipo = songMode==='melody'?'notas':'acordes';
  setContentStatus('🎵 <b>'+s.title+'</b> · '+songEvents.length+' '+tipo+' · desde Supabase ✓','ok');
  document.getElementById('rhythmFb').innerHTML = songMode==='melody'
    ? 'Tocá cada <b>nota</b> cuando llegue a la línea.'
    : 'Tocá cada <b>acorde</b> cuando llegue a la línea.';
}
