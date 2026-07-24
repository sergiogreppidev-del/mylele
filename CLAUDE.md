# CLAUDE.md

Guía para trabajar en este repo con Claude Code. El usuario (fundador) **no es técnico**: explicá en lenguaje claro, evitá jerga sin traducir, y no asumas que va a revisar el código línea por línea.

## Qué es MyLele

App web (futuro: app nativa Android) para **aprender ukelele jugando**. Escucha por el micrófono y evalúa en tiempo real afinación, notas, acordes y ritmo. Todo el audio se procesa **en el dispositivo** — nunca sale del navegador.

**Estado:** prototipo funcional en Vercel, motor de audio validado con datos reales, contenido en Supabase, rediseño arcade completo.

## Cómo está construido

Sitio estático puro: **sin build, sin dependencias, sin `npm install`**. Los `.js` son scripts clásicos (no `import`/`export`) que comparten alcance global y se cargan en un **orden fijo** en `index.html`:

```
config.js → content.js → audio-engine.js → core.js → tuner.js → chords.js → game.js → ui.js
```

| Archivo | Responsabilidad |
|---|---|
| `index.html` | Estructura de las 7 pantallas |
| `styles.css` | Sistema de diseño (tokens, botones caramelo, pantallas) |
| `config.js` | Notas, cuerdas GCEA, acordes y sus plantillas de detección |
| `content.js` | Carga de contenido (niveles/acordes) desde Supabase |
| `audio-engine.js` | **Motor de audio**: micrófono, pitch, cromagrama, detección de acordes |
| `core.js` | Bucle de análisis en tiempo real |
| `tuner.js` | Afinador guiado por cuerda |
| `chords.js` | Ejercicio de acordes + diagrama de digitación |
| `game.js` | Pista del juego, ritmo, metrónomo, calibración, acompañamiento |
| `ui.js` | Router de pantallas, permiso de micrófono, mapa de niveles |

Si agregás un archivo nuevo, sumalo a esta lista y a `index.html` respetando las dependencias de scope global.

> `audio-engine.js` está deliberadamente aislado: es la pieza que a futuro se reescribe en **C/C++** para la app nativa Android (Oboe/AAudio + NDK). El resto no se traduce — va en el lenguaje de UI de esa app nativa.

**Despliegue:** GitHub (`sergiogreppidev-del/mylele`) → Vercel, automático en cada push.
**En vivo:** https://mylele-phi.vercel.app/ · Requiere HTTPS (el micrófono lo exige).

**Editor de niveles** (repo hermano, proyecto de Vercel aparte, mismo Supabase):
`sergiogreppidev-del/mylele-editor` (privado) · https://mylele-editor-git-main-punto-gesell.vercel.app/
Carpeta local: `../mylele-editor`. Es donde se crean y publican los niveles.

## Flujo de trabajo

- **Subir cambios:** doble clic en `subir-a-github.bat` (pull + push, dispara redeploy en Vercel).
- **Probar en el celular:** abrir https://mylele-phi.vercel.app/ y hacer **refresh forzado** siempre — el navegador cachea los `.js`.
- **Probar en la compu:** el micrófono necesita contexto seguro; `index.html` con doble clic no alcanza. Levantar `python3 -m http.server` y entrar a `http://localhost:8000`.

## Decisiones técnicas ya validadas (no revisar sin motivo)

- **Detección restringida:** la app siempre sabe qué debería tocar el usuario, así que *verifica* contra 2–4 candidatos en vez de transcribir audio libre. Es el principio central de todo el motor de audio (web y, a futuro, Android).
- **Plantilla del acorde G** (`config.js`): exige su tercera (**B**) y baja el peso del **D** — sin esto el "D fantasma" del ukelele hacía que C se detectara como G (subió de 10/39 a 38/39 aciertos con datos reales). No tocar sin volver a medir contra grabaciones reales.
- **Afinador por cuerda, no cromático:** se fija la cuerda objetivo (G/C/E/A) y solo da verde en su nota correcta.
- **Latencia:** se calibra golpeando contra el metrónomo (mediana robusta). En Android puede dar ~300 ms y es normal.
- **Auriculares con cable, sin micrófono, obligatorios.** Los Bluetooth con mic fuerzan el micrófono del auricular y arruinan la detección. No hay fix por software.
- **Ventanas de acierto anchas** (±130 ms justo / ±240 ms cerca): sensación arcade, no exigencia de músico profesional.
- **Afinar antes de practicar acordes** — con una cuerda desafinada, la detección de acordes falla y parece un bug del algoritmo.
- El progreso se guarda en `localStorage` (`mylele_progress`), así que en ventana privada arranca de cero.

## Base de datos (Supabase)

Proyecto `mylele` · id `duvflmqbagnlhznuqjhr` · región São Paulo · `https://duvflmqbagnlhznuqjhr.supabase.co`

