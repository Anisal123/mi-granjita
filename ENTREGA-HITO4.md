# Proyecto 15: Granja de cultivos por turnos (Mi Granjita, multijugador)

El documento completo con diagramas está en `Prototipo-Mi-Granjita.docx`. Este archivo resume las seis partes.

## 1. Terreno y pantallas

Bienvenida (Vue): elegir personaje (gato, conejo u oveja), nombre de la granja y código del pueblo; lista de granjas en MySQL para **Jugar**, cambiar personaje, **Renombrar** o **Borrar**. Al jugar, Vue emite `game-started` y Phaser pasa de Menu a Farm.

Granja: HUD arriba (personaje y nombre a la izquierda; día, monedas, puntos y ranking al centro; «Terminar día» a la derecha), menú lateral (Granja, Tienda, Inventario, Calendario, Pueblo), herramientas, lienzo de Phaser con el terreno 4 × 4, semillas, detalle de parcela, «Tu día» y actividad. Tienda, Inventario, Calendario y Pueblo son paneles de Vue que permanecen montados.

Estado inicial: 14 parcelas vacías, una plantada con tomate (parcela 6) y una lista con zanahoria (parcela 15).

## Entidades

- **Parcela:** `id` (0–15), `status` (`empty`, `growing`, `ready`), `cropId`, `remaining`, `watered`.
- **Cultivo:** `nombre`, `diasCrecimiento`, `precioSemilla`, `precioVenta`, `diaDesbloqueo`, `forma`, `color` (JSON).
- **Herramienta:** pala, regadera, cesta.
- **Evento del calendario:** día de la semana, tipo, nombre, descripción y efecto (JSON).
- **Personaje:** gato, conejo u oveja (skin del JSON con forma y colores).
- **Pueblo / vecino:** sala multijugador por código; ranking y regalos de semillas.

## 2. Pinia y Phaser

| Dato | Va en Pinia | Va en Phaser |
|---|---|---|
| Día actual | Sí: lo muestran HUD, calendario y tienda; decide eventos y desbloqueos. | Solo lo recibe en `day-ended` para el resumen. |
| Dinero | Sí: HUD, Tienda e Inventario; valida compras. | No; solo anima monedas con `item-sold`. |
| Inventario | Sí: Tienda, Inventario y selector leen los mismos valores. | No. |
| Estado de cada parcela | Sí: reglas del juego y se guarda en MySQL. | Recibe una copia en `farm-updated` para dibujar. |
| Posición de las parcelas | Solo el id estable 0–15. | Sí: fila, columna, coordenadas y zonas de clic. |
| Animación de crecimiento | No; solo indica `grownPlots`. | Sí: escala, lluvia y destellos. |
| Personaje | Sí: HUD y ranking; se guarda. | Dibuja el sprite y su posición (camina a la parcela). |
| Jugadores del pueblo | Sí (`villageStore`): ranking y en línea. | Dibuja los vecinos en línea. |

## 3. JSON

`src/data/cultivos.json` contiene 30 cultivos, 3 eventos semanales y 3 personajes. Ejemplo:

```json
{
  "cultivos": [
    { "id": "zanahoria", "nombre": "Zanahoria", "diasCrecimiento": 1, "precioSemilla": 5, "precioVenta": 12, "diaDesbloqueo": 1, "forma": "raiz", "color": "#ed883c" },
    { "id": "tomate", "nombre": "Tomate", "diasCrecimiento": 2, "precioSemilla": 8, "precioVenta": 18, "diaDesbloqueo": 1, "forma": "redondo", "color": "#e85d48" },
    { "id": "calabaza", "nombre": "Calabaza", "diasCrecimiento": 3, "precioSemilla": 12, "precioVenta": 30, "diaDesbloqueo": 1, "forma": "calabaza", "color": "#ec873a" }
  ],
  "eventosCalendario": [
    { "dia": 5, "tipo": "feria", "nombre": "Feria del pueblo", "descripcion": "Las cosechas se venden por el doble de su precio habitual.", "multiplicadorVenta": 2, "icon": "party-popper" }
  ],
  "personajes": [
    { "id": "conejo", "nombre": "Saltarín", "especie": "Conejo", "forma": "conejo", "color": "#e9e1d6", "detalle": "#f6b7c4" }
  ]
}
```

## 4. Flujo de `day-ended`

```text
Vue: «Terminar día» → Pinia recorre las parcelas growing
  ¿Regada? No → mantiene días (unwateredPlots)
           Sí → remaining − 1 (grownPlots) → ¿0? → ready (maturedPlots)
Pinia borra el riego, suma el día y, si el día nuevo tiene lluvia, riega lo que crece
Pinia emite day-ended { day, grownPlots, maturedPlots, unwateredPlots, events }
Phaser: redibuja (farm-updated), anima la escala de lo que creció, lluvia, el personaje vuelve a casa, abre Summary
Vue: aviso, bloquea el botón hasta summary-closed y guarda en MySQL
```

Eventos: `game-started`, `game-exited`, `farm-updated`, `plot-clicked`, `plot-focused`, `seed-dropped`, `seed-dropped-on-plot`, `crop-planted`, `plot-watered`, `crop-harvested`, `item-sold`, `day-ended`, `game-won`, `summary-closed`, `village-updated`, `gift-sent`, `gift-received`.

## 5. Guardado

Después de cada cambio de Pinia: copia inmediata en `localStorage` y guardado en MySQL (`api/partidas.php`, tabla `partidas`, columna `estado_json`) agrupando cambios cada 450 ms; también al salir y al ocultar la pestaña. Se guardan nombre, personaje, pueblo, día, monedas, puntos, variedades, herramienta y semilla, inventarios, 16 parcelas y actividad. Los regalos van en la tabla `regalos` (`api/pueblo.php`), que se consulta cada 4 s junto con el ranking.

## 6. Escalabilidad: de 3 a 30 cultivos

Solo cambia `src/data/cultivos.json` (y su copia en `index.html`): se agregan objetos con nombre, días, precios, día de desbloqueo, forma y color. Los componentes de Vue recorren el catálogo con `v-for`, las reglas de Pinia leen los campos del dato y Phaser dibuja cada planta según su forma y color, así que no se toca código. La API guarda el estado como JSON, sin una columna por cultivo.
