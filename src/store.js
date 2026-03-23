import { reactive } from 'vue';

export const store = reactive({
  messages: [],
  charts: [],
  currentSql: '',
  isDarkMode: false,
  isQueryVisible: false,
  
  addMessage(msg) {
    this.messages.push(msg);
  },
  addChart(chart) {
    this.charts.push(chart);
  },
  setCurrentSql(sql) {
    this.currentSql = sql;
  },
  toggleDarkMode() {
    this.isDarkMode = !this.isDarkMode;
    if (this.isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  },
  toggleQueryPanel() {
    this.isQueryVisible = !this.isQueryVisible;
  },
  clearChat() {
    this.messages = [];
  },
  clearDashboard() {
    this.charts = [];
    this.currentSql = '';
  }
});
