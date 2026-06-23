<template>
  <div class="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
    <!-- Header -->
    <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shrink-0">
      <div class="flex items-center gap-2">
        <div class="bg-purple-600 p-2 rounded-lg">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
            <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
          </svg>
        </div>
        <h2 class="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
          MCP Console
        </h2>
        <span class="text-xs font-medium text-gray-500 dark:text-gray-400 ml-auto">
          Superset MCP Server (http://127.0.0.1:5008/mcp)
        </span>
        <span :class="['text-xs font-semibold px-2 py-1 rounded', isConnected ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300']">
          {{ isConnected ? '✓ Connected' : '✗ Offline' }}
        </span>
      </div>
    </div>

    <!-- Content -->
    <div class="flex-1 overflow-hidden flex gap-4 p-4">
      <!-- Left: Tools List -->
      <div class="w-64 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col">
        <div class="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 shrink-0">
          <h3 class="font-semibold text-sm text-gray-800 dark:text-gray-200">Available Tools</h3>
          <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">{{ tools.length }} tools available</p>
        </div>
        <div class="flex-1 overflow-y-auto">
          <div v-if="tools.length === 0" class="px-3 py-4 text-xs text-gray-500 dark:text-gray-400">
            <p>Search for tools using the search box or call search_tools with a query.</p>
          </div>
          <div v-for="tool in tools" :key="tool.name" class="px-3 py-2 border-b border-gray-100 dark:border-gray-700 last:border-b-0">
            <button
              @click="selectTool(tool)"
              :class="['w-full text-left px-2 py-1.5 rounded text-xs font-medium transition-colors',
                       selectedTool?.name === tool.name
                         ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300'
                         : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700']"
            >
              {{ tool.name }}
            </button>
          </div>
        </div>
      </div>

      <!-- Right: Tool Details + Call -->
      <div class="flex-1 flex flex-col gap-4 min-w-0">
        <!-- Tool Info -->
        <div v-if="selectedTool" class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 flex-1 overflow-y-auto">
          <h3 class="font-bold text-gray-800 dark:text-gray-100 mb-2">{{ selectedTool.name }}</h3>
          <p class="text-xs text-gray-600 dark:text-gray-400 mb-4">{{ selectedTool.description }}</p>

          <div v-if="selectedTool.inputSchema && selectedTool.inputSchema.properties" class="mb-4">
            <p class="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">Parameters:</p>
            <div class="space-y-2">
              <div v-for="(param, key) in selectedTool.inputSchema.properties" :key="key" class="bg-gray-50 dark:bg-gray-900 p-2 rounded text-xs">
                <p class="font-mono text-gray-800 dark:text-gray-200">{{ key }}:</p>
                <p class="text-gray-600 dark:text-gray-400 text-[10px]">{{ param.description || param.type }}</p>
              </div>
            </div>
          </div>

          <div v-if="!selectedTool.inputSchema || !Object.keys(selectedTool.inputSchema.properties || {}).length" class="text-xs text-gray-500 dark:text-gray-400">
            No parameters required
          </div>
        </div>

        <div v-else class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 flex items-center justify-center text-gray-500 dark:text-gray-400">
          <p class="text-sm">Select a tool to view details</p>
        </div>

        <!-- Call Button & Params Input -->
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <p class="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">Parameters (JSON):</p>
          <textarea
            v-model="paramsJson"
            placeholder='{"key": "value"}'
            class="w-full h-20 p-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded font-mono text-xs text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          ></textarea>

          <button
            @click="callTool"
            :disabled="!selectedTool || isLoading"
            :class="['w-full mt-3 px-4 py-2 rounded font-medium text-sm transition-colors flex items-center justify-center gap-2',
                     isLoading || !selectedTool
                       ? 'bg-gray-200 text-gray-400 dark:bg-gray-700 dark:text-gray-500 cursor-not-allowed'
                       : 'bg-purple-600 hover:bg-purple-700 text-white']"
          >
            <svg v-if="isLoading" class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
            </svg>
            {{ isLoading ? 'Calling...' : 'Call Tool' }}
          </button>
        </div>
      </div>

      <!-- Right: Response -->
      <div class="w-96 bg-gray-900 rounded-lg shadow-sm border border-gray-700 overflow-hidden flex flex-col">
        <div class="px-4 py-3 border-b border-gray-700 bg-gray-900/50 shrink-0">
          <h3 class="font-semibold text-sm text-gray-200">Response</h3>
        </div>
        <div class="flex-1 overflow-y-auto p-4 font-mono text-xs text-gray-300">
          <div v-if="!response" class="text-gray-500">No response yet</div>
          <div v-else-if="responseError" class="text-red-400">
            <p class="font-bold mb-1">Error:</p>
            <pre>{{ responseError }}</pre>
          </div>
          <div v-else class="text-green-400">
            <p class="font-bold mb-1">Success:</p>
            <pre class="whitespace-pre-wrap break-words">{{ JSON.stringify(response, null, 2) }}</pre>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'MCPConsole',
  data() {
    return {
      tools: [],
      selectedTool: null,
      isLoading: false,
      isConnected: false,
      response: null,
      responseError: null,
      paramsJson: '{}'
    };
  },
  mounted() {
    this.fetchTools();
  },
  methods: {
    async fetchTools() {
      try {
        const response = await this.sendMcpRequest('tools/list', {});
        if (response.result && response.result.tools) {
          this.tools = response.result.tools;
          this.isConnected = true;
        }
      } catch (err) {
        console.error('Failed to fetch tools:', err);
        this.isConnected = false;
      }
    },
    async callTool() {
      if (!this.selectedTool) return;
      this.isLoading = true;
      this.response = null;
      this.responseError = null;

      try {
        let params = {};
        if (this.paramsJson.trim()) {
          params = JSON.parse(this.paramsJson);
        }

        const response = await this.sendMcpRequest(`tools/call`, {
          name: this.selectedTool.name,
          arguments: params
        });

        if (response.result) {
          this.response = response.result;
        } else if (response.error) {
          this.responseError = response.error.message || JSON.stringify(response.error);
        }
      } catch (err) {
        this.responseError = err.message;
      } finally {
        this.isLoading = false;
      }
    },
    async sendMcpRequest(method, params) {
      try {
        const res = await fetch('http://localhost:3000/mcp-proxy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ method, params })
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
      } catch (err) {
        console.error('MCP request error:', err);
        throw new Error(`Failed to reach MCP server: ${err.message}`);
      }
    }
  }
};
</script>
