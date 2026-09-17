<script setup lang="ts">
import { computed } from 'vue';
import type { Stall, StallItem, CartItem } from '../types';
import { formatNim, formatUsdt, formatAddress } from '../utils';

const props = defineProps<{
  stalls: Stall[];
  activeStall: Stall | null;
  cart: CartItem[];
}>();

const emit = defineEmits<{
  (e: 'add-to-cart', item: StallItem): void;
  (e: 'remove-from-cart', itemId: string): void;
  (e: 'update-quantity', itemId: string, delta: number): void;
  (e: 'clear-cart'): void;
  (e: 'select-stall', stallId: string): void;
  (e: 'checkout'): void;
  (e: 'go-create'): void;
}>();

const totalItemsCount = computed(() => {
  return props.cart.reduce((sum, ci) => sum + ci.quantity, 0);
});

const totalNim = computed(() => {
  const sum = props.cart.reduce((acc, ci) => acc + ci.item.priceNim * ci.quantity, 0);
  return Math.round(sum * 10000) / 10000;
});

const totalLuna = computed(() => {
  return Math.round(totalNim.value * 100000);
});

const totalUsdt = computed(() => {
  const sum = props.cart.reduce((acc, ci) => {
    const p = ci.item.priceUsdt || 0;
    return acc + p * ci.quantity;
  }, 0);
  return Math.round(sum * 100) / 100;
});

function getCartQuantity(itemId: string): number {
  const found = props.cart.find((ci) => ci.item.id === itemId);
  return found ? found.quantity : 0;
}
</script>

