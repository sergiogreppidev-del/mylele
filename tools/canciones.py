# -*- coding: utf-8 -*-
"""
=== MyLele · tools/canciones.py ===
Las canciones de práctica, escritas en la notación del editor.

Cada una lleva las CUATRO capas del contrato:
    acordes  lo que toca el alumno
    melodia  la voz que hace que la canción se reconozca   (v='lead')
    bajo     tiene que MOVERSE, no repetir la fundamental  (v='bass')
    acomp    arpegios y bloques, no siempre el mismo ritmo (v='acomp')

DOS REGLAS QUE SE APRENDIERON POR LAS MALAS
-------------------------------------------
1. El acorde de cada compás tiene que contener lo que canta la melodía ahí. Si no, la
   armonía «no se parece a la canción» — es el control `verificarArmonia` del editor.
2. El acompañamiento no puede tener el mismo ritmo en todos los compases: eso es un
   metrónomo con alturas, y la canción no se reconoce aunque las notas estén bien.

DE DÓNDE SALE CADA MELODÍA
--------------------------
Las melodías **no se escriben de memoria**. Escribir de memoria fue lo que dejó a
Estrellita con dos Do donde va uno solo sostenido, y ese error se escucha. Cada canción
de acá sale de una de dos fuentes:

- una transcripción publicada que se fue a buscar (Cielito lindo viene del archivo ABC
  de John Chamber en el MIT, `trillian.mit.edu/~jc/music/abc/Mexico/song/`), o
- una melodía tan conocida que se puede escribir sin dudar nota por nota (Cumpleaños
  feliz, el Himno a la alegría, Navidad).

Si una canción no entra en ninguna de las dos, **no se carga**. Quedaron afuera por eso
«Arroz con leche», «De colores» y «Los pollitos dicen»: se saben de oído pero no con la
precisión que hace falta para que el juego marque bien los tiempos.
"""

