# Defensa — Mi Granjita (Vue + Phaser + Pinia)

Jueves 19 de noviembre · 15 minutos por pareja · cada integrante explica su parte y responde preguntas de las dos.

> Abre este archivo en VS Code con **Ctrl + Shift + V** para verlo con formato.

---

## 1. Antes de entrar (hazlo con 30 minutos de margen)

- [ ] Laragon abierto → **Iniciar todo** (Apache y MySQL en verde).
- [ ] Navegador en `http://localhost/mi-granjita2/` → pulsar **Ctrl + F5** → debe decir **«MySQL conectado»**.
- [ ] Dos granjas ya creadas en el mismo pueblo (por ejemplo `CLASE-3B`): una por integrante, con distinto personaje.
- [ ] Una segunda ventana en **incógnito** (Ctrl + Shift + N) con la otra granja abierta, para mostrar el multijugador.
- [ ] Jugar 2 o 3 días antes para tener cosechas, monedas, alguna parcela comprada y un ranking con progreso.
- [ ] VS Code con la carpeta del proyecto abierta y **estas pestañas listas**:
  `src/data/cultivos.json` · `src/events/eventos.js` · `src/stores/farmStore.js` · `src/components/App.js` · `src/components/FarmPanel.js` · `src/scenes/FarmScene.js` · `src/scenes/SummaryScene.js`
- [ ] Cargador conectado y volumen bajo (por la música y los efectos).
- [ ] Estar frente al aula **10 minutos antes** de su hora.

---

## 2. Guion de los 15 minutos

| Minuto | Quién | Qué hacer |
|---|---|---|
| 0–1 | Integrante 1 | Presentar la idea: plantar, regar, cosechar, vender y comprar semillas por turnos; multijugador por «pueblo». |
| 1–4 | Integrante 1 | **Jugar**: bienvenida (personaje y pueblo) → plantar → regar → **Terminar día** → resumen → cosechar → vender en Inventario → **comprar una parcela** (sube el progreso) → comprar semillas en Tienda. |
| 4–5 | Integrante 2 | Mostrar el pueblo: ranking en vivo y **regalar semillas** a la otra ventana. |
| 5–8 | Integrante 1 | Explicar **Vue + Pinia** (sección 4). |
| 8–11 | Integrante 2 | Explicar **Phaser + eventos** (sección 5). |
| 11–13 | Los dos | **Demostración «solo con datos»**: agregar un cultivo y un personaje en el JSON (sección 7). |
| 13–15 | Los dos | Preguntas. |

---

## 3. Lo que pide la profesora y dónde está

| Requisito | Dónde se ve en el juego | Dónde está en el código |
|---|---|---|
| Pantallas de Vue | Bienvenida, Granja, Tienda, Inventario, Calendario, Pueblo | `src/components/` (un archivo por pantalla) · arranque en `src/main.js:5` |
| Escenas de Phaser | Boot → Menu → Farm → Summary | `src/scenes/BootScene.js`, `MenuScene.js`, `FarmScene.js`, `SummaryScene.js` · se crea el juego en `src/components/App.js:33` |
| Pinia guarda lo que muestra la interfaz | Día, monedas, progreso, inventario, parcelas, ranking | `src/stores/farmStore.js:85` y `src/stores/villageStore.js:10` · Pinia se instala en `src/main.js:6` |
| Eventos entre Vue y Phaser | Clic en parcela, compra de parcela, terminar día, resumen, regalos | Lista de nombres: `src/events/eventos.js:5` · `emit` en la línea 29 · `on` en la línea 31 |
| Datos en JSON, no en el código | 30 cultivos, 3 eventos, 3 personajes, herramientas y configuración (precio de parcela, parcelas iniciales, monedas…) | `src/data/cultivos.json` · se carga en `src/data/catalogo.js:8` |
| Progreso 0–100 por parcelas | Barra «Progreso» arriba y en «Tu día» | Cálculo: `src/data/catalogo.js:41` (`G.progressFor`) · compra: `farmStore.js:131` (`buyPlot`) |
| Adaptado a celular | Pestañas abajo y barra superior en dos filas | Final de `styles.css` (sección «Celular y tablet») |
| Guardado | Lista de granjas en la bienvenida | `src/stores/api.js:32` (guardado automático) · `api/partidas.php` · tablas en `database/mi_granjita.sql` |

