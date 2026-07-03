<template>
  <div class="flex flex-col h-full bg-gray-100 dark:bg-gray-950 transition-colors duration-200">
    <!-- Navbar -->
    <nav class="h-16 px-6 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between shrink-0 sticky top-0 z-20">
      <div class="flex items-center gap-6">
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

        <!-- Tabs -->
        <div class="flex gap-2 border-l border-gray-200 dark:border-gray-700 pl-6">
          <button
            @click="activeTab = 'charts'"
            :class="['px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
                     activeTab === 'charts'
                       ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300'
                       : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800']"
          >
            📊 Cards
          </button>
          <button
            @click="activeTab = 'mcp'"
            :class="['px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
                     activeTab === 'mcp'
                       ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
                       : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800']"
          >
            🔧 MCP Console
          </button>
        </div>
      </div>

      <div class="flex items-center gap-4">
        <!-- Card count badge: shows total with per-type breakdown -->
        <span v-if="store.cards.length" class="text-xs font-medium text-gray-400 dark:text-gray-500 hidden sm:inline">
          {{ store.cards.length }} card{{ store.cards.length !== 1 ? 's' : '' }}
          <span v-if="chartCount && supersetCount" class="ml-1 text-gray-300 dark:text-gray-600">
            ({{ chartCount }} chart{{ chartCount !== 1 ? 's' : '' }}, {{ supersetCount }} Superset)
          </span>
        </span>

        <button
          v-if="store.cards.length"
          @click="store.clearDashboard"
          class="text-gray-500 hover:text-red-500 dark:text-gray-400 transition-colors p-2"
          title="Clear Dashboard"
        >
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

    <!-- Dashboard Content -->
    <main class="flex-1 overflow-hidden">
      <!-- Cards Tab -->
      <div v-show="activeTab === 'charts'" class="h-full overflow-y-auto p-6">

        <!-- Empty state -->
        <div v-if="store.cards.length === 0" class="h-full flex flex-col items-center justify-center text-gray-500 dark:text-gray-400">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 mb-4 text-gray-300 dark:text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p class="text-lg font-medium">No cards yet</p>
          <p class="text-sm mt-1">Ask the AI assistant to visualize data or perform Superset operations.</p>
        </div>

        <!-- Cards grid — renders ECharts cards and Superset link cards side by side -->
        <div v-else class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          <template v-for="card in store.cards" :key="card.id">
            <ChartCard
              v-if="card.type === 'chart'"
              :chartData="card"
              @remove="removeCard"
            />
            <SupersetLinkCard
              v-else-if="card.type === 'superset'"
              :card="card"
              @remove="removeCard"
            />
          </template>
        </div>
      </div>

      <!-- MCP Console Tab -->
      <div v-show="activeTab === 'mcp'" class="h-full">
        <MCPConsole />
      </div>
    </main>
  </div>
</template>

<script>
import { store } from '../store.js';
import ChartCard        from './ChartCard.vue';
import SupersetLinkCard from './SupersetLinkCard.vue';
import MCPConsole       from './MCPConsole.vue';

export default {
  name: 'Dashboard',
  components: { ChartCard, SupersetLinkCard, MCPConsole },
  data() {
    return { activeTab: 'charts' };
  },
  computed: {
    store() { return store; },
    chartCount()    { return store.cards.filter(c => c.type === 'chart').length; },
    supersetCount() { return store.cards.filter(c => c.type === 'superset').length; },
  },
  methods: {
    removeCard(id) {
      store.cards = store.cards.filter(c => c.id !== id);
    }
  }
}
</script>
