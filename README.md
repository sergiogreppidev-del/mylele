# MyLele 🎸

App web para **aprender ukelele jugando**. Escucha por el micrófono y evalúa en tiempo real:
afinación, notas, acordes y ritmo. Todo el audio se procesa **en el dispositivo** — nunca sale del navegador.

**En vivo:** el proyecto se despliega solo en Vercel con cada push.

---

## Cómo trabajar el proyecto

Es un sitio estático: **sin build, sin dependencias, sin `npm install`**. Se edita un archivo y se sube.

### Subir cambios
Doble clic en **`subir-a-github.bat`**, escribir un mensaje (o Enter) y listo.
Trae los cambios del remoto, sube los tuyos y Vercel redeploya en segundos.

### Probar en el celular
Abrir la URL de Vercel. **Siempre hacer refresh forzado** después de subir: el navegador
cachea los `.js` y podés estar viendo la versión anterior sin darte cuenta.

### Probar en la compu
El micrófono necesita un contexto seguro. Abrir el `index.html` con doble clic **no alcanza**.
En la carpeta del proyecto:
```bash
python3 -m http.server
```
y entrar a `http://localhost:8000`.

---

## Qué archivo tocar

| Quiero cambiar… | Archivo |
|---|---|
| Pantallas, textos, estructura | `index.html` |
| Colores, tipografías, botones | `styles.css` |
| Navegación, mapa de niveles, desbloqueo | `ui.js` |
| La pista del juego, ritmo, metrónomo, calibración | `game.js` |
| Detección de micrófono, tono y acordes | `audio-engine.js` |
| Afinador | `tuner.js` |
| Ejercicio de acordes y diagramas | `chords.js` |
| Conexión con Supabase | `content.js` |
| Acordes, cuerdas, constantes | `config.js` |
| Bucle de análisis | `core.js` |

⚠️ Los scripts se cargan **en un orden concreto** en `index.html` y comparten alcance global.
Si agregás un archivo nuevo, sumalo a la lista respetando las dependencias.

---

## Trampas que ya nos comimos

- **Auriculares con cable, sin micrófono.** Los Bluetooth con mic fuerzan el micrófono del
  auricular y arruinan la detección. No hay forma de evitarlo por software.
- **HTTPS obligatorio** para el micrófono (por eso Vercel, y `localhost` para local).
- **Calibrar la latencia antes de jugar** (Ajustes → Calibrar). Sin eso, el juego marca
  errores aunque toques bien. En Android suele dar valores altos (~300 ms) y es normal.
- **Afinar antes de practicar acordes.** Con una cuerda en la nota equivocada, la detección
  de acordes falla y parece un bug del algoritmo.
- El progreso de niveles se guarda en el navegador (`localStorage`), así que en ventana
  privada arranca de cero.

---

## Contenido

Los niveles **no están en el código**: viven en Supabase (proyecto `mylele`).
La app descarga el *chart* (JSON con los acordes y sus tiempos en beats) y lo reproduce localmente.

Para agregar niveles hoy hay que escribir SQL. Está previsto un **editor visual** como app aparte.

---

## Documentación

| Documento | Para qué |
|---|---|
| `MyLele_Estado_del_Proyecto.md` | Traspaso técnico: arquitectura, esquema de datos, decisiones validadas |
| `Blueprint_App_Ukelele.md` | Estrategia de producto, currículo de ukelele, roadmap |
| `Spec_Motor_de_Audio_Android.md` | Plan del motor de audio nativo (el salto a C/Android) |
| `MyLele_Editor_de_Niveles.md` | Brief del editor de niveles |
