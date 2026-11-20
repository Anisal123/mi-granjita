// Dibujos de Phaser: personajes (gato, conejo, oveja, con el mismo SVG kawaii de Vue) y cursor de herramienta.
window.Granja = window.Granja || {};
(G => {
  const hex = color => Number.parseInt(String(color || '#999999').replace('#', ''), 16);
  G.hex = hex;
  G.FONT = 'Fredoka, Comic Sans MS, Comic Neue, cursive';

  // Devuelve un Container con el personaje; (0,0) es el centro y los pies quedan cerca de y = 30.
  // El dibujo es el mismo SVG kawaii de Vue (G.characterSvg), convertido en textura por BootScene.
  G.drawCharacter = (scene, characterId) => {
    const character = G.data.characterMap[characterId] || G.data.characters[0];
    const shadow = scene.add.graphics(); shadow.fillStyle(0x8a5a6b, .16); shadow.fillEllipse(0, 30, 34, 7);
    const key = 'personaje-' + character.id;
    const art = scene.textures.exists(key)
      ? scene.add.image(0, 0, key).setDisplaySize(64, 64)
      : scene.add.circle(0, 2, 22, hex(character.color)).setStrokeStyle(2, 0x7a5246); // por si la textura no cargó
    const holder = scene.add.container(0, 0, [shadow, art]);
    holder.setSize(64, 64);
    return holder;
  };

  // Crea las texturas de los personajes a partir de sus SVG (una vez, al arrancar Phaser).
  G.loadCharacterTextures = scene => Promise.all(G.data.characters.map(character => new Promise(resolve => {
    const key = 'personaje-' + character.id;
    if (scene.textures.exists(key)) { resolve(); return; }
    const img = new Image();
    img.onload = () => { if (!scene.textures.exists(key)) scene.textures.addImage(key, img); resolve(); };
    img.onerror = () => resolve();
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(G.characterSvg(character.id, 192));
  })));

  // Icono que sigue al puntero según la herramienta seleccionada.
  G.drawToolCursor = (scene, toolId) => {
    const holder = scene.add.container(0, 0).setDepth(1000);
    const art = scene.add.graphics();
    art.fillStyle(0xfff6fa, .97); art.fillCircle(0, 0, 15); art.lineStyle(2.5, 0xff9fbd, 1); art.strokeCircle(0, 0, 15);
    if (toolId === 'pala') {
      art.lineStyle(4, 0x76502f, 1); art.lineBetween(-7, 8, 6, -5);
      art.fillStyle(0xa77946, 1); art.fillTriangle(2, -11, 15, -8, 7, 3); art.lineStyle(2, 0x6c482c, 1); art.strokeTriangle(2, -11, 15, -8, 7, 3);
    } else if (toolId === 'regadera') {
      art.fillStyle(0x65aebe, 1); art.fillRoundedRect(-10, -5, 14, 13, 3); art.lineStyle(2, 0x347687, 1); art.strokeRoundedRect(-10, -5, 14, 13, 3);
      art.lineStyle(3, 0x347687, 1); art.lineBetween(3, -1, 11, -7); art.lineBetween(11, -7, 13, -3); art.lineBetween(-7, -6, -4, -11); art.lineBetween(-4, -11, 0, -6);
      art.fillStyle(0x47b5d0, 1); art.fillCircle(12, 4, 2); art.fillCircle(7, 10, 1.5);
    } else {
      art.lineStyle(3, 0x80542d, 1); art.lineBetween(-7, -5, -4, -11); art.lineBetween(-4, -11, 4, -11); art.lineBetween(4, -11, 7, -5);
      art.fillStyle(0xd8a34c, 1); art.fillRoundedRect(-10, -5, 20, 14, 3); art.lineStyle(2, 0x80542d, 1); art.strokeRoundedRect(-10, -5, 20, 14, 3);
      art.lineStyle(2, 0x9b682f, .8); art.lineBetween(-4, -3, -4, 7); art.lineBetween(2, -3, 2, 7);
    }
    holder.add(art); holder.setVisible(false);
    return holder;
  };
})(window.Granja);
