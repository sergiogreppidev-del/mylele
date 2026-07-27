# MyLele · Plan de progresión por acordes

Documento de diseño y plan de obra. Estado: **propuesta, sin implementar**.
Escrito el 26/07/2026, revisado el mismo día con las definiciones del fundador.

Hermano de `MyLele_Plan_Android.md`. Toca **tres lugares**: la base de datos, la app de
Android (`C:\Users\Sergio\Proyectos\mylele-android`) y el editor de niveles
(`../mylele-editor`).

---

## 1. Qué se quiere

Hoy los acordes aparecerían sin presentación: se pasa de un nivel al siguiente y en algún
momento hay un acorde que nunca nadie explicó. Se quiere que **cada acorde nuevo tenga
su propio recorrido de entrada** antes de mezclarse con el resto: presentarlo,
practicarlo solo, rasguearlo, cambiarlo contra los que ya se saben, y recién ahí
soltarlo al mundo.

La referencia es Yousician, pero no se copia: allá el recorrido es una lista larga y
plana de lecciones. Acá se propone algo más chico y más legible, aprovechando el mapa de
niveles que ya existe.

---

## 2. Punto de partida: base limpia

**Los 5 niveles que hay en Supabase son de prueba y se borran.** Sirvieron para validar
el motor y ya cumplieron. Esto simplifica el plan de manera importante:

- No hay que rellenar columnas nuevas en contenido viejo.
- No hay progreso de alumnos que preservar.
- **El orden de la ruta se diseña de cero**, sin acomodarse a lo que ya existía.

> **Cuándo borrarlos:** en la Fase 6, junto con la carga del primer taller — no antes.
> Con la base vacía la app muestra *«No pude cargar el contenido. Revisá la conexión»*,
> que además de dejarla inservible **miente**: no es un problema de conexión. Conviene
> arreglar ese mensaje (`content_repo.dart` devuelve el mismo `false` para «no hay red»
> y para «no hay contenido»), pero no hay apuro mientras haya niveles cargados.

**Se arranca solo con acordes**, que es lo más divertido y lo más usual del ukelele. El
punteo queda para más adelante, y el modelo de datos tiene que dejarle lugar sin
rehacerse — ver la sección 5.

---

## 3. Las etapas y el orden de los acordes

### 3.1 Etapa Fácil: los cuatro que ya están

**C · Am · F · G**, en ese orden. No es una elección de gusto: sale de los datos.

| Orden | Acorde | Digitación (G,C,E,A) | Dedos |
|---|---|---|---|
| 1 | **C** · Do mayor | `[0,0,0,3]` | 1 |
| 2 | **Am** · La menor | `[2,0,0,0]` | 1 |
| 3 | **F** · Fa mayor | `[2,0,1,0]` | 2 |
| 4 | **G** · Sol mayor | `[0,2,3,2]` | 3 |

Tres razones, y la tercera es la que más vale:

1. **Por cantidad de dedos**: 1, 1, 2, 3. Es exactamente el `sort_order` que ya tiene el
   catálogo (10, 20, 30, 40), así que el orden pedagógico ya estaba escrito en la base
   sin que nadie lo llamara así.
2. **Por lo que abren**: C, Am, F y G son I–vi–IV–V. Con esos cuatro se toca una
   cantidad enorme de música popular. El alumno termina la etapa Fácil pudiendo tocar
   canciones de verdad, no ejercicios.
3. **Am → F es «agregá un dedo».** Mirando las digitaciones: Am es `[2,0,0,0]` y F es
   `[2,0,1,0]` — **F es Am con un dedo más**. El primer cambio de acorde que aprende el
   alumno no le pide soltar y rearmar: le pide sostener lo que ya tiene y sumar. Es el
   mejor primer cambio posible y estaba ahí, en los datos, sin que nadie lo aprovechara.

G va último porque es el más difícil de las dos maneras: tres dedos, y es el que necesitó
la calibración de detección más delicada (`{1.0, 1.6, 0.5}`, por el «D fantasma» del sol
reentrante).

### 3.2 Etapa Media: los cuatro siguientes

Cuatro acordes más, con el mismo criterio —pocos dedos primero, y preferir los que estén
«a un dedo» de algo ya sabido—:

