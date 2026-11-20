// Utilidades compartidas por las escenas de Phaser (Boot → Menu → Farm + Summary).
// Phaser solo dibuja y anima. Recibe datos por eventos (farm-updated, day-ended…) y avisa
// a Vue con eventos (plot-clicked, seed-dropped-on-plot, summary-closed). No lee Pinia ni toca el DOM.
window.Granja = window.Granja || {};
(G => {
  G.GAME_SIZE = { width: 820, height: 500 };
  G.sceneText = (scene, x, y, value, style = {}) => scene.add.text(x, y, value, { fontFamily: G.FONT, ...style });

  // Escucha eventos de la ventana y los quita al cerrar la escena.
  G.listenScene = function (scene, pairs) {
    const offs = pairs.map(([name, handler]) => G.on(name, handler));
    scene.events.once('shutdown', () => offs.forEach(off => off()));
  };

})(window.Granja);
