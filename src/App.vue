<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import type { Stall, StallItem, CartItem, Order, ScreenType } from './types';
import {
  loadStalls,
  saveStalls,
  loadOrders,
  saveOrder,
  saveOrders,
  loadActiveStallId,
  saveActiveStallId,
  getOrder,
  deleteStall,
  clearAllStorage,
} from './storage';
import {
  connectedNimAccount,
  connectedEvmAccount,
} from './nimiq';
import { generateOrderId } from './utils';

import Navbar from './components/Navbar.vue';
import LandingPage from './components/LandingPage.vue';
import SellCart from './components/SellCart.vue';
import CreateStall from './components/CreateStall.vue';
import OrderCheckout from './components/OrderCheckout.vue';
import OrdersList from './components/OrdersList.vue';
import BuyerOrderNotFound from './components/BuyerOrderNotFound.vue';

// App state
const currentScreen = ref<ScreenType>('sell');
const stalls = ref<Stall[]>(loadStalls());
const activeStallId = ref<string | null>(loadActiveStallId());
const orders = ref<Order[]>(loadOrders());
const cart = ref<CartItem[]>([]);
const activeOrder = ref<Order | null>(null);
const notFoundOrderId = ref<string | null>(null);

const activeStall = computed<Stall | null>(() => {
  if (stalls.value.length === 0) return null;
  const found = stalls.value.find((s) => s.id === activeStallId.value);
  return found || stalls.value[0] || null;
});

const totalCartCount = computed(() => {
  return cart.value.reduce((sum, ci) => sum + ci.quantity, 0);
});

// Update stall with connected account if missing
watch(connectedNimAccount, (newAcc) => {
  if (newAcc && stalls.value.length > 0) {
    let modified = false;
    stalls.value = stalls.value.map((stall) => {
      if (!stall.merchantNimAddress) {
        modified = true;
        return { ...stall, merchantNimAddress: newAcc };
      }
      return stall;
    });
    if (modified) {
      saveStalls(stalls.value);
    }
  }
});


// Hash Routing handler
function parseHashRoute() {
  const hash = window.location.hash.trim();
  if (hash.startsWith('#order=')) {
    const rawVal = hash.slice(7);
    let orderId = rawVal;
    let merchantNim = '';
    let merchantUsdt = '';
    let totalNim = 0;
    let totalUsdt = 0;
    let stallName = 'NimStall';
    let itemsSummary = '';

    if (rawVal.includes('&') || rawVal.includes('=')) {
      const p = new URLSearchParams(rawVal);
      orderId = p.get('id') || rawVal.split('&')[0];
      merchantNim = p.get('to') || '';
      merchantUsdt = p.get('usdtTo') || '';
      totalNim = parseFloat(p.get('nim') || '0');
      totalUsdt = parseFloat(p.get('usdt') || '0');
      stallName = p.get('stall') || 'NimStall';
      itemsSummary = p.get('items') || '';
    }

    let order = getOrder(orderId) || orders.value.find((o) => o.id === orderId);

    // If order was created on another device (e.g. buyer opening merchant's order link), reconstruct it
    if (!order && merchantNim && totalNim > 0) {
      const parsedItems = itemsSummary
        ? itemsSummary.split(',').map((it, idx) => {
            const match = it.match(/^(\d+)x(.*?)@([\d.]+)$/);
            if (match) {
              const qty = parseInt(match[1], 10);
              const name = match[2];
              const price = parseFloat(match[3]);
              return {
                id: `item-${idx}`,
                name,
                priceNim: price,
                priceUsdt: 0,
                quantity: qty,
                subtotalNim: qty * price,
                subtotalUsdt: 0,
              };
            }
            return {
              id: `item-${idx}`,
              name: it,
              priceNim: totalNim,
              priceUsdt: totalUsdt,
              quantity: 1,
              subtotalNim: totalNim,
              subtotalUsdt: totalUsdt,
            };
          })
        : [
            {
              id: 'item-1',
              name: 'Order Items',
              priceNim: totalNim,
              priceUsdt: totalUsdt,
              quantity: 1,
              subtotalNim: totalNim,
              subtotalUsdt: totalUsdt,
            },
          ];

      order = {
        id: orderId,
        stallId: 'shared-stall',
        stallName,
        merchantNimAddress: merchantNim,
        merchantUsdtAddress: merchantUsdt || undefined,
        items: parsedItems,
        totalNim,
        totalLuna: Math.round(totalNim * 100000),
        totalUsdt,
        status: 'unpaid',
        createdAt: Date.now(),
      };
      saveOrder(order);
      orders.value = loadOrders();
    }

    if (order) {
      activeOrder.value = order;
      currentScreen.value = 'checkout';
      return;
    } else {
      notFoundOrderId.value = orderId;
      currentScreen.value = 'not-found';
      return;
    }
  }

  if (hash === '#home' || hash === '#landing' || hash === '#about') {
    currentScreen.value = 'landing';
  } else if (hash === '#create' || hash === '#stall') {
    currentScreen.value = 'create';
  } else if (hash === '#orders' || hash === '#history') {
    currentScreen.value = 'orders';
  } else if (hash === '#sell' || hash === '#cart') {
    currentScreen.value = 'sell';
  } else if (!hash) {
    currentScreen.value = 'landing';
  }
}

