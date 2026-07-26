# 🤖 Plan de conversión a Android nativo — MyLele

### De prototipo web a app nativa con motor de audio propio
*Análisis del estado actual + plan por fases. Escrito para vos (no técnico) y para quien programe.*

---

## ✅ Estado a julio 2026 — fases 0 a 3 hechas

El código vive en `C:\Users\Sergio\Proyectos\mylele-android` (fuera de OneDrive a
propósito: compilar C++ en una carpeta sincronizada produce bloqueos a mitad de build).

| Fase | Estado | Resultado medido |
|---|---|---|
| 0 · Herramientas, esqueleto, banco de pruebas | ✅ | Verificada en un Pixel 9a real |
| 1 · Núcleo DSP en C++ | ✅ | 97,8% acordes · 99,3% notas · 4,7 ms de latencia de golpe |
| 2 · Reloj único y latencia de ida y vuelta | ✅ | **14,84 ms** (meta: <100 ms) |
| 3 · El puntaje se muda al motor | ✅ | 95,9% de veredictos justos |
| 4 · Acompañamiento y mezcla | ✅ | sintetizado y grabado, sobre el reloj único |
| 5 · Interfaz del juego | en curso | **Flutter** (ver §7, decisión revisada) |

**El número que decidía el proyecto ya está:** 14,84 ms de ida y vuelta medidos en
hardware real, contra los ~300 ms de la web. Sumándole la detección, el camino
completo desde que el alumno rasguea hasta que el juego lo sabe es de ~19,5 ms.

**El banco de pruebas existe:** 2.247 clips, 839 MB, regenerable con seis comandos.
Incluye 121 grabaciones reales bajo CC0 de un ukelele soprano barato con cuerdas
viejas. Ver `mylele-android/testbank/README.md`.

**Correcciones al plan original que la ejecución obligó a hacer:**

- La latencia se mide sola (la app emite un barrido, lo escucha volver y cuenta las
  muestras). Se eliminó la tarea de filmar en cámara lenta que figuraba en la Fase 2.
- El banco de pruebas no requiere grabar nada: se arma con audio de licencia libre más
  material construido a partir de él.
- Apareció un bloqueante de Google Play que el plan no preveía: la alineación de
  bibliotecas nativas a páginas de 16 KB, obligatoria desde noviembre de 2025.

---

## 📍 Resumen en una página

**Qué se está haciendo:** llevar MyLele de app web a **app nativa Android**, con el motor de
audio reescrito en **C++** corriendo en un hilo de audio dedicado, para bajar la latencia de
detección de ~300 ms a **menos de 100 ms** y que el juego corra fluido.

**Qué NO se toca:** el editor de niveles, la base de datos (Supabase), el esquema, las
políticas de seguridad, el formato de `events`. Cero cambios. La app Android es **un cliente
más** de la misma base, lee exactamente lo mismo que la web.

**Los tres hallazgos que definen el plan:**

1. **La latencia no tiene un culpable, tiene cinco.** Cambiar solo la captura (Oboe) te
   ahorra un tercio del problema. El otro tercio está en las ventanas de análisis y el
   suavizado, y el último tercio en que todo corre en el mismo hilo que dibuja la pantalla.
   Un plan que solo diga "usar Oboe" fracasa. Ver §2.

2. **Hay un piso físico distinto para cada cosa, y hoy el código los mezcla.** Saber
   *cuándo* rasgueaste puede llegar a ~10 ms. Saber *qué acorde* es no puede bajar de
   ~40-50 ms — es física, no software. Hoy el juego pregunta las dos cosas al mismo tiempo
   y en el mismo lugar (dentro del dibujado), así que el acorde lento arrastra al ritmo
   rápido. **Separarlos es la mejora que más se va a sentir**, y es gratis. Ver §3.

3. **La frontera "motor de audio" que dice el CLAUDE.md no es la real.** `audio-engine.js`
   está bien aislado, pero la mitad de lo que tiene que ser nativo vive afuera: la detección
   de golpes está en `game.js`, la máquina de confirmación de acordes en `chords.js`, y
   **el puntaje se calcula adentro del dibujado de la pista**. Antes de portar hay que
   redibujar esa frontera. Ver §4.

**Riesgo principal:** la Fase 1 (núcleo DSP en C++, sin app). Si ahí no se llega a los
números, no se llega. Por eso se hace **primero, en la computadora, sin app**, donde fallar
cuesta días y no meses.

**Tiempo estimado:** 3-4 meses de trabajo enfocado. Punto de "sigo / no sigo" al final de
la Fase 2 (~6 semanas), cuando ya hay un número de latencia medido en el teléfono real.

---

## 1. Qué hay hoy (línea de base)

Sitio estático sin build: 9 archivos `.js` con alcance global, cargados en orden fijo.
~1.900 líneas de JavaScript, ~900 de CSS, 8 pantallas.

