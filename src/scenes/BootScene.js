// Escena Boot: prepara las texturas de los personajes y pasa al menú.
window.Granja = window.Granja || {};
(G => {
  const E = G.EVENTOS;
  const { width: W, height: H } = G.GAME_SIZE;
  const text = G.sceneText, listen = G.listenScene;

  class BootScene extends Phaser.Scene {
    constructor() { super('Boot'); }
    // Convierte los SVG de los personajes en texturas y luego pasa al menú.
    create() { G.loadCharacterTextures(this).then(() => this.scene.start('Menu')); }
  }

  G.scenes = G.scenes || [];
  G.scenes.push(BootScene);
})(window.Granja);
