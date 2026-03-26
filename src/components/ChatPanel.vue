<template>
  <div class="flex flex-col h-full bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 transition-colors duration-200">
    <!-- Header -->
    <div class="p-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center bg-white dark:bg-gray-900 shrink-0">
      <h2 class="text-lg font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-indigo-500" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clip-rule="evenodd" />
        </svg>
        AI Assistant
      </h2>
      <button @click="store.clearChat" class="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 bg-gray-200 dark:bg-gray-800 px-2 py-1 rounded transition-colors">
        Clear
      </button>
    </div>

    <!-- Messages Area -->
    <div class="flex-1 overflow-y-auto p-4 space-y-4" ref="messagesContainer">
      <div v-if="store.messages.length === 0" class="text-center text-gray-500 dark:text-gray-400 mt-10">
        <p class="text-sm">Ask me to visualize your data!</p>
        <p class="text-xs mt-2">Examples:</p>
        <ul class="text-xs mt-1 space-y-2">
          <li class="cursor-pointer hover:text-indigo-500 transition-colors inline-block bg-white dark:bg-gray-800 px-3 py-1.5 rounded-full shadow-sm border border-gray-100 dark:border-gray-700" @click="setInput('Show me monthly revenue')">"Show me monthly revenue"</li>
          <li class="cursor-pointer hover:text-indigo-500 transition-colors inline-block bg-white dark:bg-gray-800 px-3 py-1.5 rounded-full shadow-sm border border-gray-100 dark:border-gray-700" @click="setInput('Sales by category')">"Sales by category"</li>
          <li class="cursor-pointer hover:text-indigo-500 transition-colors inline-block bg-white dark:bg-gray-800 px-3 py-1.5 rounded-full shadow-sm border border-gray-100 dark:border-gray-700" @click="setInput('Users by region')">"Users by region"</li>
        </ul>
      </div>

      <div v-for="(msg, index) in store.messages" :key="index"
           :class="['flex w-full', msg.role === 'user' ? 'justify-end' : 'justify-start']">

        <div :class="['max-w-[85%] rounded-lg p-3 text-sm shadow-sm',
                      msg.role === 'user'
                        ? 'bg-indigo-600 text-white rounded-br-none'
                        : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 border border-gray-100 dark:border-gray-700 rounded-bl-none']">
          <div class="flex items-start gap-2">
            <div v-if="msg.role === 'ai'" class="shrink-0 mt-0.5">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-indigo-500" viewBox="0 0 20 20" fill="currentColor">
                <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
              </svg>
            </div>
            <p class="whitespace-pre-wrap leading-relaxed">{{ msg.content }}</p>
          </div>

          <div v-if="msg.chartGenerated" class="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700 text-xs text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
            </svg>
            Chart added to dashboard
          </div>
        </div>
      </div>

      <!-- Typing indicator -->
      <div v-if="isLoading" class="flex justify-start">
        <div class="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-lg rounded-bl-none p-3 shadow-sm flex gap-1 items-center h-10">
          <div class="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></div>
          <div class="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 0.2s"></div>
          <div class="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 0.4s"></div>
        </div>
      </div>
    </div>

    <!-- Input Area -->
    <div class="p-4 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 shrink-0">
      <form @submit.prevent="handleSubmit" class="relative">
        <input
          type="text"
          v-model="inputText"
          placeholder="Ask a question about your data..."
          class="w-full pl-4 pr-12 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow text-sm"
          :disabled="isLoading"
        >
        <button
          type="submit"
          class="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          :disabled="!inputText.trim() || isLoading"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z" clip-rule="evenodd" />
          </svg>
        </button>
      </form>
    </div>
  </div>
</template>

<script>
import { store } from '../store.js';
import { askAI } from '../services/api.js';

export default {
  name: 'ChatPanel',
  data() {
    return {
      inputText: 'top 4 names',
      isLoading: false
    };
  },
  computed: {
    store() {
      return store;
    }
  },
  watch: {
    'store.messages.length'() {
      this.scrollToBottom();
    }
  },
  methods: {
    async scrollToBottom() {
      await this.$nextTick();
      const container = this.$refs.messagesContainer;
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    },
    setInput(text) {
      this.inputText = text;
    },
    async handleSubmit() {
      const text = this.inputText.trim();
      if (!text || this.isLoading) return;

      // Add user message
      this.store.addMessage({ role: 'user', content: text });
      this.inputText = '';
      this.isLoading = true;
      this.scrollToBottom();

      try {
        // Call API
        const response = await askAI(text);

        // Add chart to dashboard
        const chartId = Date.now().toString();
        this.store.addChart({
          id: chartId,
          ...response,
          title: text // Use the user's query as the title
        });

        // Update SQL
        this.store.setCurrentSql(response.sql);

        // Add AI response
        this.store.addMessage({
          role: 'ai',
          content: `I've created a ${response.chartType} chart for you.`,
          chartGenerated: true
        });

      } catch (error) {
        console.error('API Error:', error);
        this.store.addMessage({
          role: 'ai',
          content: 'Sorry, I encountered an error while processing your request: ' + error.message
        });
      } finally {
        this.isLoading = false;
        this.scrollToBottom();
      }
    }
  }
}
</script>
