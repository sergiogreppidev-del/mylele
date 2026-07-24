# 🎧 Spec Técnica — Motor de Audio (Android)
### MyLele — Detección de nota, acorde, rasgueo y ritmo por micrófono
*Documento técnico para desarrollo + guía de uso para fundador no técnico*

---

## 📍 Estado a julio 2026 — leer antes que nada

**El *spike* de validación de la Sección 11 ya se hizo.** No hizo falta contratar a nadie: se
construyó como **prototipo web** (`audio-engine.js` en este mismo repo), y **funciona**.

Qué quedó validado con datos reales:

| Objetivo del spike | Resultado |
|---|---|
| Afinador | ✅ Funciona (por cuerda, no cromático) |
| Detección de nota al aire | ✅ Funciona |
| Detección de C · Am · F · G con detección restringida | ✅ 38/39 aciertos tras corregir la plantilla del G |
| Latencia < 100 ms | ❌ **~300 ms en Android web** |

**La conclusión que importa:** el *enfoque* está probado — la detección restringida funciona y
la precisión llega. Lo único que la web no puede dar es la **latencia**, y eso es exactamente
lo que resuelve el motor nativo que describe este documento (Oboe + C++ + hilo de audio dedicado).

Por eso, de acá en adelante:

- **Secciones 1–9 (la spec técnica): siguen 100% vigentes.** Son el plan del motor nativo.
- **Sección 10 (banco de pruebas): vigente y pendiente.** Las grabaciones del prototipo web
  son el punto de partida del dataset.
- **Sección 11 (plan de de-risking): ya ejecutada por otra vía.** Leerla como historia, no
  como tarea. La pregunta "¿se puede hacer esto?" ya tiene respuesta: **sí**.
- **Sección 12 (a quién contratar): vigente**, pero ahora contratás desde una posición mucho
  mejor — tenés un prototipo funcionando que sirve de especificación viva y de prueba de viabilidad.

---

## ⚠️ Cómo usar este documento (leé esto primero)

Sos **solo y no técnico**, así que este documento tiene **dos lectores**:

1. **Vos** → las secciones 0, 10 y 11 están escritas en lenguaje claro. Te dicen qué decisiones tomar, a quién contratar y cómo gastar poco para saber si el proyecto es viable **antes** de invertir en serio.
2. **El desarrollador de audio que contrates** → las secciones 1 a 9 son la especificación técnica que puede ejecutar. No necesitás entenderlas al 100%; necesitás poder pasárselas y hacerle las preguntas correctas.

**La regla de oro:** el motor de audio es lo único que no se puede "fingir" ni resolver con una plantilla. Si funciona, tenés un producto. Si no, no tenés nada. Por eso la Sección 11 (el *spike* barato de validación) es literalmente lo más importante que vas a hacer en los próximos meses.

---

## 0. Qué debe lograr el motor (en lenguaje claro)

El motor escucha por el micrófono y responde cuatro preguntas, en tiempo casi real:

1. **¿Qué nota tocaste?** (para el afinador y para melodías) → *más fácil.*
2. **¿Qué acorde tocaste?** (C, Am, F, G…) → *más difícil.*
3. **¿Cuándo rasgueaste?** (cada golpe/ataque) → *medio.*
4. **¿Tocaste a tiempo?** (ritmo vs. el metrónomo) → *medio, depende de #3.*

Y con eso calcula un **puntaje** (precisión + ritmo) que alimenta las estrellas, el XP y la corrección.

**El truco que lo hace posible: "detección restringida".** La app **siempre sabe qué deberías estar tocando** (el objetivo del ejercicio). Entonces no tiene que adivinar entre miles de posibilidades — solo tiene que verificar contra 2-4 candidatos conocidos. Esto convierte un problema casi imposible en uno resoluble. Es el secreto de Yousician y es **innegociable** en tu arquitectura.

**Metas de calidad (definir antes de construir):**

| Métrica | Objetivo mínimo (sala silenciosa) | Con ruido moderado |
|---|---|---|
| Detección de nota correcta | ≥ 95% | ≥ 85% |
| Detección de acorde (set restringido de principiante) | ≥ 90% | ≥ 80% |
| Latencia total (tocar → feedback en pantalla) | < 100 ms | < 100 ms |
| Precisión del afinador | ± 5 cents | ± 10 cents |

Si el desarrollador no alcanza estos números en el *spike*, hay que ajustar el enfoque **antes** de seguir gastando.

---

## 1. Arquitectura del motor (pipeline)

