// Componentes pequeños que usan todas las pantallas.
window.Granja = window.Granja || {};
(G => {
  const { h } = Vue;
  G.components = G.components || {};

  // <app-icon name="sprout"/>: dibuja un icono de Lucide como SVG de Vue
  // (así Vue lo actualiza bien cuando cambia, sin reemplazos manuales del DOM).
  G.components.AppIcon = {
    name: 'AppIcon',
    props: { name: { type: String, required: true } },
    setup(props) {
      return () => {
        const key = props.name.split('-').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join('');
        const node = window.lucide && window.lucide.icons[key];
        if (!node) return null;
        const [, attrs, children] = node;
        return h('svg', { ...attrs, class: ['lucide', 'lucide-' + props.name], 'aria-hidden': 'true', focusable: 'false' }, children.map(([tag, childAttrs]) => h(tag, childAttrs)));
      };
    }
  };

  G.components.CharacterArt = {
    name: 'CharacterArt',
    props: { id: { type: String, default: 'gato' } },
    setup(props) { return { svg: Vue.computed(() => G.characterSvg(props.id)) }; },
    template: '<span class="character-art" v-html="svg" aria-hidden="true"></span>'
  };

  G.components.CropArt = {
    name: 'CropArt',
    props: { id: { type: String, required: true } },
    setup(props) { return { svg: Vue.computed(() => G.cropSvg(props.id)) }; },
    template: '<span class="crop-art" v-html="svg" aria-hidden="true"></span>'
  };

  // Selector de personaje (v-model).
  G.components.CharacterPicker = {
    name: 'CharacterPicker',
    props: { modelValue: { type: String, default: 'gato' } },
    emits: ['update:modelValue'],
    setup() { return { characters: Vue.computed(() => G.data.characters) }; },
    template: `
      <div class="character-picker" role="radiogroup" aria-label="Elige tu personaje">
        <button v-for="character in characters" :key="character.id" type="button" class="character-option"
          :class="{ selected: modelValue === character.id }" role="radio" :aria-checked="modelValue === character.id"
          @click="$emit('update:modelValue', character.id)">
          <character-art :id="character.id"></character-art>
          <b>{{ character.especie }}</b>
          <small>{{ character.nombre }}</small>
        </button>
      </div>`
  };

  G.notify = (message, icon = 'info') => {
    if (window.Swal) Swal.fire({ toast: true, position: 'bottom-end', icon, title: message, showConfirmButton: false, timer: 2300, timerProgressBar: true, customClass: { popup: 'game-alert-toast' } });
  };
  G.cleanName = value => String(value || '').trim().replace(/\s+/g, ' ').slice(0, 28);
  G.cleanVillage = value => String(value || '').trim().toUpperCase().replace(/\s+/g, '-').replace(/[^A-Z0-9-]/g, '').slice(0, 16);
})(window.Granja);
