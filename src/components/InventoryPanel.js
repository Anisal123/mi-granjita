// Vista Inventario: semillas para plantar y cosechas para vender (elige la cantidad).
window.Granja = window.Granja || {};
(G => {
  const { ref, computed } = Vue;
  G.components.InventoryPanel = {
    name: 'InventoryPanel',
    emits: ['go-farm'],
    setup(props, { emit }) {
      const farm = G.useFarmStore();
      const quantities = ref({});
      const seeds = computed(() => G.data.crops.filter(crop => farm.day >= crop.diaDesbloqueo || (farm.seedInventory[crop.id] || 0) > 0));
      const harvests = computed(() => G.data.crops.filter(crop => (farm.harvestInventory[crop.id] || 0) > 0));
      const isFairDay = computed(() => Boolean(G.eventOfType(farm.day, 'feria')));
      function quantity(id) {
        const available = farm.harvestInventory[id] || 0; const requested = Number(quantities.value[id] ?? 1);
        return available && Number.isInteger(requested) && requested >= 1 && requested <= available ? requested : 0;
      }
      const total = id => G.priceForHarvest(G.data.cropMap[id], farm.day) * quantity(id);
      function sell(crop) {
        const amount = quantity(crop.id); const earned = total(crop.id);
        if (!amount) { G.notify('Elige una cantidad disponible para vender.'); return; }
        if (farm.sellCrop(crop.id, amount)) { quantities.value[crop.id] = 1; G.notify('Vendiste ' + amount + ' ' + crop.nombre.toLowerCase() + ' por ' + earned + ' monedas.', 'success'); }
      }
      function plant(crop) { farm.selectSeed(crop.id); farm.selectTool('pala'); emit('go-farm'); }
      return { farm, quantities, seeds, harvests, isFairDay, quantity, total, sell, plant };
    },
    template: `
    <section class="page subpage">
      <div class="page-heading"><div><div class="eyebrow">LO QUE HAS REUNIDO</div><h1>Inventario</h1><p>Semillas para plantar y cosechas para vender.</p></div><div class="wallet-badge"><app-icon name="coins"></app-icon> <b>{{ farm.coins }}</b> monedas</div></div>
      <div class="inventory-section">
        <div class="section-title"><div><h2>Semillas</h2><p>Elige una semilla aquí o desde la granja.</p></div><span class="section-count">{{ farm.seedCount }} en total</span></div>
        <div class="inventory-grid">
          <article v-for="crop in seeds" :key="'seed-' + crop.id" class="card inventory-card"><crop-art :id="crop.id"></crop-art><div class="inventory-copy"><small>SEMILLAS</small><b>{{ crop.nombre }}</b></div><strong class="inventory-qty">× {{ farm.seedInventory[crop.id] || 0 }}</strong><button class="button outline" @click="plant(crop)" :disabled="(farm.seedInventory[crop.id] || 0) < 1"><app-icon name="shovel"></app-icon> Plantar</button></article>
        </div>
      </div>
      <div class="inventory-section">
        <div class="section-title"><div><h2>Cosechas</h2><p>Elige cuántas unidades vender; puedes conservar el resto.</p></div><span class="section-count">{{ farm.harvestCount }} en total</span></div>
        <div v-if="!harvests.length" class="card empty-inventory">Todavía no tienes cosechas. Toca una parcela dorada que diga LISTA para recogerla.</div>
        <div class="inventory-grid">
          <article v-for="crop in harvests" :key="'harvest-' + crop.id" class="card inventory-card"><crop-art :id="crop.id"></crop-art><div class="inventory-copy"><small>COSECHAS</small><b>{{ crop.nombre }}</b></div><strong class="inventory-qty">× {{ farm.harvestInventory[crop.id] }}</strong>
            <label class="sell-amount"><span>Cantidad</span><input v-model.number="quantities[crop.id]" type="number" min="1" :max="farm.harvestInventory[crop.id]" step="1" placeholder="1"></label>
            <button class="button sell" @click="sell(crop)" :disabled="quantity(crop.id) < 1 || farm.won"><app-icon name="banknote"></app-icon> Vender {{ quantity(crop.id) }} · {{ total(crop.id) }}</button>
          </article>
        </div>
      </div>
      <div v-if="isFairDay" class="tip-banner fair"><span><app-icon name="party-popper"></app-icon></span><div><b>Feria del pueblo activa</b><small>Hoy cada cosecha se vende por el doble.</small></div></div>
    </section>`
  };
})(window.Granja);
