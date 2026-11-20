// Vista Calendario: la semana de 7 días y los eventos del JSON.
window.Granja = window.Granja || {};
(G => {
  const { computed } = Vue;
  G.components.CalendarPanel = {
    name: 'CalendarPanel',
    emits: ['go-farm'],
    setup() {
      const farm = G.useFarmStore();
      const events = G.data.calendarEvents;
      const dayInWeek = computed(() => G.weekDay(farm.day));
      const eventFor = day => events.find(event => event.dia === day) || null;
      function eventValue(event) {
        if (event.tipo === 'feria') return '×' + event.multiplicadorVenta + ' venta';
        if (event.tipo === 'descuento-semillas') return Math.round(event.descuento * 100) + '% descuento';
        return 'Riego gratis';
      }
      return { farm, events, dayInWeek, eventFor, eventValue, weekDays: G.data.config.diasPorSemana };
    },
    template: `
    <section class="page subpage">
      <div class="page-heading"><div><div class="eyebrow">LOS PRÓXIMOS DÍAS</div><h1>Calendario</h1><p>Organiza el riego y no te pierdas los eventos del pueblo.</p></div><div class="season-badge"><app-icon name="flower-2"></app-icon> Primavera</div></div>
      <div class="calendar-layout">
        <div class="card calendar-card">
          <div class="calendar-title"><span><app-icon name="sprout"></app-icon></span><div><h2>Semana de primavera</h2><small>Día {{ farm.day }} · día {{ dayInWeek }} de la semana</small></div></div>
          <div class="calendar-days" :style="{ gridTemplateColumns: 'repeat(' + weekDays + ', 1fr)' }">
            <div v-for="n in weekDays" :key="n" class="calendar-day" :class="{ today: n === dayInWeek, event: eventFor(n), past: n < dayInWeek }"><small>DÍA</small><b>{{ n }}</b>
              <span v-if="n === dayInWeek" class="day-tag">HOY</span>
              <span v-else-if="eventFor(n)" class="day-tag event-tag"><app-icon :name="eventFor(n).icon"></app-icon></span>
              <span v-else class="day-empty">·</span>
            </div>
          </div>
          <div v-for="event in events" :key="event.tipo" class="event-card"><span class="event-icon"><app-icon :name="event.icon"></app-icon></span><div><small>DÍA {{ event.dia }} · EVENTO SEMANAL</small><b>{{ event.nombre }}</b><p>{{ event.descripcion }}</p></div><span class="event-value">{{ eventValue(event) }}</span></div>
        </div>
        <div class="card calendar-note"><span class="note-icon"><app-icon name="sun"></app-icon></span><h3>Un ritmo tranquilo</h3><p>Riega cada parcela plantada antes de terminar el día. Un cultivo sin agua no avanza, pero puedes cuidarlo al día siguiente.</p><button class="button primary" @click="$emit('go-farm')"><app-icon name="fence"></app-icon> Volver a la granja</button></div>
      </div>
    </section>`
  };
})(window.Granja);
