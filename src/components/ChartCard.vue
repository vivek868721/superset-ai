<template>
  <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col transition-all duration-200 hover:shadow-md h-80 relative group">
    <!-- Header -->
    <div class="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50 shrink-0">
      <div class="flex items-center gap-2 min-w-0">
        <span class="shrink-0 text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">{{ chartData.chartType }}</span>
        <h3 class="font-medium text-gray-800 dark:text-gray-200 truncate text-sm">{{ chartData.title }}</h3>
      </div>
      <div class="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <button @click="toggleFullscreen" class="p-1.5 text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" title="Expand">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
          </svg>
        </button>
        <button @click="removeChart" class="p-1.5 text-gray-500 hover:text-red-600 dark:hover:text-red-400 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" title="Remove">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Chart Container -->
    <div class="flex-1 p-2 relative min-h-0">
      <div ref="chartRef" class="w-full h-full"></div>

      <!-- SQL overlay (per-chart, never overridden) -->
      <div v-if="showSql" class="absolute inset-0 bg-gray-900 text-gray-200 flex flex-col z-10">
        <div class="flex justify-between items-center px-3 py-2 border-b border-gray-800 shrink-0">
          <span class="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Generated SQL</span>
          <div class="flex gap-1">
            <button @click="copySql" class="text-gray-400 hover:text-white transition-colors p-1" :title="copied ? 'Copied!' : 'Copy'">
              <svg v-if="copied" xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
              <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
            <button @click="showSql = false" class="text-gray-400 hover:text-white transition-colors p-1" title="Close">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        <pre class="flex-1 overflow-auto p-3 text-xs font-mono leading-relaxed"><code class="text-indigo-300">{{ formattedSql }}</code></pre>
      </div>
    </div>

    <!-- Footer actions -->
    <div class="px-3 py-2 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between gap-2 bg-gray-50 dark:bg-gray-800/50 shrink-0">
      <button
        @click="showSql = !showSql"
        :class="['text-xs font-medium px-2 py-1 rounded-md transition-colors flex items-center gap-1',
                 showSql
                   ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300'
                   : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700']"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
        </svg>
        {{ showSql ? 'Hide SQL' : 'View SQL' }}
      </button>

      <a
        v-if="publishedUrl"
        :href="publishedUrl"
        target="_blank"
        rel="noopener"
        class="text-xs font-medium px-2.5 py-1 rounded-md bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/60 transition-colors flex items-center gap-1"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
        </svg>
        Open in Superset
      </a>

      <button
        v-else
        @click="publish"
        :disabled="isPublishing"
        class="text-xs font-medium px-2.5 py-1 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white transition-colors flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
        :title="publishError || 'Create a chart + dashboard in Superset'"
      >
        <svg v-if="isPublishing" class="animate-spin h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
        </svg>
        <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3-3m0 0l3 3m-3-3v12" />
        </svg>
        {{ isPublishing ? 'Publishing…' : 'Publish to Superset' }}
      </button>
    </div>

    <p v-if="publishError" class="px-3 pb-2 text-[11px] text-red-500 truncate" :title="publishError">{{ publishError }}</p>

    <!-- Fullscreen Modal -->
    <Teleport to="body">
      <div v-if="isFullscreen" class="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 sm:p-8" @click.self="toggleFullscreen">
        <div class="bg-white dark:bg-gray-900 w-full max-w-5xl h-[80vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
          <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-900/50 shrink-0">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">{{ chartData.title }}</h3>
            <button @click="toggleFullscreen" class="p-2 text-gray-500 hover:text-gray-900 dark:hover:text-white rounded-lg hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div class="flex-1 p-4 relative min-h-0">
            <div ref="fullscreenChartRef" class="w-full h-full"></div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script>
import * as echarts from 'echarts';
import { store } from '../store.js';
import { markRaw } from 'vue';
import { publishToSuperset } from '../services/api.js';

