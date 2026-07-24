// === MyLele · content.js ===
// Contenido desde Supabase: carga de niveles, canciones y charts.

// ---------- Contenido desde Supabase (MyLele) ----------
const SUPA_URL='https://duvflmqbagnlhznuqjhr.supabase.co';
const SUPA_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR1dmZsbXFiYWdubGh6bnVxamhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ3MzI0OTcsImV4cCI6MjEwMDMwODQ5N30.grvye06MRNefUiIDTf9VzgW6AnJBeh1lS3aqJP6eqJY';
const DEFAULT_EVENTS=[{t:0,chord:'C',dur:4},{t:4,chord:'Am',dur:4},{t:8,chord:'F',dur:4},{t:12,chord:'G',dur:4},{t:16,chord:'C',dur:4},{t:20,chord:'Am',dur:4},{t:24,chord:'F',dur:4},{t:28,chord:'G',dur:4}];
let songEvents=[], songMeta=null, songMode='chords', levelsList=[], curSlug=null;

async function supaGet(path){
  const r=await fetch(SUPA_URL+'/rest/v1/'+path, {headers:{apikey:SUPA_KEY, Authorization:'Bearer '+SUPA_KEY}});
  if(!r.ok) throw new Error('supa '+r.status);
  return r.json();
}
function setContentStatus(txt,cls){ const el=document.getElementById('contentStatus'); if(el){ el.innerHTML=txt; el.className='status'+(cls==='warn'?' warn':''); } }

async function loadContent(){
  try{
    // 1) acordes (con digitación) -> reconstruye las plantillas de detección
    const rows=await supaGet('chords?select=*');
    if(rows && rows.length){
      const order=['C','Am','F','G']; const byId={}; rows.forEach(r=>byId[r.id]=r);
      const built=order.filter(id=>byId[id]).map(id=>{ const r=byId[id];
        return {name:r.id, sub:r.name_es, pcs:r.pitch_classes, w:(r.id==='G'?[1.0,1.6,0.5]:[1.3,1.0,1.0]), frets:r.frets, fingers:r.fingers}; });
      if(built.length===4){ CHORDS.length=0; built.forEach(c=>{ buildChordTemplate(c); CHORDS.push(c); }); setTarget(0); }
    }
    // 2) lista de niveles (canciones ordenadas)
    // Solo el chart PUBLICADO de cada canción: el editor deja borradores en la misma tabla
    // (published=false) y con !inner una canción sin chart publicado no aparece en el mapa.
    const songs=await supaGet('songs?select=slug,title,level,bpm,charts!inner(events,mode)&charts.published=is.true&order=level.asc');
    if(songs && songs.length){
      levelsList=songs; buildLevelSelector();
      loadSong(songs[0]);            // arranca en el nivel 1
    }else{ throw new Error('sin niveles'); }
  }catch(e){
    console.warn('No se pudo cargar de Supabase, uso respaldo local.', e);
    songEvents=DEFAULT_EVENTS.slice(); songMode='chords';
    setContentStatus('⚠ Sin conexión con Supabase — usando progresión local (C·Am·F·G)','warn');
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
  const chart=(s.charts||[])[0];
  songMode=(chart&&chart.mode)||'chords';
  songEvents=(chart&&Array.isArray(chart.events))?chart.events:[];
  document.querySelectorAll('#levels .lvbtn').forEach(b=>b.classList.toggle('active', b.dataset.slug===s.slug));
  const tipo = songMode==='melody'?'notas':'acordes';
  setContentStatus('🎵 <b>'+s.title+'</b> · '+songEvents.length+' '+tipo+' · desde Supabase ✓','ok');
  document.getElementById('rhythmFb').innerHTML = songMode==='melody'
    ? 'Tocá cada <b>nota</b> cuando llegue a la línea.'
    : 'Tocá cada <b>acorde</b> cuando llegue a la línea.';
}
