# 🎵 MyLele — Blueprint de Producto
### La mejor plataforma interactiva para aprender ukelele
*Documento maestro de producto, arquitectura, diseño, pedagogía y roadmap*

> **Nombre del producto:** *MyLele* (de *My ukelele*). Decidido y en uso.

---

## 0. Resumen ejecutivo

MyLele es una app móvil que enseña ukelele desde cero usando **únicamente el micrófono del dispositivo**. El usuario toca, la app escucha, evalúa en tiempo real (nota, acorde, rasgueo, ritmo y precisión) y responde como lo haría un profesor particular: corrige, explica, motiva y adapta.

El diferencial no es "otra app de acordes", sino **la combinación de tres cosas que hoy nadie hace bien a la vez para ukelele**:

1. **Escucha inteligente y precisa** gracias a un enfoque de *detección restringida* (la app siempre sabe qué deberías estar tocando, así que verifica en vez de adivinar) + modelos on-device.
2. **Pedagogía real de ukelele** diseñada por músicos, no un temario genérico de guitarra recortado.
3. **Motivación tipo Duolingo** (rachas, XP, ligas, camino de aprendizaje) sobre una capa de **IA adaptativa** que personaliza el plan de práctica.

**Norte estratégico:** que un principiante absoluto toque su primera canción reconocible en **menos de 20 minutos** y siga practicando **7 días seguidos**.

---

## 1. Estrategia de producto (Dirección de Producto)

### 1.1 Propuesta de valor
> "Aprendé ukelele de verdad, con un profesor que te escucha en el bolsillo. Sin partituras intimidantes, sin cables, sin frustración."

### 1.2 Diferenciadores frente a la competencia

| Competidor | Fortaleza | Debilidad que explotamos |
|---|---|---|
| **Yousician** | Detección de audio, gamificación | Multi-instrumento → ukelele es ciudadano de segunda; curva empinada |
| **Fender Play** | Producción, videos | Basado en video pasivo, **no escucha al usuario**, poca corrección real |
| **Simply Guitar/Ukulele** | Onboarding suave | Contenido limitado, poca profundidad intermedia |
| **Duolingo (referencia UX)** | Retención brutal, hábito | No es música |

**Nuestra jugada:** foco 100% ukelele + escucha real + retención estilo Duolingo. Ser *el* referente de la categoría, no un jugador más.

### 1.3 Personas objetivo

- **"Sofía, la que siempre quiso" (principiante absoluta, 16–35).** Compró un ukelele barato, ve tutoriales de YouTube y se frustra. Quiere resultados rápidos y sentirse capaz. → **Núcleo del producto.**
- **"Martín, el retomador" (intermedio, sabe algunos acordes).** Se estancó en 4 acordes. Necesita rasgueos, fingerpicking y canciones completas. → **Retención y monetización.**
- **"Lucía, la profe" (autora de contenido).** Da clases y quiere una herramienta de práctica para sus alumnos. → Canal futuro (B2B2C).

### 1.4 Métricas norte (North Star)
- **NSM:** *minutos de práctica evaluada por usuario activo semanal.* (Mide valor real, no solo apertura.)
- Activación: % que completa la 1ª lección con audio en día 1.
- Retención: D1 / D7 / D30.
- Progreso: acordes/canciones dominados por usuario.
- Conversión free → premium.

---

## 2. Experiencia y diseño UX/UI (Diseño UX/UI)

### 2.1 Principios de diseño
1. **El instrumento manda, no la pantalla.** El usuario debe mirar sus manos, no el teléfono. UI de vistazo, feedback por color y sonido, tipografía enorme.
2. **Feedback inmediato y amable.** Verde = bien, ámbar = casi, nunca "rojo de castigo". Los errores son datos, no fracasos.
3. **Una decisión por pantalla.** Reducir carga cognitiva (Duolingo/Apple).
4. **Progreso siempre visible.** Nunca dudar de "¿avancé?".
5. **Bello en movimiento.** El movimiento (notas que caen, medidor de afinación) *es* la interfaz.

