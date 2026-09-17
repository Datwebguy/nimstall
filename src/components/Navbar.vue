<script setup lang="ts">
import { computed } from 'vue';
import type { ScreenType } from '../types';
import { connectedAccount, isReady, isConnecting } from '../nimiq';

const props = defineProps<{
  currentScreen: ScreenType;
  cartCount: number;
}>();

const emit = defineEmits<{
  (e: 'navigate', screen: ScreenType): void;
}>();

const shortAccount = computed(() => {
  if (!connectedAccount.value) return null;
  const acc = connectedAccount.value.replace(/\s+/g, '');
  if (acc.length < 10) return acc;
  return acc.slice(0, 4) + '...' + acc.slice(-4);
});
</script>

<template>
  <header class="app-header">
    <div class="header-container">
      <div class="brand-row">
        <div class="brand-badge" @click="emit('navigate', 'landing')">
          <img src="/logo.png" alt="NimStall" class="app-brand-logo" />
          <div class="brand-text">
            <span class="brand-title">NimStall</span>
            <span class="brand-subtitle">Point-of-sale for Nimiq Pay</span>
          </div>
        </div>

        <div class="header-right-group">
          <button
            v-if="currentScreen === 'landing'"
            class="btn btn-primary btn-sm open-stall-header-btn"
            type="button"
            @click="emit('navigate', 'sell')"
          >
            <svg class="btn-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="9" cy="21" r="1"></circle>
              <circle cx="20" cy="21" r="1"></circle>
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
            </svg>
            <span>Open Stall</span>
          </button>

          <div class="wallet-pill">
            <span v-if="isConnecting" class="status-dot connecting"></span>
            <span v-else-if="isReady" class="status-dot connected"></span>
            <span v-else class="status-dot offline"></span>

            <span v-if="isConnecting" class="wallet-text">Connecting...</span>
            <span v-else-if="connectedAccount" class="wallet-text mono" :title="connectedAccount">
              {{ shortAccount }}
            </span>
            <span v-else-if="isReady" class="wallet-text">Nimiq Ready</span>
            <span v-else class="wallet-text dimmed">Web Mode</span>
          </div>
        </div>
      </div>

      <nav class="nav-tabs" role="tablist">
        <button
          class="nav-tab"
          :class="{ active: currentScreen === 'landing' }"
          type="button"
          @click="emit('navigate', 'landing')"
        >
          <svg class="tab-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
            <polyline points="9 22 9 12 15 12 15 22"></polyline>
          </svg>
          <span class="tab-label">Home</span>
        </button>

        <button
          class="nav-tab"
          :class="{ active: currentScreen === 'sell' }"
          type="button"
          @click="emit('navigate', 'sell')"
        >
          <svg class="tab-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="9" cy="21" r="1"></circle>
            <circle cx="20" cy="21" r="1"></circle>
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
          </svg>
          <span class="tab-label">Sell & Cart</span>
          <span v-if="cartCount > 0" class="cart-badge">{{ cartCount }}</span>
        </button>

        <button
          class="nav-tab"
          :class="{ active: currentScreen === 'create' }"
          type="button"
          @click="emit('navigate', 'create')"
        >
          <svg class="tab-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M2 3h20"></path>
            <path d="M21 3v4a3 3 0 0 1-6 0 3 3 0 0 1-6 0 3 3 0 0 1-6 0V3"></path>
            <path d="M4 10v10a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V10"></path>
            <path d="M9 21v-6a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v6"></path>
          </svg>
          <span class="tab-label">Stall Setup</span>
        </button>

        <button
          class="nav-tab"
          :class="{ active: currentScreen === 'orders' }"
          type="button"
          @click="emit('navigate', 'orders')"
        >
          <svg class="tab-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
            <polyline points="10 9 9 9 8 9"></polyline>
          </svg>
          <span class="tab-label">Orders</span>
        </button>
      </nav>
    </div>
  </header>
</template>
