# -*- coding: utf-8 -*-
"""
=== MyLele · tools/fondos.py ===
Escribe la capa de FONDO de las canciones de práctica y la deja lista para cargar.

POR QUÉ EXISTE
--------------
Las once canciones de práctica se cargaron con la capa de acordes y nada más. Sin capa
de fondo, la app solo toca el metrónomo: el alumno rasguea acordes sueltos contra un
clic y no hay canción. Eso es lo que se reportó como «suenan muy simples».

QUÉ USA
-------
La MISMA notación que el editor le pide a la IA (`aiPrompt.ts`), para que lo que se
escriba acá se pueda pegar en el editor y viceversa:

    C4/1   negra          .5 = corchea, 2 = blanca, 1.5 = con puntillo
    r/1    silencio
    ~/1    ligadura: alarga la nota anterior en vez de volver a tocarla
    |      separa compases

La ligadura es lo que permite que una nota cruce la barra de compás. Sin ella, un «ay»
de seis tiempos había que partirlo en dos de tres, y se escucha como dos notas.

Tres voces, como el formato de la base:
    lead   la melodía — es la que hace que la canción se reconozca
    bass   el bajo — tiene que MOVERSE, no repetir la fundamental
    acomp  el relleno — arpegios, no bloques

VALIDA LOS COMPASES
-------------------
Cada compás tiene que sumar exactamente los tiempos del compás. Un compás de más corre
todo lo que viene después y arruina la canción entera — es el error que el editor marca
como bloqueante, y acá se atrapa antes de escribir nada en la base.
"""

import json
import re
import sys

NOTA = re.compile(r'^([A-Ga-g][#b]?)(-?\d)$')
SEMI = {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11}


def _midi(nombre):
    m = NOTA.match(nombre)
    if not m:
        raise ValueError('altura ilegible: %r' % nombre)
    letra, alt = m.group(1)[0].upper(), m.group(1)[1:]
    pc = SEMI[letra] + (1 if alt == '#' else -1 if alt == 'b' else 0)
    return (int(m.group(2)) + 1) * 12 + pc


def parsear(linea, voz, bpb, pickup=0.0):
    """Notación → eventos con su tiempo absoluto, validando cada compás."""
    eventos = []
    t = 0.0
    ultimo = []          # los eventos que escribió el token anterior: a esos ata la ligadura
    for i, compas in enumerate(x.strip() for x in linea.split('|') if x.strip()):
        inicio = t
        for tok in compas.split():
            if '/' not in tok:
                raise ValueError('token sin duración: %r' % tok)
            nombre, dur = tok.rsplit('/', 1)
            dur = float(dur)
            if nombre == '~':
                if not ultimo:
                    raise ValueError('%s: ligadura sin nota a la que atar' % voz)
                for e in ultimo:
                    e['dur'] = round(e['dur'] + dur, 4)
            elif nombre == 'r':
                # Un silencio corta la ligadura: después de un silencio no hay nada que
                # alargar, y dejarlo pasar ataría la nota de antes del silencio.
                ultimo = []
            else:
                # Los corchetes son varias notas juntas: mismo tiempo, misma duración.
                alturas = (nombre[1:-1].split(',')
                           if nombre.startswith('[') else [nombre])
                ultimo = []
                for a in alturas:
                    _midi(a)  # valida ahora, no cuando ya está en la base
                    e = {'t': round(t, 4), 'pitch': a, 'dur': round(dur, 4), 'v': voz}
                    eventos.append(e)
                    ultimo.append(e)
            t += dur
        largo = round(t - inicio, 4)
        # El primero puede ser anacrusa y el último puede quedar corto: es música, no
        # una planilla. Cualquier otro mal sumado es un error que corre todo.
        esperado = pickup if (i == 0 and pickup) else bpb
        if largo != esperado and not (i == 0 and pickup == 0 and largo == bpb):
            if largo > esperado:
                raise ValueError(
                    '%s: el compás %d suma %g y tiene que sumar %g' %
                    (voz, i + 1, largo, esperado))
    return eventos


def fondo(bpb, melodia, bajo, acomp, pickup=0.0):
    ev = (parsear(melodia, 'lead', bpb, pickup)
          + parsear(bajo, 'bass', bpb, pickup)
          + parsear(acomp, 'acomp', bpb, pickup))
    ev.sort(key=lambda e: (e['t'], e['v']))

    # Las tres capas tienen que durar lo mismo: si una queda corta, la canción se
    # desarma a la mitad y en la app se escucha como que «se cortó la música».
    fin = {}
    for v in ('lead', 'bass', 'acomp'):
        propios = [e for e in ev if e['v'] == v]
        fin[v] = max((e['t'] + e['dur'] for e in propios), default=0)
    if len(set(round(x, 2) for x in fin.values())) > 1:
        raise ValueError('las capas no duran lo mismo: %s' % fin)
    return ev


if __name__ == '__main__':
    from canciones import CANCIONES  # noqa: E402

    salida = {}
    for slug, c in CANCIONES.items():
        try:
            salida[slug] = fondo(c['bpb'], c['melodia'], c['bajo'], c['acomp'])
        except ValueError as e:
            print('ERROR en %s → %s' % (slug, e))
            sys.exit(1)
        print('%-26s %3d notas  (%d compases de %d)' %
              (slug, len(salida[slug]), c['compases'], c['bpb']))

    with open('fondos.json', 'w', encoding='utf-8') as f:
        json.dump(salida, f, ensure_ascii=False)
    print('\nescrito fondos.json')