| Archivo | Líneas aprox. | Qué hace | Destino en Android |
|---|---|---|---|
| `config.js` | 48 | notas, cuerdas, acordes, plantillas | header C++ compartido |
| `content.js` | 146 | Supabase: acordes, niveles, charts, audio | Kotlin + caché local |
| `audio-engine.js` | 136 | micrófono, pitch, cromagrama, match de acorde | **C++ (núcleo)** |
| `core.js` | 67 | bucle de análisis | **C++ (núcleo)** |
| `tuner.js` | 102 | afinador por cuerda | C++ (lógica) + UI |
| `chords.js` | 154 | confirmación de acorde + diagrama + puntaje | **C++ (lógica)** + UI |
| `game.js` | 714 | pista, ritmo, metrónomo, calibración, acompañamiento | **se parte en tres** |
| `ui.js` | 208 | router, permisos, mapa de niveles, resultado | UI |
| `sfx.js` | ~120 | efectos de botones | UI |

**Lo que ya está validado y hay que preservar tal cual** (es el producto, no es código
descartable — se midió contra grabaciones reales):

- Detección restringida: verificar contra 2-4 candidatos, nunca transcribir libre.
- Plantilla del **G** con peso `[1.0, 1.6, 0.5]` — exige su tercera (B) y baja el D.
  Pasó de 10/39 a 38/39 aciertos. Hoy vive en la columna `weights` de Supabase.
- Umbrales de acorde: `SIM_MIN=0.55`, `MARGIN_MIN=0.02`.
- Máquina de estabilización: `CONFIRM_MS=90`, `LOST_MS=160`, `GRACE_MS=120`, `HOLD_MS_NEEDED=200`.
- Onset: EMA `0.85/0.15`, pico si `rms > EMA*1.8 + 0.02` y `rms > 0.03`, refractario 200 ms,
  rearme en `rms < EMA*1.2`.
- Afinador **por cuerda** (no cromático), verde solo dentro de ±8 cents, EMA `0.7/0.3`.
- Ventanas arcade: justo ±130 ms, cerca ±240 ms.
- Calibración de latencia por mediana robusta en dos pasadas (descarta dispersos a >150 ms).

> ⚠️ Estas constantes no son "detalles de implementación": son el resultado de medir con un
> ukelele real. El port las tiene que reproducir **idénticas**, y la única forma de
> garantizarlo es una prueba de regresión con grabaciones (ver Fase 1).

**Entorno de tu PC (verificado):** Android Studio ✅, SDK con Android 34 y 35 ✅,
emuladores Android 29 y 31 ✅. **Falta el NDK y CMake** (sin eso no se compila C++). Se
instalan desde Android Studio en 10 minutos — es lo primero de la Fase 0.

---

## 2. De dónde salen los ~300 ms (y cuánto se puede recuperar)

Este es el análisis que faltaba. Los 300 ms no son un solo problema:

| Etapa | Hoy (web en Android) | Nativo (objetivo) | Cómo se gana |
|---|---|---|---|
| Micrófono → navegador | ~80-180 ms | **10-25 ms** | Oboe/AAudio en ruta de baja latencia, buffer negociado con `getFramesPerBurst()` |
| Ventana de análisis del acorde | ~85 ms | **~40 ms** | Hoy el FFT del cromagrama usa 8192 muestras = **171 ms de audio**; su "centro de masa" está a ~85 ms en el pasado. Bajando a 4096 con salto (hop) corto se corta a la mitad |
| Suavizado | ~90-150 ms | **20-40 ms** | Hoy: `smoothingTimeConstant 0.2` + mediana de 6 lecturas de tono (~100 ms) + 90 ms de confirmación. Con mejor relación señal/ruido y un detector de tono más robusto (YIN), la mediana de 6 sobra |
| Ritmo del bucle | 16-50 ms (variable) | **5,3 ms (fijo)** | Hoy corre en `requestAnimationFrame`: va al ritmo de la pantalla y se salta cuadros cuando hay trabajo. Nativo corre a hop fijo de 256 muestras |
| Dibujo → pantalla | 16-50 ms | 8-16 ms | Hilo de render propio, sin competir con el DSP |

**Conclusión:** la captura (Oboe) es apenas un tercio de la ganancia. El resto sale de acortar
ventanas, sacar suavizado innecesario y separar hilos. **Por eso el plan no empieza por la app,
empieza por el DSP.**

### El costo escondido: `detectPitch`

La autocorrelación actual (`audio-engine.js:66-70`) es un doble bucle sobre hasta 2048
muestras: ~2 millones de multiplicaciones **por cuadro**, 60 veces por segundo, en
JavaScript, en el mismo hilo que dibuja la pista. Es lo más caro de toda la app y es la causa
principal de que se sienta pesada. En C++ con **YIN** (que usa FFT) esto pasa de N² a
N·log N: de 2.000.000 de operaciones a ~22.000. No es una micro-optimización, es dos órdenes
de magnitud.

---

## 3. La separación que más se va a sentir: *cuándo* vs. *qué*

