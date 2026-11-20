// Componente raíz: barra superior (HUD), menú lateral y las vistas.
// Conecta Pinia con Phaser solo mediante eventos (farm-updated, game-started, game-exited…).
window.Granja = window.Granja || {};
(G => {
  const { ref, computed, watch, onMounted, onBeforeUnmount } = Vue;
  const E = G.EVENTOS;

  G.components.App = {
    name: 'App',
    setup() {
      const farm = G.useFarmStore(); const village = G.useVillageStore();
      const gameStarted = ref(false); const showStory = ref(true); const panel = ref('farm'); const summaryOpen = ref(false); const online = ref(false);
      const currentEvent = computed(() => G.eventsForDay(farm.day)[0] || null);
      const character = computed(() => G.data.characterMap[farm.character] || G.data.characters[0]);
      const snapshot = () => ({ plots: JSON.parse(JSON.stringify(farm.plots)), selectedToolId: farm.selectedToolId, personaje: farm.character, day: farm.day, plotPrice: G.data.config.precioParcela });

      function onStarted({ newGame }) {
        online.value = G.saver.online && Boolean(farm.saveId);
        G.writeLocalSave(farm);
        panel.value = 'farm'; summaryOpen.value = false; gameStarted.value = true;
        G.emit(E.GAME_STARTED, { saveName: farm.gameName, newGame, personaje: farm.character, estado: snapshot() });
        if (online.value) village.start(farm.village, farm.saveId); else village.stop();
      }
      async function exitGame() {
        await G.saver.flush(); village.stop();
        G.emit(E.GAME_EXITED); gameStarted.value = false; summaryOpen.value = false;
      }
      function endDay() { if (!summaryOpen.value) farm.endDay(); }

      // Música según la pantalla: cajita musical en la historia y la bienvenida, canción de granja al jugar.
      watch([showStory, gameStarted], ([story, playing]) => {
        G.sonido.cancion(playing && !story ? 'granja' : 'historia');
        document.body.classList.toggle('game-on', playing && !story);
      }, { immediate: true });

      const offs = [];
      onMounted(() => {
        // Phaser se crea una sola vez dentro del div de FarmPanel.
        const game = new Phaser.Game({ type: Phaser.AUTO, parent: 'farm-game', ...G.GAME_SIZE, backgroundColor: '#ffeef5', scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH }, scene: G.scenes, render: { antialias: true } });
        G.game = game;
        // Cada cambio de Pinia: se guarda y se avisa a Phaser con los datos que necesita para dibujar.
        G.saver.onStatus = ok => { if (!ok) { online.value = false; G.notify('Se perdió la conexión; tu granja se guardó en este navegador.', 'warning'); } };
        farm.$subscribe(() => { if (!gameStarted.value) return; G.saver.queue(farm); G.emit(E.FARM_UPDATED, snapshot()); });
        offs.push(
          G.on(E.DAY_ENDED, detail => { summaryOpen.value = true; G.notify('Comenzó el día ' + detail.day); }),
          G.on(E.GAME_WON, () => { summaryOpen.value = true; G.notify('¡Ganaste! Ya tienes las ' + G.TOTAL_PLOTS + ' parcelas.', 'success'); }),
          G.on(E.SUMMARY_CLOSED, () => { summaryOpen.value = false; }),
          G.on(E.GIFT_RECEIVED, detail => G.notify(detail.de + ' te regaló ' + detail.cantidad + ' semilla(s) de ' + ((G.data.cropMap[detail.cropId] || {}).nombre || '').toLowerCase() + '.', 'success'))
        );
        window.addEventListener('beforeunload', () => G.saver.flush());
      });
      onBeforeUnmount(() => { offs.forEach(off => off()); village.stop(); if (G.game) G.game.destroy(true); });

      return { showStory, totalPlots: G.TOTAL_PLOTS, goal: G.data.config.puntosMeta, totalCrops: G.data.crops.length, farm, village, gameStarted, panel, summaryOpen, online, currentEvent, character, onStarted, exitGame, endDay };
    },
    template: `
    <story-intro v-if="showStory" @done="showStory = false"></story-intro>
    <welcome-screen v-if="!gameStarted && !showStory" @started="onStarted" @story="showStory = true"></welcome-screen>
    <sound-controls v-if="!gameStarted || showStory"></sound-controls>

    <header class="topbar" :inert="!gameStarted">
      <a class="brand" href="#" @click.prevent="panel = 'farm'" aria-label="Ir a la granja">
        <character-art :id="farm.character" class="brand-avatar"></character-art>
        <span class="brand-text"><b>{{ farm.gameName }}</b><small>{{ character.especie }} · {{ online ? 'Pueblo ' + farm.village : 'Modo local' }}</small></span>
      </a>
      <div class="top-stats">
        <div class="stat-pill"><span class="stat-icon"><app-icon name="sun"></app-icon></span><span><small>HOY</small><strong>Día {{ farm.day }}</strong></span></div>
        <div class="stat-pill money"><span class="stat-icon"><app-icon name="coins"></app-icon></span><span><small>MONEDAS</small><strong>{{ farm.coins }}</strong></span></div>
        <div class="stat-pill score-pill"><span class="stat-icon"><app-icon name="trophy"></app-icon></span><span><small>PROGRESO</small><strong>{{ farm.score }}/{{ goal }}</strong></span></div>
        <div v-if="online" class="stat-pill village-pill"><span class="stat-icon"><app-icon name="users"></app-icon></span><span><small>RANKING</small><strong>{{ village.myRank ? '#' + village.myRank : '—' }} · {{ village.onlineCount }} en línea</strong></span></div>
      </div>
      <sound-controls inline></sound-controls>
      <button class="button outline help-top" @click="showStory = true" title="Ver la historia" aria-label="Ver la historia"><app-icon name="book-open"></app-icon> Historia</button>
      <button class="button outline new-game-top" @click="exitGame"><app-icon name="log-out"></app-icon> Cambiar granja</button>
      <button class="button primary end-day" @click="endDay" :disabled="summaryOpen || farm.won">{{ farm.won ? 'Partida completada' : summaryOpen ? 'Revisa el resumen' : 'Terminar día' }} <app-icon name="arrow-right"></app-icon></button>
    </header>

    <div class="app-shell" :inert="!gameStarted">
      <nav class="sidebar" aria-label="Navegación principal">
        <div class="nav-label">TU ESPACIO</div>
        <button class="nav-item" :class="{ active: panel === 'farm' }" @click="panel = 'farm'"><span class="nav-icon"><app-icon name="fence"></app-icon></span> Granja</button>
        <button class="nav-item" :class="{ active: panel === 'shop' }" @click="panel = 'shop'"><span class="nav-icon"><app-icon name="store"></app-icon></span> Tienda</button>
        <button class="nav-item" :class="{ active: panel === 'inventory' }" @click="panel = 'inventory'"><span class="nav-icon"><app-icon name="backpack"></app-icon></span> Inventario <span class="nav-count">{{ farm.seedCount }}</span></button>
        <button class="nav-item" :class="{ active: panel === 'calendar' }" @click="panel = 'calendar'"><span class="nav-icon"><app-icon name="calendar-days"></app-icon></span> Calendario</button>
        <button class="nav-item" :class="{ active: panel === 'village' }" @click="panel = 'village'"><span class="nav-icon"><app-icon name="users"></app-icon></span> Pueblo <span v-if="online" class="nav-count live">{{ village.onlineCount }}</span></button>
        <div class="sidebar-bottom">
          <div class="weather-card"><span class="weather-sun"><app-icon :name="currentEvent ? currentEvent.icon : 'sun'"></app-icon></span><div><strong>{{ currentEvent ? currentEvent.nombre : 'Día tranquilo' }}</strong><small>{{ currentEvent ? currentEvent.descripcion : 'Riega tus cultivos' }}</small></div></div>
          <div class="save-status"><span class="save-dot" :class="{ local: !online }"></span><span>«{{ farm.gameName }}» se guarda automáticamente</span></div>
        </div>
      </nav>

      <main class="main-content">
        <div v-if="farm.won" class="win-banner"><app-icon name="trophy"></app-icon><div><b>¡Granja completada!</b><small>{{ totalPlots }} parcelas compradas · progreso {{ goal }}/{{ goal }}</small></div></div>
        <farm-panel v-show="panel === 'farm'"></farm-panel>
        <shop-panel v-show="panel === 'shop'"></shop-panel>
        <inventory-panel v-show="panel === 'inventory'" @go-farm="panel = 'farm'"></inventory-panel>
        <calendar-panel v-show="panel === 'calendar'" @go-farm="panel = 'farm'"></calendar-panel>
        <village-panel v-show="panel === 'village'" :online="online"></village-panel>
      </main>
    </div>
    <footer class="footer-note" :inert="!gameStarted"><span>MI GRANJITA</span><span>Granja de cultivos por turnos ♡ Michi, Saltarín y Lanita</span></footer>`
  };
})(window.Granja);
