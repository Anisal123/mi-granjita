// Vista Granja: herramientas, lienzo de Phaser, semillas, detalle de parcela, día y actividad.
// Se comunica con Phaser solo con eventos: escucha plot-clicked / seed-dropped-on-plot
// y emite plot-focused / seed-dropped.
window.Granja = window.Granja || {};
(G => {
  const { ref, computed, watch, onMounted, onBeforeUnmount } = Vue;
  const E = G.EVENTOS;

  G.components.FarmPanel = {
    name: 'FarmPanel',
    setup() {
      const farm = G.useFarmStore();
      const selectedPlot = ref(-1); const draggingSeed = ref('');
      const activePlot = computed(() => selectedPlot.value >= 0 ? farm.plots[selectedPlot.value] : null);
      // Semillas visibles: las desbloqueadas y las que llegaron de regalo.
      const seedChoices = computed(() => G.data.crops.filter(crop => farm.day >= crop.diaDesbloqueo || (farm.seedInventory[crop.id] || 0) > 0));
      const todayEvents = computed(() => G.eventsForDay(farm.day));
      const currentEvent = computed(() => todayEvents.value[0] || null);
      const dayInWeek = computed(() => G.weekDay(farm.day));
      const cropById = id => G.data.cropMap[id] || G.data.crops[0];
      const statusLabel = status => status === 'locked' ? 'Bloqueada' : status === 'empty' ? 'Vacía' : status === 'ready' ? 'Lista para cosechar' : 'Plantada';
      const salePrice = crop => G.priceForHarvest(crop, farm.day);
      const toolAction = id => (G.TOOLS.find(tool => tool.id === id) || G.TOOLS[0]).accion;

      function focus(id) { selectedPlot.value = id; }
      function plantSelected() {
        const id = selectedPlot.value;
        if (id < 0) { G.notify('Selecciona primero una parcela vacía.'); return; }
        if (farm.plots[id].status !== 'empty') { G.notify('Para plantar necesitas una parcela vacía.'); return; }
        farm.selectTool('pala');
        if (farm.plantPlot(id)) G.notify('Semilla plantada. ¡No olvides regarla!', 'success');
        else G.notify('No tienes esa semilla. Visita la tienda.');
      }
      function waterSelected() {
        const plot = activePlot.value;
        if (!plot || plot.status !== 'growing') { G.notify('Selecciona una parcela con un cultivo en crecimiento.'); return; }
        if (plot.watered) { G.notify('Esta parcela ya recibió agua hoy.'); return; }
        farm.selectTool('regadera');
        if (farm.waterPlot(selectedPlot.value)) G.notify('Parcela regada. Avanzará al terminar el día.', 'success');
      }
      function harvestSelected() {
        const plot = activePlot.value;
        if (!plot || plot.status !== 'ready') { G.notify('Selecciona una parcela con un cultivo listo.'); return; }
        const crop = cropById(plot.cropId); farm.selectTool('cesta');
        if (farm.harvestPlot(selectedPlot.value)) G.notify('Cosechaste ' + crop.nombre.toLowerCase() + '. Véndela en Inventario por ' + salePrice(crop) + ' monedas.', 'success');
      }

      // plot-clicked (Phaser → Vue): Pinia decide la acción según la herramienta.
      // Comprar una parcela bloqueada (la regla está en Pinia: farm.buyPlot).
      async function buyPlot(id) {
        const price = G.data.config.precioParcela;
        if (farm.coins < price) { G.notify('Necesitas ' + price + ' monedas para comprar esta parcela. Vende cosechas en el Inventario.'); return; }
        const answer = await Swal.fire({ title: '¿Comprar la parcela ' + (id + 1) + '?', text: 'Cuesta ' + price + ' monedas. Tendrás ' + (farm.ownedPlots + 1) + ' de ' + G.TOTAL_PLOTS + ' parcelas.', icon: 'question', showCancelButton: true, confirmButtonText: 'Comprar por ' + price, cancelButtonText: 'Ahora no', confirmButtonColor: '#f0789f' });
        if (answer.isConfirmed && farm.buyPlot(id)) G.notify('¡Parcela ' + (id + 1) + ' comprada! Progreso: ' + farm.score + '/' + G.data.config.puntosMeta, 'success');
      }
      function onPlotClicked({ plotId }) {
        if (!Number.isInteger(plotId) || plotId < 0 || plotId > 15) return;
        focus(plotId);
        const plot = farm.plots[plotId];
        if (plot.status === 'locked') { buyPlot(plotId); return; }
        if (plot.status === 'ready') { harvestSelected(); return; }
        if (farm.selectedToolId === 'pala') { if (plot.status === 'empty') plantSelected(); else G.notify('Elige la regadera para cuidar esta planta.'); return; }
        if (farm.selectedToolId === 'regadera') { if (plot.status !== 'growing') G.notify('Planta una semilla antes de regar.'); else waterSelected(); return; }
        G.notify(plot.status === 'empty' ? 'Aquí todavía no hay nada que cosechar.' : 'Espera a que el cultivo esté listo.');
      }
      function onSeedOnPlot({ cropId, plotId }) {
        draggingSeed.value = '';
        if (plotId < 0) { G.notify('Suelta la semilla sobre una parcela.'); return; }
        focus(plotId); farm.selectSeed(cropId); farm.selectTool('pala');
        if (farm.plantPlot(plotId)) G.notify('¡Semilla plantada! Ahora riégala.', 'success');
        else G.notify(farm.plots[plotId].status === 'empty' ? 'No te quedan semillas de ese cultivo.' : 'Esa parcela ya tiene un cultivo.');
      }

      function startSeedDrag(event, id) {
        if ((farm.seedInventory[id] || 0) < 1) { event.preventDefault(); G.notify('No quedan semillas de ese cultivo.'); return; }
        farm.selectTool('pala'); farm.selectSeed(id); draggingSeed.value = id;
        if (event.dataTransfer) { event.dataTransfer.setData('text/plain', id); event.dataTransfer.effectAllowed = 'copy'; }
      }
      function allowDrop(event) { if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy'; }
      // seed-dropped (Vue → Phaser): se envía la posición relativa; Phaser sabe qué parcela es.
      function dropSeed(event) {
        const cropId = event.dataTransfer && event.dataTransfer.getData('text/plain');
        const rect = event.currentTarget.getBoundingClientRect();
        if (!cropId || !rect.width) { draggingSeed.value = ''; return; }
        G.emit(E.SEED_DROPPED, { cropId, relX: (event.clientX - rect.left) / rect.width, relY: (event.clientY - rect.top) / rect.height });
      }

      const offs = [];
      onMounted(() => { offs.push(G.on(E.PLOT_CLICKED, onPlotClicked), G.on(E.SEED_DROPPED_ON_PLOT, onSeedOnPlot)); });
      onBeforeUnmount(() => offs.forEach(off => off()));
      watch(selectedPlot, id => G.emit(E.PLOT_FOCUSED, { plotId: id }));

      return { buyPlot, totalPlots: G.TOTAL_PLOTS, config: G.data.config, weekDays: G.data.config.diasPorSemana, farm, tools: G.TOOLS, selectedPlot, activePlot, seedChoices, currentEvent, dayInWeek, draggingSeed, cropById, statusLabel, salePrice, toolAction, plantSelected, waterSelected, harvestSelected, startSeedDrag, allowDrop, dropSeed, totalCrops: G.data.crops.length, characterName: computed(() => (G.data.characterMap[farm.character] || {}).nombre) };
    },
    template: `
    <section class="page farm-page">
      <div class="page-heading">
        <div><div class="eyebrow">TU PEQUEÑO PARAÍSO</div><h1>La granja de {{ characterName }}</h1><p>Cuida tus cultivos y mira cómo crecen día a día.</p></div>
        <div class="season-badge"><app-icon name="sprout"></app-icon> Primavera <b>·</b> Día {{ farm.day }}</div>
      </div>
      <div class="farm-layout">
        <div class="farm-board card">
          <div class="board-heading"><div><h2>Tu terreno</h2><span>Elige una herramienta y toca una parcela</span></div><div class="board-legend"><span><i class="legend-dot locked"></i> Por comprar</span><span><i class="legend-dot empty"></i> Vacía</span><span><i class="legend-dot growing"></i> Plantada</span><span><i class="legend-dot ready"></i> Lista</span></div></div>
          <div class="tool-tray"><span class="tool-label">HERRAMIENTAS</span>
            <button v-for="tool in tools" :key="tool.id" class="tool-button" :class="{ selected: farm.selectedToolId === tool.id }" @click="farm.selectTool(tool.id)" :aria-pressed="farm.selectedToolId === tool.id"><app-icon :name="tool.icon"></app-icon><span>{{ tool.nombre }}</span></button>
            <small>{{ toolAction(farm.selectedToolId) }}</small>
          </div>
          <div class="phaser-frame"><div id="farm-game" :class="{ 'drop-ready': draggingSeed }" @dragover.prevent="allowDrop" @drop.prevent="dropSeed" aria-label="Terreno de cultivo en cuadrícula de 4 por 4"></div></div>
          <div class="seed-picker">
            <div class="seed-picker-title"><span>SEMILLAS</span><small>Arrástrala al terreno o selecciónala</small></div>
            <button v-for="crop in seedChoices" :key="crop.id" class="seed-option" :class="{ selected: farm.selectedCropId === crop.id, dragging: draggingSeed === crop.id }" :draggable="(farm.seedInventory[crop.id] || 0) > 0" @dragstart="startSeedDrag($event, crop.id)" @dragend="draggingSeed = ''" @click="farm.selectSeed(crop.id)">
              <crop-art :id="crop.id"></crop-art><span class="seed-info"><b>{{ crop.nombre }}</b><small>{{ farm.seedInventory[crop.id] || 0 }} semillas</small></span><span class="seed-check">{{ farm.selectedCropId === crop.id ? '✓' : '' }}</span>
            </button>
          </div>
        </div>

        <aside class="side-panel">
          <div class="card selected-card">
            <div class="card-kicker">PARCELA SELECCIONADA</div>
            <template v-if="activePlot">
              <div class="plot-detail-head"><span class="plot-number">{{ String(selectedPlot + 1).padStart(2, '0') }}</span><div><h3>Parcela {{ selectedPlot + 1 }}</h3><span class="status-chip" :class="activePlot.status">{{ statusLabel(activePlot.status) }}</span></div></div>
              <template v-if="activePlot.status === 'locked'">
                <div class="empty-hint locked-hint"><app-icon name="lock-keyhole"></app-icon> Terreno sin comprar. Cómpralo para plantar aquí y avanzar tu progreso.</div>
              </template>
              <template v-else-if="activePlot.status !== 'empty'">
                <div class="crop-detail"><crop-art :id="activePlot.cropId" class="detail-art"></crop-art><div><b>{{ cropById(activePlot.cropId).nombre }}</b><small v-if="activePlot.status === 'growing'">{{ activePlot.remaining }} día(s) regado(s) para cosechar</small><small v-else>¡Lista para recoger!</small></div></div>
                <div v-if="activePlot.status === 'growing'" class="water-state" :class="{ watered: activePlot.watered }"><app-icon name="droplets"></app-icon>{{ activePlot.watered ? 'Regada hoy' : 'Necesita agua' }}</div>
              </template>
              <div v-else class="empty-hint">Esta parcela espera una semilla.</div>
              <div class="action-stack">
                <button v-if="activePlot.status === 'locked'" class="button harvest full" @click="buyPlot(selectedPlot)" :disabled="farm.coins < config.precioParcela"><app-icon name="fence"></app-icon> Comprar parcela · {{ config.precioParcela }} monedas</button>
                <button v-if="activePlot.status === 'empty'" class="button primary full" @click="plantSelected" :disabled="(farm.seedInventory[farm.selectedCropId] || 0) < 1"><app-icon name="shovel"></app-icon> Plantar {{ cropById(farm.selectedCropId).nombre }}</button>
                <button v-if="activePlot.status === 'growing'" class="button primary full" @click="waterSelected" :disabled="activePlot.watered"><app-icon :name="activePlot.watered ? 'check' : 'droplets'"></app-icon>{{ activePlot.watered ? 'Regada por hoy' : 'Regar parcela' }}</button>
                <button v-if="activePlot.status === 'ready'" class="button harvest full" @click="harvestSelected"><app-icon name="wheat"></app-icon> Cosechar · {{ salePrice(cropById(activePlot.cropId)) }} al vender</button>
              </div>
            </template>
            <div v-else class="empty-hint">Haz clic en una parcela para ver sus acciones.</div>
          </div>

          <div class="card day-card">
            <div class="card-heading"><h3>Tu día</h3><span class="day-sun"><app-icon :name="currentEvent ? currentEvent.icon : 'sun'"></app-icon></span></div>
            <div class="day-progress"><span>Semana de primavera</span><b>{{ dayInWeek }}/{{ weekDays }}</b></div>
            <div class="progress-track"><i :style="{ width: (dayInWeek / weekDays * 100) + '%' }"></i></div>
            <p v-if="currentEvent" class="fair-note"><app-icon :name="currentEvent.icon"></app-icon> {{ currentEvent.nombre }}: {{ currentEvent.descripcion }}</p>
            <p v-else>Riega antes de terminar el día para que tus plantas crezcan.</p>
            <div class="goal-progress"><div><span>Progreso de la granja</span><b>{{ farm.score }}/{{ config.puntosMeta }}</b></div><div class="progress-track"><i :style="{ width: (farm.score / config.puntosMeta * 100) + '%' }"></i></div><small>{{ farm.ownedPlots }}/{{ totalPlots }} parcelas · cada parcela cuesta {{ config.precioParcela }} monedas</small></div>
          </div>

          <div class="card activity-card">
            <div class="card-heading"><h3>Actividad reciente</h3><button class="text-button" @click="farm.clearLogs()">Limpiar</button></div>
            <div class="activity-list">
              <div v-for="(log, index) in farm.logs.slice(0, 5)" :key="index + log.text" class="activity-row"><span class="activity-icon"><app-icon :name="log.icon"></app-icon></span><span>{{ log.text }}</span><small>{{ log.dayLabel }}</small></div>
              <div v-if="farm.logs.length === 0" class="quiet-empty">Tu historia empieza aquí</div>
            </div>
          </div>
        </aside>
      </div>
    </section>`
  };
})(window.Granja);