Hay un piso físico distinto para cada pregunta:

| Pregunta | Piso realista | Por qué |
|---|---|---|
| ¿Cuándo rasgueaste? (onset) | **~10 ms** | Un ataque es un salto de energía; se ve en pocas muestras |
| ¿Qué nota es? (pitch) | **~20-30 ms** | Hace falta ver 2-3 ciclos de la onda; a 262 Hz eso son ~11 ms mínimo |
| ¿Qué acorde es? (cromagrama) | **~40-50 ms** | Para distinguir C de D en frecuencia hacen falta bins de ~12 Hz, y eso exige una ventana larga. **Es física, no software** |
| ¿Está afinada? (cents) | ~50-100 ms | Precisión de ±5 cents exige promediar; y no hace falta que sea rápido |

**Qué hace mal el código actual:** en `game.js:588-600`, el puntaje se calcula así —
por cada cuadro de dibujado, mira si la nota/acorde *que quedó guardado en una variable
global* coincide con lo que corresponde. O sea:

- El **momento** del acierto se decide a la velocidad del dibujado (~16 ms, más si hay lag).
- Y arrastra la **latencia del acorde** (~200 ms de ventana + suavizado + confirmación),
  aunque el golpe se detectó mucho antes.

**Qué hay que hacer en el motor nativo:** el onset marca el **cuándo** con precisión de
muestra (sample-accurate). El cromagrama confirma el **qué** unos milisegundos después,
dentro de la ventana de ±130 ms que igual toleramos. El puntaje se emite cuando ya se saben
las dos cosas, pero **fechado con el timestamp del onset**, no con el de la confirmación.

Esto solo ya mejora la sensación de respuesta muchísimo, y no depende de ningún cambio de
hardware ni de algoritmo.

---

## 4. La frontera real entre motor y UI

El `CLAUDE.md` dice que `audio-engine.js` es "la pieza que se reescribe en C". Es cierto pero
está incompleto: **la mitad de lo que tiene que ser nativo hoy vive afuera de ese archivo**.

**Lo que el motor C++ tiene que poseer (mucho más de lo que hoy está en `audio-engine.js`):**

| Qué | Hoy vive en | Por qué tiene que ser nativo |
|---|---|---|
| Captura + preproceso | `audio-engine.js` | evidente |
| Pitch, cromagrama, match de acorde | `audio-engine.js` | evidente |
| Bucle de análisis | `core.js` | tiene que ser hop fijo, no `requestAnimationFrame` |
| **Detección de golpes** (`detectOnset`) | `game.js:146` | necesita timestamp de muestra |
| **Confirmación de acorde** (`handleChordDetection`) | `chords.js:89` | es máquina de estados de tiempo real, no UI |
| **Puntaje contra el chart** (`renderTrack` + `registerHit`) | `game.js:399, 588` | **es lo que hoy está mal ubicado** |
| **Metrónomo, acompañamiento sintetizado y grabado** | `game.js:159-293` | tienen que compartir reloj con la entrada |

**Lo que la UI conserva:** dibujar la pista, las pantallas, los textos, el diagrama de
acordes, el mapa de niveles, el resultado, la navegación, el contenido de Supabase.

**El contrato entre los dos** (esto define si la app se siente fluida o no): el motor emite
eventos livianos a un buffer circular sin bloqueos, y la UI lo vacía a su propio ritmo.

```
Motor → UI  (eventos, nunca audio)
   NoteDetected  { midi, cents, tFrames }
   ChordDetected { chordId, confianza, tFrames }
   Onset         { tFrames, fuerza }
   Judgment      { indiceEvento, veredicto, desvioMs }   ← el puntaje lo decide el motor
   TunerUpdate   { cuerda, cents }

UI → Motor  (configuración, poco frecuente)
   cargarChart(eventos, bpm, countIn, compás, anacrusa)
   setPlantillasAcordes(desde Supabase)
   start() / stop() / setLatenciaCalibrada(ms)
```

> **La regla de oro:** la UI **nunca** juzga. Solo anima lo que el motor ya decidió. Si un
> cuadro se salta, el puntaje no se entera — hoy sí se entera, y por eso a veces "no te toma"
> un acorde que tocaste bien.

---

## 5. Lo que sí hay que rediseñar (no es copiar y pegar)

Cinco cosas que en la web salían gratis y en nativo hay que construir. Es donde se subestima
el esfuerzo:

**5.1 El reloj único.** En la web, `audioCtx.currentTime` servía para las dos cosas: programar
el metrónomo y fechar los golpes. En Android hay **dos streams de Oboe** (entrada y salida) con
relojes de hardware independientes. Todo el puntaje depende de relacionarlos. Se resuelve con
`AudioStream::getTimestamp()` en ambos y un reloj de motor en frames. **Es la pieza más
delicada de todo el port** y tiene su propio paso en la Fase 2.