| Orden | Acorde | Digitación propuesta | Dedos | Por qué acá |
|---|---|---|---|---|
| 5 | **A** · La mayor | `[2,1,0,0]` | 2 | Más fácil que G. Comparte el 2.º traste de la cuerda G con Am y F |
| 6 | **G7** · Sol séptima | `[0,2,1,2]` | 3 | Es el G que ya sabe con un dedo corrido. Abre el blues y las cadencias |
| 7 | **Em** · Mi menor | `[0,4,3,2]` | 3 | Estira la mano. Abre las tonalidades menores |
| 8 | **D** · Re mayor | `[2,2,2,0]` | 3 | Tres dedos apretados en el mismo traste. El más incómodo del ukelele |

Digitaciones **confirmadas por el fundador** el 26/07/2026. Falta cargarlas en el editor;
los pesos de detección de cada una son otra historia — ver 3.3.

### 3.3 El freno real de la etapa Media (leer esto antes de planificar fechas)

**El motor de audio solo está calibrado para C, Am, F y G.** Los pesos de detección se
midieron contra grabaciones reales, y las dos calibraciones que existen dieron resultados
contraintuitivos: en las dos, la fundamental pesa *menos* que otra nota. Subirle el peso
al fa **empeora** la detección del F.

O sea: **cada acorde nuevo de la etapa Media no es trabajo de contenido, es trabajo de
audio.** Hay que grabar ese acorde con ukelele real, correr el banco de pruebas de
`mylele-android/testbank`, y ajustar los pesos hasta que la detección sea confiable. Sin
eso, un alumno toca bien y la app le dice que no — que es la peor cosa que le puede pasar
a una app de aprendizaje.

La etapa Fácil no tiene ese problema: sus cuatro acordes ya están medidos.

### 3.4 Etapa Difícil

Sin definir. Cuando llegue, probablemente sea menos «más acordes» y más «acordes con
cejilla» (Bb, Bm), que es un salto físico distinto. Se decide cuando la Media esté andando.

---

## 4. El diseño: **talleres**

Un **taller** es el recorrido de entrada de un acorde. El mapa de niveles es una fila con
dos clases de nodo:

```
 ┌───────────────────────┐
 │  TALLER · acorde F    │   ← un bloque, visualmente distinto
 │   ① presentación      │
 │   ② F solo            │
 │   ③ F con rasgueo     │
 │   ④ cambios F ↔ C, Am │   (solo si no es el primer acorde)
 │   ⑤ desafío           │   (solo si no es el primer acorde)
 └───────────────────────┘
  ●  Nivel normal ← ya puede usar F
  ●  Nivel normal
 ┌───────────────────────┐
 │  TALLER · acorde G    │
 └───────────────────────┘
```

### 4.1 Los cinco pasos

| Paso | Qué es | Quién lo crea |
|---|---|---|
| ① Presentación | Diagrama, nombre, dónde van los dedos, botón para escucharlo, y **sostenerlo 3 segundos** para pasar | **La genera la app** |
| ② Aislado | El acorde solo, lento, una pulsación por tiempo | Chart normal |
| ③ Rasgueo | El mismo acorde con un patrón de rasgueo | Chart normal |
| ④ Cambios | El acorde nuevo alternando con los ya aprendidos | Chart normal |
| ⑤ Desafío | Una canción corta que lo usa de verdad | Chart normal |

**La presentación NO se autorea, se genera.** Todo lo que necesita ya está en la tabla
`chords`: `frets`, `fingers`, `name_es`, `pitch_classes`. Generarla tiene tres ventajas
que se pagan solas: no hay trabajo de contenido por acorde, no se puede quedar vieja
cuando se corrige una digitación, y un acorde nuevo cargado desde el editor **ya trae su
presentación** sin que nadie haga nada.

Los pasos ② a ⑤ son charts `chords` comunes. **No hace falta ningún formato nuevo.**

### 4.2 Cómo se ve la presentación

Es la pantalla donde el alumno **conoce** el acorde. Si se siente pobre, todo el taller se
siente pobre — y es la única pantalla del recorrido que no es un ejercicio, así que es la
que más margen tiene para estar linda.

Va en cuatro momentos, cada uno con su gesto. No es una ficha con datos: es una
presentación.

**① La revelación.** Entra el nombre grande —`ArcadeTitle`, Titan One con contorno de
tinta— y debajo el nombre en español en una `HintPill`. El diagrama aparece con `PopIn`
(crece con rebote). Un puñado de chispas de la paleta acompaña la entrada, reusando
`TapSparks`. Suena `Sfx.confirm`.

**② Dónde van los dedos.** Los dedos **no aparecen todos juntos**: se encienden de a uno,
igual que las estrellas del resultado, con unos 350 ms entre cada uno y su sonido. Ver
aparecer el dedo 1, después el 2, después el 3 es la instrucción misma — un diagrama
completo de golpe hay que descifrarlo, uno que se arma solo se entiende.

