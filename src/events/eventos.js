// Nombres de todos los eventos. Es el ÚNICO puente entre Vue (y Pinia) y Phaser:
// Vue no llama métodos de las escenas y Phaser no lee Pinia ni toca el DOM.
window.Granja = window.Granja || {};
(G => {
  G.EVENTOS = Object.freeze({
    // Vue → Phaser
    GAME_STARTED: 'game-started',           // { saveName, newGame, personaje }
    GAME_EXITED: 'game-exited',             // {}  vuelve a la escena Menu
    FARM_UPDATED: 'farm-updated',           // { plots, selectedToolId, personaje, day, plotPrice }
    PLOT_FOCUSED: 'plot-focused',           // { plotId }
    SEED_DROPPED: 'seed-dropped',           // { cropId, relX, relY }  (0..1 dentro del lienzo)
    VILLAGE_UPDATED: 'village-updated',     // { pueblo, vecinos: [{ id, nombre, personaje, enLinea }] }
    GIFT_SENT: 'gift-sent',                 // { para, cropId, cantidad }
    GIFT_RECEIVED: 'gift-received',         // { de, dePersonaje, cropId, cantidad }
    // Phaser → Vue
    PLOT_CLICKED: 'plot-clicked',           // { plotId }
    SEED_DROPPED_ON_PLOT: 'seed-dropped-on-plot', // { cropId, plotId }
    SUMMARY_CLOSED: 'summary-closed',       // {}
    // Pinia → Vue y Phaser (resultado de las reglas)
    CROP_PLANTED: 'crop-planted',           // { plotId, cropId }
    PLOT_WATERED: 'plot-watered',           // { plotId }
    PLOT_BOUGHT: 'plot-bought',             // { plotId, owned }
    CROP_HARVESTED: 'crop-harvested',       // { plotId, cropId, score, uniqueCrops }
    ITEM_SOLD: 'item-sold',                 // { cropId, quantity, earned }
    DAY_ENDED: 'day-ended',                 // { day, grownPlots, maturedPlots, unwateredPlots, events }
    GAME_WON: 'game-won'                    // { score, plots }
  });

  G.emit = (name, detail = {}) => window.dispatchEvent(new CustomEvent(name, { detail }));
  // Devuelve una función para dejar de escuchar.
  G.on = (name, handler) => {
    const listener = event => handler(event.detail || {}, event.type);
    window.addEventListener(name, listener);
    return () => window.removeEventListener(name, listener);
  };
})(window.Granja);