CANCIONES = {
    # ---------------------------------------------------------------------
    # «Vaivén» · propia · dos acordes (C, Am)
    # No existe repertorio tradicional que ande solo con C y Am, así que esta se
    # compuso para el puesto. Ocho compases: dos frases que van y vuelven.
    'practica-vaiven': {
        'bpb': 4, 'compases': 8,
        'acordes':
            'C/1 C/1 C/2 | C/1 C/1 C/2 | Am/1 Am/1 Am/2 | Am/1 Am/1 Am/2 |'
            'C/1 C/1 C/2 | C/1 C/1 C/2 | Am/1 Am/1 Am/2 | C/4',
        'melodia':
            'E4/1 G4/1 E4/2 | C4/1 E4/1 G4/2 | A4/1 C5/1 A4/2 | E4/1 A4/1 C5/2 |'
            'G4/1 E4/1 C4/2 | E4/1 G4/1 C5/2 | A4/1 G4/1 E4/2 | C4/4',
        'bajo':
            'C3/2 G2/2 | C3/1 E3/1 G2/2 | A2/2 E3/2 | A2/1 C3/1 E3/2 |'
            'C3/2 G2/2 | C3/1 E3/1 G2/2 | A2/2 E3/2 | C3/4',
        'acomp':
            'E3/1 G3/1 [C4,E4]/2 | G3/.5 E3/.5 C4/1 [E3,G3]/2 |'
            'A3/1 C4/1 [E4,A4]/2 | C4/.5 A3/.5 E3/1 [A3,C4]/2 |'
            'E3/1 G3/1 [G3,C4]/2 | G3/.5 C4/.5 E4/1 [C4,E4]/2 |'
            'A3/1 E4/1 [A3,C4]/2 | [C3,E3,G3]/4',
    },

    # ---------------------------------------------------------------------
    # «Dos colores» · propia · dos acordes (C, Am)
    # Usa SILENCIOS al empezar cada frase: el arreglo respira y el alumno tiene un
    # tiempo para acomodar la mano antes de entrar.
    'practica-dos-colores': {
        'bpb': 4, 'compases': 8,
        'acordes':
            'C/4 | C/2 Am/2 | C/1 C/1 C/1 C/1 | C/4 |'
            'Am/4 | Am/2 C/2 | C/1 C/1 C/1 C/1 | C/4',
        'melodia':
            'r/1 E4/1 G4/1 A4/1 | C5/2 A4/2 | G4/1 E4/1 C4/1 E4/1 | G4/4 |'
            'r/1 A4/1 C5/1 E5/1 | A4/2 G4/2 | E4/1 G4/1 E4/1 C4/1 | C4/4',
        'bajo':
            'C3/2 G2/2 | C3/2 A2/2 | C3/1 G2/1 E3/1 G2/1 | C3/4 |'
            'A2/2 E3/2 | A2/2 C3/2 | C3/1 E3/1 G2/1 E3/1 | C3/4',
        'acomp':
            'r/1 [E3,G3]/1 C4/1 E4/1 | [C4,E4]/2 [A3,C4]/2 |'
            'G3/.5 E3/.5 C4/1 G3/1 E3/1 | [C3,E3,G3]/4 |'
            'r/1 [A3,C4]/1 E4/1 A4/1 | [A3,E4]/2 [G3,C4]/2 |'
            'E3/1 G3/1 E3/1 C4/1 | [C3,E3,G3]/4',
    },

    # ---------------------------------------------------------------------
    # «Martinillo» · tradicional (Frère Jacques) · dominio público
    # Ocho compases, cuatro frases de dos: la canción entera, sin estirar.
    'practica-martinillo': {
        'bpb': 4, 'compases': 8,
        'acordes':
            'C/1 C/1 C/1 C/1 | C/1 C/1 C/1 C/1 | C/1 F/1 C/2 | C/1 F/1 C/2 |'
            'C/1 F/1 Am/1 C/1 | C/1 F/1 Am/1 C/1 | C/1 C/1 C/2 | C/4',
        'melodia':
            'C4/1 D4/1 E4/1 C4/1 | C4/1 D4/1 E4/1 C4/1 |'
            'E4/1 F4/1 G4/2 | E4/1 F4/1 G4/2 |'
            'G4/.5 A4/.5 G4/.5 F4/.5 E4/1 C4/1 |'
            'G4/.5 A4/.5 G4/.5 F4/.5 E4/1 C4/1 |'
            'C4/1 G3/1 C4/2 | C4/4',
        'bajo':
            'C3/2 G2/2 | C3/1 E3/1 G2/2 | C3/2 F2/2 | C3/2 F2/2 |'
            'C3/1 F2/1 A2/1 C3/1 | C3/1 F2/1 A2/1 C3/1 | C3/2 G2/2 | C3/4',
        'acomp':
            'E3/1 G3/1 C4/1 G3/1 | [C3,E3,G3]/2 G3/1 E3/1 |'
            'E3/1 [F3,A3]/1 [E3,G3]/2 | G3/1 [F3,A3]/1 [C4,E4]/2 |'
            'E3/.5 G3/.5 F3/1 A3/1 E3/1 | G3/1 [F3,A3]/1 [A3,C4]/1 G3/1 |'
            'E3/1 G3/1 [C4,E4]/2 | [C3,E3,G3]/4',
    },

    # ---------------------------------------------------------------------
    # «Ronda de tres» · propia · tres acordes (C, Am, F)
    'practica-ronda-de-tres': {
        'bpb': 4, 'compases': 8,
        'acordes':
            'C/1 C/1 C/1 C/1 | F/2 F/2 | Am/1 Am/1 C/2 | C/4 |'
            'C/1 Am/1 Am/1 C/1 | F/2 F/2 | C/1 C/1 C/2 | C/4',
        'melodia':
            'C4/1 E4/1 G4/1 E4/1 | F4/2 A4/2 | A4/1 G4/1 E4/2 | E4/4 |'
            'G4/1 A4/1 C5/1 A4/1 | F4/2 A4/2 | G4/1 E4/1 C4/2 | C4/4',
        'bajo':
            'C3/1 G2/1 E3/1 G2/1 | F2/2 A2/2 | A2/2 E3/2 | C3/4 |'
            'C3/1 A2/1 C3/1 E3/1 | F2/2 C3/2 | C3/1 G2/1 E3/2 | C3/4',
        'acomp':
            'E3/1 G3/1 C4/1 G3/1 | [F3,A3]/2 [A3,C4]/2 |'
            'A3/1 C4/1 [E3,G3]/2 | [C3,E3,G3]/4 |'
            'G3/.5 C4/.5 E4/1 [A3,C4]/2 | [F3,A3]/2 [C4,F4]/2 |'
            'E3/1 G3/1 [C4,E4]/2 | [C3,E3,G3]/4',
    },

    # ---------------------------------------------------------------------
    # «La cucaracha» · tradicional mexicana · anónima
    'practica-la-cucaracha': {
        'bpb': 4, 'compases': 8,
        'acordes':
            'C/1 C/1 F/2 | C/1 C/1 F/2 | F/1 F/1 C/2 | G/1 G/1 C/2 |'
            'C/1 C/1 F/2 | C/1 C/1 F/2 | F/1 F/1 C/2 | G/2 C/2',
        'melodia':
            'C4/.5 C4/.5 C4/.5 F4/.5 A4/2 | C4/.5 C4/.5 C4/.5 F4/.5 A4/2 |'
            'F4/1 F4/1 E4/1 E4/1 | D4/1 D4/1 C4/2 |'
            'C4/.5 C4/.5 C4/.5 F4/.5 A4/2 | C4/.5 C4/.5 C4/.5 F4/.5 A4/2 |'
            'F4/1 F4/1 E4/1 E4/1 | D4/2 C4/2',
        'bajo':
            'C3/2 F2/2 | C3/2 F2/2 | F2/2 C3/2 | G2/2 C3/2 |'
            'C3/1 E3/1 F2/2 | C3/2 F2/2 | F2/1 A2/1 C3/2 | G2/2 C3/2',
        'acomp':
            '[C3,E3]/1 G3/1 [F3,A3]/2 | E3/.5 G3/.5 C4/1 [F3,A3]/2 |'
            '[F3,A3]/2 [E3,G3]/2 | [D3,G3]/2 [C3,E3]/2 |'
            '[C3,E3]/1 G3/1 [F3,A3]/2 | E3/.5 G3/.5 C4/1 [F3,A3]/2 |'
            'F3/1 A3/1 [E3,G3]/2 | [D3,G3]/2 [C3,E3,G3]/2',
    },

    # ---------------------------------------------------------------------
    # «Oh! Susana» · Stephen Foster (1848) · dominio público
    # Sin la anacrusa original: arranca en el tiempo fuerte para no complicar el
    # primer contacto. Es una simplificación consciente, no un descuido.
    'practica-oh-susana': {
        'bpb': 4, 'compases': 8,
        'acordes':
            'C/1 C/1 C/2 | C/1 C/1 C/1 G/1 | C/1 C/1 G/2 | G/4 |'
            'C/1 C/1 C/2 | C/1 C/1 C/1 G/1 | C/1 C/1 G/1 G/1 | C/4',
        'melodia':
            'E4/1 G4/1 G4/1.5 A4/.5 | G4/1 E4/1 C4/1 D4/1 |'
            'E4/1 E4/1 D4/1 C4/1 | D4/4 |'
            'E4/1 G4/1 G4/1.5 A4/.5 | G4/1 E4/1 C4/1 D4/1 |'
            'E4/1 E4/1 D4/1 D4/1 | C4/4',
        'bajo':
            'C3/2 G2/2 | C3/1 E3/1 G2/2 | C3/2 G2/2 | G2/2 D3/2 |'
            'C3/2 G2/2 | C3/1 E3/1 G2/2 | C3/2 G2/2 | C3/4',
        'acomp':
            '[C3,E3]/1 G3/1 [C4,E4]/2 | E3/.5 G3/.5 C4/1 [D3,G3]/2 |'
            '[C3,E3]/2 [B2,D3]/2 | [D3,G3]/2 [B2,D3]/2 |'
            '[C3,E3]/1 G3/1 [C4,E4]/2 | E3/.5 G3/.5 C4/1 [D3,G3]/2 |'
            '[C3,E3]/2 [D3,G3]/2 | [C3,E3,G3]/4',
    },

    # ---------------------------------------------------------------------
    # «Estrellita» · tradicional (Ah! vous dirai-je, maman) · dominio público
    #
    # Doce compases, que es lo que dura la canción. Antes tenía dieciséis porque los
    # inventé para llenar: estirar una canción hasta un número redondo la deja dando
    # vueltas sin terminar.
    #
    # Los acordes cambian a mitad de compás donde la melodía lo pide. La etapa Fácil
    # limita el RASGUEO —solo hacia abajo— , no la armonía: apretar la armonía para que
    # entre un acorde por compás es lo que hacía que no sonara a la canción.
    'practica-estrellita': {
        'bpb': 4,
        'compases': 12,
        # EL RASGUEO SIGUE EL RITMO DE LA MELODÍA.
        #
        # Donde la melodía se mueve en negras, se rasguea en negras; donde sostiene una
        # blanca —el final de cada frase—, el acorde se sostiene con ella: UN rasgueo
        # de dos tiempos, no dos de uno.
        #
        # Esto estaba mal y se notaba al tocar: el final de la canción pedía un Do
        # sostenido y el juego mostraba dos Do seguidos, así que había que cortar el
        # acorde para volver a golpear justo donde la canción respira.
        'acordes':
            'C/1 C/1 C/1 C/1 | F/1 F/1 C/2 |'
            'F/1 F/1 C/1 C/1 | G/1 G/1 C/2 |'
            'C/1 C/1 G/1 G/1 | C/1 C/1 G/2 |'
            'C/1 C/1 G/1 G/1 | C/1 C/1 G/2 |'
            'C/1 C/1 C/1 C/1 | F/1 F/1 C/2 |'
            'F/1 F/1 C/1 C/1 | G/1 G/1 C/2',
        'melodia':
            'C4/1 C4/1 G4/1 G4/1 | A4/1 A4/1 G4/2 |'
            'F4/1 F4/1 E4/1 E4/1 | D4/1 D4/1 C4/2 |'
            'G4/1 G4/1 F4/1 F4/1 | E4/1 E4/1 D4/2 |'
            'G4/1 G4/1 F4/1 F4/1 | E4/1 E4/1 D4/2 |'
            'C4/1 C4/1 G4/1 G4/1 | A4/1 A4/1 G4/2 |'
            'F4/1 F4/1 E4/1 E4/1 | D4/1 D4/1 C4/2',
        # El bajo se mueve: fundamental, quinta, y alguna nota de paso que conecte un
        # acorde con el siguiente.
        'bajo':
            'C3/2 G2/2 | F2/2 C3/2 | F2/2 C3/2 | G2/2 C3/2 |'
            'C3/2 G2/2 | C3/2 G2/2 | C3/1 E3/1 G2/2 | C3/2 G2/2 |'
            'C3/2 E3/2 | F2/2 C3/2 | F2/1 A2/1 C3/2 | G2/2 C3/2',
        # La textura CAMBIA entre secciones: arpegios sueltos en las frases de los
        # extremos, bloques sostenidos en la parte del medio.
        'acomp':
            'E3/.5 G3/.5 C4/1 G3/1 E3/1 | [F3,A3]/2 [E3,G3]/2 |'
            'F3/.5 A3/.5 C4/1 E3/1 G3/1 | [D3,G3]/2 [C3,E3]/2 |'
            'E3/1 G3/1 [D3,G3]/2 | E3/.5 G3/.5 C4/1 [D3,G3]/2 |'
            '[C3,E3]/2 [B2,D3]/2 | E3/1 C4/1 [D3,G3]/2 |'
            'C4/.5 E4/.5 G3/1 E3/1 C4/1 | [F3,A3]/2 [E3,G3]/2 |'
            'F3/1 A3/1 E3/1 G3/1 | [D3,G3]/2 [C3,E3,G3]/2',
    },

    # ---------------------------------------------------------------------
    # «Cumpleaños feliz» · Mildred y Patty Hill (1893) · dominio público desde 2016
    #
    # El primer vals del recorrido: compás de 3, no de 4. `beats_per_bar` viaja hasta el
    # motor y hasta el dibujo de la pista, así que el acento cae donde tiene que caer.
    #
    # La anacrusa («Cum-ple») va DENTRO de un primer compás con silencio, en vez de usar
    # `pickup_beats`: así el compás 1 queda como una entrada rasgueada y el alumno tiene
    # tres tiempos para acomodar la mano antes de que arranque la melodía.
    'practica-cumpleanos': {
        'bpb': 3, 'compases': 9,
        'acordes':
            'C/3 |'
            'C/1 C/1 C/1 | G/2 G/1 | G/1 G/1 G/1 | C/2 C/1 |'
            'C/1 C/1 C/1 | G/1 F/2 | C/2 G/1 | C/3',
        'melodia':
            'r/2 G3/.5 G3/.5 |'
            'A3/1 G3/1 C4/1 | B3/2 G3/.5 G3/.5 | A3/1 G3/1 D4/1 | C4/2 G3/.5 G3/.5 |'
            'G4/1 E4/1 C4/1 | B3/1 A3/1 F4/.5 F4/.5 | E4/1 C4/1 D4/1 | C4/3',
        'bajo':
            'C3/1 G2/1 E3/1 |'
            'C3/1 E3/1 G2/1 | G2/1 D3/1 B2/1 | G2/1 B2/1 D3/1 | C3/1 G2/1 E3/1 |'
            'C3/1 E3/1 G2/1 | G2/1 F2/2 | C3/2 G2/1 | C3/3',
        # Vals: el bajo pisa el 1 y el relleno contesta en el 2 y el 3.
        'acomp':
            'r/1 [E3,G3]/1 [E3,G3]/1 |'
            'r/1 [E3,G3,C4]/1 [E3,G3,C4]/1 | r/1 [D3,G3]/1 [B3,D4]/1 |'
            'r/1 [D3,G3,B3]/1 [D3,G3,B3]/1 | E3/.5 G3/.5 C4/1 [E3,G3]/1 |'
            'r/1 [E3,G3,C4]/1 [E3,G3,C4]/1 | r/1 [D3,G3]/1 [A3,C4]/1 |'
            'r/1 [E3,G3]/1 [D3,G3]/1 | [C3,E3,G3]/3',
    },

    # ---------------------------------------------------------------------
    # «Himno a la alegría» · Beethoven (1824) · dominio público
    # El tema, tal cual, sin adornos: ocho compases, dos frases iguales con final
    # distinto. El Fa del primer compás es nota de paso sobre Do — por eso el rasgueo
    # sí cambia a Fa ahí, que es como se toca de verdad.
    'practica-alegria': {
        'bpb': 4, 'compases': 8,
        'acordes':
            'C/1 C/1 F/1 C/1 | C/1 C/1 C/1 G/1 | C/1 C/1 G/1 C/1 | C/1.5 G/.5 G/2 |'
            'C/1 C/1 F/1 C/1 | C/1 C/1 C/1 G/1 | C/1 C/1 G/1 C/1 | G/1.5 C/.5 C/2',
        'melodia':
            'E4/1 E4/1 F4/1 G4/1 | G4/1 F4/1 E4/1 D4/1 |'
            'C4/1 C4/1 D4/1 E4/1 | E4/1.5 D4/.5 D4/2 |'
            'E4/1 E4/1 F4/1 G4/1 | G4/1 F4/1 E4/1 D4/1 |'
            'C4/1 C4/1 D4/1 E4/1 | D4/1.5 C4/.5 C4/2',
        'bajo':
            'C3/1 G2/1 F2/1 E3/1 | C3/1 E3/1 C3/1 G2/1 |'
            'C3/1 E3/1 G2/1 C3/1 | C3/2 G2/2 |'
            'C3/1 E3/1 F2/1 C3/1 | C3/1 G2/1 E3/1 G2/1 |'
            'C3/1 E3/1 G2/1 C3/1 | G2/2 C3/2',
        'acomp':
            'E3/1 G3/1 [F3,A3]/1 [E3,G3]/1 | [C3,E3,G3]/2 G3/1 [D3,G3]/1 |'
            'E3/.5 G3/.5 C4/1 [D3,G3]/1 [C3,E3]/1 | [C3,E3,G3]/2 [D3,G3]/2 |'
            'C4/1 E4/1 [F3,A3]/1 [E3,G3]/1 | [C3,E3]/1 G3/1 E3/1 [D3,G3]/1 |'
            'E3/1 G3/1 [D3,G3]/1 [C3,E3]/1 | [D3,G3]/2 [C3,E3,G3]/2',
    },

    # ---------------------------------------------------------------------
    # «Cielito lindo» · Quirino Mendoza y Cortés (1882)
    #
    # Solo el ESTRIBILLO —«ay, ay, ay, ay»— que es la parte que todo el mundo reconoce.
    # La copla entera son otros dieciséis compases y no aportan nada al ejercicio.
    #
    # Melodía y cifrado tomados de la transcripción ABC de John Chambers (MIT),
    # `Mexico/song/Cielito_Lindo-C-32-.abc`. Los G7 se tocan como G: la séptima la pone
    # el acompañamiento, el alumno solo forma la tríada que ya sabe.
    #
    # Acá se ve para qué sirve la ligadura: el «ay» del compás 3 dura SEIS tiempos. Es
    # un rasgueo de seis, no dos de tres.
    'practica-cielito-lindo': {
        'bpb': 3, 'compases': 16,
        'acordes':
            'C/3 | C/2 C/1 | F/3 | ~/3 |'
            'F/3 | G/2 C/1 | C/1 C/2 | ~/2 C/1 |'
            'C/2 C/1 | C/1 C/1 C/1 | F/1 F/1 G/1 | ~/1 G/1 G/1 |'
            'G/1 G/1 G/1 | ~/1 G/1 G/1 | C/1 C/2 | ~/3',
        'melodia':
            'E5/3 | D5/2 C5/1 | A4/3 | ~/3 |'
            'D5/3 | D5/2 C5/.5 C5/.5 | E5/1 C5/2 | ~/2 G4/1 |'
            'A4/2 G4/1 | A4/1 A4/1 G4/.5 G4/.5 | F5/1 F5/1 D5/1 | ~/1 B4/1 G4/1 |'
            'A4/1 A4/1 G4/1 | ~/1 F4/1 G4/1 | E4/.5 D4/.5 C4/2 | ~/3',
        'bajo':
            'C3/1 G2/1 E3/1 | C3/1 E3/1 G2/1 | F2/1 C3/1 A2/1 | F2/1 A2/1 C3/1 |'
            'F2/1 C3/1 A2/1 | G2/2 C3/1 | C3/1 G2/1 E3/1 | C3/1 E3/1 G2/1 |'
            'C3/1 G2/1 E3/1 | C3/1 E3/1 G2/1 | F2/1 A2/1 G2/1 | G2/1 D3/1 B2/1 |'
            'G2/1 B2/1 D3/1 | G2/1 D3/1 F2/1 | C3/1 G2/1 E3/1 | C3/3',
        'acomp':
            'r/1 [E3,G3]/1 [E3,G3]/1 | r/1 [E3,G3,C4]/1 [E3,G3]/1 |'
            'r/1 [A3,C4]/1 [A3,C4]/1 | r/1 [F3,A3]/1 [A3,C4]/1 |'
            'r/1 [A3,C4]/1 [C4,F4]/1 | r/1 [D3,G3,B3]/1 [E3,G3]/1 |'
            'r/1 [E3,G3]/1 [E3,G3,C4]/1 | E3/.5 G3/.5 C4/1 [E3,G3]/1 |'
            'r/1 [E3,G3]/1 [E3,G3]/1 | r/1 [E3,G3,C4]/1 [E3,G3]/1 |'
            'r/1 [A3,C4]/1 [D3,G3]/1 | r/1 [D3,G3,B3]/1 [D3,G3]/1 |'
            'r/1 [D3,G3]/1 [B3,D4]/1 | r/1 [D3,F3,G3]/1 [D3,G3]/1 |'
            'r/1 [E3,G3]/1 [E3,G3,C4]/1 | [C3,E3,G3]/3',
    },

    # ---------------------------------------------------------------------
    # «Navidad, Navidad» (Jingle Bells) · James Lord Pierpont (1857) · dominio público
    # El estribillo. Etapa media: la melodía tiene corcheas y puntillos, así que el
    # rasgueo también — es lo que la separa de las de etapa fácil.
    'practica-navidad': {
        'bpb': 4, 'compases': 8,
        'acordes':
            'C/1 C/1 C/2 | C/1 C/1 C/2 | C/1 C/1 C/1.5 G/.5 | C/4 |'
            'F/1 F/1 F/1.5 F/.5 | F/1 C/1 C/1 C/1 | C/1 G/1 G/1 C/1 | G/2 C/2',
        'melodia':
            'E4/1 E4/1 E4/2 | E4/1 E4/1 E4/2 | E4/1 G4/1 C4/1.5 D4/.5 | E4/4 |'
            'F4/1 F4/1 F4/1.5 F4/.5 | F4/1 E4/1 E4/1 E4/.5 E4/.5 |'
            'E4/1 D4/1 D4/1 E4/1 | D4/2 G4/2',
        'bajo':
            'C3/1 G2/1 E3/2 | C3/1 E3/1 G2/2 | C3/1 E3/1 G2/2 | C3/2 G2/2 |'
            'F2/1 C3/1 A2/2 | F2/1 C3/1 E3/1 G2/1 |'
            'C3/1 G2/1 D3/1 E3/1 | G2/2 C3/2',
        'acomp':
            '[C3,E3]/1 G3/1 [C4,E4]/2 | E3/.5 G3/.5 C4/1 [E3,G3]/2 |'
            '[C3,E3]/1 G3/1 [D3,G3]/2 | [C3,E3,G3]/2 G3/1 E3/1 |'
            '[F3,A3]/1 C4/1 [F3,A3]/2 | F3/.5 A3/.5 C4/1 [E3,G3]/2 |'
            '[C3,E3]/1 [D3,G3]/1 [D3,G3]/1 [C3,E3]/1 | [D3,G3]/2 [C3,E3,G3]/2',
    },
}