export default {
  name: 'ChartCard',
  props: {
    chartData: {
      type: Object,
      required: true
    }
  },
  data() {
    return {
      chartInstance: null,
      fullscreenChartInstance: null,
      isFullscreen: false,
      showSql: false,
      copied: false,
      isPublishing: false,
      publishedUrl: '',
      publishError: ''
    };
  },
  computed: {
    store() {
      return store;
    },
    formattedSql() {
      if (!this.chartData.sql) return '';
      return this.chartData.sql
        .replace(/SELECT /gi, 'SELECT\n  ')
        .replace(/ FROM /gi, '\nFROM\n  ')
        .replace(/ GROUP BY /gi, '\nGROUP BY\n  ')
        .replace(/ ORDER BY /gi, '\nORDER BY\n  ')
        .replace(/ LIMIT /gi, '\nLIMIT ');
    }
  },
  watch: {
    'store.isDarkMode'() {
      this.initChart();
      if (this.isFullscreen) {
        this.initFullscreenChart();
      }
    },
    chartData: {
      deep: true,
      handler() {
        if (this.chartInstance) {
          this.chartInstance.setOption(this.getChartOptions());
        }
        if (this.isFullscreen && this.fullscreenChartInstance) {
          this.fullscreenChartInstance.setOption(this.getChartOptions());
        }
      }
    }
  },
  mounted() {
    this.initChart();
    window.addEventListener('resize', this.handleResize);
  },
  beforeUnmount() {
    window.removeEventListener('resize', this.handleResize);
    if (this.chartInstance) {
      this.chartInstance.dispose();
    }
    if (this.fullscreenChartInstance) {
      this.fullscreenChartInstance.dispose();
    }
  },
  methods: {
    getChartOptions() {
      const { data: raw, chartType } = this.chartData;

      // extract actual array safely
      const data = raw?.data || [];

      if (!Array.isArray(data) || data.length === 0) {
        return {};
      }

      let options = {
        backgroundColor: 'transparent',
        tooltip: { trigger: 'axis' },
        grid: { top: 30, right: 20, bottom: 30, left: 50, containLabel: true }
      };

      // Common helpers
      const getX = (item) => item.name || item.category || item.date || item.year || Object.values(item)[0];
      const getY = (item) => item.total ?? item.value ?? Object.values(item)[1];

      // LINE
      if (chartType === 'line') {
        const xAxisData = data.map(getX);
        const seriesData = data.map(getY);

        options = {
          ...options,
          xAxis: {
            type: 'category',
            data: xAxisData,
            axisLine: {
              lineStyle: {
                color: this.store?.isDarkMode ? '#4b5563' : '#cbd5e1'
              }
            }
          },
          yAxis: {
            type: 'value',
            splitLine: {
              lineStyle: {
                color: this.store?.isDarkMode ? '#374151' : '#f1f5f9'
              }
            }
          },
          series: [{
            data: seriesData,
            type: 'line',
            smooth: true,
            lineStyle: { color: '#4f46e5', width: 3 },
            itemStyle: { color: '#4f46e5' },
            areaStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: 'rgba(79,70,229,0.25)' },
                { offset: 1, color: 'rgba(79,70,229,0)' }
              ])
            }
          }]
        };
      }

      // BAR
      else if (chartType === 'bar') {
        const xAxisData = data.map(getX);
        const seriesData = data.map(getY);

        options = {
          ...options,
          xAxis: {
            type: 'category',
            data: xAxisData,
            axisLabel: { interval: 0, rotate: 30 },
            axisLine: {
              lineStyle: {
                color: this.store?.isDarkMode ? '#4b5563' : '#cbd5e1'
              }
            }
          },
          yAxis: {
            type: 'value',
            splitLine: {
              lineStyle: {
                color: this.store?.isDarkMode ? '#374151' : '#f1f5f9'
              }
            }
          },
          series: [{
            data: seriesData,
            type: 'bar',
            itemStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: '#6366f1' },
                { offset: 1, color: '#3b82f6' }
              ]),
              borderRadius: [4, 4, 0, 0]
            },
            barWidth: '40%'
          }]
        };
      }

      // PIE
      else if (chartType === 'pie') {
        options = {
          backgroundColor: 'transparent',
          tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
          legend: {
            orient: 'vertical',
            left: 'left',
            top: 'center',
            textStyle: {
              color: this.store?.isDarkMode ? '#e5e7eb' : '#374151'
            }
          },
          series: [{
            type: 'pie',
            radius: ['40%', '70%'],
            avoidLabelOverlap: false,
            itemStyle: {
              borderRadius: 10,
              borderColor: this.store?.isDarkMode ? '#1f2937' : '#fff',
              borderWidth: 2
            },
            data: data.map(item => ({
              name: getX(item),
              value: getY(item)
            }))
          }]
        };
      }

      return options;
    },
    initChart() {
      if (!this.$refs.chartRef) return;
      if (this.chartInstance) {
        this.chartInstance.dispose();
      }

      this.chartInstance = markRaw(echarts.init(this.$refs.chartRef, this.store.isDarkMode ? 'dark' : null));
      this.chartInstance.setOption(this.getChartOptions());
    },
    async initFullscreenChart() {
      await this.$nextTick();
      if (!this.$refs.fullscreenChartRef) return;
      if (this.fullscreenChartInstance) {
        this.fullscreenChartInstance.dispose();
      }

      this.fullscreenChartInstance = markRaw(echarts.init(this.$refs.fullscreenChartRef, this.store.isDarkMode ? 'dark' : null));

      const options = this.getChartOptions();
      if (options.series && options.series[0].type === 'pie') {
        options.series[0].radius = ['30%', '60%'];
      }
      options.textStyle = { fontSize: 14 };

      this.fullscreenChartInstance.setOption(options);
    },
    handleResize() {
      if (this.chartInstance) {
        this.chartInstance.resize();
      }
      if (this.isFullscreen && this.fullscreenChartInstance) {
        this.fullscreenChartInstance.resize();
      }
    },
    async toggleFullscreen() {
      this.isFullscreen = !this.isFullscreen;
      if (this.isFullscreen) {
        await this.initFullscreenChart();
      } else {
        if (this.fullscreenChartInstance) {
          this.fullscreenChartInstance.dispose();
          this.fullscreenChartInstance = null;
        }
      }
    },
    async copySql() {
      try {
        await navigator.clipboard.writeText(this.chartData.sql || '');
        this.copied = true;
        setTimeout(() => { this.copied = false; }, 2000);
      } catch (err) {
        console.error('Failed to copy', err);
      }
    },
    async publish() {
      this.isPublishing = true;
      this.publishError = '';
      try {
        const { dashboardUrl } = await publishToSuperset({
          sql: this.chartData.sql,
          chartType: this.chartData.chartType,
          groupby: this.chartData.groupby
        });
        this.publishedUrl = dashboardUrl;
        window.open(dashboardUrl, '_blank', 'noopener');
      } catch (err) {
        console.error('Publish error:', err);
        this.publishError = err.message || 'Failed to publish';
      } finally {
        this.isPublishing = false;
      }
    },
    removeChart() {
      this.$emit('remove', this.chartData.id);
    }
  }
}
</script>