### 2.2 Sistema de diseño
- **Base:** Material Design 3 (Expressive) como cimiento de componentes y accesibilidad + capa de marca propia (evitar el look "template").
- **Color:** paleta cálida-moderna. Un color de marca de firma (ej. coral/mango) para energía + neutros tipo Notion + acentos de estado (verde éxito, ámbar casi, azul info). Dark mode nativo (como Spotify).
- **Tipografía:** una sans geométrica con mucha personalidad para títulos y una neutra legible para cuerpo. Números tabulares para tempo/BPM/estadísticas.
- **Iconografía y motion:** ilustración cálida y amigable + microanimaciones (Lottie/Rive) para XP, rachas y celebración de logros.
- **Tokens de diseño** versionados (color, espaciado, radios, sombras, tipografía) compartidos entre diseño y código.

### 2.3 Arquitectura de información (navegación principal)

```
┌───────────┬───────────┬───────────┬───────────┬───────────┐
│  Aprender │  Canciones│   Tocar   │Herramientas│  Perfil  │
│  (Camino) │(Biblioteca)│ (Práctica │(Afinador,  │(Stats,   │
│           │           │  libre)   │ Metrónomo, │ Logros)  │
│           │           │           │ Acordes)   │          │
└───────────┴───────────┴───────────┴───────────┴───────────┘
```

### 2.4 Pantallas clave

**Onboarding (60–90 s):**
Bienvenida → "¿Qué ukelele tenés?" (soprano/concierto/tenor/barítono) → afinación guiada (primera victoria) → primer sonido → objetivo diario (5/10/20 min) → **primer acorde tocado antes de pedir registro** (aha-moment primero, cuenta después).

**Home / Camino de aprendizaje (corazón del producto):**
Sendero visual estilo Duolingo con nodos (lección/ejercicio/canción/checkpoint). Muestra racha, XP del día, siguiente meta. Un solo botón grande: **"Continuar"**.

**Reproductor de lección (la pantalla más importante):**
- **Notación en scroll sincronizada** con el audio: diagramas de acordes o "notas que caen" (falling notes, estilo Yousician) sobre las 4 cuerdas.
- **Feedback en vivo:** cada nota/acorde detectado se ilumina verde (correcto), ámbar (afinación/timing casi) o gris (no sonó).
- **Indicador de afinación y de tempo** discretos.
- **Barra de precisión** en tiempo real.
- Al terminar: resultado con **estrellas (1–3)**, XP ganado, y **replay de los fragmentos fallados**.

**Herramientas:** Afinador cromático grande, Metrónomo con patrones, Biblioteca de acordes (diagrama + audio + digitación animada), Práctica libre.

**Perfil:** nivel, XP total, racha, calendario de práctica (heatmap tipo GitHub), acordes/canciones dominados, logros, estadísticas de precisión y ritmo por semana.

### 2.5 Accesibilidad
Contraste AA/AAA, escalado de texto, feedback no dependiente solo del color (íconos + háptica), soporte para zurdos (invertir digitaciones), subtítulos en videos.

---

## 3. El motor de audio — el corazón del producto (Ukelele + DSP)

> Esta es la parte más difícil y la que define si el producto es excelente o mediocre. Merece un *spike* de viabilidad **antes** de construir nada más.

### 3.1 Contexto del ukelele (afinación)
Afinación estándar **GCEA** (soprano/concierto/tenor), con **G reentrante (G4 agudo)**:

| Cuerda | Nota | Frecuencia |
|---|---|---|
| 4ª (arriba) | **G4** | 392,00 Hz |
| 3ª | **C4** | 261,63 Hz |
| 2ª | **E4** | 329,63 Hz |
| 1ª (abajo) | **A4** | 440,00 Hz |

*(Barítono: DGBE — soportado como modo secundario.)* El rango tonal es agudo y limpio → **ventaja** para la detección de tono.

### 3.2 La idea clave: **detección restringida (constrained detection)**
La app **siempre sabe qué debería tocar el usuario** (el objetivo del ejercicio). Entonces el problema deja de ser "transcribir audio arbitrario" (muy difícil) y pasa a ser "verificar y alinear contra un objetivo conocido" (mucho más resoluble y preciso). Es el secreto de las apps tipo Yousician. Cada módulo se apoya en esto.

### 3.3 Los cuatro problemas de escucha

**a) Detección de nota individual (monofónico)**
- Algoritmos: **YIN / pYIN** o autocorrelación con interpolación parabólica para precisión de cents. Para máxima robustez, un modelo tipo CREPE/CNN pequeño on-device.
- Salida: frecuencia → nota + desviación en cents (para afinador y para evaluar afinación de melodías).

