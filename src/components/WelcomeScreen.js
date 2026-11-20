// Pantalla de bienvenida: elegir personaje, pueblo y nombre; continuar, renombrar o borrar partidas.
window.Granja = window.Granja || {};
(G => {
  const { ref, computed, onMounted } = Vue;
  G.components = G.components || {};

  G.components.WelcomeScreen = {
    name: 'WelcomeScreen',
    emits: ['started', 'story'],
    setup(props, { emit }) {
      const farm = G.useFarmStore();
      const newName = ref(''); const character = ref('gato'); const village = ref('GRANJITA');
      const saves = ref([]); const loading = ref(true); const online = ref(false); const status = ref('Conectando con la base de datos…');
      const characterName = id => (G.data.characterMap[id] || {}).especie || 'Gato';

      async function refresh() {
        loading.value = true;
        try {
          if (!G.api.available) throw new Error('archivo local');
          const result = await G.api.listGames();
          online.value = true; G.saver.online = true;
          status.value = 'MySQL conectado · ' + (result.partidas || []).length + ' granja(s)';
          saves.value = (result.partidas || []).map(save => ({ ...save, local: false }));
        } catch (_) {
          online.value = false; G.saver.online = false;
          const local = G.readLocalSave();
          saves.value = local ? [{ id: null, nombre: local.gameName, personaje: local.character, pueblo: local.village, dia: local.day, monedas: local.coins, puntos: local.score, local: true, state: local }] : [];
          status.value = 'Sin conexión a MySQL · guardado local activo';
        } finally { loading.value = false; }
      }

      async function begin() {
        const name = G.cleanName(newName.value); const code = G.cleanVillage(village.value);
        if (!name) { G.notify('Escribe un nombre para tu granja.'); return; }
        if (online.value) {
          if (code.length < 3) { G.notify('El código del pueblo necesita al menos 3 letras o números.'); return; }
          const state = G.freshState(); Object.assign(state, { gameName: name, character: character.value, village: code });
          try {
            const result = await G.api.createGame(name, character.value, code, state);
            farm.loadSavedState(result.partida.estado, result.partida.id);
          } catch (error) { await Swal.fire({ icon: 'error', title: 'No se pudo crear la granja', text: error.message }); return; }
        } else {
          if (G.readLocalSave()) {
            const choice = await Swal.fire({ icon: 'warning', title: 'Guardado del navegador', text: 'En este navegador solo cabe una granja; se reemplazará la que ya está guardada.', showCancelButton: true, confirmButtonText: 'Iniciar aquí', cancelButtonText: 'Cancelar', confirmButtonColor: '#f0789f' });
            if (!choice.isConfirmed) return;
          }
          farm.startFresh({ name, character: character.value, village: code || 'GRANJITA' });
          G.writeLocalSave(farm);
        }
        newName.value = '';
        emit('started', { newGame: true });
      }

      async function play(save) {
        if (!save.local) {
          try {
            const result = await G.api.getGame(save.id);
            if (!farm.loadSavedState(result.partida.estado, result.partida.id)) throw new Error('El archivo de partida no es válido.');
            farm.$patch({ character: result.partida.personaje, village: result.partida.pueblo, gameName: result.partida.nombre });
          } catch (error) { await Swal.fire({ icon: 'error', title: 'No se pudo abrir', text: error.message }); return; }
        } else if (!farm.loadSavedState(save.state || G.readLocalSave(), null)) {
          await Swal.fire({ icon: 'error', title: 'Guardado local dañado', text: 'No se pudo leer esta partida.' }); return;
        }
        emit('started', { newGame: false });
      }

      async function rename(save) {
        const result = await Swal.fire({ title: 'Cambiar nombre', input: 'text', inputValue: save.nombre, inputAttributes: { maxlength: 28, autocomplete: 'off' }, showCancelButton: true, confirmButtonText: 'Guardar', cancelButtonText: 'Cancelar', confirmButtonColor: '#f0789f', inputValidator: value => G.cleanName(value) ? undefined : 'Escribe un nombre.' });
        if (result.isConfirmed) await change(save, { nombre: G.cleanName(result.value) }, 'Nombre actualizado.');
      }
      async function recharacter(save) {
        const options = Object.fromEntries(G.data.characters.map(c => [c.id, c.especie]));
        const result = await Swal.fire({ title: 'Elige personaje', input: 'radio', inputOptions: options, inputValue: save.personaje || 'gato', showCancelButton: true, confirmButtonText: 'Guardar', cancelButtonText: 'Cancelar', confirmButtonColor: '#f0789f' });
        if (result.isConfirmed && result.value) await change(save, { personaje: result.value }, 'Ahora juegas con: ' + characterName(result.value) + '.');
      }
      async function change(save, changes, message) {
        try {
          if (save.local) {
            const local = G.readLocalSave(); if (!local) throw new Error('No se encontró el guardado local.');
            if (changes.nombre) local.gameName = changes.nombre;
            if (changes.personaje) local.character = changes.personaje;
            G.writeLocalSave(local);
          } else await G.api.updateGame(save.id, changes);
          await refresh(); G.notify(message, 'success');
        } catch (error) { await Swal.fire({ icon: 'error', title: 'No se pudo cambiar', text: error.message }); }
      }
      async function remove(save) {
        const result = await Swal.fire({ icon: 'warning', title: '¿Borrar esta granja?', text: 'Se eliminará «' + save.nombre + '» y su progreso.', showCancelButton: true, confirmButtonText: 'Sí, borrar', cancelButtonText: 'Cancelar', confirmButtonColor: '#bd5145' });
        if (!result.isConfirmed) return;
        try {
          if (save.local) G.removeLocalSave(); else await G.api.deleteGame(save.id);
          await refresh(); G.notify('Granja eliminada.');
        } catch (error) { await Swal.fire({ icon: 'error', title: 'No se pudo borrar', text: error.message }); }
      }

      onMounted(refresh);
      return { newName, character, village, saves, loading, online, status, refresh, begin, play, rename, recharacter, remove, hasSaves: computed(() => saves.value.length > 0) };
    },
    template: `
    <section class="welcome-screen" aria-labelledby="welcome-title">
      <div class="welcome-card">
        <div class="eyebrow">TU PEQUEÑO PARAÍSO</div>
        <h1 id="welcome-title">Bienvenida a Mi Granjita</h1>
        <p class="welcome-copy">{{ online ? 'Elige tu personaje, entra a un pueblo con tus compañeros y empieza a plantar.' : 'Elige tu personaje, ponle nombre a tu granja y empieza a plantar.' }}</p>
        <button type="button" class="story-replay" @click="$emit('story')"><app-icon name="book-open"></app-icon> Ver la historia otra vez</button>
        <div class="saved-games-section">
          <div class="saved-games-heading"><b>Mis granjas</b><span>{{ saves.length }} guardada(s)</span></div>
          <div v-if="loading" class="saved-games-empty">Buscando tus granjas…</div>
          <div v-else-if="!saves.length" class="saved-games-empty">Aún no tienes granjas guardadas.</div>
          <div class="saved-games-list">
            <article v-for="save in saves" :key="save.local ? 'local' : 'db-' + save.id" class="saved-game-card">
              <character-art :id="save.personaje" class="resume-avatar"></character-art>
              <div class="resume-info"><small>{{ save.local ? 'EN ESTE NAVEGADOR' : 'PUEBLO ' + save.pueblo }}</small><b>{{ save.nombre }}</b><span>Día {{ save.dia }} · {{ save.monedas }} monedas · {{ save.puntos }} pts</span></div>
              <div class="saved-game-actions">
                <button class="button primary resume-button" type="button" @click="play(save)"><app-icon name="play"></app-icon> Jugar</button>
                <button class="icon-button" type="button" title="Cambiar personaje" aria-label="Cambiar personaje" @click="recharacter(save)"><app-icon name="paw-print"></app-icon></button>
                <button class="icon-button" type="button" title="Cambiar nombre" aria-label="Cambiar nombre" @click="rename(save)"><app-icon name="pencil"></app-icon></button>
                <button class="icon-button delete-save" type="button" title="Borrar" aria-label="Borrar granja" @click="remove(save)"><app-icon name="trash-2"></app-icon></button>
              </div>
            </article>
          </div>
        </div>

        <div v-if="hasSaves" class="welcome-divider"><span>o crea una granja nueva</span></div>
        <form class="welcome-form" @submit.prevent="begin">
          <label>1. Elige tu personaje</label>
          <character-picker v-model="character"></character-picker>
          <div class="welcome-row" :class="{ solo: !online }">
            <div>
              <label for="new-game-name">2. Nombre de tu granja</label>
              <div class="welcome-input-wrap"><app-icon name="pencil"></app-icon><input id="new-game-name" v-model="newName" type="text" maxlength="28" placeholder="La granja de Ana" autocomplete="off" required></div>
            </div>
            <div v-if="online">
              <label for="village-code">3. Código del pueblo</label>
              <div class="welcome-input-wrap"><app-icon name="house"></app-icon><input id="village-code" v-model="village" type="text" maxlength="16" placeholder="CLASE-3B" autocomplete="off" :disabled="!online" @input="village = village.toUpperCase()"></div>
            </div>
          </div>
          <small class="welcome-hint">{{ online ? 'Quienes escriban el mismo código jugarán en el mismo pueblo.' : 'Tu granja se guarda sola en este navegador.' }}</small>
          <button class="button primary welcome-start" type="submit" :disabled="!newName.trim() || loading"><app-icon name="sprout"></app-icon> Iniciar nueva granja</button>
        </form>
      </div>
    </section>`
  };
})(window.Granja);
