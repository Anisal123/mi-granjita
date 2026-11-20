// Pinia: fuente única del estado de la granja y de sus reglas.
// Guarda lo que la interfaz de Vue muestra siempre: día, monedas, puntos, inventarios,
// herramienta, parcelas, personaje y nombre. No guarda posiciones de sprites (eso es de Phaser).
window.Granja = window.Granja || {};
(G => {
  const { defineStore } = Pinia;
  const E = G.EVENTOS;
  const SAVE_KEY = 'mi-granjita-save-v2';

  function emptyPlot(id) { return { id, status: 'empty', cropId: null, remaining: 0, watered: false }; }
  function lockedPlot(id) { return { id, status: 'locked', cropId: null, remaining: 0, watered: false }; }
  const ownedOf = plots => plots.filter(plot => plot.status !== 'locked').length;

  G.freshState = () => {
    const { crops, cropMap, config } = G.data;
    // Se empieza con pocas parcelas compradas (configuracion.parcelasCompradasIniciales); el resto, bloqueadas.
    const plots = Array.from({ length: G.TOTAL_PLOTS }, (_, i) => i < config.parcelasCompradasIniciales ? emptyPlot(i) : lockedPlot(i));
    // Cultivos iniciales desde el JSON (configuracion.parcelasIniciales): una plantada y una lista.
    (config.parcelasIniciales || []).forEach(p => {
      const id = Number(p.parcela) - 1, crop = cropMap[p.cultivo];
      if (!crop || id < 0 || id > 15) return;
      plots[id] = p.estado === 'ready'
        ? { id, status: 'ready', cropId: crop.id, remaining: 0, watered: false }
        : { id, status: 'growing', cropId: crop.id, remaining: Math.max(1, Math.min(crop.diasCrecimiento, p.diasRestantes || crop.diasCrecimiento)), watered: p.regada === true };
    });
    const starter = config.semillasIniciales || {};
    return {
      saveId: null, gameName: 'Mi granja', character: 'gato', village: 'GRANJITA',
      day: 1, coins: config.monedasIniciales, score: G.progressFor(ownedOf(plots)), harvestedCropIds: [], won: false,
      selectedCropId: 'zanahoria', selectedToolId: 'pala',
      seedInventory: Object.fromEntries(crops.map(crop => [crop.id, starter[crop.id] || 0])),
      harvestInventory: Object.fromEntries(crops.map(crop => [crop.id, 0])),
      plots, logs: [{ icon: 'sprout', text: 'Bienvenida a tu nueva granja', dayLabel: 'Día 1' }]
    };
  };

  G.normalizeSave = data => {
    try {
      const { crops, cropMap, characterMap } = G.data;
      if (typeof data === 'string') data = JSON.parse(data);
      if (!data || !Array.isArray(data.plots) || data.plots.length !== 16) return null;
      const count = value => Number.isFinite(Number(value)) ? Math.max(0, Math.floor(Number(value))) : 0;
      // Partidas anteriores (sin parcelas bloqueadas): se conservan las parcelas usadas y las iniciales.
      const oldSave = !data.plots.some(plot => plot && plot.status === 'locked');
      const plots = data.plots.map((plot, id) => {
        if (plot && plot.status === 'locked') return lockedPlot(id);
        if (!plot || !['growing', 'ready'].includes(plot.status) || !cropMap[plot.cropId]) return oldSave && id >= G.data.config.parcelasCompradasIniciales ? lockedPlot(id) : emptyPlot(id);
        const crop = cropMap[plot.cropId];
        const hasRemaining = plot.remaining !== null && plot.remaining !== undefined && Number.isFinite(Number(plot.remaining));
        const remaining = Math.min(hasRemaining ? count(plot.remaining) : crop.diasCrecimiento, crop.diasCrecimiento);
        const status = plot.status === 'ready' || remaining === 0 ? 'ready' : 'growing';
        return { id, status, cropId: crop.id, remaining: status === 'ready' ? 0 : remaining, watered: status === 'growing' && plot.watered === true };
      });
      const fresh = G.freshState();
      const logs = Array.isArray(data.logs) ? data.logs.filter(log => log && typeof log.text === 'string' && typeof log.icon === 'string').slice(0, 8) : fresh.logs;
      return {
        ...fresh,
        saveId: Number(data.saveId) > 0 ? Number(data.saveId) : null,
        gameName: typeof data.gameName === 'string' && data.gameName.trim() ? data.gameName.trim().slice(0, 28) : 'Mi granja',
        character: characterMap[data.character] ? data.character : 'gato',
        village: typeof data.village === 'string' && /^[A-Z0-9-]{3,16}$/.test(data.village) ? data.village : 'GRANJITA',
        day: Math.max(1, count(data.day)), coins: count(data.coins), score: G.progressFor(ownedOf(plots)),
        harvestedCropIds: Array.isArray(data.harvestedCropIds) ? [...new Set(data.harvestedCropIds.filter(id => cropMap[id]))] : [],
        won: ownedOf(plots) === G.TOTAL_PLOTS,
        selectedCropId: cropMap[data.selectedCropId] ? data.selectedCropId : crops[0].id,
        selectedToolId: G.TOOLS.some(tool => tool.id === data.selectedToolId) ? data.selectedToolId : 'pala',
        seedInventory: Object.fromEntries(crops.map(crop => [crop.id, count(data.seedInventory && data.seedInventory[crop.id])])),
        harvestInventory: Object.fromEntries(crops.map(crop => [crop.id, count(data.harvestInventory && data.harvestInventory[crop.id])])),
        plots, logs
      };
    } catch (_) { return null; }
  };

  // Lo que se guarda en MySQL y en el navegador.
  G.serializeSave = state => JSON.parse(JSON.stringify({
    gameName: state.gameName, character: state.character, village: state.village,
    day: state.day, coins: state.coins, score: state.score, harvestedCropIds: state.harvestedCropIds, won: state.won,
    selectedCropId: state.selectedCropId, selectedToolId: state.selectedToolId,
    seedInventory: state.seedInventory, harvestInventory: state.harvestInventory, plots: state.plots, logs: state.logs
  }));
  G.readLocalSave = () => { try { return G.normalizeSave(localStorage.getItem(SAVE_KEY)); } catch (_) { return null; } };
  G.writeLocalSave = state => { try { localStorage.setItem(SAVE_KEY, JSON.stringify({ ...G.serializeSave(state), saveId: state.saveId || null })); } catch (_) { /* almacenamiento bloqueado */ } };
  G.removeLocalSave = () => { try { localStorage.removeItem(SAVE_KEY); } catch (_) { /* almacenamiento bloqueado */ } };

  G.useFarmStore = defineStore('farm', {
    state: () => G.freshState(),
    getters: {
      seedCount: state => Object.values(state.seedInventory).reduce((sum, n) => sum + n, 0),
      harvestCount: state => Object.values(state.harvestInventory).reduce((sum, n) => sum + n, 0),
      ownedPlots: state => ownedOf(state.plots),
      nextLockedPlot: state => { const plot = state.plots.find(p => p.status === 'locked'); return plot ? plot.id : -1; }
    },
    actions: {
      addLog(icon, text) { this.logs.unshift({ icon, text, dayLabel: 'Día ' + this.day }); this.logs = this.logs.slice(0, 8); },
      selectSeed(id) { if (G.data.cropMap[id]) this.selectedCropId = id; },
      selectTool(id) { if (G.TOOLS.some(tool => tool.id === id)) this.selectedToolId = id; },
      plantPlot(id) {
        if (this.won) return false;
        const plot = this.plots[id]; const crop = G.data.cropMap[this.selectedCropId];
        // Se puede plantar cualquier semilla que tengas (también las recibidas de regalo antes de desbloquearse).
        if (this.selectedToolId !== 'pala' || !plot || plot.status !== 'empty' || !crop || (this.seedInventory[crop.id] || 0) < 1) return false;
        const rainyDay = Boolean(G.eventOfType(this.day, 'lluvia'));
        this.seedInventory[crop.id]--;
        Object.assign(plot, { status: 'growing', cropId: crop.id, remaining: crop.diasCrecimiento, watered: rainyDay });
        this.addLog('sprout', 'Plantaste ' + crop.nombre.toLowerCase() + ' en la parcela ' + (id + 1));
        if (rainyDay) this.addLog('cloud-rain', 'La lluvia regó la parcela ' + (id + 1));
        G.emit(E.CROP_PLANTED, { plotId: id, cropId: crop.id });
        return true;
      },
      waterPlot(id) {
        if (this.won) return false;
        const plot = this.plots[id];
        if (this.selectedToolId !== 'regadera' || !plot || plot.status !== 'growing' || plot.watered) return false;
        plot.watered = true; this.addLog('droplets', 'Regaste la parcela ' + (id + 1));
        G.emit(E.PLOT_WATERED, { plotId: id });
        return true;
      },
      harvestPlot(id) {
        if (this.won) return false;
        const plot = this.plots[id];
        if (this.selectedToolId !== 'cesta' || !plot || plot.status !== 'ready') return false;
        const crop = G.data.cropMap[plot.cropId];
        this.harvestInventory[crop.id] = (this.harvestInventory[crop.id] || 0) + 1;
        this.addLog('wheat', 'Cosechaste ' + crop.nombre.toLowerCase());
        Object.assign(plot, emptyPlot(id));
        if (!this.harvestedCropIds.includes(crop.id)) this.harvestedCropIds.push(crop.id);
        G.emit(E.CROP_HARVESTED, { plotId: id, cropId: crop.id, score: this.score, uniqueCrops: this.harvestedCropIds.length });
        return true;
      },
      // Comprar terreno: cada parcela cuesta configuracion.precioParcela. El progreso depende de las parcelas.
      buyPlot(id) {
        const plot = this.plots[id]; const price = G.data.config.precioParcela;
        if (this.won || !plot || plot.status !== 'locked' || this.coins < price) return false;
        this.coins -= price;
        Object.assign(plot, emptyPlot(id));
        const owned = ownedOf(this.plots);
        this.score = G.progressFor(owned);
        this.addLog('fence', 'Compraste la parcela ' + (id + 1) + ' por ' + price + ' monedas');
        G.emit(E.PLOT_BOUGHT, { plotId: id, owned });
        if (owned === G.TOTAL_PLOTS) { this.won = true; G.emit(E.GAME_WON, { score: this.score, plots: owned }); }
        return true;
      },
      buySeed(id) {
        if (this.won) return false;
        const crop = G.data.cropMap[id];
        if (!crop || this.day < crop.diaDesbloqueo) return false;
        const price = G.priceForSeed(crop, this.day); if (this.coins < price) return false;
        this.coins -= price; this.seedInventory[id] = (this.seedInventory[id] || 0) + 1;
        this.addLog('shopping-bag', 'Compraste una semilla de ' + crop.nombre.toLowerCase() + ' por ' + price + ' monedas');
        return true;
      },
      sellCrop(id, requested = 1) {
        if (this.won) return false;
        const crop = G.data.cropMap[id], amount = this.harvestInventory[id] || 0, quantity = Math.floor(Number(requested));
        if (!crop || !Number.isFinite(quantity) || quantity < 1 || quantity > amount) return false;
        const earned = G.priceForHarvest(crop, this.day) * quantity;
        this.harvestInventory[id] -= quantity; this.coins += earned;
        this.addLog('coins', 'Vendiste ' + quantity + ' ' + crop.nombre.toLowerCase() + ' por ' + earned + ' monedas');
        G.emit(E.ITEM_SOLD, { cropId: id, quantity, earned });
        return true;
      },
      endDay() {
        if (this.won) return;
        const maturedPlots = [], grownPlots = [], unwateredPlots = [];
        this.plots.forEach(plot => {
          if (plot.status !== 'growing') return;
          if (plot.watered) {
            plot.remaining = Math.max(0, plot.remaining - 1); grownPlots.push(plot.id);
            if (plot.remaining === 0) { plot.status = 'ready'; maturedPlots.push(plot.id); }
          } else unwateredPlots.push(plot.id);
          plot.watered = false;
        });
        this.day++;
        const todayEvents = G.eventsForDay(this.day);
        if (todayEvents.some(event => event.tipo === 'lluvia')) {
          this.plots.forEach(plot => { if (plot.status === 'growing') plot.watered = true; });
          this.addLog('cloud-rain', 'La lluvia regó los cultivos del día ' + this.day);
        }
        this.addLog('sun', maturedPlots.length ? maturedPlots.length + ' cultivo(s) listo(s) para cosechar' : 'Comenzó un nuevo día en la granja');
        G.emit(E.DAY_ENDED, { day: this.day, maturedPlots, grownPlots, unwateredPlots, events: todayEvents });
      },
      // Multijugador: semillas que llegan de otra granja del pueblo.
      receiveGift(cropId, quantity, from) {
        const crop = G.data.cropMap[cropId]; const amount = Math.floor(Number(quantity));
        if (!crop || !(amount > 0)) return false;
        this.seedInventory[cropId] = (this.seedInventory[cropId] || 0) + amount;
        this.addLog('gift', from + ' te regaló ' + amount + ' semilla(s) de ' + crop.nombre.toLowerCase());
        return true;
      },
      // El servidor ya descontó las semillas regaladas; aquí se refleja el mismo valor.
      giftSent(cropId, remaining, toName, quantity) {
        const crop = G.data.cropMap[cropId]; if (!crop) return;
        this.seedInventory[cropId] = Math.max(0, Math.floor(Number(remaining)) || 0);
        this.addLog('gift', 'Regalaste ' + quantity + ' semilla(s) de ' + crop.nombre.toLowerCase() + ' a ' + toName);
      },
      startFresh({ name, character, village, saveId = null }) {
        const next = G.freshState();
        Object.assign(next, { gameName: name, character, village: village || 'GRANJITA', saveId });
        this.$patch(next);
      },
      loadSavedState(data, id = null) {
        const next = G.normalizeSave(data);
        if (!next) return false;
        next.saveId = id === null ? null : Number(id);
        this.$patch(next);
        return true;
      },
      clearLogs() { this.logs = []; }
    }
  });
})(window.Granja);