**b) Detección de acordes (polifónico)**
- **Chromagram (perfil de croma de 12 clases)** + clasificación. Como conocemos el conjunto de acordes esperados del ejercicio (p. ej. {C, Am, F, G}), reducimos el clasificador a esos candidatos → precisión muy alta.
- Modelo entrenado (CNN/logístico sobre features) desplegado en **TensorFlow Lite / Core ML / ONNX Runtime Mobile**, con *fallback* a template-matching.

**c) Detección de rasgueo (strumming)**
- **Detección de onsets** por flujo espectral / energía: cada ataque = un rasgueo.
- Dirección (down/up) es difícil solo por audio → se infiere del **patrón esperado + timing** (sabemos qué patrón se pide). Fase 2+ puede mejorar con features tímbricas.

**d) Evaluación de ritmo y precisión**
- Alinear los onsets detectados contra la **grilla del metrónomo/tempo del ejercicio**.
- Métricas: desviación temporal (adelantado/atrasado en ms), consistencia, % de golpes en ventana, y **score de precisión** combinando afinación + acierto de nota/acorde + timing.

### 3.4 Rendimiento y privacidad
- **DSP en la ruta caliente = código nativo** (AVAudioEngine/iOS, Oboe-AAudio/Android), *nunca* a través del puente JS. Buffers pequeños, baja latencia.
- **Todo el procesamiento de audio ocurre en el dispositivo.** El audio crudo del micrófono **no se sube a servidores.** → Esto es a la vez requisito técnico (latencia) y **argumento de venta y de confianza** (privacidad).
- Robustez ante ruido de fondo, micrófonos baratos y distintos tamaños de ukelele (calibración inicial + normalización).

---

## 4. Arquitectura de software (Arquitecto Full Stack)

### 4.1 Vista general (modular, escalable)

```
┌──────────────────────── APP MÓVIL (cliente) ───────────────────────┐
│  UI (Flutter/RN)  │  Estado  │  Motor de gamificación local        │
│         │                                                           │
│  ┌──────┴───────── NÚCLEO DE AUDIO (nativo/C++/Rust) ────────────┐  │
│  │  Captura mic → DSP (pitch, chroma, onsets) → Modelos ML       │  │
│  │  (TFLite/CoreML) → Evaluador (score, timing, precisión)       │  │
│  └───────────────────────────────────────────────────────────────┘ │
│         │ (solo eventos/metadatos, NUNCA audio crudo)               │
└─────────┼───────────────────────────────────────────────────────────┘
          │  HTTPS / WebSocket
┌─────────┴───────────────────── BACKEND ─────────────────────────────┐
│  API Gateway                                                        │
│  ├─ Servicio Identidad/Auth                                         │
│  ├─ Servicio Contenido/Currículo (headless CMS)                    │
│  ├─ Servicio Progreso/Gamificación (XP, rachas, logros, ligas)     │
│  ├─ Servicio Analítica/Eventos de práctica                         │
│  └─ Servicio Adaptativo/IA (repetición espaciada + LLM profesor)   │
│                                                                     │
│  Datos: PostgreSQL │ Redis (cache/leaderboards) │ Object Storage    │
│         │ Event store/warehouse (analítica)                         │
└─────────────────────────────────────────────────────────────────────┘
```

### 4.2 Principios
- **Monolito modular primero**, con límites de servicio claros → extraer microservicios solo cuando la escala lo exija (no sobre-ingeniería temprana).
- **Contenido como dato** (curriculum-as-content): lecciones/ejercicios como documentos estructurados versionados → los músicos autoran contenido sin desplegar código.
- **Offline-first** en el cliente: se puede practicar sin conexión; el progreso sincroniza al reconectar.
- **Contratos de API versionados**; feature flags para lanzar gradual.

---

## 5. Modelo de datos y estructura educativa

### 5.1 Jerarquía de contenido
```
Nivel (Level 0–4)
 └─ Curso (Course)
     └─ Unidad (Unit)
         └─ Lección (Lesson)
             └─ Ejercicio (Exercise)   ← unidad mínima evaluable
 Canción (Song)        ← transversal, asociada a nivel/skills
 Evaluación (Assessment/Checkpoint)  ← cierra unidad/curso
 Objetivo (Objective)  ← qué skill entrena cada pieza
```