<template>
  <div>
    <!-- State: No stalls exist yet -->
    <div v-if="!activeStall || stalls.length === 0" class="welcome-section-container">
      <div class="card empty-welcome-card">
        <div class="welcome-icon-wrapper">
          <img src="/logo.png" alt="NimStall" class="welcome-logo-icon" />
        </div>
        <h2 class="welcome-title">Welcome to NimStall</h2>
        <p class="welcome-desc">
          No stalls have been created yet. Create a live stall with your Nimiq Pay wallet to start selling in NIM & USDT.
        </p>
        <div class="welcome-actions">
          <button class="btn btn-primary btn-lg welcome-cta" type="button" @click="emit('go-create')">
            <svg class="btn-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            <span>Create Your First Stall</span>
          </button>
        </div>
      </div>

      <!-- Supporting "How It Works" 3-step section filling empty space -->
      <div class="how-it-works-strip">
        <div class="step-feature-card">
          <div class="step-badge">1</div>
          <div class="step-icon-box">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M2 3h20"></path>
              <path d="M21 3v4a3 3 0 0 1-6 0 3 3 0 0 1-6 0 3 3 0 0 1-6 0V3"></path>
              <path d="M4 10v10a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V10"></path>
              <path d="M9 21v-6a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v6"></path>
            </svg>
          </div>
          <h4 class="step-title">Set Up Your Stall</h4>
          <p class="step-desc">Name your stall, add your products, and set pricing in NIM and USDT.</p>
        </div>

        <div class="step-feature-card">
          <div class="step-badge">2</div>
          <div class="step-icon-box">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="3" width="7" height="7"></rect>
              <rect x="14" y="3" width="7" height="7"></rect>
              <rect x="14" y="14" width="7" height="7"></rect>
              <rect x="3" y="14" width="7" height="7"></rect>
            </svg>
          </div>
          <h4 class="step-title">Cart & QR Checkout</h4>
          <p class="step-desc">Tap products to cart and generate an instant deep-link and payment QR.</p>
        </div>

        <div class="step-feature-card">
          <div class="step-badge">3</div>
          <div class="step-icon-box">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
              <polyline points="9 12 11 14 15 10"></polyline>
            </svg>
          </div>
          <h4 class="step-title">Settle on Chain</h4>
          <p class="step-desc">Buyers confirm directly in Nimiq Pay. Paid status verifies live on blockchain.</p>
        </div>
      </div>

      <div class="welcome-footer-badge">
        <span class="pulse-indicator"></span>
        <span>Connected to Nimiq Mini App Framework & EVM Rails</span>
      </div>
    </div>

    <!-- State: Stall exists -->
    <div v-else class="sell-screen-layout">
      <!-- Main catalog area -->
      <div class="catalog-section">
        <!-- Stall Banner -->
        <div class="stall-banner-card">
          <div class="banner-top">
            <div>
              <span class="banner-badge">Active Stall</span>
              <h1 class="stall-title">{{ activeStall.name || 'Untitled Stall' }}</h1>
              <p v-if="activeStall.description" class="stall-desc">
                {{ activeStall.description }}
              </p>
            </div>

            <div v-if="stalls.length > 1" class="stall-quick-select">
              <label class="small-label">Switch Stall</label>
              <select
                :value="activeStall.id"
                class="form-select-sm"
                @change="(e) => emit('select-stall', (e.target as HTMLSelectElement).value)"
              >
                <option v-for="s in stalls" :key="s.id" :value="s.id">
                  {{ s.name }}
                </option>
              </select>
            </div>
          </div>

          <div class="banner-meta">
            <div class="merchant-badge">
              <span class="meta-label">NIM Recipient:</span>
              <span class="meta-addr mono" :title="activeStall.merchantNimAddress">
                {{ activeStall.merchantNimAddress ? formatAddress(activeStall.merchantNimAddress) : 'Not configured' }}
              </span>
            </div>
            <div v-if="activeStall.merchantUsdtAddress" class="merchant-badge">
              <span class="meta-label">USDT (Polygon):</span>
              <span class="meta-addr mono" :title="activeStall.merchantUsdtAddress">
                {{ formatAddress(activeStall.merchantUsdtAddress) }}
              </span>
            </div>
          </div>
        </div>

        <!-- Products Grid -->
        <div v-if="activeStall.items.length === 0" class="card empty-catalog-card">
          <div class="empty-icon-box">
            <svg class="empty-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="16.5" y1="9.4" x2="7.5" y2="4.21"></line>
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
              <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
              <line x1="12" y1="22.08" x2="12" y2="12"></line>
            </svg>
          </div>
          <h3>This stall has no products yet</h3>
          <p>Add products to your catalog in the Stall Setup tab.</p>
          <button class="btn btn-primary btn-sm" style="margin-top: 14px;" type="button" @click="emit('go-create')">
            + Add Products Now
          </button>
        </div>

        <div v-else class="products-grid">
          <div
            v-for="item in activeStall.items"
            :key="item.id"
            class="product-card"
            @click="emit('add-to-cart', item)"
          >
            <div class="product-top">
              <div class="product-emoji">{{ item.emoji || '🏷️' }}</div>
              <div v-if="getCartQuantity(item.id) > 0" class="product-qty-badge">
                {{ getCartQuantity(item.id) }} in cart
              </div>
            </div>

            <div class="product-info">
              <h3 class="product-name">{{ item.name }}</h3>
              <p v-if="item.description" class="product-desc">{{ item.description }}</p>
            </div>

            <div class="product-footer">
              <div class="product-price">
                <span class="price-val">{{ formatNim(item.priceNim) }}</span>
                <span v-if="item.priceUsdt" class="price-sub-val">{{ formatUsdt(item.priceUsdt) }}</span>
              </div>

              <button
                class="btn-add"
                type="button"
                @click.stop="emit('add-to-cart', item)"
              >
                + Add
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Cart Sidebar / Summary -->
      <div class="cart-sidebar">
        <div class="card cart-card">
          <div class="cart-header">
            <div class="cart-header-title">
              <svg class="cart-header-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <path d="M16 10a4 4 0 0 1-8 0"></path>
              </svg>
              <h3>Current Cart</h3>
            </div>
            <span class="cart-pill-count">{{ totalItemsCount }} items</span>
          </div>

          <!-- Cart Body -->
          <div v-if="cart.length === 0" class="cart-empty-state">
            <div class="empty-cart-icon-box">
              <svg class="empty-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="9" cy="21" r="1"></circle>
                <circle cx="20" cy="21" r="1"></circle>
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
              </svg>
            </div>
            <p class="empty-text">Cart is empty</p>
            <span class="empty-subtext">Tap products from the catalog to add them</span>
          </div>

          <div v-else class="cart-items-container">
            <div v-for="ci in cart" :key="ci.item.id" class="cart-item-row">
              <div class="ci-emoji">{{ ci.item.emoji || '🏷️' }}</div>
              <div class="ci-details">
                <div class="ci-name">{{ ci.item.name }}</div>
                <div class="ci-unit-price">
                  {{ formatNim(ci.item.priceNim) }}
                  <span v-if="ci.item.priceUsdt">({{ formatUsdt(ci.item.priceUsdt) }})</span>
                </div>
              </div>

              <div class="ci-controls">
                <button
                  class="qty-btn"
                  title="Decrease"
                  @click="emit('update-quantity', ci.item.id, -1)"
                >
                  -
                </button>
                <span class="qty-num">{{ ci.quantity }}</span>
                <button
                  class="qty-btn"
                  title="Increase"
                  @click="emit('update-quantity', ci.item.id, 1)"
                >
                  +
                </button>
              </div>

              <div class="ci-subtotal">
                {{ formatNim(ci.item.priceNim * ci.quantity) }}
              </div>

              <button
                class="ci-delete"
                title="Remove item"
                @click="emit('remove-from-cart', ci.item.id)"
              >
                ✕
              </button>
            </div>
          </div>

          <!-- Cart Summary & Checkout -->
          <div v-if="cart.length > 0" class="cart-summary-section">
            <div class="summary-line">
              <span class="summary-label">Total in Luna:</span>
              <span class="summary-value mono">{{ new Intl.NumberFormat('en-US').format(totalLuna) }}</span>
            </div>

            <div v-if="totalUsdt > 0" class="summary-line">
              <span class="summary-label">USDT Equivalent:</span>
              <span class="summary-value font-semibold">{{ formatUsdt(totalUsdt) }}</span>
            </div>

            <div class="summary-divider"></div>

            <div class="summary-total-row">
              <span class="total-label">Total Payable</span>
              <div class="total-display">
                <span class="total-nim">{{ formatNim(totalNim) }}</span>
              </div>
            </div>

            <div class="cart-actions-row">
              <button class="btn btn-outline btn-sm" @click="emit('clear-cart')">
                Clear Cart
              </button>
              <button class="btn btn-primary btn-block btn-lg btn-checkout-action" @click="emit('checkout')">
                <span>Checkout (Create Order)</span>
                <svg class="btn-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                  <polyline points="12 5 19 12 12 19"></polyline>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
