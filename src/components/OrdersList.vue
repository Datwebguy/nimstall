<script setup lang="ts">
import { ref, computed } from 'vue';
import type { Order } from '../types';
import { formatNim, formatLuna, formatUsdt, formatDate, formatAddress } from '../utils';

const props = defineProps<{
  orders: Order[];
}>();

const emit = defineEmits<{
  (e: 'select-order', orderId: string): void;
  (e: 'clear-orders'): void;
  (e: 'go-sell'): void;
}>();

const statusFilter = ref<'all' | 'paid' | 'unpaid'>('all');

const filteredOrders = computed(() => {
  if (statusFilter.value === 'all') return props.orders;
  return props.orders.filter((o) => o.status === statusFilter.value);
});

const totalRevenueNim = computed(() => {
  return props.orders
    .filter((o) => o.status === 'paid' && (!o.paymentCurrency || o.paymentCurrency === 'NIM'))
    .reduce((sum, o) => sum + o.totalNim, 0);
});

const totalRevenueUsdt = computed(() => {
  return props.orders
    .filter((o) => o.status === 'paid' && o.paymentCurrency === 'USDT')
    .reduce((sum, o) => sum + (o.totalUsdt || 0), 0);
});

const paidOrdersCount = computed(() => {
  return props.orders.filter((o) => o.status === 'paid').length;
});

function exportOrdersCsv() {
  if (props.orders.length === 0) return;

  const headers = ['Order ID', 'Date', 'Stall Name', 'Status', 'Payment Currency', 'Total NIM', 'Total USDT', 'Items Count', 'Items Summary', 'Tx Hash'];
  const rows = props.orders.map((o) => {
    const itemsSummary = (o.items || [])
      .map((it) => `${it.quantity}x ${it.name} (${it.priceNim} NIM)`)
      .join('; ');
    const dateStr = new Date(o.createdAt).toISOString();
    return [
      `"${o.id}"`,
      `"${dateStr}"`,
      `"${(o.stallName || '').replace(/"/g, '""')}"`,
      `"${o.status}"`,
      `"${o.paymentCurrency || 'NIM'}"`,
      o.totalNim,
      o.totalUsdt || 0,
      (o.items || []).reduce((sum, it) => sum + it.quantity, 0),
      `"${itemsSummary.replace(/"/g, '""')}"`,
      `"${o.txHash || ''}"`,
    ].join(',');
  });

  const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  const dateTag = new Date().toISOString().slice(0, 10);
  link.setAttribute('download', `nimstall-orders-${dateTag}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
</script>

<template>
  <div class="screen-container">
    <div class="card orders-list-card">
      <div class="card-header-row">
        <div>
          <h2 class="section-title">Order History & Receipts</h2>
          <p class="section-subtitle">Track incoming orders and verified payments stored locally</p>
        </div>
        <button class="btn btn-primary btn-sm" @click="emit('go-sell')">
          + New Order
        </button>
      </div>

      <!-- Stats overview -->
      <div class="orders-stats-grid">
        <div class="stat-card">
          <span class="stat-label">Total Orders</span>
          <span class="stat-value">{{ orders.length }}</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">Paid Orders</span>
          <span class="stat-value text-success">{{ paidOrdersCount }}</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">Total Revenue</span>
          <span class="stat-value text-accent">{{ formatNim(totalRevenueNim) }}</span>
          <span v-if="totalRevenueUsdt > 0" class="stat-sub">+ {{ formatUsdt(totalRevenueUsdt) }}</span>
          <span v-else class="stat-sub">{{ formatLuna(totalRevenueNim) }}</span>
        </div>
      </div>

      <!-- Filter row -->
      <div class="orders-filter-row">
        <div class="filter-tabs">
          <button
            class="filter-tab"
            :class="{ active: statusFilter === 'all' }"
            @click="statusFilter = 'all'"
          >
            All ({{ orders.length }})
          </button>
          <button
            class="filter-tab"
            :class="{ active: statusFilter === 'paid' }"
            @click="statusFilter = 'paid'"
          >
            Paid ({{ paidOrdersCount }})
          </button>
          <button
            class="filter-tab"
            :class="{ active: statusFilter === 'unpaid' }"
            @click="statusFilter = 'unpaid'"
          >
            Unpaid ({{ orders.length - paidOrdersCount }})
          </button>
        </div>

        <div class="orders-action-btns">
          <button
            v-if="orders.length > 0"
            class="btn btn-outline btn-sm"
            type="button"
            title="Download orders as CSV spreadsheet"
            @click="exportOrdersCsv"
          >
            <svg class="btn-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            <span>Export CSV</span>
          </button>
          <button
            v-if="orders.length > 0"
            class="btn-ghost-danger btn-sm"
            type="button"
            @click="emit('clear-orders')"
          >
            Clear History
          </button>
        </div>
      </div>

      <!-- List -->
      <div v-if="filteredOrders.length === 0" class="empty-orders-state">
        <div class="empty-icon-box">
          <svg class="empty-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
            <polyline points="10 9 9 9 8 9"></polyline>
          </svg>
        </div>
        <p class="empty-text">No orders found in this view</p>
        <span class="empty-subtext">Orders placed from the cart will be logged here.</span>
      </div>

      <div v-else class="orders-table-wrapper">
        <table class="orders-table">
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Date</th>
              <th>Items</th>
              <th>Total</th>
              <th>Status</th>
              <th>Recipient</th>
              <th class="text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="order in filteredOrders"
              :key="order.id"
              class="clickable-row"
              @click="emit('select-order', order.id)"
            >
              <td>
                <span class="order-link mono">{{ order.id }}</span>
              </td>
              <td class="text-muted">{{ formatDate(order.createdAt) }}</td>
              <td>
                <span class="order-items-snippet">
                  {{ order.items.map((i) => `${i.quantity}x ${i.name}`).join(', ') }}
                </span>
              </td>
              <td class="font-semibold">
                {{ formatNim(order.totalNim) }}
                <div v-if="order.totalUsdt" class="price-sub-tag mono">
                  {{ order.totalUsdt }} USDT
                </div>
              </td>
              <td>
                <span
                  class="status-pill"
                  :class="{
                    'status-paid': order.status === 'paid',
                    'status-unpaid': order.status === 'unpaid',
                  }"
                >
                  {{ order.status.toUpperCase() }}
                </span>
              </td>
              <td class="mono text-muted text-xs">
                {{ formatAddress(order.merchantNimAddress).slice(0, 14) }}...
              </td>
              <td class="text-right">
                <button class="btn btn-outline btn-xs" @click.stop="emit('select-order', order.id)">
                  View QR ➔
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