### 5.2 Entidades núcleo (esquema conceptual)

- **User** (perfil, ukelele, mano dominante, objetivo diario, nivel, XP).
- **Skill** (átomo pedagógico: "acorde C", "cambio C↔Am", "island strum", "afinación") → base del motor adaptativo y de repetición espaciada.
- **Course / Unit / Lesson / Exercise** (contenido, objetivos, skills asociados, dificultad, tempo objetivo).
- **Song** (metadatos, licencia, acordes/tablatura, skills requeridos).
- **PracticeSession** (fecha, duración, ejercicio, métricas: precisión, timing, errores taxonomizados).
- **SkillMastery** (por usuario y skill: nivel de dominio, próxima revisión, historial).
- **Progress / Streak / XP / Achievement / Leaderboard**.
- **ErrorEvent** (taxonomía: cuerda muteada, presión insuficiente/buzz, acorde equivocado, adelantado/atrasado, tempo inconsistente).

Cada **ejercicio** declara: *objetivo, skills, tempo, patrón, criterio de aprobación (umbrales de precisión/ritmo), XP, condiciones de estrella (1–3)*.

---

## 6. Currículo de ukelele (Profesor de Ukelele)

Diseño pedagógico real, progresivo, orientado a "tocar canciones cuanto antes".

### **Nivel 0 — Fundamentos (Principiante absoluto)**
**Curso: Tu primer ukelele**
- Unidad 1 — *Conocé tu instrumento:* partes, cómo sostenerlo, postura, mano derecha/izquierda.
- Unidad 2 — *Afinación:* usar el afinador, GCEA, por qué el G reentrante. **(Primera victoria.)**
- Unidad 3 — *Tu primer sonido:* tocar cuerdas al aire, nombres de las cuerdas, tono limpio.
- Unidad 4 — *Primer rasgueo:* golpes hacia abajo, muñeca relajada, pulso constante con metrónomo.
- **Checkpoint:** tocar 4 golpes a tempo, cuerdas al aire.

### **Nivel 1 — Primeros acordes**
**Curso: Los 3 acordes mágicos (C, Am, F)**
- Acorde **C** (1 dedo) → Am → F, uno por unidad: forma, sonido limpio, evitar cuerdas muteadas.
- Unidad de **cambios:** C↔Am, luego Am↔F, luego el triángulo completo.
- **Canción hito:** una canción sencilla real solo con C, Am, F. *(Aha-moment: "¡estoy tocando una canción!")*
**Curso: Rasgueos básicos**
- Todo abajo → *down-up* → primer patrón (D DU).
- **Checkpoint:** canción con cambios a tempo lento.

### **Nivel 2 — Más acordes y ritmo (Principiante+)**
- **Curso: Nuevos acordes:** G, G7, C7, D, Em (D suele costar → ejercicios de remediación específicos).
- **Curso: Patrones de rasgueo:** *island strum* (D–DU–UDU), síncopa básica, muteo con la palma.
- **Curso: Cambios rápidos:** subir tempo progresivamente (el motor adaptativo empuja el BPM).
- **Canciones:** repertorio con progresión I–V–vi–IV.

### **Nivel 3 — Intermedio**
- **Curso: Fingerpicking:** arpegios, patrón tipo Travis, independencia de dedos.
- **Curso: Escalas y melodía:** escala de Do mayor, pentatónica, tocar melodías simples (evalúa afinación/nota).
- **Curso: Acordes con cejilla:** Bb, transición a barré, fuerza y limpieza.
- **Curso: Ritmos del mundo:** vals (3/4), reggae/offbeat, swing.

### **Nivel 4 — Intermedio+ / Tocar de verdad**
- **Curso: Teoría aplicada:** progresiones (I–IV–V, ii–V–I), círculo de quintas, transposición y capo.
- **Curso: Técnicas expresivas:** hammer-on, pull-off, slides, palm mute, dinámica.
- **Curso: Melodía + acompañamiento** (chord-melody básico).
- **Performance:** canciones completas, modo "show" sin ayudas, evaluación integral.

**Estructura de cada lección (patrón fijo):**
`Objetivo → Calentamiento → Enseñar (animación/video corto) → Práctica guiada con mic → Evaluación → XP + estrellas → (si falla) repetición del fragmento difícil.`

---

## 7. Gamificación y motivación

