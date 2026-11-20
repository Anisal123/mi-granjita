// Historia de introducción: se muestra al abrir el juego, antes de la bienvenida.
// Michi (gato), Saltarín (conejo) y Lanita (oveja) heredan la granjita dormida de la Abuela Margarita.
// - Toca la escena, el botón «Siguiente» o pulsa Espacio/Enter para avanzar.
// - Si el texto se está escribiendo, el primer toque lo completa.
// - «Saltar historia» va directo a la bienvenida.
// Para cambiar el texto basta con editar la lista PAGINAS.
window.Granja = window.Granja || {};
(G => {
  const { ref, computed, onMounted, onBeforeUnmount } = Vue;

  // escena: fondo y objetos · habla: gato | conejo | oveja | narrador | todos
  const PAGINAS = [
    { escena: 'valle', habla: 'narrador', texto: 'Había una vez, en el Valle Algodón —donde las nubes parecen malvaviscos—, tres amigos inseparables…' },
    { escena: 'valle', habla: 'gato', texto: '¡Hola! Soy Michi. Siempre llego primero a todas partes… ¡y este brotecito en mi cabeza nunca se me cae!' },
    { escena: 'valle', habla: 'conejo', texto: '¡Y yo soy Saltarín! Salto de surco en surco. ¿Mi comida favorita? ¡Las zanahorias, obvio!' },
    { escena: 'valle', habla: 'oveja', texto: 'Yo soy Lanita. Voy despacito, pero cuido cada brote con mucho cariño.' },
    { escena: 'carta', habla: 'narrador', texto: 'Una mañana de primavera, el viento trajo una carta con un sello de corazón.' },
    { escena: 'carta', habla: 'oveja', texto: '¡Es de la Abuela Margarita! Dice: «Queridos míos, les dejo mi vieja granjita. La tierra está dormida y necesita manos cariñosas».' },
    { escena: 'dormida', habla: 'narrador', texto: 'Cuando llegaron, la granjita estaba en silencio: la tierra seca, la cerca torcida y casi todo cubierto de pasto.' },
    { escena: 'dormida', habla: 'gato', texto: 'Mmm… por ahora solo podemos usar tres parcelas. ¡Las demás tendremos que comprarlas con monedas!' },
    { escena: 'semillas', habla: 'conejo', texto: '¡Miren! La abuela nos dejó semillas: zanahorias, tomates y una calabaza. ¡Huelen a aventura!' },
    { escena: 'semillas', habla: 'oveja', texto: 'Con la pala plantamos, con la regadera regamos cada día… y cuando estén doraditas, ¡a la cesta!' },
    { escena: 'pueblo', habla: 'narrador', texto: 'En el pueblo, los vecinos venden semillas nuevas, celebran ferias y hasta se regalan semillas entre amigos.' },
    { escena: 'pueblo', habla: 'gato', texto: 'Si vendemos nuestras cosechas y compramos todo el terreno, ¡la granjita despertará otra vez!' },
    { escena: 'turno', habla: 'todos', texto: '¿Nos ayudas? ¡Elige a uno de nosotros y empecemos a cultivar juntos! ♡' }
  ];

  // ---------- Dibujos de las escenas (SVG) ----------
  const heart = (x, y, s, color) => `<path transform="translate(${x} ${y}) scale(${s})" d="M0 4C-3-1-9 0-9 5c0 4 5 7 9 11 4-4 9-7 9-11 0-5-6-6-9-1Z" fill="${color}"/>`;
  const flower = (x, y, color) => `<g transform="translate(${x} ${y})"><path d="M0 0v14" stroke="#7cc59b" stroke-width="2"/>${[0, 72, 144, 216, 288].map(a => `<circle cx="${(Math.cos(a * Math.PI / 180) * 4).toFixed(1)}" cy="${(Math.sin(a * Math.PI / 180) * 4).toFixed(1)}" r="3.4" fill="${color}"/>`).join('')}<circle r="2.6" fill="#ffe08a"/></g>`;
  const house = (x, y, s, roof, wall, door, sleepy = false) => `<g transform="translate(${x} ${y}) scale(${s})">
      <rect x="-46" y="-6" width="92" height="66" rx="10" fill="${wall}" stroke="#c99aa9" stroke-width="3"/>
      <path d="M-58 2 0-46 58 2Z" fill="${roof}" stroke="#c97a95" stroke-width="3" stroke-linejoin="round"/>
      <circle cx="0" cy="-16" r="9" fill="#fff" stroke="#c97a95" stroke-width="2.5"/>${heart(0, -21, .6, roof)}
      <rect x="-12" y="22" width="24" height="38" rx="12" fill="${door}" stroke="#a6788a" stroke-width="2.5"/><circle cx="6" cy="42" r="2" fill="#fff"/>
      <rect x="-38" y="8" width="18" height="16" rx="4" fill="${sleepy ? '#d9d4e4' : '#d6f0ff'}" stroke="#a6788a" stroke-width="2.5"/>
      <rect x="20" y="8" width="18" height="16" rx="4" fill="${sleepy ? '#d9d4e4' : '#d6f0ff'}" stroke="#a6788a" stroke-width="2.5"/>
      ${sleepy ? '<text x="40" y="-34" font-size="18" fill="#a99abd" font-family="Fredoka, sans-serif" font-weight="700">z</text><text x="52" y="-48" font-size="13" fill="#a99abd" font-family="Fredoka, sans-serif" font-weight="700">z</text>' : ''}</g>`;
  const fence = (x, y, n, crooked) => `<g transform="translate(${x} ${y})">${Array.from({ length: n }, (_, i) => `<rect x="${i * 26}" y="${crooked && i % 2 ? 4 : 0}" width="12" height="34" rx="6" transform="rotate(${crooked ? (i % 3 - 1) * 9 : 0} ${i * 26 + 6} 34)" fill="#fff6ee" stroke="#d8b39c" stroke-width="2.5"/>`).join('')}<rect x="-4" y="12" width="${n * 26}" height="7" rx="3.5" fill="#fff6ee" stroke="#d8b39c" stroke-width="2"/></g>`;
  const plot = (x, y, color, grass) => `<g transform="translate(${x} ${y})"><rect width="74" height="34" rx="12" fill="${color}" stroke="#c28c66" stroke-width="2.5"/>${grass ? [10, 24, 38, 52, 64].map(gx => `<path d="M${gx} 30l3-12 3 12" fill="#b9d6a4"/>`).join('') : ''}</g>`;

  const ESCENAS = {
    valle: `
      <path d="M0 90 Q120 0 240 90" transform="translate(300 40)" fill="none" stroke="#ffb3c7" stroke-width="9" opacity=".75"/>
      <path d="M0 90 Q120 0 240 90" transform="translate(300 50)" fill="none" stroke="#ffe08a" stroke-width="9" opacity=".75"/>
      <path d="M0 90 Q120 0 240 90" transform="translate(300 60)" fill="none" stroke="#a8e6cf" stroke-width="9" opacity=".75"/>
      <path d="M0 90 Q120 0 240 90" transform="translate(300 70)" fill="none" stroke="#cdb6ec" stroke-width="9" opacity=".75"/>
      ${flower(90, 300, '#ffb3c7')}${flower(140, 318, '#cdb6ec')}${flower(720, 305, '#ffd1b8')}${flower(770, 322, '#ffb3c7')}${flower(660, 330, '#a8d8ff')}`,
    carta: `
      <g class="story-float" style="transform-origin:430px 120px">
        <g transform="translate(430 120) rotate(-6)">
          <rect x="-62" y="-40" width="124" height="80" rx="10" fill="#fffaf2" stroke="#e7a9bd" stroke-width="3.5"/>
          <path d="M-60-37 0 8 60-37" fill="none" stroke="#e7a9bd" stroke-width="3.5" stroke-linejoin="round"/>
          <circle cx="0" cy="8" r="15" fill="#f0789f"/>${heart(0, 1, .9, '#fff')}
        </g>
      </g>
      <g class="story-twinkle">${heart(340, 80, .8, '#ffb3c7')}${heart(530, 70, .7, '#cdb6ec')}${heart(560, 170, .6, '#ffd1b8')}${heart(310, 175, .55, '#ffb3c7')}</g>`,
    dormida: `
      <g filter="url(#gris)">${house(735, 249, .85, '#e6a8bc', '#fff1e6', '#b8e3cf', true)}</g>
      ${fence(300, 262, 13, true)}
      ${plot(300, 304, '#e2b48e', false)}${plot(385, 304, '#e2b48e', false)}${plot(470, 304, '#e2b48e', false)}${plot(555, 304, '#d6dcc6', true)}
      ${plot(300, 342, '#d6dcc6', true)}${plot(385, 342, '#d6dcc6', true)}${plot(470, 342, '#d6dcc6', true)}${plot(555, 342, '#d6dcc6', true)}`,
    semillas: `
      <g class="story-float" style="transform-origin:430px 150px">
        <g transform="translate(430 150)">
          <path d="M-46-34c-6 20-8 54 2 76 22 8 66 8 88 0 10-22 8-56 2-76Z" fill="#f6d7b6" stroke="#c99a79" stroke-width="3.5" stroke-linejoin="round"/>
          <path d="M-50-38q50-18 100 0" fill="none" stroke="#c99a79" stroke-width="4" stroke-linecap="round"/>
          <path d="M-14-40q14 10 28 0" fill="none" stroke="#f0789f" stroke-width="5" stroke-linecap="round"/>
          ${heart(0, 4, 1.2, '#ffb3c7')}
          <text x="0" y="44" text-anchor="middle" font-size="12" font-family="Fredoka, sans-serif" font-weight="700" fill="#b07a5c">SEMILLAS</text>
        </g>
      </g>
      <g class="story-pop" style="animation-delay:.1s"><g transform="translate(330 70) scale(1.5)">__CROP_zanahoria__</g></g>
      <g class="story-pop" style="animation-delay:.35s"><g transform="translate(398 22) scale(1.5)">__CROP_tomate__</g></g>
      <g class="story-pop" style="animation-delay:.6s"><g transform="translate(470 70) scale(1.5)">__CROP_calabaza__</g></g>`,
    pueblo: `
      ${house(110, 266, .58, '#cdb6ec', '#fffaf2', '#ffd1b8')}${house(770, 262, .62, '#a8e6cf', '#fffaf2', '#ffb3c7')}
      <g transform="translate(430 232)">
        <rect x="-80" y="0" width="160" height="64" rx="8" fill="#fff6ee" stroke="#d8b39c" stroke-width="3"/>
        <rect x="-74" y="-10" width="6" height="74" fill="#d8b39c"/><rect x="68" y="-10" width="6" height="74" fill="#d8b39c"/>
        <path d="M-92-12h184l-8 26h-168Z" fill="#fff" stroke="#e7a9bd" stroke-width="3" stroke-linejoin="round"/>
        ${[-84, -48, -12, 24, 60].map(px => `<path d="M${px}-12h24l-3 26h-18Z" fill="#ffb3c7"/>`).join('')}
        <text x="0" y="-22" text-anchor="middle" font-size="16" font-family="Fredoka, sans-serif" font-weight="700" fill="#e0628d">MERCADO</text>
        <g transform="translate(-58 18) scale(.75)">__CROP_fresa__</g><g transform="translate(-18 18) scale(.75)">__CROP_lechuga__</g><g transform="translate(22 18) scale(.75)">__CROP_uva__</g>
      </g>
      <g class="story-twinkle">${heart(250, 110, .7, '#ffb3c7')}${heart(610, 100, .6, '#ffe08a')}${heart(430, 80, .55, '#cdb6ec')}</g>`,
    turno: `
      ${house(790, 249, .85, '#f4a9bf', '#fffaf2', '#a8e6cf')}
      ${fence(300, 262, 13, false)}
      ${plot(300, 304, '#c4eab0', false)}${plot(385, 304, '#ffe28f', false)}${plot(470, 304, '#c4eab0', false)}${plot(555, 304, '#ffe28f', false)}
      <g transform="translate(318 284) scale(.6)">__CROP_zanahoria__</g><g transform="translate(403 284) scale(.6)">__CROP_tomate__</g><g transform="translate(488 284) scale(.6)">__CROP_lechuga__</g><g transform="translate(573 284) scale(.6)">__CROP_calabaza__</g>
      <g class="story-twinkle">${heart(120, 70, .9, '#ffb3c7')}${heart(260, 40, .7, '#cdb6ec')}${heart(470, 60, .8, '#ffd1b8')}${heart(380, 120, .6, '#a8e6cf')}${heart(560, 30, .7, '#ffb3c7')}</g>
      ${flower(90, 330, '#ffb3c7')}${flower(820, 340, '#cdb6ec')}`
  };
  // Personajes en cada escena: [id, x en %, y del suelo en %, tamaño]
  const POSES = {
    valle: [['gato', 31, 84, 1], ['conejo', 50, 86, 1], ['oveja', 69, 84, 1]],
    carta: [['gato', 26, 86, .95], ['oveja', 50, 88, 1.05], ['conejo', 74, 86, .95]],
    dormida: [['gato', 13, 92, .9], ['conejo', 27, 94, .85], ['oveja', 76, 95, .85]],
    semillas: [['conejo', 26, 86, 1], ['oveja', 74, 86, 1], ['gato', 12, 90, .8]],
    pueblo: [['gato', 24, 92, .9], ['conejo', 36, 95, .8], ['oveja', 71, 93, .9]],
    turno: [['gato', 14, 92, 1], ['conejo', 28, 95, 1], ['oveja', 79, 95, 1]]
  };
  const COLORES = { gato: '#f19a4f', conejo: '#a77fd8', oveja: '#4fae86', narrador: '#e86d97', todos: '#e86d97' };

  function sceneSvg(name) {
    const body = ESCENAS[name].replace(/__CROP_(\w+)__/g, (_, id) => (G.cropSvg(id) || '').replace(/<svg[^>]*>/, '<g>').replace('</svg>', '</g>'));
    return `<svg viewBox="0 0 860 380" preserveAspectRatio="xMidYMax slice" class="story-scene-art" aria-hidden="true">
      <defs><filter id="gris"><feColorMatrix type="saturate" values=".35"/></filter></defs>
      <ellipse cx="180" cy="420" rx="420" ry="120" fill="${name === 'dormida' ? '#d3dcc6' : '#c9ecd6'}"/>
      <ellipse cx="720" cy="430" rx="420" ry="130" fill="${name === 'dormida' ? '#c8d2bb' : '#b8e4c6'}"/>
      ${body}</svg>`;
  }

  G.components.StoryIntro = {
    name: 'StoryIntro',
    emits: ['done'],
    setup(props, { emit }) {
      const started = ref(false), index = ref(0), shown = ref(''), typing = ref(false), leaving = ref(false);
      let timer = null;
      const page = computed(() => PAGINAS[index.value]);
      const last = computed(() => index.value === PAGINAS.length - 1);
      const speakerName = who => who === 'narrador' ? 'Narradora' : who === 'todos' ? G.data.characters.map(c => c.nombre).join(', ').replace(/, ([^,]*)$/, ' y $1') : (G.data.characterMap[who] || {}).nombre || who;
      const cast = computed(() => (POSES[page.value.escena] || []).filter(([id]) => G.data.characterMap[id]).map(([id, x, y, size]) => ({ id, x, y, size })));
      const art = computed(() => sceneSvg(page.value.escena));

      function type() {
        clearInterval(timer);
        const full = page.value.texto; let i = 0;
        shown.value = ''; typing.value = true;
        timer = setInterval(() => {
          i++; shown.value = full.slice(0, i);
          const ch = full.charAt(i - 1);
          if (i % 2 === 0 && /[a-záéíóúñ¡!¿?]/i.test(ch)) G.sonido.voz(page.value.habla);
          if (i >= full.length) { clearInterval(timer); typing.value = false; }
        }, 30);
      }
      function begin() {
        if (started.value) return;
        G.sonido.unlock(); G.sonido.play('inicio');
        started.value = true; index.value = 0; setTimeout(type, 450);
      }
      function next() {
        if (!started.value) { begin(); return; }
        if (typing.value) { clearInterval(timer); shown.value = page.value.texto; typing.value = false; return; }
        if (last.value) { finish(); return; }
        index.value++; G.sonido.play('pagina'); type();
      }
      function finish() {
        if (leaving.value) return;
        clearInterval(timer); leaving.value = true; G.sonido.unlock(); G.sonido.play('inicio');
        setTimeout(() => emit('done'), 450);
      }
      function onKey(event) {
        if (event.key === ' ' || event.key === 'Enter' || event.key === 'ArrowRight') { event.preventDefault(); next(); }
        else if (event.key === 'Escape') finish();
      }
      onMounted(() => { window.addEventListener('keydown', onKey); G.sonido.cancion('historia'); });
      onBeforeUnmount(() => { clearInterval(timer); window.removeEventListener('keydown', onKey); });

      return { pages: PAGINAS, started, index, page, last, shown, typing, leaving, cast, art, colors: COLORES, speakerName, characters: computed(() => G.data.characters), begin, next, finish };
    },
    template: `
    <section class="story" :class="{ leaving }" aria-label="Historia de Mi Granjita">
      <div class="story-clouds" aria-hidden="true"><i></i><i></i><i></i></div>

      <div v-if="!started" class="story-title" @click="begin">
        <p class="story-kicker">♡ UNA HISTORIA DEL VALLE ALGODÓN ♡</p>
        <h1>Mi Granjita</h1>
        <div class="story-title-cast">
          <character-art v-for="(c, i) in characters" :key="c.id" :id="c.id" :style="{ animationDelay: (i * .18) + 's' }"></character-art>
        </div>
        <button type="button" class="button primary story-start" @click.stop="begin"><app-icon name="book-open"></app-icon> Toca para comenzar</button>
        <button type="button" class="story-skip-link" @click.stop="finish">Saltar la historia</button>
      </div>

      <div v-else class="story-stage-wrap">
        <div class="story-stage" :class="'scene-' + page.escena" @click="next">
          <div class="story-scene-box">
            <transition name="story-fade">
              <div class="story-scene" :key="page.escena" v-html="art"></div>
            </transition>
            <div v-for="c in cast" :key="c.id" class="story-char" :class="{ talking: page.habla === c.id || page.habla === 'todos', listening: page.habla !== c.id && page.habla !== 'todos' }"
              :style="{ left: c.x + '%', top: c.y + '%', '--size': c.size }">
              <character-art :id="c.id"></character-art>
            </div>
          </div>
          <div class="story-dialog" :style="{ '--speaker': colors[page.habla] || colors.narrador }">
            <span class="story-name"><character-art v-if="colors[page.habla] && page.habla !== 'narrador' && page.habla !== 'todos'" :id="page.habla"></character-art>{{ speakerName(page.habla) }}</span>
            <p :class="{ narrator: page.habla === 'narrador' }">{{ shown }}<span v-if="typing" class="story-caret">▍</span></p>
            <span v-if="!typing && !last" class="story-more" aria-hidden="true">▼</span>
          </div>
        </div>
        <div class="story-controls">
          <div class="story-dots" aria-hidden="true"><i v-for="(p, i) in pages" :key="i" :class="{ on: i === index, done: i < index }"></i></div>
          <button type="button" class="story-skip" @click="finish"><app-icon name="skip-forward"></app-icon> Saltar historia</button>
          <button type="button" class="button primary story-next" @click="next">
            <template v-if="last && !typing"><app-icon name="heart"></app-icon> ¡Comenzar mi granja!</template>
            <template v-else>Siguiente <app-icon name="chevron-right"></app-icon></template>
          </button>
        </div>
      </div>
    </section>`
  };
})(window.Granja);