**③ Escuchalo.** Un `CandyButton` **«🔊 Escuchar»** que toca el acorde arpegiado, cuerda
por cuerda, y después junto. Mientras suena, cada cuerda del diagrama se ilumina en su
turno. Esto necesita una función nueva del motor (ver 4.2.2).

**④ Probalo vos.** Un `CandyButton` **«🎸 Me sale»** abre el medidor: sostené el acorde 3
segundos. El diagrama se pone lima y la barra —la misma `LoadingBar` del arranque— se
llena mientras la detección aguanta; si se pierde, retrocede en vez de reiniciarse de
golpe. Al completarse: chispas, `Sfx.fanfare` y el paso queda hecho.

> **No puede ser un muro.** Un principiante puede tardar días en que le suene limpio el
> G. A los 30 segundos sin lograrlo aparece un `GhostButton` **«Seguir igual»**: el paso
> se marca hecho sin estrella. La app es para que no abandone, no para tener razón.

#### 4.2.1 El diagrama de acorde es la pieza visual del proyecto

**No existe todavía en la app de Android.** Es trabajo nuevo, y es la ilustración más
importante de toda la función: se va a ver en la presentación, en la práctica libre y —a
futuro— como ayuda dentro del juego.

Especificación, con el mismo lenguaje que el resto:

- Mástil en `--paper` con contorno de tinta de 3 px, esquinas redondeadas y la extrusión
  de 6 px hacia abajo, igual que el botón caramelo. **Es una tarjeta caramelo, no un
  gráfico técnico.**
- Cejuela (la barra de arriba) gruesa, en tinta.
- Cuatro cuerdas verticales G · C · E · A rotuladas en Titan One.
- Cuatro trastes visibles. Alcanzan para todo lo de las etapas Fácil y Media.
- **Un color por dedo, fijo en toda la app**: 1 = cielo, 2 = sandía, 3 = lima, 4 = uva.
  Círculo con contorno de tinta y el número adentro en Titan One. Que el dedo 2 sea
  siempre sandía, en toda la app y para siempre, es lo que convierte el diagrama en un
  idioma en vez de un dibujo.
- Cuerda al aire: un `○` sobre la cejuela.

> ⚠️ **El editor ya tiene su propio diagrama** (`ChordDiagram.tsx`, en React). Van a ser
> dos dibujos del mismo objeto en dos lenguajes, y si divergen, el alumno ve una cosa y
> el autor otra. Es exactamente la trampa que ya apareció con el ukelele de la portada y
> el del ícono, y que se resolvió haciendo que los dos salieran de la misma función.
> Acá no se puede compartir código entre Dart y TypeScript: **lo que hay que compartir es
> la especificación**, y este documento es esa especificación. Cualquier cambio de estilo
> se hace en los dos.

#### 4.2.2 Escuchar el acorde: dos funciones nuevas del motor

La Fase 4 pasa a tener dos entregas, no una:

- `mylele_read_chord()` — qué acorde se escucha ahora, con confianza y estabilidad.
  Necesario para el momento ④.
- `mylele_play_chord()` — tocá estas cuatro notas, arpegiadas o juntas. Necesario para el
  momento ③.

La segunda es la más barata de las dos: el motor **ya sintetiza notas** (`voice_synth.h`,
que es lo que toca el acompañamiento). Solo falta poder pedírselo desde afuera de un
nivel.

> Se toca por el motor y no con un `.wav` grabado por acorde a propósito: un archivo por
> acorde es un archivo que hay que crear cada vez que se carga un acorde nuevo desde el
> editor, y la presentación dejaría de ser gratis — que es justo lo que la hace valer.

### 4.3 Reglas visuales para todo lo nuevo

Para que ninguna pantalla del taller se sienta ajena, todo lo que se agregue usa lo que ya
existe: `PopScaffold` (fondo pop y barra), `ArcadeTitle` (títulos con contorno),
`HintPill` (texto suelto sobre el celeste), `CandyButton` / `GhostButton`, `PopIn` para
las entradas escalonadas, `Pulse` y `PulseRing` para lo que late, `LoadingBar` para
cualquier progreso.

Y las dos reglas técnicas que ya se pagaron caro y están en el README de la app:

- **Nunca animar el `transform` de un botón** — se pierde el hundido al presionar, que es
  la respuesta al toque.
