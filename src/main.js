// Arranque: carga el JSON, crea Vue con Pinia y registra los componentes.
// Phaser se crea dentro de App (cuando ya existe el div del terreno).
(async G => {
  await G.loadCatalog();
  // Espera (máximo 1,5 s) la letra redondeada para que Phaser también la use.
  if (document.fonts) await Promise.race([document.fonts.load('16px Fredoka').catch(() => {}), new Promise(r => setTimeout(r, 1500))]);
  G.wrapNotify(); // los avisos suenan (src/audio/sonido.js)
  const app = Vue.createApp(G.components.App);
  app.use(Pinia.createPinia());
  const tags = {
    'app-icon': 'AppIcon', 'character-art': 'CharacterArt', 'crop-art': 'CropArt', 'character-picker': 'CharacterPicker',
    'welcome-screen': 'WelcomeScreen', 'farm-panel': 'FarmPanel', 'shop-panel': 'ShopPanel',
    'inventory-panel': 'InventoryPanel', 'calendar-panel': 'CalendarPanel', 'village-panel': 'VillagePanel',
    'story-intro': 'StoryIntro', 'sound-controls': 'SoundControls'
  };
  Object.entries(tags).forEach(([tag, name]) => app.component(tag, G.components[name]));
  app.mount('#app');
  // Si la pestaña se cierra, se intenta guardar lo pendiente.
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') G.saver.flush(); });
})(window.Granja);