**5.2 La calibración se vuelve (casi) automática.** La pantalla de calibración existe porque
el navegador no te dice cuánta latencia tiene. Oboe **sí te la dice**. La app va a poder
descontar sola la parte de hardware y dejar el golpeteo contra el metrónomo solo para el
resto (acústica de la sala + reacción humana). La pantalla se queda; cambia lo que corrige,
y el número va a ser mucho más chico que 300 ms.

**5.3 El acompañamiento grabado.** Hoy: `decodeAudioData` → `AudioBufferSourceNode.start(when)`,
sample-accurate y gratis. En Android hay que decodificar con `MediaCodec` a PCM en memoria y
**mezclarlo en el callback de salida del motor** — no con ExoPlayer, porque necesitás que
comparta reloj con el metrónomo. Es exactamente el mismo motivo por el que en la web se
descartó la etiqueta `<audio>`.

**5.4 El acompañamiento sintetizado.** `scheduleBacking`, `scheduleBackingMelody` y
`playVoice` son ~150 líneas de osciladores de Web Audio, con voces (`lead`/`bass`/`acomp`),
timbres y mezcla ya afinados. En nativo se vuelve un mezclador de voces chiquito dentro del
motor. No es difícil, pero es trabajo real y se subestima siempre.

**5.5 Contenido offline.** Hoy la app pide todo a Supabase al arrancar. Una app nativa tiene
que cachear canciones, charts, acordes y los audios de fondo en disco (Room/SQLite + archivos),
para que un nivel abra instantáneo y funcione sin señal. **Sin tocar el backend**: mismas
consultas, misma anon key.

---

## 6. Qué NO cambia (y por qué te conviene que sea así)

- **El editor de niveles: cero cambios.** No sabe ni tiene que saber que existe un cliente
  Android. Sigue escribiendo en las mismas tablas.
- **Supabase: cero cambios.** Mismo esquema, mismas políticas RLS, misma anon key pública,
  mismas funciones `publish_chart()` / `publish_song_meta()`.
- **El formato de `events`: cero cambios.** Tiempos en beats, modos `chords`/`melody`/`backing`,
  voces `lead`/`bass`/`acomp`.
- **La app web sigue viva.** No la borres: te sirve como demo, como versión de escritorio, y
  sobre todo **como implementación de referencia** para verificar que el motor C++ da los
  mismos resultados (ver Fase 1).

> ⚠️ Dos trampas del cliente web que la app Android tiene que heredar, no reinventar:
> **(a)** cargar **todos** los acordes de la tabla, nunca una lista fija — si no, los acordes
> nuevos del editor se ignoran. **(b)** nunca agarrar `charts[0]`: el orden que devuelve
> PostgREST no está garantizado (se comprobó que devuelve `backing` antes que `chords`).
>
> En cambio **no** hay que portar `dificultadPara()`: ya está marcada como vestigial en el
> `CLAUDE.md`. En la app nueva se agarra directamente el único chart jugable publicado.

---

## 7. Decisión de tecnología para la interfaz

El motor C++ no está en discusión (es la única forma de llegar a la latencia). La pregunta
abierta es con qué se hace la **interfaz**.

| Opción | A favor | En contra |
|---|---|---|
| **Kotlin + Jetpack Compose** ✅ *recomendada* | Camino nativo de primera clase. Android Studio ya instalado. Nada entre la UI y el motor. Mejores herramientas para cazar tirones (Perfetto, Macrobenchmark) | La UI hay que reescribirla otra vez para iPhone |
| **Flutter + C++ por FFI** | Una sola interfaz para Android y iPhone | Otra cadena de herramientas más, otro lenguaje, más piezas móviles entre el motor y la pantalla. Vale la pena solo si iPhone se adelanta mucho |
| **WebView (Capacitor) + plugin nativo** | Conserva el HTML/CSS actual casi tal cual | Sigue habiendo un navegador en el medio, que es justamente de lo que estamos huyendo. Resuelve la latencia pero no del todo la fluidez |
| React Native | Ecosistema grande | Peor para dibujar un juego en canvas que las otras |

### ✅ Decisión tomada (julio 2026): **Flutter**

La recomendación original de este documento era Kotlin + Compose, con el argumento de que
la interfaz es chica y reescribirla una vez para iPhone sale más barato que cargar con
Flutter. **Se revisó y se cambió**, por tres motivos concretos:

1. **iPhone quedó confirmado como requisito**, no como hipótesis lejana.

2. **El contenido va a ser 100% notas generadas por IA, no audio grabado.** Eso elimina toda
   la decodificación de archivos, que era trabajo específico de cada plataforma
   (MediaCodec en Android, AVAudioFile en iPhone). Lo que queda de específico es solo la
   entrada/salida de audio: ~300 líneas por plataforma. Con el trabajo de plataforma
   reducido a eso, "escribir la interfaz una sola vez" pasa a ser el factor dominante.

