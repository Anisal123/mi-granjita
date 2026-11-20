// Vista Tienda: genera una tarjeta por cultivo desbloqueado recorriendo el catálogo JSON.
window.Granja = window.Granja || {};
(G => {
  const { computed } = Vue;
  G.components.ShopPanel = {
    name: 'ShopPanel',
    setup() {
      const farm = G.useFarmStore();
      const available = computed(() => G.data.crops.filter(crop => farm.day >= crop.diaDesbloqueo));
      const newToday = computed(() => G.data.crops.filter(crop => crop.diaDesbloqueo === farm.day && crop.diaDesbloqueo > 1));
      const nextUnlockDay = computed(() => (G.data.crops.find(crop => crop.diaDesbloqueo > farm.day) || {}).diaDesbloqueo || null);
      const nextUnlockCount = computed(() => nextUnlockDay.value ? G.data.crops.filter(crop => crop.diaDesbloqueo === nextUnlockDay.value).length : 0);
      const isSeedSaleDay = computed(() => Boolean(G.eventOfType(farm.day, 'descuento-semillas')));
      const seedPrice = crop => G.priceForSeed(crop, farm.day);
      const plotPrice = G.data.config.precioParcela;
      function buyPlot() {
        const id = farm.nextLockedPlot;
        if (id < 0) { G.notify('¡Ya tienes las ' + G.TOTAL_PLOTS + ' parcelas!'); return; }
        if (farm.buyPlot(id)) G.notify('¡Compraste la parcela ' + (id + 1) + '! Progreso: ' + farm.score + '/' + G.data.config.puntosMeta, 'success');
        else G.notify('Necesitas ' + plotPrice + ' monedas para comprar una parcela.');
      }
      function buy(crop) { if (farm.buySeed(crop.id)) G.notify('Compraste una semilla de ' + crop.nombre.toLowerCase() + '.', 'success'); else G.notify('No te alcanzan las monedas.'); }
      return { plotPrice, buyPlot, totalPlots: G.TOTAL_PLOTS, goal: G.data.config.puntosMeta, farm, available, newToday, nextUnlockDay, nextUnlockCount, isSeedSaleDay, seedPrice, buy };
    },
    template: `
    <section class="page subpage">
      <div class="page-heading"><div><div class="eyebrow">PREPARA TU PRÓXIMA COSECHA</div><h1>La tienda</h1><p>Compra semillas y haz crecer tu granja.</p></div><div class="wallet-badge"><app-icon name="coins"></app-icon> <b>{{ farm.coins }}</b> monedas</div></div>
      <div class="card land-card">
        <div class="land-art"><app-icon name="fence"></app-icon></div>
        <div class="land-copy"><small>AMPLÍA TU GRANJA</small><h2>Parcela de cultivo</h2><p>Cada parcela nueva te deja plantar más y sube tu progreso.</p>
          <div class="land-progress"><div class="progress-track"><i :style="{ width: (farm.ownedPlots / totalPlots * 100) + '%' }"></i></div><span><b>{{ farm.ownedPlots }}/{{ totalPlots }}</b> parcelas · progreso <b>{{ farm.score }}/{{ goal }}</b></span></div></div>
        <button class="button harvest land-buy" @click="buyPlot" :disabled="farm.coins < plotPrice || farm.nextLockedPlot < 0"><app-icon name="shopping-bag"></app-icon> {{ farm.nextLockedPlot < 0 ? 'Completa' : 'Comprar · ' + plotPrice }}</button>
      </div>
      <div v-if="newToday.length" class="tip-banner new-crops-banner"><span><app-icon name="sparkles"></app-icon></span><div><b>¡Llegaron semillas nuevas!</b><small>{{ newToday.length }} variedades se sumaron hoy al mercado.</small></div></div>
      <div v-if="isSeedSaleDay" class="tip-banner fair"><span><app-icon name="badge-percent"></app-icon></span><div><b>Mercado de semillas</b><small>Hoy tienes descuento en todas las semillas.</small></div></div>
      <div class="shop-grid">
        <article v-for="crop in available" :key="crop.id" class="card shop-card">
          <div class="shop-art"><crop-art :id="crop.id" class="large-crop"></crop-art><span class="seed-pill"><app-icon name="sprout"></app-icon> DÍA {{ crop.diaDesbloqueo }}</span></div>
          <div class="shop-body">
            <div class="shop-name"><div><h2>{{ crop.nombre }}</h2><span>{{ crop.diasCrecimiento }} {{ crop.diasCrecimiento === 1 ? 'día' : 'días' }} para crecer · vende a {{ crop.precioVenta }}</span></div><b class="shop-price"><del v-if="seedPrice(crop) < crop.precioSemilla">{{ crop.precioSemilla }}</del> {{ seedPrice(crop) }} <app-icon name="coins"></app-icon></b></div>
            <p>{{ crop.descripcion }}</p>
            <div class="shop-foot"><span>En tu bolsa: <b>{{ farm.seedInventory[crop.id] || 0 }}</b></span><button class="button primary" @click="buy(crop)" :disabled="farm.coins < seedPrice(crop) || farm.won"><app-icon name="shopping-bag"></app-icon> Comprar</button></div>
          </div>
        </article>
      </div>
      <div v-if="nextUnlockDay" class="tip-banner"><span><app-icon name="lock-keyhole"></app-icon></span><div><b>Próximo lote: día {{ nextUnlockDay }}</b><small>Se desbloquean {{ nextUnlockCount }} cultivos nuevos cada cinco días. En el Pueblo te pueden regalar semillas antes.</small></div></div>
    </section>`
  };
})(window.Granja);