- **`chords`** — catálogo: `id` PK (`'C'`,`'Am'`,...), `name_es`, `frets[]` (por cuerda G,C,E,A), `fingers[]`, `pitch_classes[]`.
- **`songs`** — niveles: `id`, `slug`, `title`, `artist`, `level`, `bpm`, `time_sig`, `tuning`, `audio_path`, `is_free`, `duration_s`.
- **`charts`** — la partitura: `id`, `song_id`→`songs.id`, `mode` (`'chords'`|`'melody'`), `version`, `events` (jsonb), `published` (bool), único por (`song_id`,`mode`,`version`).
- **`admins`** — quién puede editar contenido desde el editor. Se toca **solo desde el SQL editor** de Supabase.

**Publicado vs. borrador:** un nivel puede tener varios charts, pero **solo uno publicado** por (`song_id`,`mode`) — lo garantiza el índice parcial `charts_one_published_per_mode`. La app de alumnos consulta con `charts!inner(...)&charts.published=is.true`, así que un chart en borrador no le llega nunca, y una canción sin chart publicado no aparece en el mapa de niveles. Para poner uno en vivo se usa la función `publish_chart(uuid)`, que baja el anterior y sube el nuevo en la misma transacción.

**Formato de `events`** — tiempos siempre en **beats** (no segundos): `t` = beat de inicio, `dur` = duración en beats.

- Modo **`melody`** (tablatura): `{"t":0,"string":"C","fret":0,"dur":1}`. `string` ∈ G/C/E/A, `fret` ≥ 0. El editor debe pedir cuerda+traste, nunca el nombre de la nota — la app calcula la nota sola.
- Modo **`chords`**: `{"t":0,"chord":"C","dur":1,"dir":"d"}`. `dir`: `"d"` abajo (default) | `"u"` arriba. `chord` debe existir en `chords`. La dirección de rasgueo **no se detecta por audio**, es guía visual.

**Seguridad actual:** RLS activo en las 4 tablas.
- **SELECT público** en `songs`, `charts` y `chords` — es lo que usa la app de alumnos, sin login.
- **INSERT/UPDATE/DELETE solo para admins**: las políticas exigen `public.is_admin()`, que devuelve true únicamente si el usuario logueado está en la tabla `admins`. Sin login no se puede escribir nada.
- `is_admin()` y `publish_chart()` son `security definer` con `search_path` fijo (necesario: una política sobre `admins` que consulta `admins` entraría en recursión infinita).

La `anon key` pública ya está en `content.js` (correcto, sin login es solo-lectura); **nunca** poner la `service_role` key en código cliente.

**Contenido cargado hoy:** 4 acordes (C, Am, F, G) y 5 niveles (`nivel-1-notas`, `nivel-2-arpegios`, `nivel-2-acordes`, `nivel-3-cambios`, `nivel-4-rasgueos`).

## Sistema de diseño

Estética "Casual Game / Pop Art", tropical y luminosa, nada de oscuro.

```
--ink:#3A2A63   --sky:#4FC9F5   --sun:#FFC42E
--melon:#FF5F7E --lime:#7FD94C  --grape:#A263FF
--cream:#FFF8E7 --paper:#FFFFFF --lock:#B9AFCE
```

- Tipografías: `Titan One` (display/arcade) + `Baloo 2` (interfaz).
- Firma visual: **botones caramelo** — contorno 3px tinta, extrusión 6px abajo, se hunden al presionar.
- Colores por acorde: C lima · Am uva · F sandía · G cielo.

Mantener esta paleta y tipografía en cualquier pantalla o herramienta nueva (incluido el futuro editor de niveles) para que se sienta parte del mismo producto.

## Documentación del proyecto

| Documento | Para qué |
|---|---|
| `MyLele_Estado_del_Proyecto.md` | Traspaso técnico completo: arquitectura, esquema de datos, decisiones validadas |
| `MyLele_Blueprint_Producto.md` | Estrategia de producto, UX, currículo pedagógico, roadmap por fases |
| `MyLele_Spec_Motor_Audio.md` | Plan del motor de audio nativo en C++ para Android (el salto post-web) |
| `MyLele_Editor_de_Niveles.md` | Brief de la app de autoría de contenido — construida en el repo hermano `mylele-editor` |

## Qué falta (próximos pasos conocidos)

- Pantalla de resultado al terminar un nivel (estrellas, celebración).
- Más niveles y acordes (D, Em, G7, C7…).
- Audio de acompañamiento grabado en Supabase Storage (hoy se sintetiza en el navegador).
- Editor de niveles: **fase 1 lista** (acordes) en el repo hermano `mylele-editor`. Falta el modo notas (tablatura) y el ABM de acordes.
- A futuro: app nativa Android con el motor de audio reescrito en C++.