**Secciones de `src/data/cultivos.json`:** `configuracion` (línea 2; `precioParcela` en la 10) · `cultivos` (28) · `eventosCalendario` (360) · `personajes` (385) · `herramientas` (414).

---

## 4. Integrante 1 — Vue y Pinia

**Idea clave:** Vue dibuja las pantallas, botones y textos. Pinia es la **fuente única de los datos y de las reglas**. Vue nunca toca sprites de Phaser.

### Vue: pantallas (`src/components/`)

| Pantalla | Archivo | Qué mostrar |
|---|---|---|
| Raíz y HUD | `App.js:53` | Barra superior con día, monedas, puntos y ranking; menú lateral; las vistas con `v-show` siguen montadas. |
| Bienvenida | `WelcomeScreen.js:32` (`begin`) · selector en la línea 136 | Elige personaje, nombre y pueblo; crea la partida en MySQL. |
| Granja | `FarmPanel.js` | Herramientas, lienzo de Phaser y semillas (`v-for` en la línea 111). Al tocar una parcela bloqueada pide confirmar la compra (`buyPlot`, línea 50). |
| Tienda | `ShopPanel.js:9` (`available`) · tarjeta de parcelas en la línea 28 · `v-for` en la línea 37 | Comprar parcelas y una tarjeta por cultivo desbloqueado, **recorriendo el JSON**. |
| Inventario | `InventoryPanel.js:19` (`sell`) | Elegir cuántas unidades vender. |
| Calendario | `CalendarPanel.js:33` | `v-for` sobre los eventos del JSON. |
| Pueblo | `VillagePanel.js:47` | Ranking en vivo (`v-for`) y formulario de regalo. |

### Pinia: datos y reglas (`src/stores/farmStore.js`)

- **Estado inicial:** `freshState`, en la línea 14. Del JSON (`configuracion`) lee las monedas, las semillas, cuántas parcelas empiezan compradas (3) y qué tiene cada una. Las demás quedan bloqueadas (`status: 'locked'`).
- **Reglas (acciones):**
  - `plantPlot` (97), `waterPlot` (110), `harvestPlot` (118), `buySeed` (143), `sellCrop` (152).
  - **`buyPlot` (131):** si alcanzan las monedas, desbloquea la parcela, recalcula el progreso y emite `plot-bought`. Con las 16 parcelas, emite `game-won`.
  - `endDay` (162): emite `day-ended` en la línea 180.
- **Pueblo (multijugador):** `src/stores/villageStore.js`. `poll` (30) pregunta cada 4 segundos y `sendGift` (49) envía un regalo.
- **Guardado:** `src/stores/api.js`. Usa `fetch` a PHP (línea 5) y `G.saver` (32) junta los cambios cada 450 ms y guarda en MySQL.

### Prueba de Pinia: cada dato y la pantalla que lo muestra

`day` → HUD y Calendario · `coins` → HUD, Tienda e Inventario · `score` (progreso 0–100) → HUD, «Tu día» y Tienda · `ownedPlots` (getter) → «Tu día» y Tienda · `seedInventory` y `harvestInventory` → Semillas e Inventario · `plots` → detalle de parcela · `selectedToolId` → bandeja de herramientas · `character` y `gameName` → HUD · `logs` → Actividad · `village.players` → Ranking.

**No van en Pinia:** la posición del personaje, los sprites, las animaciones ni las coordenadas de las celdas. Son de Phaser.

---

## 5. Integrante 2 — Phaser y eventos

**Idea clave:** Phaser **solo dibuja y anima**. No lee Pinia ni toca el DOM. Recibe los datos por eventos y avisa a Vue con eventos.

### Escenas

| Escena | Archivo | Qué hace |
|---|---|---|
| Boot | `BootScene.js:8` | Arranca y pasa a Menu. |
| Menu | `MenuScene.js:11` | Muestra los personajes del JSON y espera `game-started` para abrir Farm. |
| Farm | `FarmScene.js:12` (`create`) | Terreno 4 × 4 (con parcelas bloqueadas), plantas, personaje, vecinos y animaciones. |
| Summary | `SummaryScene.js:10` | Resumen del día o de la victoria; el botón emite `summary-closed` (línea 30). |

