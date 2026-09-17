<script setup lang="ts">
defineProps<{
  orderId: string | null;
}>();

const emit = defineEmits<{
  (e: 'go-sell'): void;
  (e: 'go-home'): void;
}>();
</script>

<template>
  <div class="not-found-screen-container">
    <div class="card not-found-card">
      <div class="not-found-icon-box">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" class="not-found-svg">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          <line x1="8" y1="11" x2="14" y2="11"></line>
        </svg>
      </div>

      <h2 class="not-found-title">Order Not Found</h2>
      
      <p class="not-found-desc">
        This order link may have expired or was opened on a device that doesn't have the order cache. Ask the merchant for their updated payment link or browse the active stall.
      </p>

      <div v-if="orderId" class="order-id-pill">
        <span class="pill-label">Order Ref:</span>
        <span class="mono">{{ orderId }}</span>
      </div>

      <div class="not-found-actions">
        <button class="btn btn-primary" type="button" @click="emit('go-sell')">
          Browse Stall Catalog
        </button>
        <button class="btn btn-outline" type="button" @click="emit('go-home')">
          NimStall Home
        </button>
      </div>
    </div>
  </div>
</template>