```
   Micrófono
      │
      ▼
┌─────────────────┐   Captura de audio de baja latencia (Oboe/AAudio)
│  1. Captura     │   48 kHz mono, buffers pequeños
└────────┬────────┘
         ▼
┌─────────────────┐   Ventaneo, normalización, gate de ruido,
│  2. Preproceso  │   filtro pasa-altos, buffer circular
└────────┬────────┘
         ▼
┌───────────────────────────────────────────────┐
│  3. Detección (corre en paralelo por frame)    │
│   ├─ Pitch (nota + cents)      → YIN/pYIN/CREPE │
│   ├─ Chroma → Acorde           → CQT + templates│
│   └─ Onset (ataque de rasgueo) → flujo espectral│
└────────┬───────────────────────────────────────┘
         ▼
┌─────────────────┐   Compara contra el OBJETIVO del ejercicio
│  4. Evaluación  │   (detección restringida) + alinea a la grilla
│                 │   de tempo → timing, aciertos, cents
└────────┬────────┘
         ▼
┌─────────────────┐   Precisión %, score de ritmo, taxonomía de
│  5. Scoring +   │   errores → estrellas, XP, feedback visual
│     Eventos     │   (solo METADATOS salen del motor, nunca audio)
└─────────────────┘
```

**Principio de rendimiento:** todo el pipeline de la #1 a la #5 corre en **código nativo (C++)** en un hilo de audio dedicado. Nada de esto pasa por el puente de Flutter/React Native. Solo los *resultados* (eventos livianos: "acorde C detectado, correcto, +2 ms") cruzan al lado UI.

---

## 2. Captura de audio en Android

- **Librería:** **Oboe** (biblioteca C++ de Google que usa AAudio en Android moderno y OpenSL ES como fallback). Es el estándar para audio de baja latencia en Android.
- **Formato:** mono, **48 kHz** (o 44,1 kHz), 16-bit o float.
- **Buffer/callback:** ruta de baja latencia, tamaño de buffer chico (p. ej. 256–512 frames), negociado con el dispositivo (`getFramesPerBurst`).
- **Permisos:** `RECORD_AUDIO`; manejar *audio focus* y el caso de que el usuario deniegue el permiso.
- **Consideración:** en Android la latencia y el tamaño de buffer varían mucho entre dispositivos gama alta/baja → negociar dinámicamente y testear en gama baja real.

> El rango del ukelele (fundamentales ~262 Hz a ~1 kHz, armónicos hasta varios kHz) entra holgadamente en 48 kHz. Para el detector de pitch incluso se puede *downsamplear* para ahorrar cómputo.

---

## 3. Preprocesamiento

- **Buffer circular (ring buffer)** para acumular muestras entre callbacks.
- **Ventaneo:** frames solapados. Sugerido para pitch: **frame 2048, hop 512** (75% de solape) → resolución temporal ~11 ms a 48 kHz. Para onsets, hop más chico.
- **Normalización de amplitud** (para tolerar micrófonos y volúmenes distintos).
- **Gate de ruido / VAD:** ignorar frames por debajo de un umbral de energía (silencio, ruido de fondo).
- **Filtro pasa-altos** suave para quitar rumble de baja frecuencia (manos, roce, HVAC).

---

## 4. Detección de nota individual (monofónico)

**Algoritmos recomendados (probados y maduros):**
- **YIN** o **pYIN** (probabilístico, más robusto): estándar de oro para pitch monofónico.
- Alternativas: **MPM** (McLeod Pitch Method), autocorrelación con interpolación parabólica.
- **Opción ML (mayor precisión):** **CREPE** (CNN de pitch) en variante *tiny* corriendo on-device vía TensorFlow Lite. Más caro en cómputo; usar solo si YIN no alcanza.

**Salida:** frecuencia fundamental (Hz) → nota más cercana + **desviación en cents** (para el afinador y para evaluar afinación de melodías).

**Librerías concretas para el dev:**
- **TarsosDSP** (Java/Kotlin, pensada para Android): implementa YIN, MPM, FFT-YIN, AMDF. Punto de partida rápido.
- **aubio** (C, compilable con NDK): pitch (`yin`, `yinfft`), muy liviana.

---

## 5. Detección de acordes (polifónico) — la parte difícil

**Enfoque en dos capas:**

**Capa A — Chroma / HPCP + plantillas (empezar acá):**
1. Calcular un **Constant-Q Transform (CQT)** (mejor que FFT lineal para música, porque su eje de frecuencia es logarítmico como las notas).
2. Reducir a un **vector de croma de 12 clases** (HPCP — Harmonic Pitch Class Profile): "cuánta energía hay en cada una de las 12 notas".
3. **Comparar contra plantillas de los acordes esperados** (¡detección restringida!). Si la lección espera {C, Am, F, G}, solo comparás contra esas 4 plantillas y elegís la de mayor similitud por encima de un umbral. Todo lo demás se ignora.