function handleNavigate(screen: ScreenType) {
  currentScreen.value = screen;
  if (screen === 'landing') {
    window.location.hash = '#home';
  } else if (screen === 'sell') {
    window.location.hash = '#sell';
  } else if (screen === 'create') {
    window.location.hash = '#create';
  } else if (screen === 'orders') {
    window.location.hash = '#orders';
  }
}

// Cart operations
function handleAddToCart(item: StallItem) {
  const existing = cart.value.find((ci) => ci.item.id === item.id);
  if (existing) {
    existing.quantity += 1;
  } else {
    cart.value.push({ item, quantity: 1 });
  }
}

function handleRemoveFromCart(itemId: string) {
  cart.value = cart.value.filter((ci) => ci.item.id !== itemId);
}

function handleUpdateQuantity(itemId: string, delta: number) {
  const existing = cart.value.find((ci) => ci.item.id === itemId);
  if (existing) {
    existing.quantity += delta;
    if (existing.quantity <= 0) {
      handleRemoveFromCart(itemId);
    }
  }
}

function handleClearCart() {
  cart.value = [];
}

// Checkout -> creates order with QR and sets hash #order=id
function handleCheckout() {
  if (cart.value.length === 0 || !activeStall.value) return;

  const totalNim = Math.round(
    cart.value.reduce((acc, ci) => acc + ci.item.priceNim * ci.quantity, 0) * 10000
  ) / 10000;

  const totalUsdt = Math.round(
    cart.value.reduce((acc, ci) => acc + (ci.item.priceUsdt || 0) * ci.quantity, 0) * 100
  ) / 100;

  const merchantNim =
    activeStall.value.merchantNimAddress ||
    connectedNimAccount.value ||
    '';

  const merchantUsdt =
    activeStall.value.merchantUsdtAddress ||
    connectedEvmAccount.value ||
    undefined;

  const orderId = generateOrderId();
  const newOrder: Order = {
    id: orderId,
    stallId: activeStall.value.id,
    stallName: activeStall.value.name,
    merchantNimAddress: merchantNim,
    merchantUsdtAddress: merchantUsdt,
    items: cart.value.map((ci) => {
      const pUsdt = ci.item.priceUsdt || 0;
      return {
        id: ci.item.id,
        name: ci.item.name,
        priceNim: ci.item.priceNim,
        priceUsdt: pUsdt,
        quantity: ci.quantity,
        subtotalNim: Math.round(ci.item.priceNim * ci.quantity * 10000) / 10000,
        subtotalUsdt: Math.round(pUsdt * ci.quantity * 100) / 100,
        image: ci.item.image,
      };
    }),
    totalNim,
    totalLuna: Math.round(totalNim * 100000),
    totalUsdt,
    status: 'unpaid',
    createdAt: Date.now(),
  };

  saveOrder(newOrder);
  orders.value = loadOrders();
  cart.value = [];
  activeOrder.value = newOrder;
  currentScreen.value = 'checkout';
  window.location.hash = `#order=${newOrder.id}`;
}

