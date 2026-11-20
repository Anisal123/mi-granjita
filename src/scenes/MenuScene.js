// Escena Menu: espera el evento game-started que emite Vue al elegir partida.
window.Granja = window.Granja || {};
(G => {
  const E = G.EVENTOS;
  const { width: W, height: H } = G.GAME_SIZE;
  const text = G.sceneText, listen = G.listenScene;

  class MenuScene extends Phaser.Scene {
    constructor() { super('Menu'); }
    create() {
      listen(this, [[E.GAME_STARTED, detail => { if (this.scene.isActive('Menu')) this.scene.start('Farm', detail); }]]);
      this.cameras.main.setBackgroundColor('#ffeef5');
      const g = this.add.graphics(); g.fillStyle(0xffd6e5, 1); g.fillRoundedRect(W * .13, H * .13, W * .74, H * .74, 30);
      g.fillStyle(0xffffff, .6); for (let i = 0; i < 40; i++) g.fillCircle(W * .15 + (i * 53) % (W * .7), H * .16 + Math.floor(i / 10) * 95 + (i % 2) * 40, 3);
      text(this, W / 2, H * .24, 'MI GRANJITA', { fontSize: '20px', fontStyle: 'bold', color: '#e86d97' }).setOrigin(.5);
      text(this, W / 2, H * .35, 'Elige personaje y pueblo', { fontSize: '27px', fontStyle: 'bold', color: '#7a5246' }).setOrigin(.5);
      G.data.characters.forEach((character, i) => {
        const n = G.data.characters.length, gap = Math.min(120, 560 / Math.max(1, n - 1));
        const hero = G.drawCharacter(this, character.id).setPosition(W / 2 + (i - (n - 1) / 2) * gap, H * .57).setScale(n > 4 ? .9 : 1.15);
        this.tweens.add({ targets: hero, y: hero.y - 8, duration: 700 + i * 120, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
        text(this, hero.x, H * .72, character.especie.toUpperCase(), { fontSize: '12px', fontStyle: 'bold', color: '#b0638a' }).setOrigin(.5);
      });
    }
  }

  G.scenes = G.scenes || [];
  G.scenes.push(MenuScene);
})(window.Granja);
