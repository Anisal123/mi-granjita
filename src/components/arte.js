// Ilustraciones SVG para Vue: cultivos y personajes se dibujan a partir de la "forma"
// y los colores del JSON. Agregar un cultivo o un personaje nuevo no requiere dibujar a mano.
window.Granja = window.Granja || {};
(G => {
  const cropArt = {
    zanahoria: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" class="crop-svg"><path d="M22 15C13 11 10 7 11 4c6 1 10 4 13 10 2-7 7-10 13-10 0 6-4 10-12 13" fill="#60a84b" stroke="#326c3b" stroke-width="2.5" stroke-linejoin="round"/><path d="M14 17c4-5 16-5 20 0 4 5-2 19-10 28-8-8-14-22-10-28Z" fill="#ed883c" stroke="#8c512c" stroke-width="2.5" stroke-linejoin="round"/><path d="M18 23l4 2m4 4 4 2m-11 1 3 2" stroke="#ffc269" stroke-width="2.5" stroke-linecap="round"/></svg>',
    tomate: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" class="crop-svg"><path d="M24 12c-3-5-2-9 1-11 3 3 3 6 1 10 5-4 10-3 13 0-3 4-7 5-12 4 3 5 1 9-3 10-4-4-4-7-2-11-5 3-10 2-12-2 4-4 8-5 14-2Z" fill="#559647" stroke="#326b39" stroke-width="2.2" stroke-linejoin="round"/><path d="M24 14c-3-3-9-4-13-1-4 3-6 8-5 14 1 9 8 15 18 15s17-6 18-15c1-6-1-11-5-14-4-3-10-2-13 1Z" fill="#e85d48" stroke="#913d32" stroke-width="2.5"/><path d="M13 20c2-3 5-4 8-4" fill="none" stroke="#ff9a73" stroke-width="3" stroke-linecap="round"/><path d="M24 15v4" stroke="#356a39" stroke-width="3" stroke-linecap="round"/></svg>',
    calabaza: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" class="crop-svg"><path d="M24 13c-9-8-20-1-20 12 0 12 8 18 20 18s20-6 20-18c0-13-11-20-20-12Z" fill="#ec873a" stroke="#8d512d" stroke-width="2.5"/><path d="M24 14c-5 5-6 21 0 28m0-28c6 5 6 21 0 28m-9-25c-3 7-3 16 1 23m17-23c3 7 3 16-1 23" fill="none" stroke="#ffbd58" stroke-width="2.2" stroke-linecap="round"/><path d="M22 14c-1-5 1-8 5-10 2 3 2 6 0 9" fill="#579747" stroke="#326b39" stroke-width="2.2" stroke-linejoin="round"/></svg>'
  };

  G.cropSvg = id => {
    if (cropArt[id]) return cropArt[id];
    const crop = G.data && G.data.cropMap[id]; if (!crop) return '';
    const color = crop.color || '#79a94d';
    const shapes = {
      raiz: `<path d="M15 15c5-6 15-6 20 0 3 4-4 20-10 28-6-8-13-24-10-28Z" fill="${color}" stroke="#79543a" stroke-width="2.5"/><path d="M22 12C14 9 13 5 14 3c5 1 8 3 10 8 2-5 6-8 11-8 0 5-3 8-10 10" fill="#64a84b" stroke="#356d3d" stroke-width="2"/>`,
      redondo: `<circle cx="24" cy="27" r="17" fill="${color}" stroke="#79543a" stroke-width="2.5"/><path d="M24 11c-4-5-3-8 0-10 3 2 4 5 2 9 4-3 8-2 11 1-3 3-6 4-11 3" fill="#64a84b" stroke="#356d3d" stroke-width="2"/>`,
      oval: `<ellipse cx="24" cy="27" rx="13" ry="19" transform="rotate(25 24 27)" fill="${color}" stroke="#79543a" stroke-width="2.5"/><path d="M24 10c1-5 5-8 11-8-1 5-4 8-10 10" fill="#64a84b" stroke="#356d3d" stroke-width="2"/>`,
      racimo: `<circle cx="17" cy="20" r="9" fill="${color}" stroke="#79543a" stroke-width="2"/><circle cx="30" cy="20" r="9" fill="${color}" stroke="#79543a" stroke-width="2"/><circle cx="23" cy="31" r="10" fill="${color}" stroke="#79543a" stroke-width="2"/><path d="M24 12c0-5 3-8 8-9" fill="none" stroke="#356d3d" stroke-width="3" stroke-linecap="round"/>`,
      bulbo: `<path d="M24 10c-4 6-15 7-15 18 0 11 7 17 15 17s15-6 15-17c0-11-11-12-15-18Z" fill="${color}" stroke="#79543a" stroke-width="2.5"/><path d="M24 11V5m0 6c-5-5-9-5-12-4m12 4c4-5 8-5 12-4" fill="none" stroke="#64a84b" stroke-width="3" stroke-linecap="round"/>`,
      hoja: `<path d="M24 41C8 34 7 19 14 8c9 1 14 6 15 14 4-8 9-11 16-10 1 13-6 25-21 29Z" fill="${color}" stroke="#356d3d" stroke-width="2.5"/><path d="M14 34 34 15" stroke="#eaf3cc" stroke-width="2.5" stroke-linecap="round"/>`,
      vaina: `<path d="M9 32C12 17 28 8 40 15c-1 15-16 25-29 22-3-1-4-3-2-5Z" fill="${color}" stroke="#356d3d" stroke-width="2.5"/><circle cx="19" cy="29" r="3" fill="#f5e8b5"/><circle cx="26" cy="24" r="3" fill="#f5e8b5"/><circle cx="33" cy="19" r="3" fill="#f5e8b5"/>`,
      flor: `<g fill="${color}" stroke="#79543a" stroke-width="1.7"><circle cx="24" cy="11" r="8"/><circle cx="36" cy="19" r="8"/><circle cx="32" cy="33" r="8"/><circle cx="16" cy="33" r="8"/><circle cx="12" cy="19" r="8"/></g><circle cx="24" cy="23" r="8" fill="#f3c846" stroke="#79543a" stroke-width="2"/>`
    };
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" class="crop-svg">${shapes[crop.forma] || shapes.redondo}<path d="M24 44v3" stroke="#76502f" stroke-width="2.5" stroke-linecap="round"/></svg>`;
  };

  // Caritas kawaii para los cultivos (ojitos, cachetes y sonrisa). [x, y] es el centro del fruto.
  const FACE_SPOT = { zanahoria: [24, 27], tomate: [24, 30], calabaza: [24, 30] };
  const SHAPE_SPOT = { raiz: [24.5, 25], redondo: [24, 29], oval: [24, 28], racimo: [23, 31], bulbo: [24, 31], flor: [24, 23] };
  const cropFace = ([x, y]) => `<g class="crop-face"><circle cx="${x - 3.6}" cy="${y}" r="1.7" fill="#4a3032"/><circle cx="${x + 3.6}" cy="${y}" r="1.7" fill="#4a3032"/><circle cx="${x - 3.1}" cy="${y - .6}" r=".6" fill="#fff"/><circle cx="${x + 4.1}" cy="${y - .6}" r=".6" fill="#fff"/><ellipse cx="${x - 6.6}" cy="${y + 2.4}" rx="2" ry="1.2" fill="#ff8fab" opacity=".75"/><ellipse cx="${x + 6.6}" cy="${y + 2.4}" rx="2" ry="1.2" fill="#ff8fab" opacity=".75"/><path d="M${x - 1.3} ${y + 2.2}q1.3 1.3 2.6 0" fill="none" stroke="#4a3032" stroke-width="1.1" stroke-linecap="round"/></g>`;
  const baseCropSvg = G.cropSvg;
  G.cropSvg = id => {
    const svg = baseCropSvg(id); if (!svg) return '';
    const crop = G.data && G.data.cropMap[id];
    const spot = FACE_SPOT[id] || (crop && SHAPE_SPOT[crop.forma]);
    return spot ? svg.replace(/<\/svg>$/, cropFace(spot) + '</svg>') : svg;
  };

  // Personajes kawaii originales de Mi Granjita: Michi (gato), Saltarín (conejo) y Lanita (oveja).
  // El JSON da la forma y dos colores (color = pelaje/cara, detalle = hocico/orejas/lana).
  // Este mismo SVG se usa en Vue y se convierte en textura para Phaser (BootScene), así hay un solo dibujo.
  const LINE = '#7a5246';
  const kawaiiEyes = (y, color = '#3b2a2e') => `<ellipse cx="25.5" cy="${y}" rx="3" ry="3.8" fill="${color}"/><ellipse cx="38.5" cy="${y}" rx="3" ry="3.8" fill="${color}"/><circle cx="24.4" cy="${y - 1.5}" r="1.3" fill="#fff"/><circle cx="37.4" cy="${y - 1.5}" r="1.3" fill="#fff"/><circle cx="26.5" cy="${y + 1.4}" r=".6" fill="#fff"/><circle cx="39.5" cy="${y + 1.4}" r=".6" fill="#fff"/>`;
  const kawaiiBlush = y => `<ellipse cx="20.3" cy="${y}" rx="3.1" ry="1.9" fill="#ff9fb4" opacity=".7"/><ellipse cx="43.7" cy="${y}" rx="3.1" ry="1.9" fill="#ff9fb4" opacity=".7"/>`;
  const catMouth = y => `<path d="M29.4 ${y}q1.3 1.7 2.6 0q1.3 1.7 2.6 0" fill="none" stroke="${LINE}" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>`;
  const sprout = (x, y) => `<path d="M${x} ${y}v-5" stroke="#5aa66a" stroke-width="1.8" stroke-linecap="round"/><path d="M${x} ${y - 4.5}q-6-3.5-8.5.5q4.5 3 8.5-.5Z" fill="#9fe0a6" stroke="#5aa66a" stroke-width="1.3" stroke-linejoin="round"/><path d="M${x} ${y - 4.5}q6.5-4 9 .3q-4.6 3.4-9-.3Z" fill="#b8ecb9" stroke="#5aa66a" stroke-width="1.3" stroke-linejoin="round"/>`;
  const daisy = (x, y, petal = '#ffb3c7') => `<g>${[0, 72, 144, 216, 288].map(a => `<circle cx="${(x + Math.cos(a * Math.PI / 180) * 2.6).toFixed(2)}" cy="${(y + Math.sin(a * Math.PI / 180) * 2.6).toFixed(2)}" r="2.1" fill="${petal}" stroke="#f08aa6" stroke-width=".6"/>`).join('')}<circle cx="${x}" cy="${y}" r="1.7" fill="#ffe38a"/></g>`;

  G.characterSvg = (id, size = null) => {
    const character = G.data && (G.data.characterMap[id] || G.data.characters[0]);
    if (!character) return '';
    const c = character.color, d = character.detalle, line = LINE, sw = 'stroke-width="1.8" stroke-linejoin="round"';
    let art = '';
    if (character.forma === 'oveja') {
      const wool = [[22, 49, 7], [28, 46, 7], [36, 46, 7], [42, 49, 7], [24, 55, 6.5], [32, 56, 7], [40, 55, 6.5]]
        .map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${d}" stroke="#dccbe6" stroke-width="1.4"/>`).join('');
      const crown = [[20.5, 21, 6], [26, 16, 6.6], [32.5, 14.2, 6.8], [39, 16, 6.6], [44, 21, 6]]
        .map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${d}" stroke="#dccbe6" stroke-width="1.4"/>`).join('');
      art = `<ellipse cx="26.5" cy="60" rx="3.4" ry="2.4" fill="${c}" stroke="${line}" stroke-width="1.4"/><ellipse cx="37.5" cy="60" rx="3.4" ry="2.4" fill="${c}" stroke="${line}" stroke-width="1.4"/>${wool}`
        + `<ellipse cx="15.5" cy="30" rx="6.2" ry="3.3" transform="rotate(-22 15.5 30)" fill="${c}" stroke="${line}" ${sw}/><ellipse cx="48.5" cy="30" rx="6.2" ry="3.3" transform="rotate(22 48.5 30)" fill="${c}" stroke="${line}" ${sw}/>`
        + `<ellipse cx="15.8" cy="30" rx="3.4" ry="1.5" transform="rotate(-22 15.8 30)" fill="#ffc7d2"/><ellipse cx="48.2" cy="30" rx="3.4" ry="1.5" transform="rotate(22 48.2 30)" fill="#ffc7d2"/>`
        + `<ellipse cx="32" cy="31" rx="12.6" ry="12.4" fill="${c}" stroke="${line}" ${sw}/>${crown}${daisy(41, 13.5)}`
        + `<ellipse cx="32" cy="37" rx="6" ry="3.8" fill="#f6e2d8"/>${kawaiiEyes(30.5)}${kawaiiBlush(35.5)}`
        + `<ellipse cx="32" cy="35.6" rx="1.6" ry="1.1" fill="#e4808f"/>${catMouth(36.8)}`;
    } else if (character.forma === 'conejo') {
      art = `<circle cx="43.5" cy="53" r="3.6" fill="#fff" stroke="${line}" stroke-width="1.4"/>`
        + `<ellipse cx="32" cy="50.5" rx="11.5" ry="9.5" fill="${c}" stroke="${line}" ${sw}/>`
        + `<ellipse cx="26.5" cy="59" rx="4" ry="2.5" fill="${c}" stroke="${line}" stroke-width="1.5"/><ellipse cx="37.5" cy="59" rx="4" ry="2.5" fill="${c}" stroke="${line}" stroke-width="1.5"/>`
        + `<path d="M21 41.5q11 5.5 22 0l.4 3.6q-11 5.2-22.8 0Z" fill="#ffe08a" stroke="${line}" stroke-width="1.4" stroke-linejoin="round"/><path d="M37.5 45.5l2.6 7.2 3.4-1.4-2.4-6.6Z" fill="#ffd36b" stroke="${line}" stroke-width="1.3" stroke-linejoin="round"/>`
        + `<ellipse cx="24.5" cy="11.5" rx="5" ry="12" transform="rotate(-9 24.5 11.5)" fill="${c}" stroke="${line}" ${sw}/><ellipse cx="24.6" cy="12.5" rx="2.4" ry="8.4" transform="rotate(-9 24.6 12.5)" fill="${d}"/>`
        + `<path d="M36.6 19C36 11 37.6 4.2 41.2 2.6c2.8-1.2 6 1 7.4 4.4.9 2.2-.4 3.7-2.6 3.3-1.6-.3-2.6.6-2.9 2.4-.4 2.6-.3 4.8-.2 7.1Z" fill="${c}" stroke="${line}" ${sw}/><path d="M39.4 17.5c-.3-5 .4-9.6 2.3-11.2 1.4-1.2 3.3-.6 4.3 1-.9 0-2.5.8-2.9 2.6-.5 2.2-.6 4.6-.6 7.3Z" fill="${d}"/>`
        + `<ellipse cx="32" cy="29.5" rx="16.5" ry="14.5" fill="${c}" stroke="${line}" ${sw}/>${kawaiiEyes(29)}${kawaiiBlush(34)}`
        + `<ellipse cx="32" cy="33.3" rx="1.7" ry="1.2" fill="#f28da0"/>${catMouth(34.6)}<rect x="30.7" y="36.3" width="2.6" height="2.1" rx=".6" fill="#fff" stroke="${line}" stroke-width=".8"/>`;
    } else {
      art = `<path d="M42.5 54q9.5-.5 9.5-10.5 0-4.6-3.6-3.4" fill="none" stroke="${line}" stroke-width="6" stroke-linecap="round"/><path d="M42.5 54q9.5-.5 9.5-10.5 0-4.6-3.6-3.4" fill="none" stroke="${c}" stroke-width="3.4" stroke-linecap="round"/>`
        + `<ellipse cx="32" cy="50.5" rx="12" ry="9.5" fill="${c}" stroke="${line}" ${sw}/><ellipse cx="32" cy="52.5" rx="6.4" ry="5.4" fill="${d}"/>`
        + `<ellipse cx="26.5" cy="59" rx="4" ry="2.5" fill="${d}" stroke="${line}" stroke-width="1.5"/><ellipse cx="37.5" cy="59" rx="4" ry="2.5" fill="${d}" stroke="${line}" stroke-width="1.5"/>`
        + `<path d="M21.5 41q10.5 5 21 0L32 49.5Z" fill="#a8e6cf" stroke="${line}" stroke-width="1.4" stroke-linejoin="round"/><circle cx="32" cy="44.6" r="1.3" fill="#fff"/>`
        + `<path d="M17 23 18.6 7.6 29 14.2Z" fill="${c}" stroke="${line}" ${sw}/><path d="M47 23 45.4 7.6 35 14.2Z" fill="${c}" stroke="${line}" ${sw}/><path d="M19.6 19 20.4 11.3 26 14.8Z" fill="#ffb8c6"/><path d="M44.4 19 43.6 11.3 38 14.8Z" fill="#ffb8c6"/>`
        + `<ellipse cx="32" cy="28.5" rx="17" ry="15" fill="${c}" stroke="${line}" ${sw}/>`
        + `<path d="M28.8 14.6v3.4m3.2-4v4.2m3.2-3.6v3.4" stroke="#f2a465" stroke-width="1.8" stroke-linecap="round"/>${sprout(32, 13.6)}`
        + `<ellipse cx="32" cy="35.5" rx="6.6" ry="4.3" fill="${d}"/>${kawaiiEyes(29.5)}${kawaiiBlush(34.5)}`
        + `<path d="M30.6 32.8h2.8l-1.4 1.6Z" fill="#f28da0" stroke="#f28da0" stroke-width=".8" stroke-linejoin="round"/>${catMouth(34.8)}`
        + `<path d="M15.5 33.5h-5m5 2.6-4.6 1.4M48.5 33.5h5m-5 2.6 4.6 1.4" stroke="${line}" stroke-width="1" stroke-linecap="round" opacity=".55"/>`;
    }
    const dims = size ? ` width="${size}" height="${size}"` : '';
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"${dims} class="character-svg">${art}</svg>`;
  };
})(window.Granja);