### Partes de FarmScene para mostrar

- **Escucha los eventos:** `listen(this, [...])`, en la línea 30.
- **Clic en una parcela:** emite `plot-clicked`, en la línea 154. Vue decide qué hacer y Pinia aplica la regla. Solo cuenta si el clic es sobre el lienzo, no sobre un diálogo de Vue que lo tape.
- **Convierte coordenadas en número de parcela:** `plotAt`, en la línea 74. Así funciona arrastrar una semilla.
- **Redibuja el terreno:** `drawBoard`, en la línea 104. Usa la copia de las parcelas que llega en `farm-updated`. Las bloqueadas se dibujan con candado y precio (línea 121).
- **Animación de crecimiento:** `plant.setScale(.35)` pasa a 1, en la línea 137.
- **Dibuja cada planta según su `forma` y `color` del JSON:** `drawPlant`, en la línea 160.
- **Al terminar el día:** `onDayEnded` (62) muestra la lluvia, hace volver al personaje y abre Summary.
- **Personaje que camina:** `walkTo` (191). **Vecinos en línea:** `drawNeighbors` (202).
- **Personajes dibujados desde el JSON:** `src/scenes/dibujos.js:10`.

### Tabla de eventos (`src/events/eventos.js`)

| Evento | Emite | Escucha | Datos |
|---|---|---|---|
| `game-started` | Vue (App) | Phaser Menu → abre Farm | `{ saveName, newGame, personaje, estado }` |
| `game-exited` | Vue (App) | Phaser Farm → vuelve a Menu | `{}` |
| `farm-updated` | Vue (App, cuando cambia Pinia) | Phaser Farm redibuja | `{ plots, selectedToolId, personaje, day, plotPrice }` |
| `plot-clicked` | Phaser Farm | Vue FarmPanel | `{ plotId }` |
| `plot-focused` | Vue FarmPanel | Phaser Farm (resalta) | `{ plotId }` |
| `seed-dropped` | Vue (arrastrar) | Phaser Farm | `{ cropId, relX, relY }` |
| `seed-dropped-on-plot` | Phaser Farm | Vue FarmPanel | `{ cropId, plotId }` |
| `crop-planted` / `plot-watered` / `crop-harvested` | Pinia | Phaser (personaje y destellos) | `{ plotId, ... }` |
| `plot-bought` | Pinia | Phaser (personaje camina y destellos) | `{ plotId, owned }` |
| `item-sold` | Pinia | Phaser (monedas) | `{ cropId, quantity, earned }` |
| `day-ended` | Pinia | Phaser (anima y abre Summary) y Vue | `{ day, grownPlots, maturedPlots, unwateredPlots, events }` |
| `game-won` | Pinia (al tener las 16 parcelas) | Phaser Summary y Vue | `{ score, plots }` |
| `summary-closed` | Phaser Summary | Vue (habilita «Terminar día») | `{}` |
| `village-updated` | Pinia del pueblo | Phaser (dibuja vecinos) | `{ pueblo, vecinos }` |
| `gift-sent` / `gift-received` | Pinia del pueblo | Phaser (caja de regalo) y Vue | `{ cropId, cantidad, ... }` |

**Dónde se conectan:**
- Vue avisa a Phaser en `App.js:37`: cada cambio de Pinia emite `farm-updated`.
- Vue escucha a Phaser en `FarmPanel.js:81`: `plot-clicked`.

---

## 6. Flujo de «Terminar día» (para explicarlo con el código abierto)

1. El botón llama a `farm.endDay()` (`farmStore.js:162`).
2. Cada parcela regada resta un día; si llega a 0 pasa a `ready`. Las no regadas no avanzan.
3. Pinia borra el riego, suma el día y, si el día nuevo tiene lluvia, riega las parcelas.
4. Pinia emite `day-ended` (línea 180).
5. Phaser (`FarmScene.js:62`) hace crecer las plantas con una animación de escala, muestra la lluvia y abre **Summary**.
6. Vue (`App.js:39`) bloquea el botón hasta recibir `summary-closed`, y la suscripción de Pinia guarda en MySQL.