3. **Se había subestimado el costo de mantener dos interfaces para siempre.** No es el
   trabajo inicial: es que cada pantalla nueva se hace dos veces, cada bug se arregla dos
   veces, y las dos versiones se van separando. Y contando el mapa de niveles, la pista, el
   afinador, los diagramas, el resultado, el sistema de diseño, el cliente de Supabase y el
   progreso, la interfaz **no** es chica.

**Nada de lo construido se pierde con este cambio.** El motor en C++ —que es el trabajo
difícil y la mayor parte del valor— no se toca: Flutter llega a él por FFI igual que Kotlin
por JNI, y el patrón que ya usa el motor (una cola sin bloqueos que la interfaz vacía a
60 Hz) cuesta lo mismo por los dos caminos. Lo único que se reemplaza es la pantalla de
sonda, que siempre fue descartable — por eso se escribió sin ningún framework.

**El riesgo que hay que vigilar** es el dibujado de la pista a 60 fps. La arquitectura ya lo
protege: el audio corre entero en C++ en su propio hilo y Flutter nunca lo toca, solo vacía
eventos. Pero es lo primero a medir en la Fase 5.

---

## 8. Reglas para que iPhone después sea barato

Cuestan **cero** ahora y ahorran meses después. Si se respetan, el port a iOS es ~30-40% del
esfuerzo de Android. Si no, es ~80%.

1. **Todo el DSP, las máquinas de estado y el puntaje en C++17 portable.** Cero tipos de
   Android, cero JNI, cero `android/log.h` adentro del núcleo.
2. **La plataforma entra por dos interfaces**: `IAudioInput` e `IAudioOutput`. Oboe las
   implementa en Android; AVAudioEngine las implementa en iOS. Nada más cambia.
3. **Un solo archivo puente** (`jni_bridge.cpp`). En iOS ese archivo se reemplaza por un
   `bridge.mm` de Objective-C++ y listo.
4. **Constantes y plantillas en un header compartido**, nunca duplicadas en Kotlin.
5. **Compilar con CMake**, para que el mismo `CMakeLists.txt` genere después el framework de iOS.
6. **El banco de pruebas es un ejecutable de escritorio**, no una app de Android. Así corre en
   tu PC, en integración continua, y mañana valida la build de iOS gratis.

---

## 9. El plan por fases

Estimaciones para vos trabajando con Claude Code, no para un equipo. Son órdenes de magnitud,
no compromisos.

---

### **Fase 0 — Preparación y medición de la línea de base** · ~1 semana

Antes de escribir código nuevo, saber contra qué estamos compitiendo.

- Instalar **NDK + CMake** (hoy faltan los dos). Se hace por línea de comandos con
  `sdkmanager` — no hace falta abrir Android Studio.
- Crear el repo `mylele-android` (aparte de `MuLulu`, que queda como web + referencia).
- Esqueleto: app Kotlin + módulo `:engine` con CMake y **Oboe**.
- **Armar el banco de pruebas** — ver §13. Se construye con audio con licencia libre y
  material sintetizado a partir de samples de ukelele; **no requiere grabar nada ni saber
  tocar**.
- **Medir la línea de base real** de la web en el teléfono, con la app de prueba de la Fase 2
  como referencia. No "≈300 ms" sino el número desglosado.

✅ **Listo cuando:** compila un APK que abre un stream de entrada con Oboe y muestra en
pantalla `framesPerBurst`, la latencia de entrada que reporta el sistema, y el RMS en vivo.

---

### **Fase 1 — Núcleo DSP en C++, sin app** · ~2-3 semanas · ⚠️ *la fase que decide todo*

Todo en la computadora. Sin Android, sin interfaz, sin teléfono.

- Núcleo C++17 portable: buffer circular, filtro pasa-altos, gate de ruido, ventaneo con hop.
- **Pitch con YIN** (reemplaza la autocorrelación N²: mismo resultado, 100× más barato, y más
  robusto a errores de octava — lo que además permite sacar la mediana de 6 y sus ~100 ms).
- **Cromagrama**: primero idéntico al actual (`computeChroma`), para poder comparar peras con
  peras. La mejora a CQT se evalúa después. *No cambiar el algoritmo y la plataforma al mismo
  tiempo* — si algo empeora, no sabés cuál de los dos fue.
- Match de acordes + plantillas + `SIM_MIN`/`MARGIN_MIN` + máquina de confirmación, con las
  constantes exactas de hoy.
- **Onset**: implementar flujo espectral (mejor que el pico de RMS actual) **y** el método
  actual, con un interruptor, para poder compararlos contra las grabaciones.
- **Banco de pruebas de escritorio**: `mylele_bench archivo.wav --esperado etiquetas.json` →
  imprime aciertos, falsos positivos y latencia por evento. Determinista, sin micrófono.
- **Prueba de oro**: los mismos clips por el motor web (un script de Node que reusa
  `audio-engine.js`) y por el motor C++. Tienen que coincidir en ≥95% de las decisiones; donde
  difieran, el C++ tiene que ser el que acierta.

