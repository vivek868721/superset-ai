<template>
  <div v-if="store.isQueryVisible && store.currentSql" class="bg-gray-900 text-gray-300 p-4 border-t border-gray-800 shrink-0">
    <div class="flex justify-between items-center mb-2">
      <h4 class="text-xs font-semibold uppercase tracking-wider text-gray-500 flex items-center gap-1">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
        </svg>
        Generated SQL
      </h4>
      <div class="flex gap-2">
        <button @click="copySql" class="text-xs text-gray-400 hover:text-white transition-colors p-1" title="Copy to clipboard">
          <svg v-if="copied" xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
          <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        </button>
        <button @click="store.toggleQueryPanel" class="text-xs text-gray-400 hover:text-white transition-colors p-1" title="Close">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
    <pre class="text-sm font-mono whitespace-pre-wrap overflow-x-auto p-3 bg-black/50 rounded-lg border border-gray-800 max-h-40 overflow-y-auto"><code class="text-indigo-400">{{ formattedSql }}</code></pre>
  </div>
</template>

<script>
import { store } from '../store.js';

export default {
  name: 'QueryPreview',
  data() {
    return {
      copied: false
    };
  },
  computed: {
    store() {
      return store;
    },
    formattedSql() {
      if (!this.store.currentSql) return '';
      return this.store.currentSql
        .replace(/SELECT /gi, 'SELECT\n  ')
        .replace(/ FROM /gi, '\nFROM\n  ')
        .replace(/ GROUP BY /gi, '\nGROUP BY\n  ')
        .replace(/ ORDER BY /gi, '\nORDER BY\n  ')
        .replace(/ LIMIT /gi, '\nLIMIT ');
    }
  },
  methods: {
    async copySql() {
      try {
        await navigator.clipboard.writeText(this.store.currentSql);
        this.copied = true;
        setTimeout(() => {
          this.copied = false;
        }, 2000);
      } catch (err) {
        console.error('Failed to copy', err);
      }
    }
  }
}
</script>
