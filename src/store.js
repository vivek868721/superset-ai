import { reactive } from 'vue';

export const store = reactive({
  messages: [],

  // Unified card array — each entry has a `type` field:
  //   { id, type: 'chart',    title, sql, chartType, groupby, data }  → ECharts card
  //   { id, type: 'superset', title, url, reply, chartInfo }          → Superset link card
  cards: [],

  isDarkMode: false,

  addMessage(msg) {
    this.messages.push(msg);
  },

  addCard(card) {
    this.cards.unshift(card); // newest first
  },

  // Backward-compat alias used by any callers that predate the cards refactor
  addChart(chart) {
    this.addCard({ ...chart, type: 'chart' });
  },

  // charts getter for any legacy code that reads store.charts
  get charts() {
    return this.cards.filter(c => c.type === 'chart');
  },

  toggleDarkMode() {
    this.isDarkMode = !this.isDarkMode;
    if (this.isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  },

  clearChat() {
    this.messages = [];
  },

  clearDashboard() {
    this.cards = [];
  },
});