✅ **Listo cuando:** ≥90% de acierto en acordes y ≥95% en notas sobre el banco; latencia
algorítmica (ventana + suavizado) ≤45 ms; el banco corre solo con un comando.

🔴 **Riesgo:** acá es donde el proyecto puede fallar. Y está bien: falla en tu computadora
después de tres semanas, no después de tres meses de app construida encima.

---

### **Fase 2 — Motor en el teléfono: captura, reloj y latencia real** · ~1-2 semanas

- Conectar Oboe entrada → núcleo, en el hilo de audio: **sin reservar memoria, sin locks,
  sin logs** dentro del callback (la regla de oro del audio en tiempo real).
- Stream de salida de Oboe con el clic del metrónomo, sobre el mismo reloj.
- **Unificación de relojes**: mapear frames de entrada ↔ frames de salida ↔ reloj monotónico.
- **Auto-calibración**: leer latencias reportadas y dejar el golpeteo solo para el residuo.
- App de prueba fea: una pantalla con la nota/acorde/golpe detectado y la latencia en vivo.

✅ **Listo cuando:** la latencia **medida de punta a punta es < 100 ms** en tu teléfono.

> **Cómo se mide sin que tengas que hacer nada:** la app se mide sola. Emite un pulso por el
> parlante, lo escucha de vuelta por el micrófono y cuenta cuántas muestras pasaron — es la
> prueba de *round-trip latency* estándar de Oboe (la misma que usa la app OboeTester de
> Google). Da el número exacto, automático, repetible, sin cámara lenta y sin ukelele. Solo
> hace falta que el teléfono esté enchufado por USB con depuración activada.

🟡 **Riesgo:** hay Android que no conceden ruta de baja latencia. Mitigación: probar en 2-3
teléfonos ya en esta fase y tener degradación elegante (buffer más grande, avisar al usuario).

🚦 **Punto de decisión "sigo / no sigo".** Acá ya tenés el número real. Todo lo que sigue es
construcción sobre terreno probado.

---

### **Fase 3 — Contrato motor↔UI y el juego "de mentira"** · ~1 semana

- Definir la API de eventos de la §4 y el buffer circular sin bloqueos.
- **Mudar el puntaje al motor**: se le empuja el chart (eventos en beats, bpm, cuenta de
  entrada, compás, anacrusa) y el motor emite `Judgment` fechado con el timestamp del onset.
- Puente JNI en un solo archivo, vaciado desde Kotlin a 60 Hz.

✅ **Listo cuando:** una pantalla de depuración en Kotlin toca un nivel real traído de
Supabase, con clic y veredictos **solo en texto, sin gráficos**. Si el timing se siente bien
acá, todo lo demás es decoración.

---

### **Fase 4 — Reproducción: acompañamiento y mezcla** · ~1-2 semanas

- Mezclador de voces en el motor (`lead`/`bass`/`acomp` con los timbres y niveles actuales).
- Acompañamiento grabado: decodificar con MediaCodec a PCM y mezclar en el callback de salida,
  respetando `audio_offset_s`.
- Cuenta de entrada y regla de acento con `time_sig` y `pickup_beats` (la lógica de anacrusa
  ya está resuelta en `game.js` — se porta, no se re-deduce).

✅ **Listo cuando:** un nivel con fondo grabado y otro con fondo escrito suenan igual que en
la web y en sincronía, sobre el mismo reloj.

---

### **Fase 5 — Interfaz del juego** · ~2-3 semanas

- Pista: `SurfaceView` con hilo de render propio (o Compose Canvas — se mide cuál va mejor).
  Las posiciones salen del **tiempo del motor**, no de un reloj local.
- Las 8 pantallas: inicio, modo, mapa de niveles, juego, resultado, afinador, calibración,
  práctica libre.
- Port del sistema de diseño: los tokens de color, los botones caramelo, Titan One + Baloo 2
  (**empaquetadas en la app**, no descargadas).

✅ **Listo cuando:** 60 fps estables durante un nivel completo en un teléfono de gama media,
medido con Macrobenchmark (<1% de cuadros perdidos).

---

### **Fase 6 — Contenido, offline y paridad** · ~1-2 semanas

- Cliente REST de Supabase en Kotlin: mismas consultas, misma anon key, **cero cambios en el
  backend y cero en el editor**.
- Caché local (Room) de `songs`/`charts`/`chords` + caché en disco de los audios de fondo.
- Progreso y latencia calibrada en DataStore (equivalentes a `mylele_progress` y `mylele_lat`).

✅ **Listo cuando:** en modo avión, los niveles ya abiertos siguen jugándose completos.

---

### **Fase 7 — Endurecido, dispositivos y publicación** · ~2 semanas

- Probar en gama baja, con y sin auriculares con cable, con ruido de fondo.
- Foco de audio, interrupciones (llamada entrante), permiso denegado, auricular desenchufado
  a mitad de nivel.
