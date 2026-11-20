// Escena Farm: dibuja el terreno 4 × 4, el personaje, los vecinos y las animaciones.
window.Granja = window.Granja || {};
(G => {
  const E = G.EVENTOS;
  const { width: W, height: H } = G.GAME_SIZE;
  const text = G.sceneText, listen = G.listenScene;
  const GRID = { left: 42, top: 95, cellW: 184, cellH: 87 };
  const HOME = { x: 62, y: 458 };
  class FarmScene extends Phaser.Scene {
    constructor() { super('Farm'); }

    create(data = {}) {
      const estado = data.estado || {};
      this.view = { plots: estado.plots || [], selectedToolId: estado.selectedToolId || 'pala', personaje: data.personaje || estado.character || 'gato', plotPrice: estado.plotPrice || 12 };
      this.selected = -1; this.pendingGrow = []; this.boardTweens = []; this.board = null;
      this.heroCharacter = null; this.heroPlot = -1; this.toolCursor = null; this.cursorTool = null; this.lastPointer = null;
      this.drawBackground();
      this.neighbors = this.add.container(0, 0).setDepth(20);
      this.drawBoard();
      this.buildHero();
      this.buildCursor();

      this.input.setDefaultCursor('none');
      this.input.on('pointermove', pointer => {
        if (pointer.wasTouch) { this.lastPointer = null; if (this.toolCursor) this.toolCursor.setVisible(false); return; } // en celular no hay cursor
        this.lastPointer = { x: pointer.x, y: pointer.y }; this.moveCursor();
      });
      this.input.on('gameout', () => { this.lastPointer = null; if (this.toolCursor) this.toolCursor.setVisible(false); });

      listen(this, [
        [E.FARM_UPDATED, detail => this.onFarmUpdated(detail)],
        [E.PLOT_FOCUSED, ({ plotId }) => { this.selected = Number.isInteger(plotId) ? plotId : -1; this.drawBoard(); }],
        [E.SEED_DROPPED, detail => this.onSeedDropped(detail)],
        [E.CROP_PLANTED, ({ plotId }) => this.onPlotAction(plotId, 'plant')],
        [E.PLOT_WATERED, ({ plotId }) => this.onPlotAction(plotId, 'water')],
        [E.PLOT_BOUGHT, ({ plotId }) => this.onPlotAction(plotId, 'buy')],
        [E.CROP_HARVESTED, ({ plotId }) => this.onPlotAction(plotId, 'harvest')],
        [E.ITEM_SOLD, ({ quantity }) => this.coinBurst(quantity || 1)],
        [E.DAY_ENDED, detail => this.onDayEnded(detail)],
        [E.GAME_WON, detail => this.time.delayedCall(700, () => this.scene.launch('Summary', { won: true, ...detail }))],
        [E.VILLAGE_UPDATED, ({ vecinos }) => this.drawNeighbors(vecinos || [])],
        [E.GIFT_RECEIVED, () => this.giftDrop()],
        [E.GIFT_SENT, () => this.giftToss()],
        [E.GAME_EXITED, () => { this.scene.stop('Summary'); this.scene.start('Menu'); }]
      ]);
    }

    // ---------- Datos recibidos ----------
    onFarmUpdated(detail) {
      const toolChanged = detail.selectedToolId !== this.view.selectedToolId;
      const characterChanged = detail.personaje !== this.view.personaje;
      this.view = { plots: detail.plots || [], selectedToolId: detail.selectedToolId, personaje: detail.personaje, plotPrice: detail.plotPrice || this.view.plotPrice };
      this.drawBoard(this.pendingGrow); this.pendingGrow = [];
      if (toolChanged) this.buildCursor();
      if (characterChanged) this.buildHero();
    }
    onPlotAction(plotId, type) {
      this.pendingGrow = [plotId];
      this.walkTo(plotId, () => this.sparkle(plotId, type));
      this.cameras.main.flash(170, 249, 247, 226);
    }
    onDayEnded(detail) {
      this.pendingGrow = detail.grownPlots || [];
      if ((detail.events || []).some(event => event.tipo === 'lluvia')) this.rain();
      this.walkHome();
      this.time.delayedCall(1050, () => this.scene.launch('Summary', detail));
    }
    onSeedDropped({ cropId, relX, relY }) {
      const plotId = this.plotAt(relX * W, relY * H);
      G.emit(E.SEED_DROPPED_ON_PLOT, { cropId, plotId });
    }

    // ---------- Terreno ----------
    plotAt(x, y) {
      const { left, top, cellW, cellH } = GRID;
      const col = Math.floor((x - left) / cellW), row = Math.floor((y - top) / cellH);
      if (col < 0 || col > 3 || row < 0 || row > 3) return -1;
      const localX = (x - left) % cellW, localY = (y - top) % cellH;
      return localX >= 4 && localX <= 180 && localY >= 3 && localY <= 81 ? row * 4 + col : -1;
    }
    plotOrigin(i) { return { x: GRID.left + (i % 4) * GRID.cellW + 4, y: GRID.top + Math.floor(i / 4) * GRID.cellH + 3 }; }

    drawBackground() {
      const g = this.add.graphics();
      // Cielo pastel, pasto suave y un marco de jardín rosado.
      g.fillGradientStyle(0xd9eeff, 0xd9eeff, 0xffeaf3, 0xffeaf3, 1); g.fillRect(0, 0, W, 80);
      g.fillStyle(0xc9ecb7, 1); g.fillRect(0, 75, W, H - 75);
      g.fillStyle(0xb5e0a2, .7); for (let d = 0; d < 36; d++) g.fillCircle((d * 67 + 19) % W, 87 + (d * 43) % (H - 100), d % 3 === 0 ? 3 : 2);
      g.fillStyle(0xf4a9bf, 1); g.fillRoundedRect(27, 70, W - 54, H - 93, 22);
      g.fillStyle(0xffe1d0, 1); g.fillRoundedRect(34, 76, W - 68, H - 105, 18);
      // Lunares blancos en el marco.
      g.fillStyle(0xffffff, .55); for (let x = 48; x < W - 40; x += 34) { g.fillCircle(x, 73, 1.8); g.fillCircle(x + 17, H - 26, 1.8); }
      const sun = this.add.container(W - 58, 43), sunArt = this.add.graphics();
      sunArt.lineStyle(3, 0xffd77a, .9); for (let a = 0; a < 8; a++) { const angle = a * Math.PI / 4; sunArt.lineBetween(Math.cos(angle) * 27, Math.sin(angle) * 27, Math.cos(angle) * 34, Math.sin(angle) * 34); }
      sunArt.fillStyle(0xffe08a, 1); sunArt.fillCircle(0, 0, 22);
      sun.add(sunArt);
      const sunFace = this.add.graphics(); // carita del sol (no gira)
      sunFace.fillStyle(0x7a5246, 1); sunFace.fillCircle(-7, -2, 2.2); sunFace.fillCircle(7, -2, 2.2);
      sunFace.fillStyle(0xff9fb4, .8); sunFace.fillEllipse(-12, 5, 6, 3.5); sunFace.fillEllipse(12, 5, 6, 3.5);
      sunFace.lineStyle(1.6, 0x7a5246, 1); sunFace.beginPath(); sunFace.arc(0, 3, 3.5, .2, Math.PI - .2); sunFace.strokePath();
      sunFace.setPosition(W - 58, 43);
      this.tweens.add({ targets: sun, angle: 360, duration: 32000, repeat: -1 });
      const cloud = this.add.container(112, 45), cloudArt = this.add.graphics();
      cloudArt.fillStyle(0xffffff, .9); cloudArt.fillEllipse(-20, 3, 45, 17); cloudArt.fillEllipse(0, -2, 34, 25); cloudArt.fillEllipse(20, 4, 39, 16); cloud.add(cloudArt);
      this.tweens.add({ targets: cloud, x: 285, duration: 14000, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
      // Corazoncitos que flotan en el cielo.
      [[230, 30, 0xffb3c7], [330, 52, 0xd9c2f0], [690, 26, 0xffc9a8]].forEach(([x, y, color], i) => {
        const heart = this.add.graphics().setPosition(x, y); heart.fillStyle(color, .9);
        heart.fillCircle(-3, -2, 3.6); heart.fillCircle(3, -2, 3.6); heart.fillTriangle(-6.6, -.6, 6.6, -.6, 0, 7);
        this.tweens.add({ targets: heart, y: y - 6, alpha: .45, duration: 1800 + i * 400, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
      });
      text(this, 43, 28, '♡  TU HUERTO', { fontSize: '12px', fontStyle: 'bold', color: '#c2577d' });
      text(this, 43, 46, 'Elige herramienta y toca una parcela', { fontSize: '10px', color: '#9a6b7c' });
      text(this, W / 2, H - 12, 'RIEGA  ♡  CUIDA  ♡  COSECHA', { fontSize: '9px', fontStyle: 'bold', color: '#fff6fa' }).setOrigin(.5);
    }

    boardTween(config) { const tween = this.tweens.add(config); this.boardTweens.push(tween); return tween; }

    drawBoard(animateIds = []) {
      this.boardTweens.forEach(tween => tween.remove()); this.boardTweens = [];
      if (this.board) this.board.destroy(true);
      const board = this.add.container(0, 0).setDepth(10); this.board = board;
      const g = this.add.graphics(); board.add(g);
      const { cellW } = GRID;
      for (let i = 0; i < 16; i++) {
        const plot = this.view.plots[i] || { status: 'empty' };
        const crop = plot.cropId ? G.data.cropMap[plot.cropId] : null;
        const { x, y } = this.plotOrigin(i); const selected = this.selected === i;
        const locked = plot.status === 'locked';
        const tileFill = locked ? 0xe3d6f1 : plot.status === 'ready' ? 0xffe28f : plot.status === 'growing' ? 0xc4eab0 : 0xe2b48e;
        g.fillStyle(selected ? 0xff8fb1 : locked ? 0xc5b3dc : plot.status === 'ready' ? 0xf0b84d : plot.status === 'growing' ? 0x8fcf8f : 0xc28c66, 1); g.fillRoundedRect(x - 2, y + 3, cellW - 5, 81, 14);
        g.fillStyle(selected ? 0xffeef5 : tileFill, 1); g.fillRoundedRect(x, y, cellW - 9, 78, 13);
        g.lineStyle(selected ? 3 : 2, selected ? 0xff8fb1 : locked ? 0xf5effb : plot.status === 'empty' ? 0xf3cfab : plot.status === 'ready' ? 0xfff3c4 : 0xe6f7da, 1); g.strokeRoundedRect(x + 1, y + 1, cellW - 11, 76, 12);
        const glow = this.add.graphics(); glow.fillStyle(0xffffff, .6); glow.fillRoundedRect(x + 3, y + 3, cellW - 15, 72, 9); glow.setAlpha(0); board.add(glow);
        const cx = x + (cellW - 9) / 2;
        if (locked) {
          // Terreno por comprar: pasto con candado y precio.
          g.fillStyle(0xcdb9e6, 1); for (let k = 0; k < 6; k++) g.fillTriangle(x + 18 + k * 27, y + 66, x + 22 + k * 27, y + 56, x + 26 + k * 27, y + 66);
          g.lineStyle(3, 0xb79ad6, 1); g.strokeCircle(cx, y + 20, 7);
          g.fillStyle(0xffb3c7, 1); g.fillCircle(cx - 5.5, y + 27, 7); g.fillCircle(cx + 5.5, y + 27, 7); g.fillTriangle(cx - 12.4, y + 29, cx + 12.4, y + 29, cx, y + 42);
          g.fillStyle(0xffffff, .8); g.fillCircle(cx - 7, y + 25, 2);
          board.add(text(this, x + 8, y + 6, String(i + 1).padStart(2, '0'), { fontSize: '9px', fontStyle: 'bold', color: '#9d7fc2' }));
          board.add(text(this, cx, y + 52, 'COMPRAR · ' + this.view.plotPrice + ' ◎', { fontSize: '9px', fontStyle: 'bold', color: '#ffffff', backgroundColor: 'rgba(157,127,194,.85)', padding: { x: 5, y: 2 } }).setOrigin(.5));
        } else if (plot.status === 'empty' || !crop) {
          g.fillStyle(0xc28c66, .45); g.fillEllipse(cx, y + 42, 42, 10);
          g.fillStyle(0xfff0e0, 1); g.fillEllipse(cx, y + 38, 10, 6);
          board.add(text(this, x + 8, y + 6, String(i + 1).padStart(2, '0'), { fontSize: '9px', fontStyle: 'bold', color: '#fff6ee' }));
          board.add(text(this, cx, y + 57, 'TIERRA LIBRE', { fontSize: '8px', fontStyle: 'bold', color: '#fff6ee' }).setOrigin(.5));
        } else {
          const cy = y + 30, plant = this.add.container(cx, cy), art = this.add.graphics();
          this.drawPlant(art, crop, plot.status === 'ready'); plant.add(art); board.add(plant);
          if (animateIds.includes(i)) { plant.setScale(.35); this.boardTween({ targets: plant, scaleX: 1, scaleY: 1, duration: 520, ease: 'Back.Out' }); }
          this.boardTween({ targets: plant, y: cy - 2, duration: 1250 + (i % 4) * 120, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
          board.add(text(this, x + 8, y + 6, String(i + 1).padStart(2, '0'), { fontSize: '9px', fontStyle: 'bold', color: plot.status === 'ready' ? '#b07a1f' : '#4f9461' }));
          board.add(text(this, cx, y + 51, crop.nombre.toUpperCase(), { fontSize: '8px', fontStyle: 'bold', color: '#7a5246' }).setOrigin(.5));
          const label = plot.status === 'ready' ? '♡ LISTA' : (plot.watered ? 'REGADA' : 'CRECE ' + plot.remaining + 'd');
          board.add(text(this, cx, y + 65, label, { fontSize: '7px', fontStyle: 'bold', color: plot.status === 'ready' ? '#c2577d' : '#4f9461' }).setOrigin(.5));
          if (plot.status === 'ready') {
            const shine = text(this, x + cellW - 27, y + 9, '✦', { fontSize: '13px', color: '#ffffff', stroke: '#ff8fb1', strokeThickness: 1 }).setOrigin(.5);
            board.add(shine); this.boardTween({ targets: shine, alpha: .25, scale: .65, angle: 20, duration: 760, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
          }
        }
        const zone = this.add.zone(cx, y + 39, cellW - 9, 78).setInteractive();
        zone.on('pointerover', () => this.boardTween({ targets: glow, alpha: .32, duration: 110 }));
        zone.on('pointerout', () => this.boardTween({ targets: glow, alpha: 0, duration: 180 }));
        zone.on('pointerdown', pointer => {
          // Ignora clics hechos sobre ventanas de Vue que tapan el lienzo (por ejemplo, un diálogo).
          if (pointer.event && pointer.event.target !== this.game.canvas) return;
          G.emit(E.PLOT_CLICKED, { plotId: i });
        });
        board.add(zone);
      }
    }

    drawPlant(art, crop, ready) {
      this.drawCrop(art, crop, ready);
      if (ready && crop.forma !== 'hoja' && crop.forma !== 'vaina') { // carita kawaii cuando está lista
        const fy = crop.forma === 'raiz' ? 15 : crop.forma === 'flor' ? 19 : 18;
        art.fillStyle(0x4a3032, 1); art.fillCircle(-3.4, fy, 1.5); art.fillCircle(3.4, fy, 1.5);
        art.fillStyle(0xffffff, 1); art.fillCircle(-3, fy - .5, .55); art.fillCircle(3.8, fy - .5, .55);
        art.fillStyle(0xff8fab, .8); art.fillEllipse(-6.2, fy + 2.4, 3.6, 2); art.fillEllipse(6.2, fy + 2.4, 3.6, 2);
      }
    }
    drawCrop(art, crop, ready) {
      art.lineStyle(5, 0x347941, 1); art.lineBetween(0, 20, 0, -3);
      art.fillStyle(0x54a843, 1); art.fillEllipse(-10, 6, 18, 10); art.fillEllipse(10, 1, 18, 10); art.fillEllipse(0, -8, 15, 10);
      const size = ready ? 1 : .72;
      if (crop.id === 'tomate') { art.fillStyle(0xed6742, 1); art.fillCircle(-8, 18, 7 * size); art.fillCircle(8, 18, 7 * size); art.fillStyle(0xf8a04f, 1); art.fillCircle(0, 20, 7 * size); return; }
      art.fillStyle(G.hex(crop.color || '#70a84d'), 1);
      if (crop.forma === 'raiz') art.fillTriangle(0, 27, -9 * size, 8, 9 * size, 8);
      else if (crop.forma === 'oval') art.fillEllipse(0, 18, 16 * size, 23 * size);
      else if (crop.forma === 'racimo') { art.fillCircle(-7, 15, 6 * size); art.fillCircle(7, 15, 6 * size); art.fillCircle(0, 23, 7 * size); }
      else if (crop.forma === 'bulbo') art.fillEllipse(0, 18, 19 * size, 21 * size);
      else if (crop.forma === 'hoja') { art.fillEllipse(-6, 13, 14, 10); art.fillEllipse(6, 17, 14, 10); art.fillEllipse(0, 23, 15, 10); }
      else if (crop.forma === 'vaina') { art.fillRoundedRect(-11, 13, 22, 12, 6); art.fillStyle(0xf1e5b5, .9); art.fillCircle(-5, 19, 2); art.fillCircle(1, 19, 2); art.fillCircle(7, 19, 2); }
      else if (crop.forma === 'flor') { art.fillCircle(-7, 15, 6); art.fillCircle(7, 15, 6); art.fillCircle(-5, 23, 6); art.fillCircle(5, 23, 6); art.fillStyle(0xf3c846, 1); art.fillCircle(0, 19, 6); }
      else if (crop.forma === 'calabaza') { art.fillEllipse(0, 17, 23 * size, 17 * size); art.lineStyle(2, 0xffbd54, 1); art.lineBetween(0, 9, 0, 25); }
      else art.fillCircle(0, 19, 9 * size);
    }

    // ---------- Personaje del jugador ----------
    heroSpot(plotId) {
      if (plotId < 0) return HOME;
      const { x, y } = this.plotOrigin(plotId);
      return { x: x + 24, y: y + 50 };
    }
    buildHero() {
      const spot = this.heroSpot(this.heroPlot);
      if (this.hero) this.hero.destroy(true);
      this.hero = this.add.container(spot.x, spot.y).setDepth(40);
      this.heroArt = G.drawCharacter(this, this.view.personaje).setScale(.78);
      this.hero.add(this.heroArt);
      this.heroIdle = this.tweens.add({ targets: this.heroArt, y: -3, duration: 650, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    }
    walkTo(plotId, onArrive) {
      if (!this.hero) { if (onArrive) onArrive(); return; }
      const spot = this.heroSpot(plotId); this.heroPlot = plotId;
      const distance = Phaser.Math.Distance.Between(this.hero.x, this.hero.y, spot.x, spot.y);
      if (distance > 2) this.heroArt.scaleX = (spot.x < this.hero.x ? -1 : 1) * Math.abs(this.heroArt.scaleX);
      this.tweens.killTweensOf(this.hero);
      this.tweens.add({ targets: this.hero, x: spot.x, y: spot.y, duration: Phaser.Math.Clamp(distance * 1.4, 120, 650), ease: 'Sine.InOut', onComplete: () => onArrive && onArrive() });
    }
    walkHome() { this.walkTo(-1); }

    // ---------- Vecinos (multijugador) ----------
    drawNeighbors(list) {
      this.neighbors.removeAll(true);
      if (!list.length) return;
      this.neighbors.add(text(this, 395, 8, 'VECINOS EN LÍNEA', { fontSize: '8px', fontStyle: 'bold', color: '#3e6b40' }));
      list.slice(0, 4).forEach((neighbor, i) => {
        const x = 412 + i * 74;
        const art = G.drawCharacter(this, neighbor.personaje).setPosition(x, 36).setScale(.48);
        this.neighbors.add(art);
        this.tweens.add({ targets: art, y: 35, duration: 800 + i * 140, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
        this.neighbors.add(text(this, x, 60, neighbor.nombre.length > 11 ? neighbor.nombre.slice(0, 10) + '…' : neighbor.nombre, { fontSize: '8px', fontStyle: 'bold', color: '#2f5732', backgroundColor: 'rgba(255,248,224,.75)', padding: { x: 3, y: 1 } }).setOrigin(.5, 0));
      });
      if (list.length > 4) this.neighbors.add(text(this, 412 + 4 * 74 - 20, 32, '+' + (list.length - 4), { fontSize: '12px', fontStyle: 'bold', color: '#2f5732' }));
    }
    giftBox(x, y) {
      const box = this.add.graphics().setPosition(x, y).setDepth(60);
      box.fillStyle(0xe2564d, 1); box.fillRoundedRect(-9, -7, 18, 15, 3);
      box.fillStyle(0xf6d36b, 1); box.fillRect(-2, -7, 4, 15); box.fillRect(-9, -1, 18, 3);
      box.lineStyle(2, 0xf6d36b, 1); box.strokeCircle(-4, -10, 3); box.strokeCircle(4, -10, 3);
      return box;
    }
    giftDrop() {
      const box = this.giftBox(this.hero.x, -20);
      this.tweens.add({ targets: box, y: this.hero.y - 34, duration: 650, ease: 'Bounce.Out', onComplete: () => this.tweens.add({ targets: box, alpha: 0, scale: 1.6, duration: 400, delay: 500, onComplete: () => box.destroy() }) });
    }
    giftToss() {
      const box = this.giftBox(this.hero.x, this.hero.y - 30);
      this.tweens.add({ targets: box, x: 520, y: -20, angle: 200, duration: 800, ease: 'Cubic.In', onComplete: () => box.destroy() });
    }

    // ---------- Efectos ----------
    coinBurst(quantity) {
      if (!this.hero) return;
      for (let i = 0; i < Math.min(8, 2 + quantity); i++) {
        const coin = this.add.graphics().setPosition(this.hero.x, this.hero.y - 20).setDepth(60);
        coin.fillStyle(0xf2c247, 1); coin.fillCircle(0, 0, 6); coin.lineStyle(2, 0xb5832a, 1); coin.strokeCircle(0, 0, 6);
        this.tweens.add({ targets: coin, x: this.hero.x + (i - 3) * 9, y: this.hero.y - 50 - (i % 3) * 8, alpha: 0, duration: 650 + i * 40, ease: 'Cubic.Out', onComplete: () => coin.destroy() });
      }
    }
    sparkle(id, type) {
      const { x, y } = this.plotOrigin(id); const cx = x + 88, cy = y + 34;
      const count = type === 'harvest' || type === 'buy' ? 10 : 5;
      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count, distance = type === 'harvest' || type === 'buy' ? 26 : 17;
        const heart = type === 'harvest' || type === 'buy';
        const dot = text(this, cx, cy, type === 'water' ? '●' : heart && i % 2 ? '♥' : '✦', { fontSize: type === 'harvest' ? '15px' : '11px', color: type === 'water' ? '#cdeeff' : heart && i % 2 ? '#ffb3c7' : '#fff3b0', stroke: type === 'water' ? '#7cc2e0' : heart && i % 2 ? '#e86d97' : '#e0a93f', strokeThickness: 2 }).setOrigin(.5).setDepth(30);
        this.tweens.add({ targets: dot, x: cx + Math.cos(angle) * distance, y: cy + Math.sin(angle) * distance - 7, alpha: 0, scale: .25, duration: 520 + (i % 3) * 90, ease: 'Cubic.Out', onComplete: () => dot.destroy() });
      }
    }
    rain() {
      for (let i = 0; i < 30; i++) {
        const x = 30 + ((i * 83) % (W - 60)), y = 70 + ((i * 47) % 360);
        const drop = this.add.graphics().setPosition(x, y).setDepth(25);
        drop.lineStyle(2, 0xe3f9ff, .9); drop.lineBetween(0, 0, -3, 10);
        this.tweens.add({ targets: drop, y: y + 45, alpha: 0, duration: 640 + (i % 5) * 75, delay: (i % 8) * 35, ease: 'Sine.In', onComplete: () => drop.destroy() });
      }
    }
    buildCursor() {
      if (this.toolCursor) this.toolCursor.destroy(true);
      this.toolCursor = G.drawToolCursor(this, this.view.selectedToolId);
      this.moveCursor();
    }
    moveCursor() {
      if (!this.toolCursor || !this.lastPointer) return;
      this.toolCursor.setPosition(this.lastPointer.x + 15, this.lastPointer.y + 15).setVisible(true);
    }
  }

  G.scenes = G.scenes || [];
  G.scenes.push(FarmScene);
})(window.Granja);
