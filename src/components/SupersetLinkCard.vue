<template>
  <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col transition-all duration-200 hover:shadow-md h-80 group">
    <!-- Header -->
    <div class="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50 shrink-0">
      <div class="flex items-center gap-2 min-w-0">
        <span class="shrink-0 text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">
          {{ cardTypeLabel }}
        </span>
        <h3 class="font-medium text-gray-800 dark:text-gray-200 truncate text-sm">{{ card.title }}</h3>
      </div>
      <button
        @click="$emit('remove', card.id)"
        class="p-1.5 text-gray-500 hover:text-red-600 dark:hover:text-red-400 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors opacity-0 group-hover:opacity-100 shrink-0"
        title="Remove"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>

    <!-- Body -->
    <div class="flex-1 flex flex-col items-center justify-center p-5 gap-4 min-h-0">
      <!-- Superset icon -->
      <div class="w-14 h-14 rounded-2xl bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center shadow-md shrink-0">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      </div>

      <!-- AI reply text -->
      <p class="text-sm text-gray-600 dark:text-gray-300 text-center leading-relaxed line-clamp-3">
        {{ card.reply || 'Created in Superset' }}
      </p>

      <!-- Chart info chips -->
      <div v-if="card.chartInfo?.id" class="flex gap-2 flex-wrap justify-center">
        <span class="text-[11px] font-mono bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-2 py-0.5 rounded">
          ID: {{ card.chartInfo.id }}
        </span>
      </div>
    </div>

    <!-- Footer -->
    <div class="px-3 py-2 border-t border-gray-100 dark:border-gray-700 flex items-center justify-end bg-gray-50 dark:bg-gray-800/50 shrink-0">
      <a
        :href="card.url"
        target="_blank"
        rel="noopener"
        class="text-xs font-medium px-2.5 py-1 rounded-md bg-green-600 hover:bg-green-700 text-white transition-colors flex items-center gap-1.5"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
        </svg>
        Open in Superset
      </a>
    </div>
  </div>
</template>

<script>
export default {
  name: 'SupersetLinkCard',
  props: {
    card: {
      type: Object,
      required: true
    }
  },
  emits: ['remove'],
  computed: {
    cardTypeLabel() {
      if (!this.card.url) return 'SUPERSET';
      if (this.card.url.includes('/dashboard/')) return 'DASHBOARD';
      if (this.card.url.includes('/explore/')) return 'EXPLORE';
      return 'CHART';
    }
  }
}
</script>