- Play Console: canal de pruebas internas, ficha, y la declaración de privacidad —
  **"el audio nunca sale del dispositivo"** es cierto, es un argumento de venta, y además
  simplifica el formulario de seguridad de datos.

✅ **Listo cuando:** AAB firmado en pruebas internas, sin cierres inesperados en 10 sesiones
sobre 3 teléfonos distintos.

---

### **Fase 8 — iPhone** · *no ahora; queda habilitada, no empezada*

Si se respetaron las reglas de la §8: implementar `IAudioInput`/`IAudioOutput` con
AVAudioEngine, cambiar el archivo puente por uno de Objective-C++, y reescribir la interfaz en
SwiftUI. El motor, el puntaje y la lógica de contenido se reusan tal cual.

---

## 10. Cómo se mide el éxito

Los números de la spec de audio siguen siendo los correctos, ahora con un desglose por
pregunta (§3):

| Métrica | Objetivo | Se mide en |
|---|---|---|
| Latencia punta a punta (rasgueo → pantalla) | **< 100 ms** | Fase 2, cámara lenta 240 fps |
| Latencia del onset (ritmo) | < 30 ms | Fase 1, banco de pruebas |
| Acierto de acorde (set restringido, sala silenciosa) | ≥ 90% | Fase 1, banco de pruebas |
| Acierto de acorde (con ruido moderado) | ≥ 80% | Fase 1, banco de pruebas |
| Acierto de nota al aire | ≥ 95% | Fase 1, banco de pruebas |
| Precisión del afinador | ± 5 cents | Fase 1 |
| Cuadros perdidos durante un nivel | < 1% | Fase 5, Macrobenchmark |
| Coincidencia con el motor web (prueba de oro) | ≥ 95% | Fase 1, cada vez que se toca el DSP |

---

## 11. Riesgos y cómo se mitigan

| Riesgo | Probabilidad | Mitigación |
|---|---|---|
| Algún Android no da ruta de baja latencia | Media | Probar en 3 teléfonos ya en Fase 2; degradación elegante; avisar en pantalla |
| El port del DSP cambia sutilmente la precisión y no se nota | **Alta si no se hace la prueba de oro** | La prueba de oro de la Fase 1 es innegociable |
| El acompañamiento se desincroniza del metrónomo | Media | Un solo reloj de motor; nunca ExoPlayer para el fondo |
| Se subestima el mezclador de audio (Fases 4) | Alta | Está separado en su propia fase justamente por eso |
| Se empieza por la app y no por el motor | Alta *(es el error clásico)* | Fases 1 y 2 no tienen interfaz. A propósito |
| Tocar Supabase o el editor "de paso" | Media | Regla dura: si aparece la tentación de cambiar el esquema, es señal de que algo está mal en el cliente |
| Perder las constantes calibradas al reescribir | Media | Están inventariadas en la §1 de este documento y verificadas por la prueba de oro |
| El motor da 95% contra audio sintético y falla con un ukelele real y barato | **Alta si el banco es solo sintético** | El banco tiene tres capas (§13); la validación final con grabaciones reales desordenadas es un requisito de la Fase 7, no opcional |

---

## 12. Quién hace qué

Este proyecto lo ejecuta Claude Code. El rol del fundador es **verificar**, no construir.

**Lo que se hace solo, sin intervención (la enorme mayoría):**

- Instalar NDK y CMake (por línea de comandos con `sdkmanager`; hoy el SDK no trae
  `cmdline-tools`, se descarga primero).
- Armar el banco de pruebas completo: buscar, descargar, etiquetar, verificar y aumentar
  el audio (§13).
- Escribir todo el código: C++ del motor, CMake, puente JNI, Kotlin, interfaz.
- **Correr el banco de pruebas en esta PC**: los números de precisión de la Fase 1 salen
  enteros de acá, sin teléfono y sin instrumento.
- Compilar el APK y probarlo en el **emulador** (ya hay imágenes de Android 29 y 31
  instaladas): interfaz, contenido, navegación, lógica de niveles — todo menos la latencia.
- Estudiar el código abierto de referencia: los ejemplos de Oboe, OboeTester, aubio,
  Essentia, TarsosDSP.

**Lo único que necesita tus manos:**

| Qué | Cuándo | Cuánto lleva |
|---|---|---|
| **Enchufar un teléfono Android por USB con "depuración USB" activada** | Fase 2 en adelante | 5 minutos, una sola vez. Te guío paso a paso. Después manejo todo por `adb` |
| **Verificar**: probar la app y decir si se siente bien | al final de cada fase | lo que quieras |
| Conseguir ~30-60 clips de ukelele real "desprolijo" | Fase 7, antes de publicar | ver §13, capa 4 |

> ⚠️ **La latencia solo se puede medir en un teléfono físico.** En el emulador el audio pasa
> por capas de virtualización y el número que da no significa nada. Todo lo demás se puede
> desarrollar sin el teléfono, pero el objetivo central del proyecto —bajar de 100 ms— no se
> puede verificar sin él.