---

## 7. Demostración: agregar contenido solo con datos

> Se edita **solo** `src/data/cultivos.json`. No se toca ningún `.js` ni `.php`.

### A) Un cultivo nuevo (como agregar un «nivel» o un objeto)

En `src/data/cultivos.json`, busca el último cultivo (**Cereza**, que termina en la línea 358). Después de su `}`, escribe una **coma** y pega:

```json
    {
      "id": "kiwi",
      "nombre": "Kiwi",
      "diasCrecimiento": 2,
      "precioSemilla": 9,
      "precioVenta": 24,
      "diaDesbloqueo": 1,
      "descripcion": "Fruta peluda por fuera y dulce por dentro.",
      "forma": "oval",
      "color": "#8a9a3c"
    }
```

Guarda (**Ctrl + S**) y recarga el juego (**Ctrl + F5**). Qué cambia:
- El Kiwi aparece en la **Tienda** con su ilustración, que se genera con `forma` y `color`.
- También aparece en las **semillas** y en el **Inventario**.
- Se puede plantar, y Phaser lo dibuja en el terreno.
- La meta pasa sola a **31 variedades**.

Valores válidos de `forma`: `raiz`, `redondo`, `oval`, `racimo`, `bulbo`, `hoja`, `vaina`, `flor`, `calabaza`.

### B) Una skin nueva (personaje)

Busca el último personaje (**Lanita**, la oveja). Después de su `}`, escribe una **coma** y pega:

```json
    {
      "id": "pantera",
      "nombre": "Sombra",
      "especie": "Pantera",
      "forma": "gato",
      "color": "#3b3540",
      "detalle": "#d9c7f0",
      "descripcion": "Elegante y sigilosa en el huerto."
    }
```

Guarda y recarga:
- La Pantera aparece en la **bienvenida** y en el **menú de Phaser**.
- Se puede crear una granja con ella. Se ve en el terreno, en la barra superior y en el ranking.
- **MySQL la guarda**, porque PHP lee la lista de personajes del mismo JSON (`api/db.php:11`).

Valores válidos de `forma`: `gato`, `conejo`, `oveja`.

### C) Cambiar el precio de las parcelas (lo más rápido)

En la línea 10 cambia `"precioParcela": 12` por `"precioParcela": 20`, guarda y recarga: las parcelas bloqueadas, el diálogo y la Tienda pasan a decir 20. También puedes cambiar `"parcelasCompradasIniciales": 3` para empezar con más o menos terreno en una partida nueva.

### D) Un evento de calendario más (opcional)

En `eventosCalendario`, agrega otra lluvia el día 1 de la semana:

```json
    { "dia": 1, "tipo": "lluvia", "nombre": "Llovizna", "descripcion": "Riega las parcelas plantadas.", "icon": "cloud-drizzle" }
```

### Después de la demostración

Pulsa **Ctrl + Z** en VS Code hasta volver al original y guarda. El juego **no se rompe** aunque queden granjas guardadas con kiwi o con la pantera.

**Cuidado con el JSON:** una coma de más o de menos lo rompe. Si la pantalla queda en blanco, revisa la coma antes de lo que pegaste. VS Code marca el error en rojo.

**Lo que sí requeriría código, y por qué está bien:** una `forma` nueva de dibujo, una herramienta con una acción nueva o un **tipo** de evento con un efecto nuevo. Eso es comportamiento, no datos. Todo lo que sea contenido (cultivos, precios, días, skins, eventos de tipos existentes, monedas y semillas iniciales, precio de las parcelas, parcelas iniciales, meta de progreso, días de la semana) está en el JSON.

---

## 8. Preguntas probables y respuestas cortas

**Para los dos**

- **¿Cómo se gana y cómo se calcula el progreso?** Se empieza con 3 parcelas y cada una nueva cuesta 12 monedas (`precioParcela` en el JSON). El progreso es `parcelas compradas / 16 × 100` (`G.progressFor`, `catalogo.js:41`). Al tener las 16 llega a 100 y se gana.
- **¿Por qué el progreso no depende de las cosechas?** Porque así el ciclo del juego queda claro: cosechar y vender da monedas, y las monedas se invierten en terreno.

