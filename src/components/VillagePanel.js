// Vista Pueblo (multijugador): código para compartir, ranking en vivo y regalos de semillas.
window.Granja = window.Granja || {};
(G => {
  const { ref, computed, watch } = Vue;
  G.components.VillagePanel = {
    name: 'VillagePanel',
    props: { online: { type: Boolean, default: false } },
    setup() {
      const farm = G.useFarmStore(); const village = G.useVillageStore();
      const giftTo = ref(null); const giftCrop = ref(''); const giftAmount = ref(1);
      const giftable = computed(() => G.data.crops.filter(crop => (farm.seedInventory[crop.id] || 0) > 0));
      const maxAmount = computed(() => Math.min(5, farm.seedInventory[giftCrop.value] || 0));
      const canSend = computed(() => giftTo.value && giftCrop.value && giftAmount.value >= 1 && giftAmount.value <= maxAmount.value && !village.sending);
      watch(giftable, list => { if (!list.some(crop => crop.id === giftCrop.value)) giftCrop.value = list[0] ? list[0].id : ''; }, { immediate: true });
      watch(() => village.others, list => { if (!list.some(player => player.id === giftTo.value)) giftTo.value = list[0] ? list[0].id : null; }, { immediate: true });
      const characterName = id => (G.data.characterMap[id] || {}).especie || '';

      async function send() {
        if (!canSend.value) return;
        try {
          const target = village.others.find(player => player.id === giftTo.value);
          await village.sendGift(giftTo.value, giftCrop.value, giftAmount.value);
          G.notify('Enviaste ' + giftAmount.value + ' semilla(s) a ' + target.nombre + '.', 'success');
          giftAmount.value = 1;
        } catch (error) { Swal.fire({ icon: 'error', title: 'No se pudo enviar', text: error.message }); }
      }
      async function copyCode() {
        try { await navigator.clipboard.writeText(village.code); G.notify('Código copiado: ' + village.code, 'success'); }
        catch (_) { G.notify('Código del pueblo: ' + village.code); }
      }
      return { totalPlots: G.TOTAL_PLOTS, totalCrops: G.data.crops.length, farm, village, giftTo, giftCrop, giftAmount, giftable, maxAmount, canSend, send, copyCode, characterName, cropName: id => (G.data.cropMap[id] || {}).nombre };
    },
    template: `
    <section class="page subpage">
      <div class="page-heading"><div><div class="eyebrow">JUEGA CON TU CLASE</div><h1>El pueblo</h1><p>Compite en el ranking y ayuda a tus vecinos con semillas.</p></div>
        <button v-if="online" class="village-code" type="button" @click="copyCode" title="Copiar código"><app-icon name="house"></app-icon> {{ village.code }} <app-icon name="copy"></app-icon></button></div>

      <div v-if="!online" class="card village-offline">
        <app-icon name="wifi-off"></app-icon>
        <div><b>Pueblo no disponible</b><p>En esta versión juegas en solitario y tu granja se guarda en este navegador. Cuando el juego tenga servidor, aquí verás a tus vecinos y podrás regalarles semillas.</p></div>
      </div>

      <div v-else class="village-layout">
        <div class="card ranking-card">
          <div class="card-heading"><h3><app-icon name="trophy"></app-icon> Ranking del pueblo</h3><small :class="{ live: village.connected }">{{ village.connected ? 'En vivo · ' + village.onlineCount + ' en línea' : 'Conectando…' }}</small></div>
          <ol class="ranking-list">
            <li v-for="(player, index) in village.players" :key="player.id" :class="{ me: player.id === village.meId }">
              <span class="rank-pos">{{ index + 1 }}</span>
              <character-art :id="player.personaje"></character-art>
              <span class="rank-name"><b>{{ player.nombre }}<em v-if="player.id === village.meId"> (tú)</em></b><small><i class="online-dot" :class="{ on: player.enLinea }"></i>{{ characterName(player.personaje) }} · día {{ player.dia }} · {{ player.parcelas }}/{{ totalPlots }} parcelas</small></span>
              <span class="rank-points"><app-icon v-if="player.gano" name="crown"></app-icon>{{ player.puntos }} <small>pts</small></span>
            </li>
          </ol>
          <p v-if="village.players.length < 2" class="quiet-empty">Comparte el código <b>{{ village.code }}</b> para que otra persona entre a tu pueblo.</p>
          <small class="sync-note" v-if="village.lastSync">Actualizado a las {{ village.lastSync }}</small>
        </div>

        <div class="card gift-card">
          <div class="card-heading"><h3><app-icon name="gift"></app-icon> Regalar semillas</h3></div>
          <p class="gift-help">Las semillas regaladas salen de tu bolsa. Así alguien puede plantar un cultivo antes de que se desbloquee en su tienda.</p>
          <template v-if="village.others.length && giftable.length">
            <label>Para<select v-model.number="giftTo"><option v-for="player in village.others" :key="player.id" :value="player.id">{{ player.nombre }}{{ player.enLinea ? ' · en línea' : '' }}</option></select></label>
            <label>Semilla<select v-model="giftCrop"><option v-for="crop in giftable" :key="crop.id" :value="crop.id">{{ crop.nombre }} (tienes {{ farm.seedInventory[crop.id] }})</option></select></label>
            <label>Cantidad<input v-model.number="giftAmount" type="number" min="1" :max="maxAmount" step="1"></label>
            <button class="button primary full" type="button" :disabled="!canSend" @click="send"><app-icon name="send"></app-icon> {{ village.sending ? 'Enviando…' : 'Enviar regalo' }}</button>
          </template>
          <p v-else class="empty-hint">{{ village.others.length ? 'Compra semillas en la Tienda para poder regalar.' : 'Todavía no hay vecinos en este pueblo.' }}</p>
        </div>
      </div>
    </section>`
  };
})(window.Granja);
