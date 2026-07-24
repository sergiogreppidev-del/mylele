# MyLele · Editor de niveles
*Brief para construir la app web de creación y gestión de contenido*

> Leer primero `MyLele_Estado_del_Proyecto.md` (esquema de datos, formato de chart y sistema de diseño).

---

## 1. Para qué existe

Hoy los niveles se cargan **escribiendo SQL a mano**. Eso no escala: cada canción nueva
depende de un desarrollador. El editor convierte la creación de contenido en una tarea
visual, para poder **crear, probar y publicar niveles sin tocar código**.

**Usuario:** el autor del contenido (hoy, el fundador; mañana, profesores de ukelele).
**No** es una app para alumnos.

**Éxito:** crear un nivel nuevo, escucharlo, corregirlo y publicarlo en menos de 10 minutos.

---

## 2. Lo primero de todo: autenticación (bloqueante)

La base es **solo lectura** desde el cliente. El editor necesita escribir, y eso hay que
hacerlo bien desde el día uno:

1. Activar **Supabase Auth** (email + contraseña alcanza).
2. Crear una tabla `admins` (o una columna de rol) que liste quién puede editar.
3. Agregar políticas RLS de **INSERT / UPDATE / DELETE** en `songs` y `charts`
   condicionadas a que el usuario autenticado sea administrador.
4. Mantener el **SELECT público** como está (la app de alumnos lo necesita).

> ⚠️ **Nunca** poner la clave de servicio (`service_role`) en el navegador: da acceso total
> saltándose RLS. En el cliente va únicamente la clave publicable + el login del usuario.

---

## 3. Funcionalidad

### 3.1 Listado de niveles
Tabla con todos los `songs`: título, modo, nivel, BPM, cantidad de eventos, gratis/premium.
Acciones: crear, editar, duplicar, borrar, reordenar.
*Duplicar es clave: la mayoría de los niveles nuevos nacen de una variante de otro.*

### 3.2 Editor de chart (el corazón)
Una **grilla de tiempo** donde se colocan los eventos:

```
        │1   2   3   4 │1   2   3   4 │1   2   3   4 │
 Acorde │C─────────────│Am────────────│F─────────────│
        └──────────────┴──────────────┴──────────────┘
          compás 1        compás 2       compás 3
```

- Eje horizontal en **compases y tiempos** (no en segundos).
- Clic para colocar un evento; arrastrar el borde para cambiar su duración.
- Paleta lateral con los acordes disponibles (leídos de la tabla `chords`).
- Modo **acordes** (barras) y modo **notas** (puntos sobre las 4 cuerdas G/C/E/A).
- Atajos: duplicar compás, repetir progresión N veces, borrar selección.

### 3.3 Reproducción de prueba
Botón para escuchar el nivel con metrónomo y el acompañamiento, viendo avanzar el cursor.
**Sin micrófono ni detección**: acá solo se valida que el chart suene y se lea bien.

*Reutilizable de la app de alumnos:* la síntesis del acompañamiento y el formato de eventos.
Conviene copiar esas funciones, no reescribirlas.

### 3.4 Publicar
Guarda `songs` + `charts` en Supabase. Mostrar siempre el JSON generado en un panel
plegable: sirve para depurar y para confiar en lo que se está guardando.

### 3.5 Gestión de acordes (secundario)
ABM de la tabla `chords` con vista previa del diagrama de digitación, para ir sumando
acordes nuevos (D, Em, G7, C7…) sin SQL.

---

## 4. Reglas del formato (respetar sin excepción)

- Los tiempos van en **beats**, nunca en segundos.
- `t` = beat de inicio (0 = primer tiempo), `dur` = duración en beats.

**Modo `melody` (notas y arpegios) — se escribe como TABLATURA:**
```json
{"t":0,"string":"C","fret":0,"dur":1}
```
- `string` ∈ `G` `C` `E` `A` · `fret` entero ≥ 0 (0 = al aire).
- El editor debe pedir **cuerda + traste**, nunca el nombre de la nota: la app calcula
  sola la nota resultante y dibuja el **número de traste** dentro del círculo.
- Carriles de arriba hacia abajo: **G · C · E · A**.

**Modo `chords` (acordes) — con dirección de rasgueo:**
```json
{"t":0,"chord":"C","dur":1,"dir":"d"}
```
- `dir` ∈ `"d"` (abajo ↓, por defecto) | `"u"` (arriba ↑).
- El editor debe permitir elegir la dirección por evento, y ofrecer atajos para
  patrones frecuentes (todo ↓, alternado ↓↑, island strum D–DU–UDU).
- `chord` **debe existir** en la tabla `chords`, o la app no lo dibuja ni lo detecta.

**Validar antes de publicar:** sin solapamientos, sin `t` negativos, acordes existentes,
`string` válida, `fret` entre 0 y 12, BPM entre 40 y 200.

---

## 5. Sugerencia de stack

Puede ser un sitio estático como la app de alumnos, pero acá **sí conviene un framework**:
hay formularios, estado complejo y muchas interacciones. React + Vite es una opción sensata,
desplegada en Vercel como proyecto **separado** (`mylele-editor`), apuntando al mismo Supabase.

Mantener el mismo sistema de diseño (colores, Titan One + Baloo 2, botones caramelo) para que
se sienta parte del producto, aunque sea una herramienta interna.

---

## 6. Orden de trabajo sugerido

1. **Auth + políticas RLS** (sin esto no se puede guardar nada).
2. Listado de niveles + crear/editar los datos básicos de una canción.
3. Editor de chart en modo acordes.
4. Reproducción de prueba.
5. Modo notas.
6. Gestión de acordes.
7. Importador de MIDI → chart *(opcional, acelera mucho la autoría; ver blueprint)*.

---

## 7. Riesgos a tener presentes

- **Seguridad:** una política RLS mal escrita expone la escritura a cualquiera. Revisar con
  el chequeo de seguridad de Supabase después de cada cambio.
- **Contenido roto:** un chart inválido rompe el juego del alumno. La validación previa a
  publicar no es opcional.
- **Versionado:** `charts` ya tiene columna `version`. Aprovecharla para no pisar un chart
  publicado mientras se edita.
- **Derechos de autor:** si se cargan canciones comerciales conocidas hacen falta licencias.
  Empezar con dominio público, progresiones genéricas o material propio.
