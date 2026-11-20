// Música y efectos de sonido de Mi Granjita.
// Todo se genera con la Web Audio API del navegador: no hay archivos de audio que descargar
// y funciona igual abriendo index.html sin servidor.
//
//  - Dos canciones tranquilas: «historia» (cajita musical, para la historia y la bienvenida)
//    y «granja» (cajita musical + kalimba + pad suave, mientras se juega).
//  - Efectos: pala, regadera, cesta, monedas, comprar parcela, terminar día, ganar, regalos,
//    botones, avisos y la «voz» de cada personaje cuando habla en la historia.
//  - G.sonido.prefs guarda si la música y los efectos están activados (se recuerda en el navegador).
//
// Los efectos se disparan escuchando los mismos eventos que ya usan Vue y Phaser (src/events/eventos.js),
// así que las reglas de Pinia y las escenas no tienen que saber nada de sonido.
window.Granja = window.Granja || {};
(G => {
  const PREF_KEY = 'mi-granjita-sonido';
  const saved = (() => { try { return JSON.parse(localStorage.getItem(PREF_KEY)) || {}; } catch (_) { return {}; } })();
  const prefs = Vue.reactive({ musica: saved.musica !== false, efectos: saved.efectos !== false, desbloqueado: false });
  const savePrefs = () => { try { localStorage.setItem(PREF_KEY, JSON.stringify({ musica: prefs.musica, efectos: prefs.efectos })); } catch (_) { /* modo privado */ } };

  let ctx = null, master, musicBus, sfxBus, reverbIn, noiseBuffer;
  let lastActionAt = 0, pendingAviso = false; // para no encimar sonidos
  const historial = []; // últimos efectos que sonaron (útil para revisar en la consola)

  // ---------- Notas ----------
  const NOTE_INDEX = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };
  const freq = name => {
    const m = /^([A-G][b#]?)(-?\d)$/.exec(name);
    if (!m) return 440;
    const midi = (Number(m[2]) + 1) * 12 + NOTE_INDEX[m[1]];
    return 440 * Math.pow(2, (midi - 69) / 12);
  };

  // ---------- Contexto de audio ----------
  function build() {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return false;
    ctx = new AudioCtx();
    master = ctx.createGain(); master.gain.value = 0.9;
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 3;
    master.connect(comp); comp.connect(ctx.destination);
    musicBus = ctx.createGain(); musicBus.gain.value = prefs.musica ? 0.75 : 0; musicBus.connect(master);
    sfxBus = ctx.createGain(); sfxBus.gain.value = 2.4; sfxBus.connect(master);

    // Reverberación suave hecha con ruido que se apaga poco a poco (da el aire de "cajita musical").
    const seconds = 2.6, len = Math.floor(ctx.sampleRate * seconds), impulse = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const data = impulse.getChannelData(ch); for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2); }
    const conv = ctx.createConvolver(); conv.buffer = impulse;
    reverbIn = ctx.createGain(); reverbIn.gain.value = 0.32;
    reverbIn.connect(conv); conv.connect(master);

    noiseBuffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const nd = noiseBuffer.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    return true;
  }

  // Los navegadores solo dejan sonar audio después de que la persona toca algo.
  function unlock() {
    if (!ctx && !build()) return;
    if (ctx.state === 'suspended') ctx.resume();
    if (!prefs.desbloqueado) { prefs.desbloqueado = true; if (wantedSong && prefs.musica) startSong(wantedSong); }
  }
  ['pointerdown', 'keydown', 'touchstart'].forEach(type => window.addEventListener(type, unlock, { capture: true, passive: true }));
  document.addEventListener('visibilitychange', () => {
    if (!ctx) return;
    if (document.visibilityState === 'hidden') ctx.suspend(); else if (prefs.desbloqueado) ctx.resume();
  });

  // ---------- Instrumentos ----------
  // Envolvente sencilla: sube en "attack" y baja exponencialmente hasta "end".
  function env(gainNode, t, peak, attack, end) {
    const g = gainNode.gain;
    g.setValueAtTime(0.0001, t);
    g.linearRampToValueAtTime(peak, t + attack);
    g.exponentialRampToValueAtTime(0.001, end);
    g.linearRampToValueAtTime(0, end + 0.02);
  }
  function osc(type, f, t, stop, dest) {
    const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t);
    o.connect(dest); o.start(t); o.stop(stop + 0.05);
    return o;
  }

  // Cajita musical: tono puro con un brillo agudo que se apaga rápido.
  function musicBox(f, t, vol, out, wet = 0.9) {
    const g = ctx.createGain(); env(g, t, vol, 0.006, t + 1.9);
    g.connect(out); if (wet) { const s = ctx.createGain(); s.gain.value = wet; g.connect(s); s.connect(reverbIn); }
    osc('sine', f, t, t + 1.9, g);
    const shine = ctx.createGain(); env(shine, t, vol * 0.35, 0.003, t + 0.35); shine.connect(out);
    osc('sine', f * 3, t, t + 0.4, shine);
  }
  // Kalimba: triángulo corto y redondo.
  function kalimba(f, t, vol, out) {
    const g = ctx.createGain(); env(g, t, vol, 0.004, t + 0.7);
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1800;
    g.connect(lp); lp.connect(out);
    const s = ctx.createGain(); s.gain.value = 0.5; lp.connect(s); s.connect(reverbIn);
    osc('triangle', f, t, t + 0.7, g);
  }
  // Colchón de acordes muy suave.
  function pad(freqs, t, dur, vol, out) {
    const g = ctx.createGain(); const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 950;
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + Math.min(1.2, dur * 0.4));
    g.gain.setValueAtTime(vol, t + dur * 0.75); g.gain.linearRampToValueAtTime(0.0001, t + dur + 0.6);
    g.connect(lp); lp.connect(out); const s = ctx.createGain(); s.gain.value = 0.6; lp.connect(s); s.connect(reverbIn);
    freqs.forEach(f => { [-4, 4].forEach(cents => { const o = osc('triangle', f, t, t + dur + 0.7, g); o.detune.value = cents; }); });
  }
  function bass(f, t, dur, vol, out) {
    const g = ctx.createGain(); env(g, t, vol, 0.03, t + dur);
    g.connect(out); osc('sine', f, t, t + dur, g);
  }
  function shaker(t, vol, out) {
    const src = ctx.createBufferSource(); src.buffer = noiseBuffer;
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 6000;
    const g = ctx.createGain(); env(g, t, vol, 0.005, t + 0.06);
    src.connect(hp); hp.connect(g); g.connect(out); src.start(t, Math.random() * 0.5, 0.08);
  }

  // ---------- Canciones ----------
  // Cada compás: acorde (notas del pad), bajo y melodía [tiempo en pulsos, nota, duración].
  const CHORDS = {
    C: ['C4', 'E4', 'G4', 'B4'], Am: ['A3', 'C4', 'E4', 'G4'], F: ['F3', 'A3', 'C4', 'E4'], G: ['G3', 'B3', 'D4', 'E4'],
    Em: ['E3', 'G3', 'B3', 'D4'], Dm: ['D4', 'F4', 'A4', 'C5'], Bb: ['Bb3', 'D4', 'F4', 'A4']
  };
  const BASS = { C: 'C3', Am: 'A2', F: 'F2', G: 'G2', Em: 'E2', Dm: 'D3', Bb: 'Bb2' };
  const SONGS = {
    historia: {
      bpm: 70, kalimba: false, shaker: false, melodyVol: 0.13, padVol: 0.028,
      bars: [
        ['F', [[0, 'A5'], [1, 'C6'], [2, 'A5'], [3, 'F5']]],
        ['Dm', [[0, 'G5'], [1.5, 'F5'], [2, 'D5']]],
        ['Bb', [[0, 'D5'], [1, 'F5'], [2, 'G5'], [3, 'F5']]],
        ['C', [[0, 'E5'], [1, 'G5'], [2, 'C5']]],
        ['F', [[0, 'A5'], [1, 'C6'], [2, 'D6'], [3, 'C6']]],
        ['Dm', [[0, 'A5'], [1.5, 'G5'], [2, 'F5']]],
        ['Bb', [[0, 'D5'], [1, 'F5']], 'C', [[2, 'E5'], [3, 'G5']]],
        ['F', [[0, 'F5'], [2.5, 'C5'], [3, 'A4']]]
      ]
    },
    granja: {
      bpm: 86, kalimba: true, shaker: true, melodyVol: 0.11, padVol: 0.022,
      bars: [
        ['C', [[0, 'E5'], [1, 'G5'], [2, 'A5'], [2.5, 'G5']]],
        ['Am', [[0, 'E5'], [1, 'C5'], [2, 'D5']]],
        ['F', [[0, 'A4'], [1, 'C5'], [2, 'E5'], [3, 'D5']]],
        ['G', [[0, 'D5'], [1.5, 'E5'], [2, 'D5']]],
        ['C', [[0, 'E5'], [1, 'G5'], [2, 'C6'], [3.5, 'A5']]],
        ['Am', [[0, 'G5'], [1, 'E5'], [2, 'C5']]],
        ['F', [[0, 'A4'], [1, 'C5']], 'G', [[2, 'D5'], [3, 'E5']]],
        ['C', [[0, 'C5']]],
        ['F', [[0, 'A5'], [1.5, 'G5'], [2, 'E5'], [3, 'G5']]],
        ['G', [[0, 'D5'], [1.5, 'E5'], [2, 'G5']]],
        ['Em', [[0, 'E5'], [1, 'D5'], [2, 'B4'], [3, 'D5']]],
        ['Am', [[0, 'C5'], [1, 'E5'], [2, 'A5']]],
        ['F', [[0, 'C6'], [1, 'A5'], [2, 'G5'], [3, 'A5']]],
        ['G', [[0, 'G5'], [1, 'E5'], [2, 'D5']]],
        ['C', [[0, 'E5'], [1, 'D5'], [1.5, 'C5'], [2, 'D5'], [3, 'E5']]],
        ['C', [[0, 'C5'], [2, 'G4']]]
      ]
    }
  };
  const ARP = [0, 2, 1, 2, 3, 2, 1, 2]; // índice dentro del acorde, en corcheas

  let wantedSong = null, current = null, timer = null;

  function scheduleBar(song, bar, t, out) {
    const beat = 60 / song.bpm, barLen = beat * 4;
    // Un compás puede tener un acorde o dos (mitad y mitad).
    const parts = bar.length > 2 ? [[bar[0], bar[1], 0, 2], [bar[2], bar[3], 2, 2]] : [[bar[0], bar[1], 0, 4]];
    parts.forEach(([chordName, notes, from, beats]) => {
      const chord = CHORDS[chordName].map(freq), start = t + from * beat, len = beats * beat;
      pad(chord, start, len, song.padVol, out);
      bass(freq(BASS[chordName]), start, len * 0.95, 0.09, out);
      if (song.kalimba) for (let i = 0; i < beats * 2; i++) kalimba(chord[ARP[(i + from * 2) % 8]] * 2, start + i * beat / 2, i % 2 ? 0.035 : 0.05, out);
    });
    bar[1].concat(bar[3] || []).forEach(([at, note]) => musicBox(freq(note), t + at * beat + (Math.random() - 0.5) * 0.012, song.melodyVol * (0.85 + Math.random() * 0.3), out));
    if (song.shaker) for (let i = 1; i < 8; i += 2) shaker(t + i * beat / 2, 0.012, out);
    return barLen;
  }

  function startSong(name) {
    stopSong();
    const song = SONGS[name]; if (!song || !ctx) return;
    const out = ctx.createGain(); out.gain.setValueAtTime(0.0001, ctx.currentTime); out.gain.linearRampToValueAtTime(1, ctx.currentTime + 1.5); out.connect(musicBus);
    current = { name, song, out, bar: 0, next: ctx.currentTime + 0.15 };
    const tick = () => {
      if (!current || ctx.state !== 'running') return;
      while (current.next < ctx.currentTime + 0.35) {
        current.next += scheduleBar(song, song.bars[current.bar % song.bars.length], current.next, out);
        current.bar++;
      }
    };
    tick(); timer = setInterval(tick, 60);
  }
  function stopSong() {
    clearInterval(timer); timer = null;
    if (!current) return;
    const { out } = current; current = null;
    const now = ctx.currentTime; out.gain.cancelScheduledValues(now); out.gain.setValueAtTime(out.gain.value, now); out.gain.linearRampToValueAtTime(0.0001, now + 0.8);
    setTimeout(() => out.disconnect(), 3500);
  }

  // Elige la canción que corresponde a la pantalla (empieza en cuanto el navegador lo permita).
  function cancion(name) {
    if (wantedSong === name && current) return;
    wantedSong = name;
    if (ctx && prefs.desbloqueado && prefs.musica) startSong(name);
  }

  function setMusica(on) {
    prefs.musica = Boolean(on); savePrefs();
    if (!ctx) return;
    const now = ctx.currentTime; musicBus.gain.cancelScheduledValues(now); musicBus.gain.setValueAtTime(musicBus.gain.value, now);
    musicBus.gain.linearRampToValueAtTime(prefs.musica ? 0.75 : 0.0001, now + 0.5);
    if (prefs.musica && wantedSong && !current && prefs.desbloqueado) startSong(wantedSong);
    if (!prefs.musica) setTimeout(() => { if (!prefs.musica) stopSong(); }, 600);
  }
  function setEfectos(on) { prefs.efectos = Boolean(on); savePrefs(); if (prefs.efectos) play('click'); }

  // ---------- Efectos ----------
  function noise(t, dur, vol, type, f, q = 1, f2 = null) {
    const src = ctx.createBufferSource(); src.buffer = noiseBuffer;
    const filter = ctx.createBiquadFilter(); filter.type = type; filter.frequency.setValueAtTime(f, t); filter.Q.value = q;
    if (f2) filter.frequency.exponentialRampToValueAtTime(f2, t + dur);
    const g = ctx.createGain(); env(g, t, vol, 0.01, t + dur);
    src.connect(filter); filter.connect(g); g.connect(sfxBus); src.start(t, Math.random() * 0.3, dur + 0.05);
  }
  function blip(type, f, t, dur, vol, f2 = null, wet = 0.25) {
    const g = ctx.createGain(); env(g, t, vol, 0.004, t + dur);
    g.connect(sfxBus); if (wet) { const s = ctx.createGain(); s.gain.value = wet; g.connect(s); s.connect(reverbIn); }
    const o = osc(type, f, t, t + dur, g);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur * 0.8);
  }
  const notes = (list, t, gap, type = 'triangle', dur = 0.3, vol = 0.12) => list.forEach((n, i) => blip(type, freq(n), t + i * gap, dur, vol));

  const SFX = {
    click: t => blip('sine', 700, t, 0.09, 0.09, 1150, 0.1),
    herramienta: t => { blip('triangle', 660, t, 0.07, 0.08); blip('triangle', 990, t + 0.06, 0.1, 0.08); },
    // Pala: dos paladas de tierra y la semilla que cae.
    pala: t => {
      noise(t, 0.16, 0.7, 'bandpass', 900, 0.9); blip('sine', 160, t, 0.14, 0.22, 70, 0);
      noise(t + 0.17, 0.14, 0.6, 'bandpass', 750, 0.9); blip('sine', 140, t + 0.17, 0.12, 0.18, 60, 0);
      blip('sine', 520, t + 0.36, 0.12, 0.13, 1040);
    },
    // Regadera: chorrito de agua y gotitas.
    regadera: t => {
      noise(t, 0.75, 0.13, 'bandpass', 2600, 1.4, 1300);
      for (let i = 0; i < 6; i++) { const f = 900 + Math.random() * 800; blip('sine', f, t + 0.12 + i * 0.1 + Math.random() * 0.04, 0.08, 0.08, f * 1.8, 0.4); }
    },
    // Cesta: arpegio brillante de cosecha.
    cosecha: t => { notes(['C6', 'E6', 'G6', 'C7'], t, 0.065, 'triangle', 0.35, 0.1); blip('sine', 2093, t + 0.28, 0.5, 0.05, null, 0.8); blip('sine', 420, t, 0.08, 0.12, 820, 0); },
    monedas: (t, n = 1) => { for (let i = 0; i < Math.min(3, n); i++) { blip('square', 988, t + i * 0.11, 0.07, 0.035, null, 0.1); blip('triangle', 1319, t + i * 0.11 + 0.07, 0.35, 0.08, null, 0.3); } },
    comprar: t => { notes(['G5', 'C6', 'E6'], t, 0.1, 'triangle', 0.25, 0.1); blip('triangle', freq('G6'), t + 0.3, 0.7, 0.1); notes(['C5', 'E5', 'G5'], t + 0.3, 0, 'sine', 0.8, 0.05); },
    // Fin del día: campanitas que bajan y luego suben (amanece).
    dia: t => { ['G5', 'E5', 'C5'].forEach((n, i) => musicBox(freq(n), t + i * 0.22, 0.12, sfxBus, 0.6)); ['C5', 'E5', 'G5', 'C6'].forEach((n, i) => musicBox(freq(n), t + 0.95 + i * 0.13, 0.11, sfxBus, 0.6)); },
    ganar: t => {
      notes(['C5', 'E5', 'G5', 'C6', 'E6', 'G6'], t, 0.09, 'triangle', 0.3, 0.1);
      ['C5', 'E5', 'G5', 'C6'].forEach(n => blip('triangle', freq(n), t + 0.6, 1.4, 0.06, null, 0.6));
      for (let i = 0; i < 8; i++) blip('sine', 1800 + Math.random() * 1500, t + 0.7 + i * 0.08, 0.15, 0.03, null, 0.8);
    },
    regalo: t => ['C6', 'D6', 'E6', 'G6', 'A6', 'C7', 'D7', 'E7'].forEach((n, i) => blip('sine', freq(n), t + i * 0.045, 0.25, 0.06, null, 0.7)),
    aviso: t => { blip('sine', 392, t, 0.12, 0.09, null, 0.2); blip('sine', 330, t + 0.11, 0.16, 0.08, null, 0.2); },
    pagina: t => { noise(t, 0.22, 0.05, 'bandpass', 3000, 0.7, 1200); musicBox(freq('A5'), t + 0.03, 0.06, sfxBus, 0.4); },
    inicio: t => ['F5', 'A5', 'C6', 'F6'].forEach((n, i) => musicBox(freq(n), t + i * 0.12, 0.11, sfxBus, 0.8))
  };
  // Voz de cada personaje al hablar (una "letrita" muy corta, como en los juegos tiernos).
  const VOICES = { gato: [784, 'triangle'], conejo: [988, 'sine'], oveja: [587, 'triangle'], narrador: [523, 'sine'], todos: [784, 'sine'] };
  function voz(who) {
    if (!ctx || !prefs.efectos || !prefs.desbloqueado || ctx.state !== 'running') return;
    const [base, type] = VOICES[who] || VOICES.narrador;
    const f = base * Math.pow(2, (Math.floor(Math.random() * 5) - 2) / 12);
    blip(type, f, ctx.currentTime, 0.045, who === 'narrador' ? 0.025 : 0.04, f * 1.05, 0);
  }

  function play(name, arg) {
    if (!ctx || !prefs.efectos || !SFX[name] || ctx.state !== 'running') return;
    if (!['click', 'herramienta', 'aviso'].includes(name)) lastActionAt = performance.now();
    historial.push(name); if (historial.length > 30) historial.shift();
    SFX[name](ctx.currentTime + 0.02, arg); // un poquito de margen para que no se corte el inicio
  }

  // ---------- Conexión con el juego ----------
  const E = G.EVENTOS;
  G.on(E.CROP_PLANTED, () => play('pala'));
  G.on(E.PLOT_WATERED, () => play('regadera'));
  G.on(E.CROP_HARVESTED, () => play('cosecha'));
  G.on(E.ITEM_SOLD, ({ quantity }) => play('monedas', quantity || 1));
  G.on(E.PLOT_BOUGHT, () => play('comprar'));
  G.on(E.DAY_ENDED, () => play('dia'));
  G.on(E.GAME_WON, () => setTimeout(() => play('ganar'), 500));
  G.on(E.GIFT_RECEIVED, () => play('regalo'));
  G.on(E.GIFT_SENT, () => play('regalo'));
  G.on(E.SUMMARY_CLOSED, () => play('click'));

  // Botones: un "pop" suave. Si el botón ya produjo otro efecto (plantar, regar…), no se suma el pop.
  document.addEventListener('click', event => {
    const button = event.target.closest && event.target.closest('button, .swal2-confirm, .swal2-cancel');
    if (!button || button.disabled || button.closest('.sound-controls')) return;
    const clickedAt = performance.now();
    const sound = button.classList.contains('tool-button') ? 'herramienta' : 'click';
    setTimeout(() => { if (lastActionAt < clickedAt && !pendingAviso) play(sound); }, 0);
  }, true);

  G.sonido = { prefs, historial, unlock, play, voz, cancion, setMusica, setEfectos };

  // Avisos (G.notify, definido en comunes.js): los de error o información suenan con un "boop" suave,
  // salvo que una acción del juego (plantar, regar…) acabe de sonar. main.js llama a esto al arrancar.
  G.wrapNotify = () => {
    const base = G.notify; if (!base || base.__sonido) return;
    const wrapped = (message, icon = 'info') => {
      if (icon !== 'success') {
        pendingAviso = true; const calledAt = performance.now();
        setTimeout(() => { pendingAviso = false; if (Math.abs(lastActionAt - calledAt) > 250) play('aviso'); }, 20);
      }
      return base(message, icon);
    };
    wrapped.__sonido = true; G.notify = wrapped;
  };
})(window.Granja);