// Order Updated (e.g. Paid)
function handleOrderUpdated(updated: Order) {
  saveOrder(updated);
  orders.value = loadOrders();
  activeOrder.value = updated;
}

// Stall operations
function handleSaveStall(updatedStall: Stall) {
  const idx = stalls.value.findIndex((s) => s.id === updatedStall.id);
  if (idx >= 0) {
    stalls.value[idx] = updatedStall;
  } else {
    stalls.value.push(updatedStall);
  }
  saveStalls(stalls.value);
}

function handleCreateStall(newStall: Stall) {
  stalls.value.push(newStall);
  activeStallId.value = newStall.id;
  saveActiveStallId(newStall.id);
  saveStalls(stalls.value);
}

function handleSelectStall(id: string) {
  activeStallId.value = id;
  saveActiveStallId(id);
}

function handleSelectOrder(orderId: string) {
  const order = getOrder(orderId) || orders.value.find((o) => o.id === orderId);
  if (order) {
    activeOrder.value = order;
    currentScreen.value = 'checkout';
    window.location.hash = `#order=${order.id}`;
  }
}

function handleClearOrders() {
  if (confirm('Are you sure you want to clear all order history from localStorage?')) {
    saveOrders([]);
    orders.value = [];
  }
}

function handleDeleteStall(stallId: string) {
  stalls.value = deleteStall(stallId);
  activeStallId.value = stalls.value[0]?.id || null;
}

function handleResetAll() {
  clearAllStorage();
  stalls.value = [];
  activeStallId.value = null;
  orders.value = [];
  cart.value = [];
  activeOrder.value = null;
  currentScreen.value = 'create';
}

onMounted(() => {
  // Pure web-first load: no eager wallet popups
  // Initial routing
  parseHashRoute();
  window.addEventListener('hashchange', parseHashRoute);
});

onUnmounted(() => {
  window.removeEventListener('hashchange', parseHashRoute);
});
</script>

<template>
  <div class="app-root">
    <Navbar
      :current-screen="currentScreen"
      :cart-count="totalCartCount"
      @navigate="handleNavigate"
    />

    <main class="app-main" :class="{ 'landing-main': currentScreen === 'landing' }">
      <!-- Landing Page -->
      <LandingPage
        v-if="currentScreen === 'landing'"
        @open-stall="handleNavigate('sell')"
        @go-create="handleNavigate('create')"
      />

      <!-- Sell / Cart Screen -->
      <SellCart
        v-else-if="currentScreen === 'sell'"
        :stalls="stalls"
        :active-stall="activeStall"
        :cart="cart"
        @add-to-cart="handleAddToCart"
        @remove-from-cart="handleRemoveFromCart"
        @update-quantity="handleUpdateQuantity"
        @clear-cart="handleClearCart"
        @select-stall="handleSelectStall"
        @checkout="handleCheckout"
        @go-create="handleNavigate('create')"
      />

      <!-- Create / Manage Stall Screen -->
      <CreateStall
        v-else-if="currentScreen === 'create'"
        :stalls="stalls"
        :active-stall-id="activeStallId"
        @save-stall="handleSaveStall"
        @create-stall="handleCreateStall"
        @delete-stall="handleDeleteStall"
        @reset-all="handleResetAll"
        @select-stall="handleSelectStall"
        @go-sell="handleNavigate('sell')"
      />

      <!-- Order Checkout Screen with QR and Hash -->
      <OrderCheckout
        v-else-if="currentScreen === 'checkout' && activeOrder"
        :order="activeOrder"
        @order-updated="handleOrderUpdated"
        @back-to-stall="handleNavigate('sell')"
        @view-orders="handleNavigate('orders')"
      />

      <!-- Orders History Screen -->
      <OrdersList
        v-else-if="currentScreen === 'orders'"
        :orders="orders"
        @select-order="handleSelectOrder"
        @clear-orders="handleClearOrders"
        @go-sell="handleNavigate('sell')"
      />

      <!-- Buyer Order Not Found Screen -->
      <BuyerOrderNotFound
        v-else-if="currentScreen === 'not-found'"
        :order-id="notFoundOrderId"
        @go-sell="handleNavigate('sell')"
        @go-home="handleNavigate('landing')"
      />
    </main>
  </div>
</template>