- **Nada se anima en una pantalla tapada**, y ningún fondo nuevo por pantalla. En esta app
  una interfaz lenta no se ve fea: **se escucha**, porque el hilo de audio se queda sin
  CPU y la música suena rota.

### 4.4 Los pasos mecánicos los genera el editor

② y ③ son mecánicos: el mismo acorde repetido, con o sin patrón de rasgueo. Escribirlos a
mano por cada acorde es trabajo tonto y desparejo.

**Propuesta:** el editor tiene un botón **«Crear taller para el acorde X»** que genera los
cuatro charts como **borradores**, y la persona revisa y publica. ④ y ⑤ salen del pedido a
la IA que ya existe, con una receta propia por tipo de paso.

Así se gana lo mejor de las dos cosas: cero trabajo repetitivo, y **una sola cañería de
contenido** — todo sigue siendo un chart en la base, revisable y publicable como cualquier
otro. Nada se genera dentro de la app salvo la presentación, que no es un chart.

### 4.5 Qué acordes «sabe» el alumno

**Se deduce, no se guarda.** Un acorde está aprendido si su taller está terminado. El
progreso sigue siendo `slug → estrellas` y nada más.

Que sea derivado importa: si fuera un dato aparte, tarde o temprano diría algo distinto
del progreso real y no habría forma de saber cuál de los dos miente.

### 4.6 El desbloqueo no cambia de idea

Sigue siendo lineal: un paso se abre cuando termina el anterior. Lo único que cambia es
que la lista ahora incluye los pasos de los talleres. `desbloqueado()` se queda como está.

---

## 5. Un solo camino, con lugar para el punteo

**Decidido:** una sola ruta ordenada, no dos mapas paralelos.

Hoy el código parte el contenido en dos caminos independientes por modo de chart
(`songsForMode`), y la pantalla «¿Qué practicamos?» elige entre ellos. Con base limpia y
solo acordes, esa división **no tiene nada que dividir**, y mantenerla sería construir hoy
el problema de mañana: con dos caminos, meter punteo después obliga a decidir cómo se
cruzan dos progresiones que nunca se hablaron.

**La ruta es una lista ordenada de nodos y no le importa el modo del chart.** Un nivel de
punteo es un nodo más, que se inserta donde corresponda el día que exista. Eso es todo lo
que hace falta para «dejarlo preparado» — y no cuesta nada, porque es *menos* código que
lo que hay hoy.

Consecuencias en la interfaz:

- **«¿Qué practicamos?» desaparece por ahora.** JUGAR lleva directo al mapa. Cuando entre
  el punteo se verá si vuelve como filtro o si la ruta única alcanza.
- **Se libera lugar para «Práctica libre»** en el inicio, como en la web: repasar acordes
  sin reloj. Es la misma pantalla que la presentación del taller, sin el candado.

> Cuando entre el punteo, un «taller de técnica» necesitaría una columna nueva
> (`teaches_skill`). **No se agrega ahora**: es una migración de cinco minutos el día que
> haga falta, y una columna vacía inventada para un futuro imaginado es exactamente cómo
> se pudre un esquema.

---

## 6. Qué cambia en cada lugar

### 6.1 Base de datos

```sql
alter table songs add column teaches_chord text references chords(id);
alter table songs add column step_kind text not null default 'normal'
  check (step_kind in ('normal','aislado','rasgueo','cambios','desafio'));
alter table songs add column orden int;
alter table songs add column etapa text not null default 'facil'
  check (etapa in ('facil','media','dificil'));
```

- `teaches_chord` — de qué taller es este paso. `null` = nivel normal.
- `step_kind` — qué clase de paso es. Decide el rótulo, el ícono y la receta de la IA.
- `orden` — el lugar en la ruta. **Con hueco entre valores** (10, 20, 30…) para poder
  insertar sin renumerar.
- `etapa` — la que el `CLAUDE.md` venía anticipando: *«cuando se defina, va a necesitar su
  propia columna»*. Ahora se definió.

`level` queda solo para el título y deja de decidir el orden. **No servía**: no es único
—hoy hay dos niveles con `level = 2`— y funcionaba de casualidad porque después se
filtraba por modo.

No hace falta una tabla `talleres`: el taller **es** el conjunto de niveles que comparten
`teaches_chord`, y la presentación la pone la app. Una tabla más sería una cosa más que
puede quedar desincronizada.

> La presentación **no** es una fila de `songs`. Si lo fuera, sería una canción sin chart,
> y toda la app está construida sobre «una canción sin chart publicado no existe»
> (`charts!inner`).

### 6.2 App de Android

