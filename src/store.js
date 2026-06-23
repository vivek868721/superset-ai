import { reactive } from 'vue';

export const store = reactive({
  messages: [],
  charts: [],
  isDarkMode: false,

  addMessage(msg) {
    this.messages.push(msg);
  },
  addChart(chart) {
    this.charts.push(chart);
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
    this.charts = [];
  }
});
