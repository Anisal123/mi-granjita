// Escena Summary: resumen al terminar el día o al ganar.
window.Granja = window.Granja || {};
(G => {
  const E = G.EVENTOS;
  const { width: W, height: H } = G.GAME_SIZE;
  const text = G.sceneText, listen = G.listenScene;

  class SummaryScene extends Phaser.Scene {
    constructor() { super('Summary'); }
    create(data) {
      this.add.zone(0, 0, W, H).setOrigin(0).setInteractive(); // bloquea clics al terreno de abajo
      const g = this.add.graphics();
      g.fillStyle(0x6b4a5e, .55); g.fillRect(0, 0, W, H);
      g.fillStyle(0xffb3c7, 1); g.fillRoundedRect(W * .19 - 5, H * .2 - 5, W * .62 + 10, H * .6 + 10, 27);
      g.fillStyle(0xfff8fb, 1); g.fillRoundedRect(W * .19, H * .2, W * .62, H * .6, 22);
      g.fillStyle(0xffd6e5, 1); [[.24, .27], [.76, .27], [.24, .73], [.76, .73]].forEach(([px, py]) => { const hx = W * px, hy = H * py; g.fillCircle(hx - 4, hy - 2, 4.5); g.fillCircle(hx + 4, hy - 2, 4.5); g.fillTriangle(hx - 8.4, hy, hx + 8.4, hy, hx, hy + 8.5); });
      const won = data.won === true;
      text(this, W / 2, H * .3, won ? '¡META COMPLETADA!' : 'DÍA NUEVO', { fontSize: '18px', fontStyle: 'bold', color: '#e86d97' }).setOrigin(.5);
      text(this, W / 2, H * .42, won ? '¡Tu granja tiene ' + data.plots + ' parcelas!' : '¡Día ' + (data.day || 2) + '!', { fontSize: '26px', fontStyle: 'bold', color: '#7a5246' }).setOrigin(.5);
      const summary = won ? 'Llegaste a ' + data.score + ' de progreso: compraste todo el terreno.'
        : data.maturedPlots && data.maturedPlots.length ? data.maturedPlots.length + ' cultivo(s) listo(s) para cosechar.'
        : data.grownPlots && data.grownPlots.length ? data.grownPlots.length + ' cultivo(s) avanzaron un día.'
        : data.unwateredPlots && data.unwateredPlots.length ? 'No avanzaron: faltó regar ' + data.unwateredPlots.length + ' parcela(s).'
        : 'Planta y riega para comenzar una cosecha.';
      text(this, W / 2, H * .52, summary, { fontSize: '13px', color: '#9a7584', align: 'center', wordWrap: { width: W * .48 } }).setOrigin(.5);
      if (!won && data.unwateredPlots && data.unwateredPlots.length && data.grownPlots && data.grownPlots.length) {
        text(this, W / 2, H * .575, 'Sin agua: ' + data.unwateredPlots.length + ' parcela(s).', { fontSize: '11px', color: '#a0654f' }).setOrigin(.5);
      }
      const eventText = won ? '¡Eres la granjera de la temporada!' : data.events && data.events.length ? data.events.map(event => event.nombre).join(' · ') : 'Recuerda regar para que tus cultivos crezcan.';
      text(this, W / 2, H * .63, eventText, { fontSize: '10px', color: '#b0638a', align: 'center', wordWrap: { width: W * .5 } }).setOrigin(.5);
      const button = text(this, W / 2, H * .72, won ? '  Volver a la granja  →  ' : '  Seguir jugando  →  ', { fontSize: '14px', fontStyle: 'bold', color: '#ffffff', backgroundColor: '#f0789f', padding: { x: 17, y: 11 } }).setOrigin(.5).setInteractive({ useHandCursor: true });
      button.on('pointerdown', pointer => { if (pointer.event && pointer.event.target !== this.game.canvas) return; G.emit(E.SUMMARY_CLOSED); this.scene.stop(); });
    }
  }

  G.scenes = G.scenes || [];
  G.scenes.push(SummaryScene);
})(window.Granja);
