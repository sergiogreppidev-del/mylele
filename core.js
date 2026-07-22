// === MyLele · core.js ===
// Núcleo: bucle de análisis en tiempo real que conecta el audio con la UI.

// ===================================================================
//  BUCLE DE ANÁLISIS
// ===================================================================
let lastFrame=performance.now(), fps=0;
let lastChordT=performance.now();

// umbrales de confianza del acorde
const SIM_MIN=0.55;         // similitud mínima
const MARGIN_MIN=0.02;      // margen sobre el 2º mejor

// --- Log de diagnóstico (para tunear la detección con datos reales) ---
let lastRms=0;
let chromaRing=[]; const CHROMA_RING=12;   // ~200 ms de cromagramas recientes
let diagLog=[];
let autoCapture=false, lastAutoCapT=0;
const AUTO_CAP_MS=600;   // una muestra automática cada ~0,6 s mientras tocás
const MAX_LOG=80;        // tope de muestras

function loop(){
  if(!running) return;
  const t0=performance.now();

  analyserPitch.getFloatTimeDomainData(timeBuf);
  const {freq, rms} = detectPitch(timeBuf, audioCtx.sampleRate);

  // ---- Afinador / nota detectada ----
  if(freq>0){
    const medFreq = smoothPitchMedian(freq);   // mediana: descarta lecturas sueltas erróneas
    const note = freqToNote(medFreq);
    updateTuner(note, medFreq);
    detectedNoteName = (rms>0.02) ? note.name : detectedNoteName;
  }else{
    fadeTuner();
  }

  // ---- Acordes ----
  analyserChroma.getFloatFrequencyData(freqBuf);
  const chroma = computeChroma(freqBuf, audioCtx.sampleRate, analyserChroma.fftSize);
  const now = performance.now();
  const chordDt = Math.min(80, now - lastChordT);   // ms desde el cuadro anterior (cap por si hubo lag)
  lastChordT = now;
  const strongSignal = rms>0.015 || chroma.some(v=>v>0.08);   // umbral: ignora ruido mínimo
  lastRms = rms;
  if(strongSignal){ chromaRing.push(chroma); if(chromaRing.length>CHROMA_RING) chromaRing.shift(); }
  const match = matchChord(chroma);
  handleChordDetection(match, strongSignal, chordDt);

  // auto-captura para el log (solo con acorde estable, sin ruido)
  if(autoCapture && detectedChord
     && diagLog.length<MAX_LOG && (now-lastAutoCapT>AUTO_CAP_MS)){
    if(doCapture()) lastAutoCapT=now;
  }

  // ---- Ritmo: detección de golpes (onsets) ----
  detectOnset(rms);

  // ---- Debug ----
  const dt=performance.now()-t0;
  fps = 0.9*fps + 0.1*(1000/(performance.now()-lastFrame));
  lastFrame=performance.now();
  updateDebug(freq, rms, match, chroma, fps, dt);

  requestAnimationFrame(loop);
}
