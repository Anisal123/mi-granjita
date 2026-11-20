// Botones flotantes para activar o desactivar la música y los efectos de sonido.
// Se ven en la historia, en la bienvenida y durante el juego. La elección se recuerda en el navegador.
window.Granja = window.Granja || {};
(G => {
  G.components.SoundControls = {
    name: 'SoundControls',
    // inline: dentro de la barra superior del juego (solo iconos); si no, flota en una esquina.
    props: { inline: { type: Boolean, default: false } },
    setup() {
      const prefs = G.sonido.prefs;
      return {
        prefs,
        toggleMusic: () => { G.sonido.unlock(); G.sonido.setMusica(!prefs.musica); },
        toggleSfx: () => { G.sonido.unlock(); G.sonido.setEfectos(!prefs.efectos); }
      };
    },
    template: `
      <div class="sound-controls" :class="{ inline }" role="group" aria-label="Sonido">
        <button type="button" class="sound-toggle" :class="{ off: !prefs.musica }" @click="toggleMusic"
          :aria-pressed="prefs.musica" :title="prefs.musica ? 'Apagar música' : 'Encender música'">
          <app-icon name="music"></app-icon><span>Música</span>
        </button>
        <button type="button" class="sound-toggle" :class="{ off: !prefs.efectos }" @click="toggleSfx"
          :aria-pressed="prefs.efectos" :title="prefs.efectos ? 'Apagar efectos' : 'Encender efectos'">
          <app-icon :name="prefs.efectos ? 'volume-2' : 'volume-x'"></app-icon><span>Efectos</span>
        </button>
      </div>`
  };
})(window.Granja);