| Archivo | Qué cambia |
|---|---|
| `content/models.dart` | `Song` lee `teachesChord`, `stepKind`, `orden`, `etapa` |
| `content/content_repo.dart` | pedir las columnas nuevas, ordenar por `orden`, **distinguir «sin red» de «sin contenido»** |
| `content/ruta.dart` **(nuevo)** | arma la ruta, agrupa los talleres, deduce los acordes aprendidos |
| `content/progress.dart` | una clave más para la presentación (`intro:F`) |
| `screens/home_page.dart` | JUGAR va al mapa; se borra `ModePage` |
| `screens/levels_page.dart` | dibuja el bloque del taller y sus pasos |
| `screens/chord_intro_page.dart` **(nuevo)** | la presentación generada, en sus cuatro momentos |
| `ui/chord_diagram.dart` **(nuevo)** | **el diagrama de acorde** — ver 4.2.1. La pieza visual de la función |
| `ui/design.dart` | los colores por dedo (1 cielo · 2 sandía · 3 lima · 4 uva), fijos para toda la app |
| `engine/mylele_ffi.dart` | `readChord()` y `playChord()` |
| `engine/.../core/` | exponer el acorde detectado **fuera** de un nivel, y tocar notas a pedido |

### 6.3 Editor de niveles

| Archivo | Qué cambia |
|---|---|
| `lib/chartFormat.ts` | los campos nuevos en el tipo `Song` |
| `lib/db.ts` | leerlos y guardarlos |
| `lib/taller.ts` **(nuevo)** | generar los 4 charts de un taller |
| `lib/aiPrompt.ts` | una receta por `step_kind` |
| `lib/dificultad.ts` | topes por tipo de paso (aislado = 1 acorde y nada más) |
| `lib/calidad.ts` | la validación de acordes no enseñados (abajo) |
| `screens/LevelList.tsx` | mostrar la ruta agrupada por talleres, en orden |
| `screens/ChartEditor.tsx` | los campos nuevos en la ficha |

### 6.4 La validación que este modelo hace posible

Con `orden` + `teaches_chord`, el editor puede responder algo que hoy **no puede**:

> **¿Este nivel usa algún acorde que todavía no se enseñó?**

Se recorre la ruta, se acumulan los acordes ya enseñados y se compara contra los que usa
cada chart. Es el error de contenido más fácil de cometer y el más difícil de ver a ojo —
y una vez que existe, es imposible publicar un nivel que le pida al alumno algo que nadie
le mostró.

**Esto solo justifica el cambio de esquema**, aunque los talleres se pospusieran.

---

## 7. Fases

Cada fase termina en algo que se puede probar y publicar sin romper lo anterior.

### ✅ Fase 1 · Esquema · *base de datos* — **hecha el 27/07/2026**
Migración `progresion_por_acordes_fase1`: `teaches_chord`, `step_kind`, `orden`, `etapa`,
más una restricción que impide guardar un paso de taller huérfano (un `step_kind`
distinto de `normal` **tiene** que decir qué acorde enseña, y un `normal` no puede
decirlo). Los 5 niveles de prueba quedaron como `normal`, `orden` 10…50.
**Comprobado:** la app siguió andando sin tocar una línea de código.

### ✅ Canciones de práctica cargadas — **27/07/2026**
Diez, ya publicadas y jugables. Ver sección 10.

### ◐ Fase 2 · La app lee lo nuevo · *app* — **el orden, hecho el 27/07/2026**
Hecho: `Song.orden`, la consulta pide `order=orden.asc` y la lista se reordena también
del lado de la app (el texto puede venir del archivo de caché, guardado por una versión
anterior que pedía otro orden). Dos pruebas nuevas fijan que manda `orden` y no `level`,
y que una canción sin `orden` va al final y no al principio.
Y **`ruta.dart`** (27/07/2026): convierte la lista plana de canciones en el recorrido.
Un taller **es** el conjunto de niveles consecutivos que comparten `teaches_chord` — se
deduce del orden, no se declara aparte. La presentación se inserta como paso sintético
delante de cada taller, con clave de progreso `intro:<acorde>`.

Los acordes aprendidos se deducen: un acorde se sabe cuando su taller está ENTERO
terminado, presentación incluida. Siete pruebas cubren el armado, los talleres
consecutivos, el mismo acorde en dos tramos separados (son dos talleres, no uno
partido) y el desbloqueo.

