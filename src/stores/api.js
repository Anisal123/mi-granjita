// Comunicación con PHP (api/partidas.php y api/pueblo.php) y guardado automático.
// El navegador nunca se conecta directo a MySQL ni conoce la contraseña.
window.Granja = window.Granja || {};
(G => {
  async function request(file, method = 'GET', { body = null, params = {} } = {}) {
    const url = new URL('api/' + file, document.baseURI);
    Object.entries(params).forEach(([key, value]) => { if (value !== null && value !== undefined) url.searchParams.set(key, String(value)); });
    const options = { method, headers: { Accept: 'application/json' } };
    if (body !== null) { options.headers['Content-Type'] = 'application/json'; options.body = JSON.stringify(body); }
    const response = await fetch(url, options);
    let result; try { result = await response.json(); } catch (_) { result = {}; }
    if (!response.ok || result.ok === false) {
      const error = new Error(result.error || 'No se pudo completar la solicitud.'); error.status = response.status; throw error;
    }
    return result;
  }

  G.api = {
    available: location.protocol !== 'file:',
    listGames: () => request('partidas.php'),
    getGame: id => request('partidas.php', 'GET', { params: { id } }),
    createGame: (nombre, personaje, pueblo, estado) => request('partidas.php', 'POST', { body: { nombre, personaje, pueblo, estado } }),
    saveGame: (id, estado) => request('partidas.php', 'PUT', { params: { id }, body: { estado } }),
    updateGame: (id, changes) => request('partidas.php', 'PATCH', { params: { id }, body: changes }),
    deleteGame: id => request('partidas.php', 'DELETE', { params: { id } }),
    village: (pueblo, yo) => request('pueblo.php', 'GET', { params: { pueblo, yo } }),
    sendGift: (de, para, cultivoId, cantidad) => request('pueblo.php', 'POST', { body: { de, para, cultivoId, cantidad } })
  };

  // Guardado: copia en el navegador al instante y en MySQL agrupando cambios (450 ms).
  let timer = null, pending = null;
  G.saver = {
    online: false,
    onStatus: () => {},
    queue(state) {
      G.writeLocalSave(state);
      if (!this.online || !state.saveId) return;
      pending = { id: state.saveId, snapshot: G.serializeSave(state) };
      clearTimeout(timer);
      timer = setTimeout(() => this.flush(), 450);
    },
    async flush() {
      clearTimeout(timer); timer = null;
      if (!pending) return;
      const { id, snapshot } = pending; pending = null;
      try { await G.api.saveGame(id, snapshot); this.onStatus(true); }
      catch (_) { this.online = false; this.onStatus(false); }
    },
    cancel() { clearTimeout(timer); timer = null; pending = null; }
  };
})(window.Granja);
