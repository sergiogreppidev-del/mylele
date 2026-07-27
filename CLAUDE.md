# CLAUDE.md

Guía para trabajar en MyLele con Claude Code. El usuario (fundador) **no es técnico**:
explicá en lenguaje claro, evitá jerga sin traducir, y no asumas que va a revisar el
código línea por línea.

## Qué es MyLele

App para **aprender ukelele jugando**. Escucha por el micrófono y evalúa en tiempo real
afinación, notas, acordes y ritmo. Todo el audio se procesa **en el dispositivo**.

## Las tres piezas, y dónde vive cada una

| Pieza | Carpeta | Qué es |
|---|---|---|
| **App de alumnos** | `../mylele-android` | Android nativo: Flutter + motor de audio en C++. **Es la app.** |
| **Editor de niveles** | `../mylele-editor` | React + Vite + TS. Donde se crea y publica el contenido |
| **Este repo** | acá | Documentación del producto y herramientas de contenido |

Los tres comparten **la misma base de datos** de Supabase, así que un cambio de esquema
toca a los tres.

> Los otros dos repos tienen **su propio `CLAUDE.md`** con las trampas específicas de
> cada uno. Si vas a tocar el editor o el motor, leelos: la mayoría de los errores que
> tuvieron vivían en lugares que desde acá no se ven.

### Qué hay en este repo

- **`MyLele_Plan_Progresion.md`** — el plan vivo: cómo se aprende, los talleres de cada
  acorde, las fases pendientes. Es el que hay que leer para saber qué sigue.
- `MyLele_Plan_Android.md` — el plan de conversión a Android, por fases.
- `MyLele_Spec_Motor_Audio.md` — el diseño del motor de audio en C++.
- `MyLele_Blueprint_Producto.md` — estrategia de producto, UX, currículo.
- `MyLele_Editor_de_Niveles.md` — el brief del editor.
- `MyLele_Estado_del_Proyecto.md` — traspaso técnico.
- **`tools/`** — genera las canciones de práctica (las cuatro capas) y el SQL para
  cargarlas. Ver su propio encabezado: usa la misma notación que el editor le pide a la IA.

> ⚠️ Los documentos que describen la **etapa web** (`Estado_del_Proyecto`, `Spec_Motor_Audio`,
> `Blueprint`) se escribieron cuando la app de alumnos era un sitio estático. El diseño y
> las decisiones de audio siguen valiendo —el motor C++ es un port fiel— pero **los
> caminos de archivo y la arquitectura de esos textos ya no existen.** Leelos como
> historia y diseño, no como mapa del código.

## La app web de alumnos se eliminó

Era un sitio estático (`index.html` + `.js` sueltos) desplegado en Vercel. **Cumplió su
propósito de spike**: sirvió para validar que la detección restringida funciona, para
calibrar los acordes contra grabaciones reales y para probar el diseño arcade. Todo eso
ya está portado a la app Android, que es la que se usa.

Se borró el 27/07/2026. **Está entera en el historial de git** si alguna vez hace falta
mirar cómo hacía algo el original.

Lo que quedó de ella, portado y mejorado:

- `audio-engine.js` → `mylele-android/engine/src/main/cpp/` (C++ con Oboe/AAudio)
- `game.js` → `flutter_app/lib/game/` y `mylele-editor/src/lib/previewAudio.ts`
- las plantillas de acordes calibradas → tabla `chords` de Supabase

## Base de datos (Supabase)

Proyecto `mylele` · id `duvflmqbagnlhznuqjhr` · región São Paulo

- **`chords`** — catálogo: `id` PK (`'C'`,`'Am'`,…), `name_es`, `frets[]` (por cuerda
  G,C,E,A), `fingers[]`, `pitch_classes[]`, `weights[]`, `sort_order`.
- **`songs`** — niveles: `slug`, `title`, `bpm`, `time_sig`, `pickup_beats`, `orden`,
  `etapa`, `teaches_chord`, `step_kind`, `draft` (jsonb).
- **`charts`** — la partitura: `song_id`, `mode` (`'chords'`|`'melody'`|`'backing'`),
  `difficulty`, `version`, `events` (jsonb), `published`.
- **`admins`** — quién puede editar. Se toca **solo desde el SQL editor** de Supabase.

**Publicado vs. borrador:** solo un chart publicado por (`song_id`,`mode`) — lo garantiza
el índice parcial `charts_one_published_per_mode`. La app de alumnos consulta con
`charts!inner(...)&charts.published=is.true`, así que **una canción sin ningún chart
publicado no aparece en el mapa**. Es lo que permite cargar contenido y probarlo antes de
mostrarlo. Para publicar se usa `publish_chart(uuid)`.

**Seguridad:** RLS en las cuatro tablas. SELECT público en `songs`, `charts` y `chords`;
escritura solo para quien esté en `admins`. La `anon key` pública va en el cliente (sin
login es solo-lectura); la `service_role` **nunca**. La clave de la IA vive como secreto
de la función `generar-nivel`, no en el navegador.

### Formato de `events` — tiempos siempre en **beats**, no en segundos

- Modo **`chords`**: `{"t":0,"chord":"C","dur":1,"dir":"d"}`. `dir`: `"d"` abajo (default)
  | `"u"` arriba. La dirección **no se detecta por audio**, es guía visual.

