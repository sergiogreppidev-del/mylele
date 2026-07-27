# MyLele 🎸 · documentación y herramientas de contenido

App para **aprender ukelele jugando**. Escucha por el micrófono y evalúa en tiempo real
afinación, notas, acordes y ritmo. Todo el audio se procesa **en el dispositivo**.

Este repo **no tiene la app**: tiene el plan, el diseño y las herramientas con las que se
escribe el contenido.

## Dónde está cada cosa

| Pieza | Repo | Qué es |
|---|---|---|
| **App de alumnos** | `mylele-android` | Android nativo: Flutter + motor de audio en C++ |
| **Editor de niveles** | `mylele-editor` | Donde se crea y publica el contenido |
| **Documentación y herramientas** | este | El plan, el diseño, y `tools/` |

Los tres comparten la misma base de datos de Supabase.

## La app web se eliminó

Hasta el 27/07/2026 acá vivía una app web de alumnos: un sitio estático desplegado en
Vercel. **Cumplió su propósito de spike** — sirvió para validar que la detección
restringida funciona, para calibrar los acordes contra grabaciones reales y para probar
el diseño arcade. Todo eso está portado a la app Android, que es la que se usa.

Está entera en el historial de git si alguna vez hace falta mirar cómo hacía algo el
original.

## Las herramientas · `tools/`

Escriben las canciones de práctica con sus cuatro capas —lo que rasguea el alumno, la
melodía, el bajo y el acompañamiento— y generan el SQL para cargarlas.

```bash
cd tools
python armar.py            # valida todo y escribe salida.json + cargar.sql
python armar.py <slug>     # una sola canción
```

Validan antes de escribir nada en la base: que cada compás sume, que las tres voces
terminen juntas, que el rasgueo termine cuando termina la música, y que no aparezca un
acorde que el alumno todavía no aprendió.

Usan **la misma notación** que el editor le pide a la IA, así que lo que se escribe acá se
puede pegar allá y viceversa.

## Documentación

| Documento | Para qué |
|---|---|
| **`MyLele_Plan_Progresion.md`** | **El plan vivo.** Cómo se aprende, los talleres, qué falta |
| `MyLele_Plan_Android.md` | La conversión a Android, por fases |
| `MyLele_Spec_Motor_Audio.md` | El diseño del motor de audio en C++ |
| `MyLele_Blueprint_Producto.md` | Estrategia de producto, currículo, roadmap |
| `MyLele_Editor_de_Niveles.md` | Brief del editor |
| `MyLele_Estado_del_Proyecto.md` | Traspaso técnico |
| `CLAUDE.md` | Contexto para trabajar con Claude Code |

> Los tres últimos y la spec se escribieron cuando la app de alumnos era web. El diseño y
> las decisiones de audio siguen valiendo —el motor C++ es un port fiel— pero **los
> caminos de archivo y la arquitectura de esos textos ya no existen.**

## Subir cambios

Doble clic en **`subir-a-github.bat`**: trae lo del remoto y sube lo tuyo.