### ◐ Fase 3 · El editor · *editor* — **el orden, hecho el 27/07/2026**
Hecho: la lista es **una sola ruta ordenada** (se fueron las dos columnas por modo, que
contradecían el recorrido único de la app), con la posición al frente de cada fila y
flechas ↑↓ para reordenar. El intercambio lo hace `mover_cancion()` en el servidor: son
dos escrituras que tienen que pasar juntas o ninguna.
**Falta:** campos de taller en la ficha, validación de «acorde no enseñado», botón
«crear taller».

### ◐ Fase 4 · El motor escucha y toca acordes sueltos · *FFI y C++* — **escuchar, hecho el 27/07/2026**

> ⚠️ **Corrección: escuchar NO necesitaba C++.** El plan daba por hecho que había que
> escribir `mylele_read_chord()`. Al ir a hacerlo apareció que el motor **ya detecta
> acordes todo el tiempo** —la detección corre en cada cuadro de audio, sin condición de
> que haya un nivel— y que **`mylele_drain_events()` ya estaba exportada** en
> `mylele_capi.cpp`. Lo único que faltaba era que Dart la pidiera:
> `grep -c drain_events mylele_ffi.dart` daba **0**.
>
> Fuera de un nivel, `acordeEsperadoAhora()` devuelve −1, así que la detección sale
> **libre**, sin desempatar hacia ningún acorde. Es exactamente lo que hace falta para
> enseñar: si el alumno pone otro acorde, tiene que decir cuál puso.

Hecho: `drainEvents()` y `ChordListener` en `mylele_ffi.dart`.

Y **`mylele_play_chord()`**, que sí fue C++ nuevo (27/07/2026): `AudioIO::playChord()`
deja las notas en una `SpscRing` que vacía el callback de audio. Se puede llamar desde
cualquier hilo, y las notas traen su desplazamiento RELATIVO al bloque — quien las pide
está en otro hilo y no puede saber en qué muestra va a estar la salida; el callback, que
sí lo sabe, le suma su propio `blockStart`. Suenan aunque no haya nivel: solo la
programación estaba condicionada a `sessionActive_`, el render nunca lo estuvo.

Las frecuencias salen de la DIGITACIÓN, no de `pitch_classes`: las clases de altura no
tienen octava y sonarían a un acorde cualquiera en cualquier registro. Lo que hay que
hacer escuchar son **las mismas cuatro cuerdas que el alumno va a pulsar**.

### ✅ Fase 5a · El diagrama de acorde · *app* — **hecha el 27/07/2026**
`ui/chord_diagram.dart` según 4.2.1, con los colores por dedo en `design.dart`
(`kDedoColor` / `colorDeDedo`). Tarjeta caramelo con extrusión, cejuela gruesa, aros
para las cuerdas al aire y el número del dedo adentro del punto.
**Comprobado:** cuatro pruebas —el idioma de colores, los 8 acordes de las dos etapas,
mostrar los dedos de a uno, y datos incompletos o fuera de rango— más
`tool/gen_diagramas.dart`, que dibuja los ocho en una hoja PNG sobre el celeste de la app
para poder mirarlos.

> Mirar la hoja encontró un error que ninguna prueba iba a encontrar: los nombres de las
> cuerdas se dibujaban **por debajo del borde de la tarjeta** y se veían como manchas en
> el filo. De ahí salió `kDiagramaProporcion`: el dibujo son TRES franjas apiladas —aros
> arriba, mástil, nombres abajo— y la proporción tiene que darle lugar a las tres.

### ✅ Fase 5b · La pantalla de presentación · *app* — **completa el 27/07/2026**
Los cuatro momentos: ① revelación, ② dedos de a uno, ③ escuchar y ④ sostener con la
barra. La detección entra por
una costura (`escucha`) que en las pruebas se reemplaza por una de mentira — sin eso la
pantalla solo se podría probar con un teléfono y un ukelele en la mano.
Mientras se sostiene, la pantalla **dice qué está escuchando** («Estoy escuchando C»).
Sin eso, el alumno que no logra el acorde se queda con un medidor que no sube y ninguna
pista: casi siempre es un dedo que no apoya del todo y deja la cuerda al aire, y
nombrar lo que suena convierte un fracaso mudo en una corrección.

Tiene entrada propia: **«Practicar acordes»** en el inicio (`ChordsPage`), la práctica
libre que la sección 5 preveía. Es la misma pantalla que el paso ① de un taller, elegida
por el alumno en vez de impuesta por el recorrido: una sola pantalla con dos puertas.

