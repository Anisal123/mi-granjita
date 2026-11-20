// Carga el catálogo (configuración, cultivos, eventos, personajes y herramientas) desde src/data/cultivos.json.
// Si el juego se abre como archivo local (sin Laragon), el navegador no deja leer el JSON,
// así que se usa la copia embebida en index.html (<script id="crop-data">).
window.Granja = window.Granja || {};
(G => {
  G.data = null;

  async function readCatalog() {
    if (location.protocol !== 'file:') {
      try {
        const response = await fetch(new URL('src/data/cultivos.json', document.baseURI), { cache: 'no-store' });
        if (response.ok) return await response.json();
      } catch (_) { /* se usa la copia embebida */ }
    }
    return JSON.parse(document.getElementById('crop-data').textContent);
  }

  G.loadCatalog = async () => {
    const catalog = await readCatalog();
    const crops = catalog.cultivos || [];
    const characters = catalog.personajes || [];
    const config = Object.assign({ monedasIniciales: 45, semillasIniciales: {}, parcelasCompradasIniciales: 3, precioParcela: 12, parcelasIniciales: [], puntosMeta: 100, diasPorSemana: 7 }, catalog.configuracion || {});
    G.TOOLS = catalog.herramientas || [];
    G.data = {
      config,
      crops,
      cropMap: Object.fromEntries(crops.map(crop => [crop.id, crop])),
      calendarEvents: catalog.eventosCalendario || [],
      characters,
      characterMap: Object.fromEntries(characters.map(character => [character.id, character]))
    };
    return G.data;
  };

  // Reglas que dependen solo del catálogo y del día.
  G.weekDay = day => ((day - 1) % G.data.config.diasPorSemana) + 1;
  G.eventsForDay = day => G.data.calendarEvents.filter(event => event.dia === G.weekDay(day));
  G.eventOfType = (day, type) => G.eventsForDay(day).find(event => event.tipo === type);
  // Progreso de 0 a 100 según cuántas de las 16 parcelas tienes compradas.
  G.TOTAL_PLOTS = 16;
  G.progressFor = owned => Math.round(owned / G.TOTAL_PLOTS * G.data.config.puntosMeta);
  G.priceForSeed = (crop, day) => Math.max(1, Math.floor(crop.precioSemilla * (1 - (G.eventOfType(day, 'descuento-semillas')?.descuento || 0))));
  G.priceForHarvest = (crop, day) => crop.precioVenta * (G.eventOfType(day, 'feria')?.multiplicadorVenta || 1);

  // Las herramientas (nombre, icono y texto) también vienen del JSON: catalog.herramientas.
  G.TOOLS = [];
})(window.Granja);