- **XP por ejercicio** = f(precisión, ritmo, dificultad, primera vez vs. repaso). Bonus por racha.
- **Nivel de usuario** (por XP acumulado) con celebración al subir.
- **Camino de aprendizaje** visual (Duolingo) con nodos y checkpoints.
- **Estrellas por lección (1–3)** según desempeño → incentiva volver a mejorar (mejor que "vidas/corazones" para música, que castigan al que practica).
- **Rachas diarias** + "congeladores" para no penalizar un día perdido.
- **Objetivo diario** configurable (5/10/20 min).
- **Logros/insignias:** primer acorde, primera canción, 7/30/100 días, lección perfecta, 10 canciones, "madrugador", "trasnochador".
- **Ligas semanales** (estilo Duolingo) — *opcional/Fase 4*, con moderación y opción de privado.
- **Estadísticas motivacionales:** heatmap de práctica, tendencia de precisión, acordes dominados.

Diseño ético: sin patrones oscuros; las notificaciones motivan, no acosan.

---

## 8. Motor adaptativo e IA — "profesor particular" (opcional pero diferenciador)

### 8.1 Capa de reglas + estadística (siempre activa)
- **Modelo de dominio por skill** (`SkillMastery`): éxito/fracaso ajusta el nivel de dominio.
- **Repetición espaciada (FSRS/SM-2)**: programa el repaso de acordes/cambios justo antes de que se olviden.
- **Dificultad adaptativa (IRT ligero):** si la tasa de acierto es alta → sube tempo / salta; si baja → inserta ejercicios de remediación.
- **Taxonomía de errores** alimentada por el motor de audio → detecta patrones ("siempre muteás la cuerda G en F", "te adelantás en el cambio").

### 8.2 Capa de IA generativa (LLM) — el "profe"
Recibe un **resumen estructurado de la sesión** (métricas + errores taxonomizados, *no* audio) y produce:
- **Explicación** de por qué ocurrió el error, en lenguaje cálido y claro.
- **Recomendación** de 1–3 ejercicios específicos.
- **Plan de práctica personalizado** semanal.
- **Retroalimentación** de fin de sesión ("Tu ritmo mejoró 12% esta semana; sigamos con los cambios F↔G").

Diseño: el LLM **orquesta y explica**, pero la *evaluación y las decisiones críticas* las toman reglas deterministas (predecible, barato, sin alucinaciones sobre "tocaste bien"). El LLM nunca juzga el audio directamente.

---

## 9. Herramientas complementarias

- **Afinador cromático:** grande, preciso (cents), con modo GCEA/DGBE y detección automática de cuerda.
- **Metrónomo:** BPM, compases (4/4, 3/4, 6/8), acento, patrones, y **modo "tempo trainer"** (acelera gradual).
- **Biblioteca de acordes:** diagrama + digitación animada + audio + variantes; búsqueda y "acordes de esta canción".
- **Repetición automática de fragmentos difíciles (looper):** el sistema detecta el compás fallado y lo aísla en bucle con tempo reducido hasta dominarlo.
- **Práctica libre:** tocá lo que quieras con afinador/metrónomo y feedback de afinación.

---

## 10. Stack tecnológico recomendado

> "La necesaria" → priorizo **velocidad de desarrollo de UI + potencia nativa donde importa (audio)**.

**Cliente móvil**
- **UI:** *Flutter* (excelente para UI animada custom, un solo código) — alternativa: React Native. *(Decisión abierta; ver §12.)*
- **Núcleo de audio/DSP:** **nativo** — AVAudioEngine (iOS) / Oboe-AAudio (Android). Lógica DSP compartida en **C++ o Rust**, expuesta vía FFI (Flutter) / módulos nativos (RN).
- **ML on-device:** TensorFlow Lite / Core ML / ONNX Runtime Mobile.
- **Estado/local:** almacenamiento offline + cola de sincronización.

**Backend**
- **API:** monolito modular en Node.js (NestJS) *o* Python (FastAPI) *o* Go. 
- **Auth:** proveedor gestionado (evitar construir identidad desde cero).
- **Base de datos:** **PostgreSQL** (usuarios, progreso, currículo) + **Redis** (cache, leaderboards, rachas) + almacenamiento de objetos (backing tracks, imágenes) + warehouse/eventos para analítica.
- **CMS de contenido:** headless (para que los profes autoren lecciones sin tocar código).
- **IA:** API de LLM para la capa "profesor" + servicio de reglas/repetición espaciada.