### Fase 6 · Contenido de la etapa Fácil · *editor, sin programar*
Los talleres de C, Am, F y G, más los niveles normales entre ellos.
**Acá se borran los 5 niveles de prueba**, cuando ya hay con qué reemplazarlos.

### ◐ Fase 7 · El mapa · *app* — **el camino único, hecho el 27/07/2026**
Hecho: se borró `ModePage` y JUGAR va directo al mapa, que ahora se llama **«Tu camino»**
y muestra TODOS los niveles en el orden de la ruta. Se fue también `songsForMode()`:
partía el contenido en dos caminos por modo de chart, y con dos caminos independientes no
hay progresión que contar porque nadie sabe en qué orden se cruzan.
**Falta:** el bloque del taller, sus pasos y el acorde nuevo anunciado.

### Fase 8 · Etapa Media · *audio primero, contenido después*
Por cada acorde nuevo: cargarlo en el editor, **grabarlo con ukelele real, correr el
banco de pruebas y calibrar los pesos**, y recién entonces armarle el taller.
No arrancar esta fase pensando que es trabajo de contenido: es trabajo de audio.

**Orden sugerido:** 1 → 2 → 3 → (4 y 5a en paralelo) → 5b → 6 → 7 → 8.
Las fases 1 a 3 ya dejan andando la validación de acordes, que es valor inmediato aunque
los talleres tarden.

---

## 7bis. Pendientes conocidos

- **La cancion no se detiene sola al terminar.** Reportado el 27/07/2026. Se llega al
  ultimo evento del chart y el nivel sigue corriendo: el metronomo y el fondo continuan
  en vez de cerrar y mostrar el resultado. `_terminado()` en `game_page.dart` existe y
  lo llama `TrackView.onFinished`, asi que el problema esta en cuando se considera
  terminada la pista — probablemente espera el fin del ULTIMO evento y con acordes
  sostenidos ese final quedo mas lejos de lo que la logica supone.

  > Ojo: esto empeoró a propósito. Ahora hay rasgueos de 5 y 6 tiempos (el «ay» de
  > Cielito lindo, los finales sostenidos), así que la distancia entre el último golpe y
  > el final real de la pista es mayor que antes. El bug es el mismo; se nota más.

- **Decidir qué se hace con «Cielito lindo».** El argumento con el que se repuso —que
  solo se guardaba una grilla de acordes— dejó de valer cuando se cargó la capa de fondo
  con la melodía. Ver la sección 9.

- **Tres slugs cambiaron de nombre** el 27/07/2026: `practica-arroz-con-leche` →
  `practica-cumpleanos`, `practica-de-colores` → `practica-alegria`,
  `practica-los-pollitos` → `practica-navidad`. El progreso se guarda por `slug`, así que
  el avance que hubiera en los viejos quedó huérfano. No importó porque eran niveles de
  prueba, pero es exactamente la trampa de la sección 8: **de acá en adelante los slugs
  no se tocan.**

---

## 8. Trampas previsibles

- **El progreso es por `slug`.** Cambiar un slug le borra el avance al alumno. Los pasos
  de taller necesitan slugs estables desde el principio (`taller-f-aislado`, no
  `nivel-6`).
- **La presentación necesita su propia clave de progreso** y no es una canción. Meterla en
  `songs` como fila sin chart rompe el filtro `charts!inner` del que depende el mapa.
- **Un taller a medio publicar deja un hueco silencioso.** La consulta filtra por
  `published`, así que un paso sin publicar simplemente no existe y el alumno salta de ②
  a ④ sin enterarse. El editor tiene que avisar: «este taller tiene 2 de 4 pasos
  publicados».
- **`chordIndex()` devuelve −1** si un chart usa un acorde que no está en el catálogo. La
  validación de la Fase 3 lo ataja **antes** de publicar.
- **No tocar los pesos de detección** de C, Am, F y G. Son calibraciones medidas contra
  grabaciones reales; el F empeora si se «arregla» a ojo.
- **«Sin contenido» no es «sin conexión».** Hoy `content_repo.dart` devuelve lo mismo para
  los dos casos. Con la base vaciándose en la Fase 6, ese mensaje va a mentir justo cuando
  más confunda.
- **Dos diagramas del mismo acorde, en dos lenguajes.** El editor dibuja el suyo en React
  y la app va a dibujar el suyo en Dart. Si divergen, el autor ve una cosa y el alumno
  otra. No se puede compartir código entre los dos, así que **lo que se comparte es la
  especificación de 4.2.1**: cualquier cambio de estilo se hace en los dos lados, en la
  misma tanda. Es la misma trampa que ya apareció con el ukelele de la portada y el del
  ícono del lanzador.