> ⚠️ **Cada evento es UN RASGUEO y `dur` es cuánto lo dejás sonar.**
> `{"chord":"C","dur":2}` es un golpe que dura dos tiempos, **no** dos golpes de uno.
> Suena obvio escrito así, pero el contenido se cargó con la lectura contraria y se
> escuchaba: el final de Estrellita pide un Do sostenido y el juego mostraba dos Do
> seguidos, así que había que cortar el acorde justo donde la canción respira.
>
> De ahí sale la regla de escritura: **el rasgueo sigue el ritmo de la melodía.** Donde
> la melodía se mueve, se rasguea; donde sostiene, el acorde se sostiene con ella. Los
> silencios valen. Lo que limita la etapa Fácil es cada cuánto **cambia** el acorde y que
> todos los golpes vayan hacia abajo — no cuántos golpes hay, porque rasguear más no le
> agrega trabajo a la mano que forma el acorde.

- Modo **`melody`** (tablatura): `{"t":0,"string":"C","fret":0,"dur":1}`. El editor pide
  cuerda+traste, nunca el nombre de la nota — la app calcula la nota sola.
- Modo **`backing`**: `{"t":0,"pitch":"G4","dur":0.5,"v":"lead"}`. Es la música que
  **reproduce la app**, no la toca el alumno: por eso guarda la altura y no la digitación.
  `v` es el rol — `'lead'` (melodía), `'bass'`, `'acomp'` — y sin eso todas las voces
  suenan iguales y la melodía queda enterrada.

> **La música no tiene límite de dificultad; el chart que toca el alumno sí.** Son cosas
> distintas y no hay que simplificar una por la otra.
>
> ⚠️ Una canción puede tener **varios charts**. **Nunca agarrar `charts[0]`**: el orden
> que devuelve PostgREST no está garantizado — se comprobó que devuelve `backing` antes
> que `chords`.

## Decisiones validadas (no revisar sin motivo)

- **Detección restringida.** La app siempre sabe qué debería tocar el alumno, así que
  **verifica contra 2–4 candidatos** en vez de transcribir audio libre. Es el principio
  central del motor y lo que hace el problema resoluble. Se implementa en dos lugares:
  `setExpected()` (qué acorde toca ahora) y el **vocabulario por nivel**
  (`flutter_app/lib/content/vocabulario.dart`).
- **Un acorde nuevo le roba detecciones a los viejos.** Medido: sumar Dm, Em, G7 y D7 con
  pesos teóricos tiraba el G de 98,8 % a 71,4 %, porque **G7 contiene las tres notas del
  G más una**. Se arregla con dos palancas juntas: calibrar los pesos y **cargar por
  nivel solo los acordes que la canción usa**. Con las dos, ocho acordes rinden 96,3 %,
  mejor que el 96,1 % que daban cuatro. El detalle está en `mylele-android/testbank/README.md`.
- **La plantilla de un acorde NO refleja la teoría musical, refleja lo que el instrumento
  produce.** Es la lección de las tres calibraciones que hay, y es contraintuitiva:
  - **G** `{1.0, 1.6, 0.5}` — exige su tercera (**B**) y baja el peso del **D**. Sin esto
    el "D fantasma" del sol reentrante hacía que C se detectara como G.
  - **F** `{0.8, 1.2, 0.7}` — subirle el peso a la fundamental lo **empeora**.
  - **G7** `{1.7, 1.7, 0.3, 1.5}` — le hunde el **re**, que es lo que comparte con el G,
    y le sostiene el **fa**, que es lo que lo define.

  **No tocar ninguna sin volver a correr el banco de pruebas** (`mylele-android/testbank`,
  2.415 clips).
- **Afinador por cuerda, no cromático.** Se fija la cuerda objetivo y solo da verde en su
  nota correcta.
- **Auriculares con cable, sin micrófono, obligatorios.** Los Bluetooth con mic fuerzan el
  micrófono del auricular y arruinan la detección. No hay arreglo por software.
- **Ventanas de acierto anchas** (±130 ms justo / ±240 ms cerca): sensación arcade, no
  exigencia de músico profesional.
- **Afinar antes de practicar acordes** — con una cuerda desafinada la detección falla y
  parece un bug del algoritmo.

## Sistema de diseño

Estética "Casual Game / Pop Art", tropical y luminosa, nada de oscuro.

```
--ink:#3A2A63   --sky:#4FC9F5   --sun:#FFC42E
--melon:#FF5F7E --lime:#7FD94C  --grape:#A263FF
--cream:#FFF8E7 --paper:#FFFFFF --lock:#B9AFCE
```

- Tipografías: `Titan One` (display/arcade) + `Baloo 2` (interfaz).
- Firma visual: **botones caramelo** — contorno 3px tinta, extrusión 6px abajo, se hunden
  al presionar.
- Colores por acorde: C lima · Am uva · F sandía · G cielo.

Mantener paleta y tipografía en cualquier pantalla nueva, en la app y en el editor, para
que se sienta parte del mismo producto.

## Qué falta (próximos pasos conocidos)

Lo detallado está en `MyLele_Plan_Progresion.md`. Lo grande:

- **Conectar el mapa de niveles a `Ruta`.** Hoy `levels_page` lee la lista de canciones
  directa, así que los talleres no se agrupan y la pantalla de presentación de un acorde
  —que es sintética, la genera `Ruta`— no aparece nunca. **Bloquea todo el contenido de
  talleres.**
- Contenido de los talleres de los ocho acordes (hoy no hay ninguno).
- Probar con ukelele real Dm, Em, G7 y D7: sus pesos salieron de 6 clips armados por
  acorde, contra 19–25 de cada acorde viejo.
- Una canción no se detiene sola al terminar.
