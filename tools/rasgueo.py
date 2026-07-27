# -*- coding: utf-8 -*-
"""
=== MyLele · tools/rasgueo.py ===
La capa de acordes: lo que el alumno rasguea.

UN TOKEN = UN RASGUEO. NO SE EXPANDE.
------------------------------------
`C/2` es UN rasgueo que suena dos tiempos, no dos rasgueos de un tiempo. Es lo que
significa el formato —cada evento de la tabla `charts` es un golpe, y su `dur` es cuánto
lo dejás sonar— y es lo que el juego dibuja: un evento, una nota en la pista.

La primera versión de esto expandía `C/2` en dos golpes «para llenar los tiempos», y el
resultado fue que TODAS las canciones quedaron con un rasgueo por tiempo de punta a
punta. El final de Estrellita pedía un Do sostenido y el juego mostraba dos Do seguidos:
el alumno cortaba el acorde para volver a golpear justo donde la canción respira.

De ahí sale la regla de escritura: **el rasgueo sigue el ritmo de la melodía.** Donde la
melodía se mueve, se rasguea; donde sostiene, el acorde se sostiene con ella.

LIGADURA: `~/3` ALARGA EL RASGUEO ANTERIOR, NO AGREGA UNO
--------------------------------------------------------
Se escribe con `~` y no con `-` porque en la notación del editor el guion ya es uno de
los nombres del silencio. Dos notaciones que usan el mismo signo para cosas opuestas es
exactamente lo que no puede pasar entre estas herramientas y el editor.

Un acorde puede sonar más de lo que dura el compás. Sin forma de escribirlo había que
elegir entre dos mentiras: cortarlo en la barra de compás (y el alumno vuelve a rasguear
donde la canción está sosteniendo) o poner un silencio (y el acorde se apaga antes de
tiempo). La ligadura resuelve las dos: `F/3 | ~/3` es **un** rasgueo que dura seis
tiempos, y así es como se dibuja en la pista.
"""


def acordes(linea, bpb, direccion='d'):
    """Notación → eventos de rasgueo, uno por token, validando cada compás."""
    ev, t = [], 0.0
    ultimo = None        # el rasgueo que escribió el token anterior; un silencio lo corta
    for i, compas in enumerate(x.strip() for x in linea.split('|') if x.strip()):
        ini = t
        for tok in compas.split():
            if '/' not in tok:
                raise ValueError('token sin duración: %r' % tok)
            nombre, dur = tok.rsplit('/', 1)
            # Un sufijo ":u" marca el rasgueo hacia arriba, como en el editor.
            dire = direccion
            if ':' in dur:
                dur, dire = dur.split(':', 1)
            dur = float(dur)
            if nombre == '~':
                if ultimo is None:
                    raise ValueError('ligadura sin rasgueo al que atar')
                ultimo['dur'] = _n(ultimo['dur'] + dur)
            elif nombre == 'r':
                ultimo = None
            else:
                ultimo = {'t': _n(t), 'chord': nombre, 'dur': _n(dur), 'dir': dire}
                ev.append(ultimo)
            t += dur
        largo = round(t - ini, 4)
        if largo != bpb:
            raise ValueError('el compás %d de acordes suma %g y tiene que sumar %g'
                             % (i + 1, largo, bpb))
    return ev


def _n(x):
    return int(x) if float(x) == int(x) else round(float(x), 3)