- **La presentación no puede ser un muro.** Si el medidor de «sostenelo» no tiene salida,
  el alumno que no logra el G queda encerrado y abandona. La salida a los 30 segundos no
  es una concesión: es la función.

---

## 9. Canciones de práctica (cargadas el 27/07/2026)

Once canciones que usan **solo los acordes ya aprendidos** en cada punto de la ruta.
Cada una tiene las dos capas: el rasgueo que toca el alumno y el fondo de tres voces
(melodía, bajo, acompañamiento) que reproduce la app.

| orden | slug | título | compás | acordes | etapa |
|---|---|---|---|---|---|
| 250 | `practica-vaiven` | Vaivén | 4/4 | C Am | fácil |
| 260 | `practica-dos-colores` | Dos colores | 4/4 | C Am | fácil |
| 350 | `practica-martinillo` | Martinillo | 4/4 | C Am F | fácil |
| 360 | `practica-ronda-de-tres` | Ronda de tres | 4/4 | C Am F | fácil |
| 450 | `practica-cumpleanos` | Cumpleaños feliz | **3/4** | C F G | fácil |
| 460 | `practica-alegria` | Himno a la alegría | 4/4 | C F G | fácil |
| 470 | `practica-la-cucaracha` | La cucaracha | 4/4 | C F G | fácil |
| 480 | `practica-cielito-lindo` | Cielito lindo | **3/4** | C F G | fácil |
| 600 | `practica-estrellita` | Estrellita | 4/4 | C F G | media |
| 610 | `practica-navidad` | Navidad, Navidad | 4/4 | C F G | media |
| 620 | `practica-oh-susana` | Oh! Susana | 4/4 | C F G | media |

Los `orden` dejan hueco para los talleres: 100 = taller C, 200 = Am, 300 = F, 400 = G.

**Los valses.** Cumpleaños feliz y Cielito lindo van en 3/4. `beats_per_bar` sale de
`time_sig` y viaja hasta el motor y hasta el dibujo de la pista, así que el acento cae
cada tres. Son la primera prueba real de que eso funciona.

**Las melodías no se escriben de memoria.** Escribir de memoria fue lo que dejó a
Estrellita con dos Do donde va uno solo sostenido, y ese error se escucha. Cada melodía
sale de una transcripción publicada que se fue a buscar (Cielito lindo viene del archivo
ABC de John Chambers en el MIT) o es tan conocida que se puede escribir sin dudar nota
por nota. **Si no entra en ninguna de las dos, no se carga.**

Quedaron afuera por eso «Arroz con leche», «De colores» y «Los pollitos dicen»: se saben
de oído, pero no con la precisión que hace falta para que el juego marque bien los
tiempos, y hay varias versiones distintas dando vueltas. Sus lugares los ocuparon
Cumpleaños feliz (la canción más útil que puede aprender alguien que arranca), el Himno a
la alegría y Navidad. **Si las querés de vuelta, hace falta una transcripción de dónde
sacarlas** — no alcanza con acordarse.

**Sobre los derechos — esto cambió y hay que decidirlo.** Antes acá se guardaba solo una
grilla de acordes y tiempos, y con ese argumento —una progresión de acordes no es
material protegible— se repuso Cielito lindo pese a que Quirino Mendoza murió en 1957 y
el plazo en Argentina es vida del autor más 70 años. **Ese argumento ya no vale**: la capa
de fondo guarda la melodía nota por nota. Es MIDI y no hay letra ni grabación, pero la
melodía sí es la obra.

Las otras diez están bien: tradicionales anónimas, autores muertos hace más de un siglo
(Foster 1864, Beethoven 1827, Pierpont 1857), Cumpleaños feliz declarada de dominio
público en 2016, y dos propias —**no existe repertorio tradicional que ande solo con C y
Am**, así que se compusieron para el puesto. La única a decidir es Cielito lindo.

**Hueco conocido:** las de cuatro acordes usan C, F y G pero **no Am** — son canciones
I–IV–V y forzarles un Am las desafinaría del original. El Am se practica en las cuatro
anteriores. Si hace falta más Am con los cuatro acordes, va una canción nueva, no un
parche a estas.

---

## 10. Lo que este plan NO resuelve

- La etapa Difícil queda sin definir.
- El punteo queda para después: el plan solo se asegura de no cerrarle la puerta.
- No toca el puntaje ni la pista del juego.
- El progreso sigue viviendo en el teléfono, sin cuenta ni sincronización.
