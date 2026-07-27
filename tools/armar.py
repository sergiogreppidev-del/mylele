# -*- coding: utf-8 -*-
"""
=== MyLele · tools/armar.py ===
Arma las dos capas de cada canción y escribe el SQL que las deja en la base.

    python armar.py            valida y escribe salida.json + cargar.sql
    python armar.py <slug>     lo mismo para una sola

QUÉ VALIDA ANTES DE ESCRIBIR NADA
---------------------------------
- Que cada compás sume los tiempos que tiene que sumar (lo hacen `rasgueo` y `fondos`).
- Que las tres voces del fondo terminen juntas (lo hace `fondos`).
- Que el RASGUEO termine cuando termina el fondo. Es el error más caro de todos: si la
  capa que toca el alumno se corta antes, el nivel «se queda sin nada que hacer» con la
  música todavía sonando, y si sobra, el juego espera un rasgueo que ya no tiene música
  detrás.
- Que ningún rasgueo pida un acorde que no sea de los cuatro que se enseñan.
"""

import json
import sys

from canciones import CANCIONES
from fondos import fondo
from rasgueo import acordes

ACORDES_ENSENADOS = {'C', 'Am', 'F', 'G'}


def armar(c):
    ac = acordes(c['acordes'], c['bpb'])
    fo = fondo(c['bpb'], c['melodia'], c['bajo'], c['acomp'])

    desconocidos = {e['chord'] for e in ac} - ACORDES_ENSENADOS
    if desconocidos:
        raise ValueError('acordes que el alumno no aprendió: %s'
                         % ', '.join(sorted(desconocidos)))

    fin_ac = max(e['t'] + e['dur'] for e in ac)
    fin_fo = max(e['t'] + e['dur'] for e in fo)
    if round(fin_ac, 3) != round(fin_fo, 3):
        raise ValueError('el rasgueo termina en el tiempo %g y el fondo en el %g'
                         % (fin_ac, fin_fo))

    largo = c['bpb'] * c['compases']
    if round(fin_fo, 3) != largo:
        raise ValueError('la canción dura %g tiempos y dice tener %d compases de %d'
                         % (fin_fo, c['compases'], c['bpb']))
    return ac, fo


def _sql(slug, ac, fo):
    j = lambda o: json.dumps(o, separators=(',', ':')).replace("'", "''")
    donde = "(select id from songs where slug='%s')" % slug
    return '\n'.join([
        "delete from charts where song_id=%s;" % donde,
        "insert into charts (song_id,mode,difficulty,events,published)"
        " select id,'chords','facil','%s'::jsonb,true from songs"
        " where slug='%s';" % (j(ac), slug),
        "insert into charts (song_id,mode,difficulty,events,published)"
        " select id,'backing','facil','%s'::jsonb,true from songs"
        " where slug='%s';" % (j(fo), slug),
    ])


if __name__ == '__main__':
    pedidas = sys.argv[1:] or list(CANCIONES)
    salida, sql = {}, []
    for slug in pedidas:
        c = CANCIONES[slug]
        try:
            ac, fo = armar(c)
        except ValueError as e:
            print('ERROR en %s → %s' % (slug, e))
            sys.exit(1)
        salida[slug] = {'chords': ac, 'backing': fo}
        sql.append(_sql(slug, ac, fo))
        sostenidos = sum(1 for e in ac if e['dur'] > 1)
        print('%-26s %2d compases de %d · %3d rasgueos (%d sostenidos) · %3d notas'
              % (slug, c['compases'], c['bpb'], len(ac), sostenidos, len(fo)))

    with open('salida.json', 'w', encoding='utf-8') as f:
        json.dump(salida, f, ensure_ascii=False)
    with open('cargar.sql', 'w', encoding='utf-8') as f:
        f.write('\n\n'.join(sql) + '\n')
    print('\nescritos salida.json y cargar.sql')