Esto es mucho más robusto que "reconocer cualquier acorde del mundo".

**Capa B — Modelo ML (para robustez / Fase 3):**
- Un **CNN pequeño** entrenado sobre frames de CQT/croma de **grabaciones reales de ukelele**, desplegado en **TensorFlow Lite**. Clasifica entre el conjunto de acordes del currículo.
- Requiere **dataset etiquetado** (ver Sección 10): grabaciones de varios ukeleles, digitaciones limpias y sucias, con y sin ruido, aumentado con perturbaciones.

**Librerías/herramientas:**
- **Essentia** (C++, MIR, del MTG-UPF Barcelona): tiene HPCP, `ChordsDetection`, onset, key. Potente pero más pesada; compilable para Android.
- Alternativa artesanal: CQT propio + templates + (luego) TFLite.

---

## 6. Detección de rasgueo (onsets)

- **Detección de onsets** por **flujo espectral (spectral flux)** o energía/HFC: cada pico = un ataque = un rasgueo.
- **Librerías:** aubio (`onset` con métodos `specflux`, `hfc`, `complex`…), TarsosDSP (onset detectors).
- **Dirección (down/up):** **no se determina de forma fiable solo por audio.** Se **infiere del patrón esperado + el timing** (sabemos qué patrón pide el ejercicio). Mejoras tímbricas quedan para más adelante.
- **Salida:** timestamps de cada onset + intensidad (para dinámica).

---

## 7. Evaluación de ritmo y timing

1. El ejercicio define una **grilla de tiempo** (tempo/BPM, compás, patrón esperado).
2. Se **alinean los onsets detectados** contra los tiempos esperados de la grilla.
3. Por cada golpe: **desviación en ms** (adelantado/atrasado) → clasificar:

| Ventana | Resultado |
|---|---|
| ± 30–50 ms | Perfecto |
| ± 50–100 ms | Bien |
| > 100 ms o ausente | Fallo / fuera de tiempo |

4. Métricas agregadas: **% de golpes en ventana**, consistencia (desvío estándar), tendencia (¿te acelerás?).

---

## 8. Motor de scoring (cómo se combina todo)

Para un ejercicio típico (ej. cambios de acorde a tempo):

```
Por cada evento (onset esperado):
   ├─ ¿Sonó dentro de la ventana de timing?      → score_ritmo
   ├─ ¿El acorde detectado == acorde esperado?    → score_acierto
   └─ (melodías) ¿afinación dentro de ± cents?    → score_afinacion

Precisión (%)  = eventos correctos / eventos totales
Score de ritmo = f(desviaciones de timing)
Puntaje final  = combinación ponderada → estrellas (1–3), XP
```

Los **umbrales de aprobación y de estrellas** los define cada ejercicio (un ejercicio de nivel 0 es más indulgente que uno de nivel 3). Toda esta lógica es **determinista** (no IA) → predecible, barata, testeable.

**Taxonomía de errores** (para el "profesor" y la remediación): cuerda muteada, presión insuficiente (*buzz*), acorde equivocado, adelantado, atrasado, tempo inconsistente. El motor etiqueta cada fallo con su categoría.

---

## 9. Rendimiento, robustez y privacidad

**Latencia:** ruta de audio nativa de baja latencia (Oboe), buffers chicos, DSP en hilo de audio dedicado. Objetivo glass-to-glass < 100 ms.

**Robustez (lo que rompe estas apps en el mundo real):**
- **Micrófonos baratos y variados** → normalización + calibración inicial.
- **Ruido de fondo** → gate/VAD, umbrales adaptativos, entrenamiento con ruido aumentado.
- **Distintos tamaños de ukelele** (soprano/concierto/tenor) y afinaciones (GCEA vs barítono DGBE) → configurable en onboarding.
- **Calibración por usuario:** un test rápido al inicio ("tocá tu cuerda C") para ajustar niveles y afinación de referencia.

**Privacidad (requisito + argumento de venta):**
- **Todo el procesamiento de audio ocurre en el dispositivo.**
- **El audio crudo del micrófono NUNCA se sube a ningún servidor.** Solo salen metadatos (eventos, scores).
- Comunicarlo explícitamente al usuario genera confianza (y simplifica el cumplimiento de privacidad).

---

## 10. Cómo medir si el motor "funciona" (banco de pruebas)

No se puede mejorar lo que no se mide. El dev debe construir, desde el día 1:

