# Mi Granjita — granja por turnos multijugador

Juego de granja hecho con **Vue 3**, **Pinia** y **Phaser 3**, con **PHP + MySQL (Laragon)** para guardar las granjas y jugar con otras personas.

- **Vue** presenta las pantallas: bienvenida, granja, tienda, inventario, calendario y pueblo.
- **Pinia** guarda el estado y aplica las reglas (día, monedas, inventario, parcelas, personaje, ranking).
- **Phaser** dibuja el terreno 4 × 4, el personaje, los vecinos y las animaciones.
- **Eventos** (`src/events/eventos.js`) son el único puente entre Vue y Phaser.

## Novedades: historia, estilo kawaii y sonido

- **Historia al entrar:** antes de la bienvenida se cuenta cómo Michi (gato), Saltarín (conejo) y Lanita (oveja)
  heredan la granjita dormida de la Abuela Margarita. Se avanza tocando la escena, con «Siguiente» o con Espacio/Enter;
  «Saltar historia» va directo a la bienvenida, y en la bienvenida está «Ver la historia otra vez».
  El texto se edita en la lista `PAGINAS` de `src/components/StoryIntro.js`.
- **Estilo kawaii pastel:** rosa, lavanda, menta y crema, con lunares, corazones y letra redondeada (Fredoka, incluida en `libs/fonts`).
  Los tres personajes son diseños propios; el mismo dibujo SVG (`src/components/arte.js`) se usa en Vue y en Phaser.
  Los cultivos tienen carita.
- **Música y efectos** (`src/audio/sonido.js`): se generan con la Web Audio API, sin archivos de audio.
  Hay una canción de cajita musical para la historia y la bienvenida, y otra más alegre para la granja.
  Suenan la pala, la regadera, la cesta, vender, comprar parcela, terminar el día, ganar, los regalos, los botones y los avisos,
  y cada personaje tiene su «vocecita» cuando habla en la historia.
  Los botones **Música** y **Efectos** (abajo a la izquierda, o en la barra superior durante el juego) los activan o desactivan,
  y la elección se recuerda en el navegador.

## Iniciar con Laragon

1. Copia la carpeta completa a `C:\laragon\www\mi-granjita`.
2. En Laragon pulsa **Iniciar todo** (Apache y MySQL).
3. Abre phpMyAdmin e importa `database/mi_granjita.sql` (crea la base `mi_granjita` con las tablas `partidas` y `regalos`).
   Si ya tenías la versión anterior importada, no hace falta borrarla: la API agrega sola las columnas nuevas.
4. Si MySQL tiene contraseña, copia `api/config.local.example.php` como `api/config.local.php` y escribe allí tu contraseña.
   (Si ya tenías tu `config.local.php`, vuelve a ponerlo en `api/`; no viene en el zip para no compartir la contraseña.)
5. Abre `http://localhost/mi-granjita/`.

> Laravel no es necesario: Laragon ya trae Apache, PHP y MySQL, y la API está hecha en PHP con PDO.

## Jugar en multijugador

1. Cada persona abre el juego (en la misma computadora con otra pestaña/navegador, o desde otra computadora de la red con `http://IP-DE-LA-PC/mi-granjita/`).
2. Elige **gato, conejo u oveja**, escribe el nombre de su granja y el **mismo código de pueblo** (por ejemplo `CLASE-3B`).
3. En la vista **Pueblo** se ve el ranking en vivo (se actualiza cada 4 s), quién está en línea y se pueden **regalar semillas** (hasta 5 a la vez). Así un vecino puede plantar un cultivo antes de que se desbloquee en su tienda.
4. Los vecinos en línea aparecen arriba del terreno en Phaser.

Para que otra computadora entre, la PC con Laragon debe permitir conexiones a Apache en el firewall de Windows.

## Publicar en internet

La guía para subirlo a Vercel (versión para un jugador) o a tu VPS con Docker o a mano (versión completa con multijugador) está en `PUBLICAR.md`.

## Defensa

La guía para presentar el proyecto (qué mostrar, dónde está cada cosa en el código y cómo agregar contenido solo con el JSON) está en `DEFENSA.md`.

## Historia en lugar de video

El video tutorial se quitó: ahora la historia explica cómo jugar. Se puede volver a ver con «Ver la historia otra vez» en la bienvenida y con el botón **Historia** de la barra superior durante la partida.

## Cómo jugar

1. **Plantar:** elige una semilla y la pala; arrástrala a una parcela vacía o tócala.
2. **Regar:** con la regadera toca una parcela en crecimiento. Cada día regado avanza un día.
3. **Terminar día:** el resumen muestra qué maduró y qué no creció por falta de agua.
4. **Cosechar:** toca una parcela dorada (LISTA). Suma 5 puntos.
5. **Vender y comprar:** en Inventario eliges cuántas vender; en Tienda compras semillas.
6. **Ganar:** 100 puntos y las 30 variedades cosechadas. Cada 5 días se desbloquean 3 cultivos.

Eventos semanales: día 3 lluvia (riega sola), día 5 feria (venta ×2), día 7 mercado (semillas −25%).

## Archivos

```
index.html                 Vue monta App aquí; copia embebida del JSON para abrir sin servidor
styles.css
src/components/            Vue: App, StoryIntro (historia), SoundControls (música/efectos), WelcomeScreen,
                           FarmPanel, ShopPanel, InventoryPanel, CalendarPanel, VillagePanel,
                           comunes (iconos, personajes), arte (SVG de personajes y cultivos)
src/audio/sonido.js        música y efectos de sonido (Web Audio API)
src/scenes/                Phaser: BootScene, MenuScene, FarmScene, SummaryScene, dibujos, comun
src/stores/                Pinia: farmStore (reglas), villageStore (pueblo), api (PHP + guardado)
src/data/cultivos.json     configuración inicial, 30 cultivos, 3 eventos, 3 personajes y herramientas
                           ← lo único que se edita para agregar contenido
src/data/catalogo.js       carga el JSON
src/events/eventos.js      nombres de todos los eventos
src/main.js                arranque
api/                       db.php, partidas.php (CRUD), pueblo.php (ranking y regalos), config
database/mi_granjita.sql   tablas partidas y regalos
libs/                      Vue, VueDemi, Pinia, Phaser, Lucide, SweetAlert2 y la letra Fredoka (fonts/) con sus licencias
```

Desde Laragon basta con editar `src/data/cultivos.json`. La copia dentro de `<script id="crop-data">` en `index.html` solo se usa al abrir el archivo sin servidor.

Sin Laragon puedes abrir `index.html` directamente: funciona con un único guardado en el navegador y sin multijugador.