**Opción concreta lista para prototipar:** un backend sobre **Supabase** (Postgres + Auth + Storage + Realtime + Edge Functions) reduce muchísimo el tiempo al MVP. Escala bien para las primeras etapas y podés migrar piezas cuando haga falta. *(Tenés Supabase disponible como conector, así que puedo ayudarte a montar el esquema real cuando quieras.)*

**Transversal:** CI/CD, feature flags, analítica de producto, testing de accuracy de audio (banco de grabaciones etiquetadas), monitoreo, y privacidad by design (audio nunca sale del dispositivo).

---

## 11. Plan de desarrollo por fases (Roadmap)

### **Fase 0 — Descubrimiento y de-risking (crítico)**
- Personas, mapas de journey, sistema de diseño y **prototipo navegable** del reproductor de lección.
- **Spike de audio (lo más importante):** probar detección de nota + acorde restringido en condiciones reales (ukeleles baratos, ruido, distintos micrófonos). **Si el audio no funciona, nada funciona.** Definir umbrales de precisión aceptables.
- *Salida:* prototipo + prueba de viabilidad técnica del motor de audio.

### **Fase 1 — MVP (validar la propuesta central)**
- Núcleo de audio: **afinador + detección de nota + detección de acordes** (conjunto restringido).
- **Nivel 0 + inicio de Nivel 1** de contenido.
- Camino de aprendizaje, reproductor de lección, evaluación básica (estrellas + XP).
- Cuenta, progreso, racha básica. Offline-first.
- *Objetivo:* que Sofía toque su primera canción con 3 acordes y vuelva al día siguiente.

### **Fase 2 — Ritmo, herramientas y retención**
- **Detección de rasgueo + evaluación de ritmo.** Metrónomo, biblioteca de acordes, looper.
- Contenido Niveles 0–2 completos.
- Gamificación completa (logros, objetivos diarios, estadísticas, heatmap).

### **Fase 3 — Intermedio + adaptación**
- **Fingerpicking y detección de melodía/afinación.** Cejilla, escalas.
- **Biblioteca de canciones** (con licenciamiento — ver riesgos).
- **Motor adaptativo v1:** repetición espaciada + dificultad dinámica + taxonomía de errores.

### **Fase 4 — IA "profesor" + social**
- **Capa LLM:** feedback tipo profesor, explicaciones de errores, planes de práctica personalizados.
- Ligas/social, pulido, celebración, motion refinado.

### **Fase 5 — Escala y negocio**
- Monetización (freemium + suscripción), localización, optimización de performance, y canal B2B2C para profes.

---

## 12. Riesgos y decisiones abiertas

**Riesgos principales**
1. **Precisión del audio (riesgo #1).** Mitigación: spike en Fase 0, detección restringida, ML on-device, calibración por usuario.
2. **Latencia/robustez** en gama baja de dispositivos → DSP nativo, no puente JS.
3. **Licenciamiento de canciones populares** (derechos mecánicos/editoriales). Mitigación: arrancar con dominio público + originales + progresiones genéricas; licenciar hits en Fase 3.
4. **Autoría de contenido a escala** → invertir temprano en el pipeline/CMS.
5. **Retención tras la novedad** → gamificación ética + IA que da sensación de progreso real.

**Decisiones que necesito de vos para afinar el plan**
- **Flutter vs. React Native vs. nativo puro** (según tu equipo y prioridades de velocidad vs. control).
- **Plataforma inicial:** ¿iOS primero, Android primero, o ambos?
- **Presupuesto y tamaño de equipo** (define si el MVP es en meses o más).
- **¿Construir la IA "profe" desde el MVP o dejarla para Fase 4?** (Recomiendo Fase 4; el valor central está en la escucha.)

---

## 13. Monetización (breve)

**Freemium + suscripción:** camino gratuito con límites (lecciones diarias / cursos), **Premium** desbloquea todos los cursos, biblioteca completa de canciones, IA profesor y práctica ilimitada. Prueba gratis. Posible plan familiar y futuro canal para profesores.

---

---

*Este documento es el punto de partida vivo del producto. Cada sección puede convertirse en su propio documento de detalle (spec de audio, guía del sistema de diseño, backlog por fase, esquema de base de datos).*