- **Un banco de grabaciones etiquetadas:** decenas/cientos de clips de ukelele reales con la respuesta correcta anotada (qué nota/acorde, cuándo). Grabados con distintos ukeleles, micrófonos, salas y niveles de ruido.
- **Un script de evaluación** que corra el motor contra el banco y reporte precisión, falsos positivos/negativos y latencia.
- **Metas numéricas** (las de la Sección 0) como criterio de "listo / no listo".

Este banco es también el **dataset de entrenamiento** si vas a la capa ML. Empezá a acumular grabaciones desde el principio.

---

## 11. 🎯 Tu plan de de-risking (lo más importante para vos)

Sos solo y no técnico. No apuestes tus ahorros a construir todo antes de saber si el audio funciona. Hacé esto, **en orden**:

**Paso 1 — Prototipo de validación barato (semanas, no meses).**
Contratá a **un** freelance de audio/Android por un trabajo acotado y definido: una app mínima, fea, sin diseño, que solo haga:
- afinador,
- detección de nota al aire,
- detección de los 4 acordes de principiante (C, Am, F, G) con **detección restringida**,
- medición de latencia y precisión contra un banco de grabaciones.

Costo relativamente bajo, y te responde **la única pregunta que importa**: *"¿Se puede hacer esto bien con el micrófono de un teléfono común y un ukelele barato?"*

**Paso 2 — Criterios de aceptación claros (acordados por escrito).**
Antes de que el dev empiece, fijá las metas de la Sección 0. Si las alcanza → verde para seguir. Si no → ajustan enfoque (más ML, otro algoritmo) **antes** de gastar más.

**Paso 3 — Recién ahí, decidir cómo escalar** (contratar más, buscar un cofundador técnico, o una agencia especializada en apps de audio/música).

**Beneficio enorme:** con ese prototipo en la mano tenés (a) prueba de viabilidad para inversores, (b) algo tangible para reclutar un cofundador técnico, y (c) evitás el error clásico de construir meses de app sobre un motor que no funciona.

---

## 12. A quién contratar y con qué construir

**El perfil que necesitás (no cualquier programador):**
- Desarrollador **Android/C++** con experiencia en **DSP / audio en tiempo real** y, si es posible, **MIR (Music Information Retrieval)**.
- Palabras clave para buscar en su CV/portfolio: *audio DSP, pitch detection, real-time audio, Oboe/AAudio, TarsosDSP/aubio/Essentia, MIR, TensorFlow Lite audio*.
- Alternativa: una **agencia especializada en apps de audio/música** (más cara pero menos riesgo de gestión para un fundador solo).
- ⚠️ Un desarrollador de apps genérico (que hace CRUDs y pantallas) **va a sufrir** con esta parte. Es una especialidad.

**Stack recomendado del motor:**
- Captura: **Oboe** (Android).
- DSP núcleo: **C++**, apoyado en **aubio** y/o **TarsosDSP** y/o **Essentia** (open source, sin costo de licencia).
- Pitch: **YIN/pYIN**, con opción **CREPE-tiny** vía **TensorFlow Lite** si hace falta.
- Acordes: **CQT → HPCP/chroma → plantillas restringidas**, luego **CNN en TFLite**.
- Puente a la UI: el motor expone eventos/scores; la app (Flutter/RN) solo los muestra.

**Buy vs. build:**
- **Build sobre open source** (recomendado): máximo control, sin licencias, pero necesita el perfil especializado.
- **SDKs comerciales de análisis de audio:** existen y pueden ahorrar tiempo; si evaluás alguno, verificá que soporte **detección de nota Y acordes con enfoque restringido**, su latencia en Android real, y el costo de licencia. Pedile a tu dev que los compare en el *spike*.

---

## 13. Resumen para vos (una página)

1. El motor de audio es el corazón y el mayor riesgo del proyecto. No se puede fingir.
2. La técnica clave es **detección restringida**: la app siempre sabe qué deberías tocar, así que verifica en vez de adivinar. Innegociable.
3. Se construye con **open source maduro** (Oboe + aubio/TarsosDSP/Essentia + TFLite), no desde cero.
4. Necesitás un **especialista en audio/DSP**, no un programador genérico.
5. **Antes de invertir en serio, pagá un *spike* barato** que pruebe afinador + nota + 4 acordes + latencia contra metas escritas. Esa es tu mejor decisión de los próximos meses.
6. Todo el audio se procesa **en el dispositivo** — bueno para latencia y excelente para privacidad/confianza.

---

*Próximos documentos posibles: (a) el brief exacto y contrato de alcance para el freelance del spike; (b) el esquema de base de datos; (c) el backlog del MVP Android.*
