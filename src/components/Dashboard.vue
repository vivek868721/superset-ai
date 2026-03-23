<template>
  <div class="flex flex-col h-full bg-gray-100 dark:bg-gray-950 transition-colors duration-200">
    <!-- Navbar -->
    <nav class="h-16 px-6 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between shrink-0 sticky top-0 z-20">
      <div class="flex items-center gap-3">
        <div class="bg-indigo-600 p-1.5 rounded-lg">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
            <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
          </svg>
        </div>
        <h1 class="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
          AI Dashboard
        </h1>
      </div>

      <div class="flex items-center gap-4">
        <button
          v-if="store.currentSql"
          @click="store.toggleQueryPanel"
          :class="['px-3 py-1.5 text-sm font-medium rounded-md transition-colors flex items-center gap-2 border',
                   store.isQueryVisible
                     ? 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800'
                     : 'text-gray-600 hover:bg-gray-50 border-gray-200 dark:text-gray-300 dark:hover:bg-gray-800 dark:border-gray-700']"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
          </svg>
          <span class="hidden sm:inline">SQL Query</span>
        </button>

        <button @click="store.clearDashboard" class="text-gray-500 hover:text-red-500 dark:text-gray-400 transition-colors p-2" title="Clear Dashboard">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>

        <button @click="store.toggleDarkMode" class="text-gray-500 hover:text-yellow-500 dark:text-gray-400 dark:hover:text-yellow-300 transition-colors p-2" title="Toggle Theme">
          <svg v-if="store.isDarkMode" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
          <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
          </svg>
        </button>
      </div>
    </nav>

    <!-- Optional Query Preview -->
    <QueryPreview />

    <!-- Dashboard Content -->
    <main class="flex-1 overflow-y-auto p-6">
      <div v-if="store.charts.length === 0" class="h-full flex flex-col items-center justify-center text-gray-500 dark:text-gray-400">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 mb-4 text-gray-300 dark:text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <p class="text-lg font-medium">No charts yet</p>
        <p class="text-sm mt-1">Ask the AI assistant to generate some visualizations.</p>
      </div>

      <div v-else class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        <ChartCard
          v-for="chart in store.charts"
          :key="chart.id"
          :chartData="chart"
          @remove="removeChart"
        />

        <!-- Add Dashboard Button (Placeholder) -->
        <div class="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl h-80 flex flex-col items-center justify-center text-gray-400 hover:text-indigo-500 hover:border-indigo-500 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/20 transition-all cursor-pointer group">
          <div class="bg-white dark:bg-gray-800 p-3 rounded-full shadow-sm mb-3 group-hover:scale-110 transition-transform">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <span class="font-medium">Create Blank Chart</span>
        </div>
      </div>
    </main>
  </div>
</template>

<script>
import { store } from '../store.js';
import ChartCard from './ChartCard.vue';
import QueryPreview from './QueryPreview.vue';

export default {
  name: 'Dashboard',
  components: {
    ChartCard,
    QueryPreview
  },
  computed: {
    store() {
      return store;
    }
  },
  methods: {
    removeChart(id) {
      this.store.charts = this.store.charts.filter(c => c.id !== id);
      if (this.store.charts.length === 0) {
        this.store.currentSql = '';
      }
    }
  }
}
</script>
