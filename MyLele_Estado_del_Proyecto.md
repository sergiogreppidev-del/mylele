# MyLele · Estado del proyecto
*Documento de traspaso — contexto para continuar en un chat nuevo*

---

## 1. Qué es MyLele

App web (futura app nativa Android) para **aprender ukelele jugando**. Escucha al usuario
**solo por el micrófono** y evalúa en tiempo real. Todo el procesamiento de audio ocurre
**en el dispositivo**: el audio crudo nunca sale del navegador.

**Estado actual:** prototipo funcional desplegado en Vercel, con motor de audio validado
sobre datos reales, contenido en Supabase y rediseño arcade completo.

---

## 2. Cómo está construido

Sitio estático (sin build, sin framework). Archivos en la raíz del repo:

| Archivo | Responsabilidad |
|---|---|
| `index.html` | Estructura de las 7 pantallas |
| `styles.css` | Sistema de diseño (tokens, botones caramelo, pantallas) |
| `config.js` | Notas, cuerdas GCEA, acordes y sus plantillas |
| `content.js` | Carga de contenido desde Supabase |
| `audio-engine.js` | **Motor de audio** (micrófono, tono, cromagrama, acordes) |
| `core.js` | Bucle de análisis en tiempo real |
| `tuner.js` | Afinador guiado por cuerda |
| `chords.js` | Ejercicio de acordes + diagrama de digitación |
| `game.js` | Pista del juego, ritmo, metrónomo, calibración, acompañamiento |
| `ui.js` | Router de pantallas, permiso de micrófono, mapa de niveles |

Se cargan como scripts clásicos **en ese orden** (comparten alcance global; no usan `import/export`).

> `audio-engine.js` está deliberadamente aislado: es la pieza que el día de mañana se
> reescribe en **C/C++** para la app nativa Android (Oboe/AAudio + NDK). El resto no se
> traduce a C: va en el lenguaje de UI de la app nativa.

**Despliegue:** GitHub → Vercel (deploy automático en cada push). Requiere HTTPS por el micrófono.

---

## 3. Decisiones técnicas ya validadas (no revisar sin motivo)

- **Detección restringida:** la app siempre sabe qué deberías tocar, así que *verifica*
  contra 2–4 candidatos en vez de transcribir audio libre. Es lo que hace viable todo.
- **Plantilla del acorde G:** exige su tercera (**B**) y baja el peso del **D**. Sin esto,
  el "D fantasma" que resuena en el ukelele hacía que la C se detectara como G
  (subió de 10/39 a 38/39 aciertos con datos reales).
- **Afinador por cuerda:** no es cromático. Se fija la cuerda objetivo (G/C/E/A) y solo
  se pone verde en su nota correcta. Antes daba "afinado" con la cuerda equivocada.
- **Latencia:** se calibra con golpes contra el metrónomo y se compensa (mediana robusta).
  En Android web puede ser alta (se midió ~300 ms) y es normal.
- **Auriculares con cable:** necesarios. Los Bluetooth con micrófono fuerzan el mic del
  auricular y arruinan la detección.
- **Ventanas de acierto anchas** (±130 ms justo / ±240 ms cerca): sensación arcade, no
  exigencia de músico profesional.

---

## 4. Base de datos (Supabase)

**Proyecto:** `mylele` · id `duvflmqbagnlhznuqjhr` · región São Paulo
**URL:** `https://duvflmqbagnlhznuqjhr.supabase.co`

### `chords` — catálogo de acordes
| columna | tipo | nota |
|---|---|---|
| `id` | text PK | `'C'`, `'Am'`, `'F'`, `'G'` |
| `name_es` | text | `'Do mayor'` |
| `frets` | smallint[] | traste por cuerda **[G,C,E,A]**, 0 = al aire |
| `fingers` | smallint[] | dedo por cuerda (1 índice, 2 mayor, 3 anular) |
| `pitch_classes` | smallint[] | notas del acorde (0=C … 11=B) |

### `songs` — niveles / canciones
`id` uuid · `slug` text único · `title` · `artist` · `level` smallint · `bpm` numeric ·
`time_sig` (`'4/4'`) · `tuning` (`'GCEA'`) · `audio_path` (nullable) · `is_free` bool · `duration_s`

### `charts` — la partitura del juego
`id` uuid · `song_id` → `songs.id` (on delete cascade) · `mode` (`'chords'` | `'melody'`) ·
`version` int · `events` **jsonb** · único por (`song_id`,`mode`,`version`)

**Formato de `events`** — tiempos en **beats**, no en segundos (independiente del BPM):
```json
[{"t":0,"chord":"C","dur":4},{"t":4,"chord":"Am","dur":4}]        // mode: chords
[{"t":0,"note":"C","dur":2},{"t":2,"note":"E","dur":2}]           // mode: melody
```

### Seguridad actual
RLS activo en las tres tablas. **Solo hay políticas de SELECT públicas.**
No existen políticas de INSERT/UPDATE/DELETE → hoy el contenido es de solo lectura
desde el cliente. Escribir requiere agregar autenticación y políticas de administrador.

### Contenido cargado
4 acordes (C, Am, F, G) y 4 niveles: `nivel-1-notas` (melody, 70 BPM),
`nivel-2-acordes` (80), `nivel-3-cambios` (80), `nivel-4-rasgueos` (84).

---

## 5. Sistema de diseño (para mantener coherencia)

Estética **"Casual Game / Pop Art"**, tropical y luminosa. Nada de oscuro.

```
--ink:#3A2A63   --sky:#4FC9F5   --sun:#FFC42E
--melon:#FF5F7E --lime:#7FD94C  --grape:#A263FF
--cream:#FFF8E7 --paper:#FFFFFF --lock:#B9AFCE
```

- **Tipografías:** `Titan One` (display/arcade) + `Baloo 2` (interfaz, 500–800).
- **Firma:** botones caramelo — contorno de 3px color tinta, extrusión de 6px abajo,
  se hunden al presionar (`translateY` + sombra corta).
- **Fondo:** rayos de sol girando + trama de puntos pop art.
- Colores por acorde: C lima · Am uva · F sandía · G cielo.

---

## 6. Flujo de la app

```
Inicio (JUGAR grande + Afinar/Calibrar chicos)
   └─ Modo: Notas · Acordes · Práctica libre
        └─ Mapa de niveles (desbloqueo progresivo + estrellas)
             └─ Juego (pista horizontal, acordes como barra vertical)
```

El micrófono se pide al primer toque. El progreso (estrellas por nivel) se guarda
en el dispositivo con `localStorage` bajo la clave `mylele_progress`.

---

## 7. Qué falta / próximos pasos

- Pantalla de resultado al terminar un nivel (estrellas, celebración).
- Más niveles y acordes (D, Em, G7, C7…).
- Audio de acompañamiento grabado en Supabase Storage (hoy es sintetizado en el navegador).
- **Editor de niveles** ← documento aparte.
- A futuro: app nativa Android con el motor de audio en C.