- **¿Por qué Pinia y no variables en Vue?** Porque varias pantallas (HUD, Tienda, Inventario, Granja) leen los mismos datos. Pinia es una sola fuente: si cambian las monedas, todas se actualizan.
- **¿Cómo se comunican Vue y Phaser?** Solo con eventos con nombre (`src/events/eventos.js`). Por ejemplo, Phaser emite `plot-clicked`, Vue lo recibe, Pinia aplica la regla, y Vue emite `farm-updated` para que Phaser redibuje.
- **¿Qué pasa si el catálogo pasa de 30 a 300 cultivos?** Solo crece el JSON. Tienda, Inventario y selector usan `v-for`; Phaser dibuja por `forma` y `color`; la meta usa la cantidad de cultivos.
- **¿Dónde se guarda la partida?** En MySQL (tabla `partidas`, columna `estado_json`) a través de `api/partidas.php`, con una copia en el navegador. Se guarda tras cada cambio, agrupando los cambios cada 450 ms.
- **¿Cómo funciona el multijugador?** Cada granja tiene un código de pueblo. Cada 4 s el juego pregunta a `api/pueblo.php` quién está en línea, el ranking y los regalos pendientes. No hace falta un servidor de WebSockets.

**Para Integrante 1 (Vue y Pinia)**

- **¿Qué es un getter y una acción?** Getter: dato calculado, como `seedCount`. Acción: función que cambia el estado con una regla, como `plantPlot`.
- **¿Por qué `v-show` y no `v-if` en las vistas?** Para que los paneles y el lienzo de Phaser no se destruyan al cambiar de sección.
- **¿Cómo evitas comprar sin dinero?** `buySeed` (`farmStore.js:143`) y `buyPlot` (131) comparan `coins` con el precio antes de restar, y los botones se desactivan con `:disabled`.
- **¿Cómo se adaptó a celular?** Con *media queries* en `styles.css`: en pantallas angostas el menú pasa a pestañas abajo y la barra superior se acomoda en dos filas. Phaser escala el lienzo con `Scale.FIT`.
- **¿Cómo llega el JSON a Vue?** `catalogo.js` lo lee con `fetch`. Si se abre como archivo local, usa la copia que está dentro de `index.html`.

**Para Integrante 2 (Phaser)**

- **¿Por qué Phaser no lee Pinia?** Por la regla de arquitectura: Phaser solo dibuja. Recibe una copia de las parcelas en `farm-updated`.
- **¿Cómo sabe en qué parcela se hizo clic?** Cada parcela tiene una zona interactiva. `plotAt` (línea 74) convierte coordenadas en número de parcela.
- **¿Cómo se anima el crecimiento?** Con un *tween* de escala de 0.35 a 1 en las parcelas que llegan en `grownPlots` (línea 137).
- **¿Cómo se dibuja una parcela bloqueada?** Phaser recibe `status: 'locked'` en `farm-updated` y dibuja pasto con un candado y el precio (línea 121). No sabe de monedas: solo dibuja; la compra la decide Pinia.
- **¿Por qué Summary es otra escena?** Se lanza encima de Farm con `scene.launch`. Al cerrarla emite `summary-closed` y Farm sigue igual debajo.
- **¿Cómo se agrega una escena nueva?** Se crea el archivo en `src/scenes/`, se agrega a `G.scenes` y se carga su `<script>` en `index.html`.

---

## 9. Si algo falla en el aula

| Problema | Solución rápida |
|---|---|
| Dice «Sin conexión a MySQL» | En Laragon pulsa **Iniciar todo** y luego **Reintentar** en la bienvenida. |
| La página no cambia después de editar | **Ctrl + F5**. |
| Pantalla en blanco tras editar el JSON | Error de coma: **Ctrl + Z** en VS Code, guarda y recarga. |
| No hay internet | No importa: el juego funciona sin internet. |
| Falla MySQL por completo | Abre `index.html` directamente: funciona con el guardado del navegador (sin multijugador). |
