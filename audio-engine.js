// === MyLele · audio-engine.js ===
// MOTOR DE AUDIO (la frontera que se reescribe en C): captura de micrófono, detección de tono, cromagrama y detección de acordes.

// ---------- Estado de audio ----------
let audioCtx, analyserPitch, analyserChroma, sourceNode, stream;
let musicGain=null;
let timeBuf, freqBuf;
let running=false;

// ---------- Arranque ----------
document.getElementById('startBtn').addEventListener('click', start);

async function start(){
  try{
    stream = await navigator.mediaDevices.getUserMedia({
      audio:{ echoCancellation:false, noiseSuppression:false, autoGainControl:false }
    });
  }catch(e){
    alert('No pude acceder al micrófono. Revisá los permisos del navegador y volvé a intentar.\n\n('+e.name+')');
    return;
  }
  audioCtx = new (window.AudioContext||window.webkitAudioContext)();
  if(audioCtx.state==='suspended') await audioCtx.resume();
  musicGain = audioCtx.createGain(); musicGain.gain.value=1; musicGain.connect(audioCtx.destination);

  sourceNode = audioCtx.createMediaStreamSource(stream);

  analyserPitch = audioCtx.createAnalyser();
  analyserPitch.fftSize = 2048;                 // ~43 ms @48k: rápido para el tono
  timeBuf = new Float32Array(analyserPitch.fftSize);

  analyserChroma = audioCtx.createAnalyser();
  analyserChroma.fftSize = 8192;                // resolución vs. latencia: 8192 responde más rápido
  analyserChroma.smoothingTimeConstant = 0.2;
  freqBuf = new Float32Array(analyserChroma.frequencyBinCount);

  sourceNode.connect(analyserPitch);
  sourceNode.connect(analyserChroma);

  running=true;
  document.getElementById('start').style.display='none';
  document.getElementById('liveDot').classList.add('live');
  buildStringsUI();
  buildDebugUI();
  loop();
}

// ===================================================================
//  DETECCIÓN DE TONO  —  autocorrelación con interpolación parabólica
// ===================================================================
function detectPitch(buf, sampleRate){
  const SIZE = buf.length;
  let rms=0;
  for(let i=0;i<SIZE;i++){ rms += buf[i]*buf[i]; }
  rms = Math.sqrt(rms/SIZE);
  if(rms < 0.008) return {freq:-1, rms};        // demasiado silencio

  // recortar bordes silenciosos
  let r1=0, r2=SIZE-1;
  const thres=0.15;
  for(let i=0;i<SIZE/2;i++){ if(Math.abs(buf[i])<thres){ r1=i; break; } }
  for(let i=1;i<SIZE/2;i++){ if(Math.abs(buf[SIZE-i])<thres){ r2=SIZE-i; break; } }
  const b = buf.subarray(r1, r2);
  const N = b.length;
  if(N < 256) return {freq:-1, rms};

  const c = new Float32Array(N);
  for(let lag=0; lag<N; lag++){
    let sum=0;
    for(let i=0;i<N-lag;i++){ sum += b[i]*b[i+lag]; }
    c[lag]=sum;
  }
  // saltar el primer descenso
  let d=0; while(d<N-1 && c[d]>c[d+1]) d++;
  // pico máximo tras el descenso
  let maxval=-1, maxpos=-1;
  for(let i=d;i<N;i++){ if(c[i]>maxval){ maxval=c[i]; maxpos=i; } }
  if(maxpos<=0) return {freq:-1, rms};
  // interpolación parabólica para afinar el período
  let T0=maxpos;
  if(maxpos>0 && maxpos<N-1){
    const x1=c[maxpos-1], x2=c[maxpos], x3=c[maxpos+1];
    const a=(x1+x3-2*x2)/2, bb=(x3-x1)/2;
    if(a) T0 = maxpos - bb/(2*a);
  }
  const freq = sampleRate / T0;
  if(freq<70 || freq>1200) return {freq:-1, rms};   // fuera del rango útil del ukelele
  return {freq, rms};
}

function freqToNote(freq){
  const midi = Math.round(69 + 12*Math.log2(freq/440));
  const refFreq = 440 * Math.pow(2,(midi-69)/12);
  const cents = Math.round(1200*Math.log2(freq/refFreq));
  return {name:NOTE_NAMES[(midi%12+12)%12], midi, cents};
}

// --- Suavizado del tono: mediana (descarta saltos/errores de octava) ---
const PITCH_HIST=6;
let pitchHist=[];
function smoothPitchMedian(freq){
  pitchHist.push(freq);
  if(pitchHist.length>PITCH_HIST) pitchHist.shift();
  const s=[...pitchHist].sort((a,b)=>a-b);
  return s[Math.floor(s.length/2)];
}

// ===================================================================
//  CROMAGRAMA  —  reparte la energía del FFT en 12 clases de altura
// ===================================================================
function computeChroma(freqData, sampleRate, fftSize){
  const chroma=new Array(12).fill(0);
  const n=freqData.length;
  for(let i=0;i<n;i++){
    const freq = i*sampleRate/fftSize;
    if(freq<180 || freq>2200) continue;
    const mag = Math.pow(10, freqData[i]/20);   // dB -> lineal
    if(mag < 1e-4) continue;
    const midi = 69 + 12*Math.log2(freq/440);
    const pc = ((Math.round(midi)%12)+12)%12;
    chroma[pc] += mag;
  }
  const norm = Math.hypot(...chroma);
  if(norm>0) for(let i=0;i<12;i++) chroma[i]/=norm;
  return chroma;
}

function matchChord(chroma){
  let best=null, bestSim=-1, second=-1;
  for(const c of CHORDS){
    let dot=0;
    for(let i=0;i<12;i++) dot += chroma[i]*c.tpl[i];
    if(dot>bestSim){ second=bestSim; bestSim=dot; best=c; }
    else if(dot>second){ second=dot; }
  }
  return {chord:best, sim:bestSim, margin:bestSim-second};
}
