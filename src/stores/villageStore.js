// Pinia: datos del pueblo (multijugador) que Vue muestra en el panel Pueblo y en la barra superior.
// Se actualiza preguntando a api/pueblo.php cada 4 segundos.
window.Granja = window.Granja || {};
(G => {
  const { defineStore } = Pinia;
  const E = G.EVENTOS;
  const POLL_MS = 4000;
  let timer = null;

  G.useVillageStore = defineStore('village', {
    state: () => ({ code: '', meId: null, players: [], connected: false, lastSync: null, sending: false }),
    getters: {
      others: state => state.players.filter(player => player.id !== state.meId),
      onlineCount: state => state.players.filter(player => player.enLinea).length,
      myRank: state => state.players.findIndex(player => player.id === state.meId) + 1
    },
    actions: {
      start(code, meId) {
        this.stop();
        Object.assign(this, { code, meId, players: [], connected: false, lastSync: null });
        if (!G.api.available || !meId) return;
        this.poll();
        timer = setInterval(() => this.poll(), POLL_MS);
      },
      stop() {
        clearInterval(timer); timer = null;
        this.connected = false;
        G.emit(E.VILLAGE_UPDATED, { pueblo: '', vecinos: [] });
      },
      async poll() {
        if (!this.code || !this.meId) return;
        try {
          const result = await G.api.village(this.code, this.meId);
          if (result.pueblo !== this.code) return; // respuesta vieja de otro pueblo
          this.players = result.jugadores || [];
          this.connected = true; this.lastSync = new Date().toLocaleTimeString();
          const farm = G.useFarmStore();
          (result.regalos || []).forEach(gift => {
            if (farm.receiveGift(gift.cultivoId, gift.cantidad, gift.de)) {
              G.emit(E.GIFT_RECEIVED, { de: gift.de, dePersonaje: gift.dePersonaje, cropId: gift.cultivoId, cantidad: gift.cantidad });
            }
          });
          G.emit(E.VILLAGE_UPDATED, {
            pueblo: this.code,
            vecinos: this.others.filter(player => player.enLinea).map(({ id, nombre, personaje }) => ({ id, nombre, personaje }))
          });
        } catch (_) { this.connected = false; }
      },
      async sendGift(toId, cropId, quantity) {
        const farm = G.useFarmStore(); const target = this.players.find(player => player.id === toId);
        if (!target || this.sending) return false;
        this.sending = true;
        try {
          await G.saver.flush(); // el servidor revisa las semillas con el último estado guardado
          const result = await G.api.sendGift(this.meId, toId, cropId, quantity);
          farm.giftSent(cropId, result.semillasRestantes, target.nombre, quantity);
          G.emit(E.GIFT_SENT, { para: target.nombre, cropId, cantidad: quantity });
          this.poll();
          return true;
        } finally { this.sending = false; }
      }
    }
  });
})(window.Granja);