---

## 13. El banco de pruebas (sin tocar un instrumento)

**Qué es, en una frase:** una carpeta de archivos de audio de ukelele donde ya sabemos de
antemano la respuesta correcta ("acá suena un C", "acá hay un rasgueo en el segundo 2,340"),
para poder correr el motor contra ella y que nos diga cuántas acertó.

**Para qué sirve:** es lo que convierte "me parece que anda mejor" en "acertó 91% contra 87%
de antes". Sin esto, cada cambio en el motor es a ciegas, y no hay forma de saber si el port
a C++ perdió la calibración del G que costó tanto conseguir.

Se construye en cuatro capas. **Las tres primeras las hago yo, con audio de licencia libre.**

**Capa 1 — Grabaciones reales de ukelele con licencia libre.**
Freesound tiene packs de acordes de ukelele con licencia Creative Commons y CC0 (hay un pack
dedicado de acordes de ukelele, más cientos de sonidos bajo la etiqueta `ukulele`). Se
descargan, se etiquetan y se verifica cada etiqueta cruzándola contra dos analizadores
independientes ya establecidos: si el nombre del archivo, `librosa` y `Essentia` coinciden,
la etiqueta es confiable; si no, ese clip se descarta. *(Las licencias CC-BY exigen crédito:
se registra la atribución de cada archivo.)*

**Capa 2 — Casos construidos a partir de samples de nota individual.**
Hay librerías gratuitas de ukelele con cada nota grabada por separado (por ejemplo el
soundfont de HEDSound, o `Bad Baritone` en formato SFZ con 102 samples y tres tomas por
nota). Con eso se arman acordes mezclando las 4 notas correctas de cada digitación, con el
desfase real entre cuerdas de un rasgueo (~15-35 ms), y patrones rítmicos a BPM exacto.

> Esta capa es la que hace posible medir la latencia del ritmo: como los acordes los armo
> yo, **sé el momento exacto de cada rasgueo hasta la muestra**. Con grabaciones reales ese
> dato hay que anotarlo a mano y siempre tiene error.

**Capa 3 — Aumentación (multiplica las dos anteriores por 20).**
A cada clip de las capas 1 y 2 se le aplican, por programa: ruido de fondo real (tráfico,
café, ventilador), reverberación de distintas salas, la respuesta en frecuencia típica de un
micrófono de celular, variaciones de volumen, compresión tipo AGC, y **desafinación de
cuerdas sueltas** (para simular un ukelele mal afinado, que es el caso que hoy hace parecer
que el detector falla). De 60 clips salen ~1.200 casos de prueba, y son justo los casos que
rompen estas apps en el mundo real.

**Capa 4 — Lo desprolijo de verdad (Fase 7, antes de publicar).**
Lo que ninguna de las tres capas anteriores reproduce: el zumbido de una cuerda mal pisada,
una cuerda muteada sin querer, la digitación torpe de un principiante, el micrófono de un
celular barato con su control automático de ganancia peleando. **Esto sí necesita grabaciones
reales**, ~30-60 clips. Tres formas de conseguirlas sin que aprendas a tocar:

1. **La app misma los graba.** Para la Fase 7 ya existe la app: se le agrega un modo de
   grabación y cualquier persona que toque genera clips etiquetados apretando un botón. Cero
   conocimiento técnico.
2. **Encargarlo.** Un ukelelista en Fiverr o un profe de una casa de música graba un guion de
   30 minutos por poca plata.
3. **Alguien conocido que toque**, con el guion impreso.

> **Por qué esto no es un problema para arrancar:** las capas 1-3 alcanzan de sobra para
> construir y validar el motor entero (Fases 1 a 6). La capa 4 es el control de calidad
> final. Llega tarde a propósito, cuando ya hay una app que la recolecta sola.

**Dato a chequear:** cuando se calibró la plantilla del G se juntaron 39 muestras reales
(38 aciertos). El log guardaba los cromagramas, no el audio. Si esos logs quedaron guardados
en algún lado, sirven directamente para verificar el matcher de acordes del motor C++ contra
datos reales tuyos. Vale la pena buscarlos.

---

## 14. Lo primero que hay que hacer

1. Descargar `cmdline-tools` e instalar **NDK + CMake** — *lo hago yo*.
2. Armar las capas 1-3 del **banco de pruebas** — *lo hago yo*.
3. Crear el repo `mylele-android` con el esqueleto y el módulo `:engine` — *lo hago yo*.
4. **Lo tuyo:** decidir la tecnología de interfaz (§7) y, cuando lleguemos a la Fase 2,
   enchufar un teléfono Android con depuración USB.

Recién después, empezar la Fase 1.

---

*Documento vivo. Complementa a `MyLele_Spec_Motor_Audio.md` (que sigue vigente como
especificación del motor: secciones 1-9) — este agrega el análisis del código actual, el
desglose de dónde está la latencia, y el orden de ejecución.*
