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
        <h2 class="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">MCP Console</h2>
        <span class="text-xs text-gray-400 ml-auto hidden sm:inline">port 5008</span>
        <span :class="['text-xs font-semibold px-2 py-1 rounded', isConnected ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300']">
          {{ isConnected ? '✓ Connected' : '✗ Offline' }}
        </span>
      </div>
    </div>

    <div class="flex-1 overflow-hidden flex gap-4 p-4">

      <!-- Tool list -->
      <div class="w-52 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col shrink-0">
        <div class="px-3 py-2.5 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 shrink-0">
          <h3 class="font-semibold text-sm text-gray-800 dark:text-gray-200">Tools</h3>
          <p class="text-[10px] text-gray-400 mt-0.5">{{ tools.length }} available</p>
        </div>
        <div class="flex-1 overflow-y-auto">
          <div v-if="tools.length === 0" class="px-3 py-4 text-xs text-gray-400 text-center">Loading…</div>
          <template v-for="(group, cat) in groupedTools" :key="cat">
            <div class="px-3 pt-2.5 pb-1">
              <span class="text-[9px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">{{ cat }}</span>
            </div>
            <div v-for="tool in group" :key="tool.name" class="px-2 py-0.5">
              <button @click="selectTool(tool)"
                :class="['w-full text-left px-2 py-1.5 rounded text-xs font-medium transition-colors',
                  selectedTool?.name === tool.name
                    ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300'
                    : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700']">
                {{ tool.name }}
              </button>
            </div>
          </template>
        </div>
      </div>

      <!-- Dynamic form panel -->
      <div class="w-72 flex flex-col gap-3 shrink-0">
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-3 shrink-0">
          <div v-if="selectedTool">
            <div class="flex items-center gap-2 mb-1">
              <span :class="['text-[9px] font-bold uppercase px-1.5 py-0.5 rounded',
                selectedTool._isSuperset ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300']">
                {{ selectedTool._isSuperset ? 'MCP' : 'BASE' }}
              </span>
              <h3 class="font-bold text-sm text-gray-800 dark:text-gray-100 truncate">{{ selectedTool.name }}</h3>
            </div>
            <p class="text-[11px] text-gray-400 leading-relaxed line-clamp-2">{{ (selectedTool.description || '').slice(0, 120) }}</p>
          </div>
          <div v-else class="text-xs text-gray-400 text-center py-2">Select a tool from the list</div>
        </div>

        <!-- Dynamic fields -->
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 flex-1 overflow-y-auto">
          <div v-if="!selectedTool" class="h-full flex items-center justify-center text-xs text-gray-400">No tool selected</div>

          <!-- No params needed -->
          <div v-else-if="visibleFields.length === 0" class="flex flex-col items-center justify-center gap-2 py-4 text-center">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M5 13l4 4L19 7" />
            </svg>
            <p class="text-xs text-gray-500 dark:text-gray-400">No parameters needed</p>
            <p class="text-[11px] text-gray-400">Just click Call Tool below</p>
          </div>

          <!-- Fields -->
          <div v-else class="space-y-3">
            <div v-for="field in visibleFields" :key="field.key">
              <label class="block text-[11px] font-semibold text-gray-600 dark:text-gray-400 mb-1">
                {{ field.label }}
                <span v-if="field.required" class="text-red-400 ml-0.5">*</span>
              </label>

              <!-- Textarea -->
              <textarea v-if="field.type === 'textarea'"
                v-model="formValues[field.key]"
                :placeholder="field.placeholder || field.default"
                rows="3"
                class="w-full p-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg font-mono text-xs text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none" />

              <!-- Select -->
              <select v-else-if="field.type === 'select'"
                v-model="formValues[field.key]"
                class="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-xs text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent">
                <option v-for="opt in field.options" :key="opt" :value="opt">{{ opt }}</option>
              </select>

              <!-- Toggle (boolean) -->
              <div v-else-if="field.type === 'boolean'" class="flex items-center gap-2">
                <button @click="formValues[field.key] = !formValues[field.key]"
                  :class="['relative inline-flex h-5 w-9 items-center rounded-full transition-colors',
                    formValues[field.key] ? 'bg-purple-600' : 'bg-gray-300 dark:bg-gray-600']">
                  <span :class="['inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform',
                    formValues[field.key] ? 'translate-x-4' : 'translate-x-1']" />
                </button>
                <span class="text-xs text-gray-600 dark:text-gray-300">{{ formValues[field.key] ? 'Yes' : 'No' }}</span>
              </div>

              <!-- Number -->
              <input v-else-if="field.type === 'number'"
                v-model.number="formValues[field.key]"
                type="number"
                :placeholder="String(field.default ?? '')"
                :min="0"
                class="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-xs text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent" />

              <!-- Text (default) -->
              <input v-else
                v-model="formValues[field.key]"
                type="text"
                :placeholder="field.placeholder || String(field.default ?? '')"
                class="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-xs text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent" />

              <p v-if="field.hint" class="text-[10px] text-gray-400 mt-0.5">{{ field.hint }}</p>
            </div>
          </div>
        </div>

        <!-- Call button -->
        <button @click="callTool" :disabled="!selectedTool || isLoading"
          :class="['w-full px-4 py-2.5 rounded-lg font-semibold text-sm transition-colors flex items-center justify-center gap-2',
            isLoading || !selectedTool
              ? 'bg-gray-200 text-gray-400 dark:bg-gray-700 dark:text-gray-500 cursor-not-allowed'
              : 'bg-purple-600 hover:bg-purple-700 text-white shadow-sm']">
          <svg v-if="isLoading" class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
          </svg>
          {{ isLoading ? 'Calling…' : 'Call Tool' }}
        </button>
      </div>

      <!-- Response panel -->
      <div class="flex-1 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col min-w-0">
        <div class="px-4 py-2.5 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 shrink-0 flex items-center justify-between">
          <h3 class="font-semibold text-sm text-gray-800 dark:text-gray-200">Response</h3>
          <span v-if="response && !responseError" class="text-[10px] px-2 py-0.5 rounded bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 font-semibold">{{ responseLabel }}</span>
          <span v-if="responseError" class="text-[10px] px-2 py-0.5 rounded bg-red-100 text-red-700 font-semibold">Error</span>
        </div>

        <div class="flex-1 overflow-y-auto p-4">
          <!-- Empty -->
          <div v-if="!response && !responseError" class="h-full flex flex-col items-center justify-center text-gray-400 gap-3">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 text-gray-300 dark:text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p class="text-sm font-medium">Call a tool to see results</p>
            <p class="text-xs text-gray-300 dark:text-gray-600">Select a tool → fill parameters → Call Tool</p>
          </div>

          <!-- Error -->
          <div v-else-if="responseError" class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
            <p class="text-sm font-semibold text-red-700 dark:text-red-400 mb-2">Tool Error</p>
            <p class="text-xs text-red-600 dark:text-red-300 font-mono leading-relaxed">{{ responseError }}</p>
          </div>

          <!-- Databases -->
          <div v-else-if="responseType === 'list-databases'">
            <p class="text-xs text-gray-400 mb-3">{{ response.databases.length }} database{{ response.databases.length !== 1 ? 's' : '' }}</p>
            <div class="space-y-2">
              <div v-for="db in response.databases" :key="db.id" class="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700">
                <div class="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582 4-8 4s8 1.79 8 4" />
                  </svg>
                </div>
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-semibold text-gray-800 dark:text-gray-100">{{ db.database_name || db.name }}</p>
                  <p class="text-xs text-gray-400">{{ db.backend }} · ID {{ db.id }}</p>
                </div>
                <span v-if="db.expose_in_sqllab" class="text-[10px] px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 shrink-0">SQL Lab</span>
              </div>
            </div>
          </div>

          <!-- Datasets -->
          <div v-else-if="responseType === 'list-datasets'">
            <p class="text-xs text-gray-400 mb-3">{{ response.datasets.length }} dataset{{ response.datasets.length !== 1 ? 's' : '' }} · page {{ response.page }}/{{ response.total_pages }} ({{ response.total_count }} total)</p>
            <div class="space-y-2">
              <div v-for="ds in response.datasets" :key="ds.id" class="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700">
                <div class="w-9 h-9 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M3 14h18M3 6h18M3 18h18" />
                  </svg>
                </div>
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">{{ ds.table_name }}</p>
                  <p class="text-xs text-gray-400">{{ ds.database_name }} · ID {{ ds.id }}</p>
                </div>
                <span v-if="ds.schema" class="text-[10px] px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-gray-500 shrink-0">{{ ds.schema }}</span>
              </div>
            </div>
          </div>

          <!-- Charts -->
          <div v-else-if="responseType === 'list-charts'">
            <p class="text-xs text-gray-400 mb-3">{{ (response.charts || response.result || []).length }} chart{{ (response.charts || response.result || []).length !== 1 ? 's' : '' }}</p>
            <div class="space-y-2">
              <div v-for="c in (response.charts || response.result || [])" :key="c.id" class="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700">
                <div class="w-9 h-9 rounded-lg bg-green-100 dark:bg-green-900/40 flex items-center justify-center shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">{{ c.slice_name || c.title }}</p>
                  <p class="text-xs text-gray-400">{{ c.viz_type || c.chart_type }} · ID {{ c.id }}</p>
                </div>
                <a v-if="c.url" :href="normaliseUrl(c.url)" target="_blank" class="text-[11px] text-purple-600 hover:underline shrink-0">Open →</a>
              </div>
            </div>
          </div>

          <!-- Dashboards -->
          <div v-else-if="responseType === 'list-dashboards'">
            <p class="text-xs text-gray-400 mb-3">{{ (response.dashboards || response.result || []).length }} dashboard{{ (response.dashboards || response.result || []).length !== 1 ? 's' : '' }}</p>
            <div class="space-y-2">
              <div v-for="d in (response.dashboards || response.result || [])" :key="d.id" class="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700">
                <div class="w-9 h-9 rounded-lg bg-orange-100 dark:bg-orange-900/40 flex items-center justify-center shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-orange-600 dark:text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                  </svg>
                </div>
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">{{ d.dashboard_title || d.title }}</p>
                  <p class="text-xs text-gray-400">{{ d.status || 'draft' }} · ID {{ d.id }}</p>
                </div>
                <a v-if="d.url" :href="normaliseUrl(d.url)" target="_blank" class="text-[11px] text-purple-600 hover:underline shrink-0">Open →</a>
              </div>
            </div>
          </div>

          <!-- SQL table -->
          <div v-else-if="responseType === 'sql-result'">
            <p class="text-xs text-gray-400 mb-3">{{ response.rows.length }} row{{ response.rows.length !== 1 ? 's' : '' }}</p>
            <div class="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
              <table class="w-full text-xs">
                <thead>
                  <tr class="bg-gray-100 dark:bg-gray-700">
                    <th v-for="col in response.columns" :key="col.name || col"
                      class="px-3 py-2 text-left font-semibold text-gray-600 dark:text-gray-300 whitespace-nowrap">
                      {{ col.name || col }}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(row, i) in response.rows" :key="i"
                    :class="['border-t border-gray-100 dark:border-gray-700', i % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-800/50']">
                    <td v-for="(col, ci) in response.columns" :key="ci" class="px-3 py-2 text-gray-700 dark:text-gray-300 whitespace-nowrap">
                      {{ Array.isArray(row) ? row[ci] : row[col.name || col] }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Chart created -->
          <div v-else-if="responseType === 'chart-created'" class="space-y-4">
            <div class="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
              <div class="w-10 h-10 rounded-xl bg-green-500 flex items-center justify-center shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-white" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                </svg>
              </div>
              <div>
                <p class="font-bold text-green-800 dark:text-green-200">Chart Created Successfully</p>
                <p class="text-xs text-green-600 dark:text-green-400">Saved to your Superset instance</p>
              </div>
            </div>
            <div class="rounded-xl border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700 overflow-hidden">
              <div class="px-4 py-3 flex justify-between items-center bg-white dark:bg-gray-800">
                <span class="text-xs text-gray-500">Chart Name</span>
                <span class="text-sm font-semibold text-gray-800 dark:text-gray-100">{{ response.chart?.slice_name }}</span>
              </div>
              <div class="px-4 py-3 flex justify-between items-center bg-gray-50 dark:bg-gray-900">
                <span class="text-xs text-gray-500">Chart ID</span>
                <span class="text-sm font-mono font-bold text-purple-600 dark:text-purple-400">#{{ response.chart?.id }}</span>
              </div>
              <div class="px-4 py-3 flex justify-between items-center bg-white dark:bg-gray-800">
                <span class="text-xs text-gray-500">Type</span>
                <span class="text-sm text-gray-700 dark:text-gray-300">{{ response.chart?.viz_type }}</span>
              </div>
              <div class="px-4 py-3 flex justify-between items-center bg-gray-50 dark:bg-gray-900">
                <span class="text-xs text-gray-500">Dataset</span>
                <span class="text-sm text-gray-700 dark:text-gray-300">{{ response.chart?.datasource_name }}</span>
              </div>
              <div class="px-4 py-3 flex justify-between items-center bg-white dark:bg-gray-800">
                <span class="text-xs text-gray-500">Created</span>
                <span class="text-sm text-gray-700 dark:text-gray-300">{{ response.chart?.changed_on_humanized }}</span>
              </div>
            </div>
            <a v-if="response.chart?.url" :href="normaliseUrl(response.chart.url)" target="_blank"
              class="block w-full text-center py-2.5 px-4 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-semibold transition-colors">
              Open Chart in Superset →
            </a>
          </div>

          <!-- Dashboard created -->
          <div v-else-if="responseType === 'dashboard-created'" class="space-y-4">
            <div class="flex items-center gap-3 p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl">
              <div class="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-white" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                </svg>
              </div>
              <div>
                <p class="font-bold text-orange-800 dark:text-orange-200">Dashboard Created</p>
                <p class="text-xs text-orange-600 dark:text-orange-400">{{ response.dashboard?.dashboard_title }}</p>
              </div>
            </div>
            <div class="rounded-xl border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700 overflow-hidden">
              <div class="px-4 py-3 flex justify-between bg-white dark:bg-gray-800">
                <span class="text-xs text-gray-500">Title</span>
                <span class="text-sm font-semibold text-gray-800 dark:text-gray-100">{{ response.dashboard?.dashboard_title }}</span>
              </div>
              <div class="px-4 py-3 flex justify-between bg-gray-50 dark:bg-gray-900">
                <span class="text-xs text-gray-500">ID</span>
                <span class="text-sm font-mono font-bold text-orange-600 dark:text-orange-400">#{{ response.dashboard?.id }}</span>
              </div>
              <div class="px-4 py-3 flex justify-between bg-white dark:bg-gray-800">
                <span class="text-xs text-gray-500">Status</span>
                <span class="text-sm text-gray-700 dark:text-gray-300">{{ response.dashboard?.status || 'draft' }}</span>
              </div>
            </div>
            <a v-if="dashboardUrl" :href="dashboardUrl" target="_blank"
              class="block w-full text-center py-2.5 px-4 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-sm font-semibold transition-colors">
              Open Dashboard →
            </a>
          </div>

          <!-- Instance stats -->
          <div v-else-if="responseType === 'instance-info'">
            <p class="text-xs text-gray-400 mb-3">Superset instance overview</p>
            <div class="grid grid-cols-2 gap-3 mb-4">
              <div v-for="stat in instanceStats" :key="stat.label"
                class="bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 text-center">
                <p class="text-3xl font-bold text-purple-600 dark:text-purple-400">{{ stat.value }}</p>
                <p class="text-xs text-gray-500 mt-1">{{ stat.label }}</p>
              </div>
            </div>
            <div v-if="response.user" class="flex items-center gap-3 p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-100 dark:border-indigo-800">
              <div class="w-9 h-9 rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold shrink-0">
                {{ (response.user.first_name || response.user.username || '?')[0].toUpperCase() }}
              </div>
              <div>
                <p class="text-sm font-semibold text-gray-800 dark:text-gray-100">{{ response.user.first_name }} {{ response.user.last_name }}</p>
                <p class="text-xs text-gray-400">@{{ response.user.username }} · {{ (response.user.roles || []).join(', ') }}</p>
              </div>
            </div>
          </div>

          <!-- Health -->
          <div v-else-if="responseType === 'health'" class="flex flex-col items-center justify-center gap-4 py-10">
            <div class="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10 text-green-600 dark:text-green-400" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
              </svg>
            </div>
            <div class="text-center">
              <p class="font-bold text-gray-800 dark:text-gray-100 text-lg">MCP Server Healthy</p>
              <p class="text-sm text-gray-400 mt-1">{{ response.status || response.message || 'All systems operational' }}</p>
            </div>
          </div>

          <!-- Explore link -->
          <div v-else-if="responseType === 'explore-link'" class="space-y-4">
            <div class="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
              <div class="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </div>
              <div class="flex-1 min-w-0">
                <p class="font-bold text-blue-800 dark:text-blue-200">Explore Link Ready</p>
                <p class="text-xs text-blue-500 truncate mt-0.5">{{ normaliseUrl(response.explore_url || response.url) }}</p>
              </div>
            </div>
            <a :href="normaliseUrl(response.explore_url || response.url)" target="_blank"
              class="block w-full text-center py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors">
              Open in Explore →
            </a>
          </div>

          <!-- Generic object -->
          <div v-else-if="responseType === 'object-detail'">
            <div class="rounded-xl border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700 overflow-hidden">
              <div v-for="(val, key) in flatObject" :key="key"
                :class="['px-4 py-2.5 flex gap-4', Object.keys(flatObject).indexOf(key) % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-900']">
                <span class="text-xs font-mono text-gray-500 w-36 shrink-0 truncate">{{ key }}</span>
                <span class="text-xs text-gray-800 dark:text-gray-200 break-all">{{ val }}</span>
              </div>
            </div>
          </div>

          <!-- Fallback -->
          <div v-else>
            <pre class="text-xs font-mono text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words bg-gray-50 dark:bg-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-700">{{ JSON.stringify(response, null, 2) }}</pre>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<script>
// Field schemas for every Superset tool — defines what the form shows
const TOOL_FIELDS = {
  health_check:      [],
  get_instance_info: [],
  list_databases:    [],
  list_datasets:     [],
  list_charts:       [],
  list_dashboards:   [],
  search_tools: [
    { key: 'query', label: 'Search Query', type: 'text', default: 'chart', placeholder: 'e.g. chart, dashboard, sql', hint: 'Search across all Superset MCP tools' },
  ],
  get_database_info: [
    { key: 'database_id', label: 'Database ID', type: 'number', default: 1, required: true, hint: '1 = examples (SQLite)' },
  ],
  get_dataset_info: [
    { key: 'dataset_id', label: 'Dataset ID', type: 'number', default: 16, required: true, hint: '16 = birth_names' },
  ],
  get_chart_info: [
    { key: 'chart_id', label: 'Chart ID', type: 'number', default: null, required: true },
  ],
  get_dashboard_info: [
    { key: 'dashboard_id', label: 'Dashboard ID', type: 'number', default: null, required: true },
  ],
  get_chart_preview: [
    { key: 'chart_id', label: 'Chart ID', type: 'number', default: null, required: true },
  ],
  get_chart_data: [
    { key: 'chart_id', label: 'Chart ID', type: 'number', default: null, required: true },
  ],
  execute_sql: [
    { key: 'database_id', label: 'Database ID', type: 'number', default: 1, required: true, hint: '1 = examples (SQLite)' },
    { key: 'sql', label: 'SQL Query', type: 'textarea', default: 'SELECT name, SUM(num) AS total\nFROM birth_names\nGROUP BY name\nORDER BY total DESC\nLIMIT 10', required: true },
  ],
  save_sql_query: [
    { key: 'database_id', label: 'Database ID', type: 'number', default: 1, required: true },
    { key: 'label', label: 'Query Name', type: 'text', default: 'Top Baby Names', required: true, placeholder: 'My Saved Query' },
    { key: 'sql', label: 'SQL Query', type: 'textarea', default: 'SELECT name, SUM(num) AS total FROM birth_names GROUP BY name ORDER BY total DESC LIMIT 10', required: true },
  ],
  create_virtual_dataset: [
    { key: 'database_id', label: 'Database ID', type: 'number', default: 1, required: true },
    { key: 'dataset_name', label: 'Dataset Name', type: 'text', default: 'top_baby_names', required: true, placeholder: 'my_virtual_dataset' },
    { key: 'sql', label: 'SQL Query', type: 'textarea', default: 'SELECT name, SUM(num) AS total FROM birth_names GROUP BY name ORDER BY total DESC', required: true },
  ],
  generate_chart: [
    { key: 'dataset_id',     label: 'Dataset ID',            type: 'number',  default: 16,    required: true, hint: '16 = birth_names, 19 = video_game_sales' },
    { key: 'title',          label: 'Chart Title',           type: 'text',    default: 'Top Baby Names', required: true, placeholder: 'My Chart' },
    { key: 'chart_type',     label: 'Chart Type',            type: 'select',  default: 'xy',  options: ['xy', 'pie', 'table', 'big_number'] },
    { key: 'kind',           label: 'Style',                 type: 'select',  default: 'bar', options: ['bar', 'line'], showWhen: { chart_type: ['xy'] } },
    { key: 'x_column',       label: 'X Axis Column',         type: 'text',    default: 'name', placeholder: 'name', showWhen: { chart_type: ['xy', 'table'] } },
    { key: 'groupby_column', label: 'Group By Column',       type: 'text',    default: 'gender', placeholder: 'gender', showWhen: { chart_type: ['pie'] } },
    { key: 'y_column',       label: 'Metric Column',         type: 'text',    default: 'num', required: true, placeholder: 'num' },
    { key: 'y_aggregate',    label: 'Aggregation',           type: 'select',  default: 'SUM', options: ['SUM', 'COUNT', 'AVG', 'MAX', 'MIN'] },
    { key: 'save_chart',     label: 'Save Permanently',      type: 'boolean', default: true },
  ],
  update_chart: [
    { key: 'chart_id',       label: 'Chart ID',              type: 'number',  default: null,  required: true },
    { key: 'title',          label: 'New Title',             type: 'text',    default: '',    placeholder: 'Updated Chart Title' },
    { key: 'chart_type',     label: 'Chart Type',            type: 'select',  default: 'xy',  options: ['xy', 'pie', 'table', 'big_number'] },
    { key: 'kind',           label: 'Style',                 type: 'select',  default: 'bar', options: ['bar', 'line'], showWhen: { chart_type: ['xy'] } },
    { key: 'x_column',       label: 'X Axis Column',         type: 'text',    default: 'name', placeholder: 'name' },
    { key: 'y_column',       label: 'Metric Column',         type: 'text',    default: 'num', placeholder: 'num' },
    { key: 'y_aggregate',    label: 'Aggregation',           type: 'select',  default: 'SUM', options: ['SUM', 'COUNT', 'AVG', 'MAX', 'MIN'] },
  ],
  update_chart_preview: [
    { key: 'chart_id',       label: 'Chart ID',              type: 'number',  default: null,  required: true },
    { key: 'chart_type',     label: 'Chart Type',            type: 'select',  default: 'xy',  options: ['xy', 'pie', 'table', 'big_number'] },
    { key: 'kind',           label: 'Style',                 type: 'select',  default: 'bar', options: ['bar', 'line'], showWhen: { chart_type: ['xy'] } },
    { key: 'x_column',       label: 'X Axis Column',         type: 'text',    default: 'name' },
    { key: 'y_column',       label: 'Metric Column',         type: 'text',    default: 'num' },
    { key: 'y_aggregate',    label: 'Aggregation',           type: 'select',  default: 'SUM', options: ['SUM', 'COUNT', 'AVG', 'MAX', 'MIN'] },
  ],
  generate_explore_link: [
    { key: 'dataset_id',     label: 'Dataset ID',            type: 'number',  default: 16,    required: true, hint: '16 = birth_names' },
    { key: 'chart_type',     label: 'Chart Type',            type: 'select',  default: 'xy',  options: ['xy', 'pie', 'table'] },
    { key: 'kind',           label: 'Style',                 type: 'select',  default: 'bar', options: ['bar', 'line'], showWhen: { chart_type: ['xy'] } },
    { key: 'x_column',       label: 'X Axis Column',         type: 'text',    default: 'name', showWhen: { chart_type: ['xy', 'table'] } },
    { key: 'groupby_column', label: 'Group By Column',       type: 'text',    default: 'gender', showWhen: { chart_type: ['pie'] } },
    { key: 'y_column',       label: 'Metric Column',         type: 'text',    default: 'num' },
    { key: 'y_aggregate',    label: 'Aggregation',           type: 'select',  default: 'SUM', options: ['SUM', 'COUNT', 'AVG', 'MAX', 'MIN'] },
  ],
  generate_dashboard: [
    { key: 'title',     label: 'Dashboard Title',            type: 'text',    default: 'My Analytics Dashboard', required: true, placeholder: 'Analytics Dashboard' },
    { key: 'chart_ids', label: 'Chart IDs (comma-separated)', type: 'text',   default: '', placeholder: '107, 108', hint: 'Enter one or more chart IDs separated by commas' },
  ],
  add_chart_to_existing_dashboard: [
    { key: 'dashboard_id', label: 'Dashboard ID', type: 'number', default: null, required: true },
    { key: 'chart_id',     label: 'Chart ID',     type: 'number', default: null, required: true },
  ],
};

// Build the correct nested request object for each tool
function buildRequest(toolName, values) {
  const buildChartConfig = (v) => {
    const ct = v.chart_type || 'xy';
    if (ct === 'xy')    return { chart_type: 'xy',    kind: v.kind || 'bar', x: { name: v.x_column || 'name' }, y: [{ name: v.y_column || 'num', aggregate: v.y_aggregate || 'SUM' }] };
    if (ct === 'pie')   return { chart_type: 'pie',   groupby: [v.groupby_column || 'gender'], metric: { name: v.y_column || 'num', aggregate: v.y_aggregate || 'SUM' } };
    if (ct === 'table') return { chart_type: 'table', groupby: [v.x_column || 'name'], metrics: [{ name: v.y_column || 'num', aggregate: v.y_aggregate || 'SUM' }] };
    return { chart_type: ct };
  };

  if (toolName === 'generate_chart') {
    return { request: { dataset_id: Number(values.dataset_id), title: values.title, save_chart: values.save_chart, config: buildChartConfig(values) } };
  }
  if (toolName === 'update_chart') {
    return { request: { chart_id: Number(values.chart_id), title: values.title, config: buildChartConfig(values) } };
  }
  if (toolName === 'update_chart_preview') {
    return { request: { chart_id: Number(values.chart_id), config: buildChartConfig(values) } };
  }
  if (toolName === 'generate_explore_link') {
    return { request: { dataset_id: Number(values.dataset_id), config: buildChartConfig(values) } };
  }
  if (toolName === 'generate_dashboard') {
    const ids = (values.chart_ids || '').split(',').map(s => Number(s.trim())).filter(n => n > 0);
    return { request: { title: values.title, chart_ids: ids } };
  }

  // Default: just clean and wrap
  const req = {};
  for (const [k, v] of Object.entries(values)) {
    if (v === '' || v === null || v === undefined) continue;
    req[k] = v;
  }
  return { request: req };
}

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
      formValues: {},
    };
  },
  computed: {
    groupedTools() {
      const groups = {};
      for (const t of this.tools) {
        const cat = t.category || (t._isBase ? 'base' : 'other');
        if (!groups[cat]) groups[cat] = [];
        groups[cat].push(t);
      }
      return groups;
    },

    currentFields() {
      if (!this.selectedTool) return [];
      return TOOL_FIELDS[this.selectedTool.name] || [];
    },

    visibleFields() {
      return this.currentFields.filter(field => {
        if (!field.showWhen) return true;
        const [watchKey, allowedVals] = Object.entries(field.showWhen)[0];
        return allowedVals.includes(this.formValues[watchKey]);
      });
    },

    responseType() {
      const r = this.response;
      if (!r) return null;
      if (Array.isArray(r.databases))  return 'list-databases';
      if (Array.isArray(r.datasets))   return 'list-datasets';
      if (Array.isArray(r.charts))     return 'list-charts';
      if (Array.isArray(r.dashboards)) return 'list-dashboards';
      if (r.rows && r.columns)         return 'sql-result';
      if (r.chart?.id)                 return 'chart-created';
      if (r.dashboard?.id)             return 'dashboard-created';
      if (r.charts_count !== undefined || r.dashboards_count !== undefined) return 'instance-info';
      if (r.status === 'OK' || r.status === 'healthy' || r.healthy) return 'health';
      if (r.explore_url || (typeof r.url === 'string' && r.url.includes('/explore/'))) return 'explore-link';
      if (typeof r === 'object' && !Array.isArray(r)) return 'object-detail';
      return 'json-fallback';
    },

    responseLabel() {
      return { 'list-databases': 'Databases', 'list-datasets': 'Datasets', 'list-charts': 'Charts', 'list-dashboards': 'Dashboards', 'sql-result': 'SQL Result', 'chart-created': 'Chart Created', 'dashboard-created': 'Dashboard Created', 'instance-info': 'Instance Info', 'health': 'Healthy', 'explore-link': 'Explore Link', 'object-detail': 'Details' }[this.responseType] || 'Success';
    },

    instanceStats() {
      const r = this.response || {};
      return [
        { label: 'Charts',     value: r.charts_count     ?? r.chart_count     },
        { label: 'Dashboards', value: r.dashboards_count ?? r.dashboard_count },
        { label: 'Datasets',   value: r.datasets_count   ?? r.dataset_count   },
        { label: 'Users',      value: r.users_count      ?? r.user_count      },
      ].filter(s => s.value != null);
    },

    dashboardUrl() {
      const r = this.response;
      if (!r) return null;
      const raw = r.dashboard?.url ?? r.dashboard_url ?? null;
      return raw ? this.normaliseUrl(raw) : null;
    },

    flatObject() {
      const r = this.response;
      if (!r || typeof r !== 'object') return {};
      const out = {};
      for (const [k, v] of Object.entries(r)) {
        if (typeof v !== 'object' || v === null) out[k] = v;
      }
      return out;
    },
  },
  mounted() {
    this.fetchTools();
  },
  methods: {
    normaliseUrl(url) {
      return url ? url.replace(/0\.0\.0\.0:8080/g, 'localhost:8088') : url;
    },

    async fetchTools() {
      try {
        const catalogRes = await fetch('http://localhost:3000/tools');
        const { tools: supersetTools } = await catalogRes.json();
        const baseRes = await this.sendMcpRequest('tools/list', {});
        const baseTools = (baseRes.result?.tools || []).map(t => ({ ...t, _isBase: true, category: 'base' }));
        this.tools = [...baseTools, ...supersetTools.map(t => ({ ...t, _isSuperset: true }))];
        this.isConnected = true;
      } catch (err) {
        this.isConnected = false;
      }
    },

    selectTool(tool) {
      this.selectedTool = tool;
      this.response = null;
      this.responseError = null;
      // Seed formValues with defaults for this tool's fields
      const defaults = {};
      const fields = TOOL_FIELDS[tool.name] || [];
      for (const f of fields) {
        defaults[f.key] = f.default ?? (f.type === 'number' ? null : f.type === 'boolean' ? false : '');
      }
      this.formValues = defaults;
    },

    async callTool() {
      if (!this.selectedTool) return;
      this.isLoading = true;
      this.response = null;
      this.responseError = null;
      try {
        const requestBody = this.selectedTool._isSuperset
          ? buildRequest(this.selectedTool.name, this.formValues)
          : this.formValues;

        const callParams = this.selectedTool._isSuperset
          ? { name: 'call_tool', arguments: { name: this.selectedTool.name, arguments: requestBody } }
          : { name: this.selectedTool.name, arguments: requestBody };

        const res = await this.sendMcpRequest('tools/call', callParams);
        if (res.result) {
          const text = res.result?.content?.[0]?.text;
          try { this.response = text ? JSON.parse(text) : res.result; }
          catch { this.response = res.result; }
        } else if (res.error) {
          this.responseError = res.error.message || JSON.stringify(res.error);
        }
      } catch (err) {
        this.responseError = err.message;
      } finally {
        this.isLoading = false;
      }
    },

    async sendMcpRequest(method, params) {
      const res = await fetch('http://localhost:3000/mcp-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method, params }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
  },
};
</script>
