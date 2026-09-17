<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue';
import QRCode from 'qrcode';
import type { Order } from '../types';
import { formatNim, formatLuna, formatUsdt, formatAddress, formatDate } from '../utils';
import {
  sendNimPayment,
  sendUsdtPayment,
  isReady,
  hasEthereumProvider,
  verifyNimTxStatus,
} from '../nimiq';

const props = defineProps<{
  order: Order;
}>();

const emit = defineEmits<{
  (e: 'order-updated', order: Order): void;
  (e: 'back-to-stall'): void;
  (e: 'view-orders'): void;
}>();

// Selected payment currency by buyer
const selectedCurrency = ref<'NIM' | 'USDT'>('NIM');

// QR Code generation
const qrType = ref<'payment' | 'url'>('payment');
const qrDataUrl = ref<string>('');
const isGeneratingQr = ref(true);

const orderUrl = computed(() => {
  const p = new URLSearchParams();
  p.set('id', props.order.id);
  p.set('stall', props.order.stallName);
  p.set('to', props.order.merchantNimAddress);
  if (props.order.merchantUsdtAddress) {
    p.set('usdtTo', props.order.merchantUsdtAddress);
  }
  p.set('nim', props.order.totalNim.toString());
  p.set('usdt', props.order.totalUsdt.toString());
  if (props.order.items && props.order.items.length > 0) {
    const summary = props.order.items
      .map((i) => `${i.quantity}x${i.name}@${i.priceNim}`)
      .join(',');
    p.set('items', summary);
  }
  return `${window.location.origin}${window.location.pathname}#order=${p.toString()}`;
});

const paymentUri = computed(() => {
  if (selectedCurrency.value === 'NIM') {
    const cleanAddr = (props.order.merchantNimAddress || '').replace(/\s+/g, '');
    return `nimiq:${cleanAddr}?amount=${props.order.totalLuna}&message=${encodeURIComponent(props.order.id)}`;
  } else {
    // Polygon USDT transfer URI or order deep link
    return orderUrl.value;
  }
});

async function updateQr() {
  isGeneratingQr.value = true;
  try {
    const textToEncode = qrType.value === 'payment' ? paymentUri.value : orderUrl.value;
    const url = await QRCode.toDataURL(textToEncode, {
      width: 280,
      margin: 2,
      color: {
        dark: '#1F2559',
        light: '#FFFFFF',
      },
    });
    qrDataUrl.value = url;
  } catch (err) {
    console.error('Failed to generate QR code:', err);
  } finally {
    isGeneratingQr.value = false;
  }
}

watch(() => [props.order.id, qrType.value, selectedCurrency.value], updateQr);

onMounted(() => {
  const p = new URLSearchParams();
  p.set('id', props.order.id);
  p.set('stall', props.order.stallName);
  p.set('to', props.order.merchantNimAddress);
  if (props.order.merchantUsdtAddress) {
    p.set('usdtTo', props.order.merchantUsdtAddress);
  }
  p.set('nim', props.order.totalNim.toString());
  p.set('usdt', props.order.totalUsdt.toString());
  if (props.order.items && props.order.items.length > 0) {
    const summary = props.order.items
      .map((i) => `${i.quantity}x${i.name}@${i.priceNim}`)
      .join(',');
    p.set('items', summary);
  }
  window.location.hash = `#order=${p.toString()}`;
  updateQr();
});

// Link copy helper
const linkCopied = ref(false);
function copyOrderUrl() {
  navigator.clipboard.writeText(orderUrl.value);
  linkCopied.value = true;
  setTimeout(() => {
    linkCopied.value = false;
  }, 2000);
}

// Payment execution
const isPaying = ref(false);
const payStatus = ref<string | null>(null);
const payError = ref<string | null>(null);

async function handlePay() {
  isPaying.value = true;
  payError.value = null;
  payStatus.value = 'Requesting payment confirmation in Nimiq Pay...';

  try {
    if (selectedCurrency.value === 'NIM') {
      const res = await sendNimPayment({
        recipient: props.order.merchantNimAddress,
        totalNim: props.order.totalNim,
        orderId: props.order.id,
      });

      if (!res.success || !res.txHash) {
        payError.value = res.error || 'NIM payment failed or rejected by wallet.';
        return;
      }

      payStatus.value = 'Transaction submitted! Verifying hash...';
      const updated: Order = {
        ...props.order,
        status: 'paid',
        paymentCurrency: 'NIM',
        paidAt: Date.now(),
        txHash: res.txHash,
      };
      emit('order-updated', updated);
    } else {
      // USDT on Polygon
      if (!props.order.merchantUsdtAddress) {
        payError.value = 'Merchant did not set a Polygon USDT address.';
        return;
      }

      const res = await sendUsdtPayment({
        recipient: props.order.merchantUsdtAddress,
        totalUsdt: props.order.totalUsdt,
        orderId: props.order.id,
      });

      if (!res.success || !res.txHash) {
        payError.value = res.error || 'USDT payment rejected or failed.';
        return;
      }

      payStatus.value = 'USDT transfer verified on Polygon!';
      const updated: Order = {
        ...props.order,
        status: 'paid',
        paymentCurrency: 'USDT',
        paidAt: Date.now(),
        txHash: res.txHash,
      };
      emit('order-updated', updated);
    }
  } catch (err) {
    payError.value = err instanceof Error ? err.message : String(err);
  } finally {
    isPaying.value = false;
  }
}

function getExplorerUrl(txHash: string): string {
  if (props.order.paymentCurrency === 'USDT' || txHash.startsWith('0x')) {
    return `https://polygonscan.com/tx/${txHash}`;
  }
  return `https://nimiq.watch/#${txHash}`;
}
</script>

<template>
  <div class="checkout-screen-container">
    <div class="checkout-card card">
      <!-- Status Header -->
      <div class="checkout-header">
        <div class="order-id-badge">
          <span class="badge-label">Order:</span>
          <span class="badge-value mono">{{ order.id }}</span>
        </div>

        <div class="status-indicator">
          <span v-if="order.status === 'paid'" class="badge-paid">
            <svg class="badge-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            <span>PAID</span>
          </span>
          <span v-else-if="order.status === 'cancelled'" class="badge-cancelled">Cancelled</span>
          <span v-else class="badge-pending">
            <svg class="badge-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
            <span>UNPAID</span>
          </span>
        </div>
      </div>

      <div class="checkout-grid">
        <!-- Left: QR Code & Scan info -->
        <div class="qr-column">
          <div class="qr-container">
            <div class="qr-tabs">
              <button
                class="qr-tab-btn"
                :class="{ active: qrType === 'payment' }"
                @click="qrType = 'payment'"
              >
                Payment QR
              </button>
              <button
                class="qr-tab-btn"
                :class="{ active: qrType === 'url' }"
                @click="qrType = 'url'"
              >
                Order Link QR
              </button>
            </div>

            <div class="qr-image-wrapper">
              <img
                v-if="qrDataUrl"
                :src="qrDataUrl"
                alt="Payment QR Code"
                class="qr-image"
              />
              <div v-else class="qr-placeholder">Generating QR code...</div>
            </div>

            <p class="qr-helper-text">
              <span v-if="qrType === 'payment' && selectedCurrency === 'NIM'">
                Scan with <strong>Nimiq Pay</strong> to auto-fill recipient, Luna amount and order ID.
              </span>
              <span v-else-if="qrType === 'payment' && selectedCurrency === 'USDT'">
                Scan to open this USDT checkout in Nimiq Pay.
              </span>
              <span v-else>
                Scan with any camera or Nimiq Pay to open this checkout screen.
              </span>
            </p>
          </div>

          <!-- Share / Hash URL -->
          <div class="share-url-box">
            <div class="share-label">Order Link (#order=id):</div>
            <div class="share-input-row">
              <input
                type="text"
                readonly
                :value="orderUrl"
                class="form-input-sm mono share-input"
              />
              <button class="btn btn-outline btn-sm" @click="copyOrderUrl">
                {{ linkCopied ? '✓ Copied' : 'Copy' }}
              </button>
            </div>
          </div>
        </div>

        <!-- Right: Order Details & Payment -->
        <div class="details-column">
          <div class="order-meta-box">
            <div class="meta-row">
              <span class="meta-label">Stall:</span>
              <span class="meta-val font-semibold">{{ order.stallName }}</span>
            </div>
            <div class="meta-row">
              <span class="meta-label">Created:</span>
              <span class="meta-val">{{ formatDate(order.createdAt) }}</span>
            </div>
            <div class="meta-row">
              <span class="meta-label">Merchant NIM:</span>
              <span class="meta-val mono text-break" :title="order.merchantNimAddress">
                {{ formatAddress(order.merchantNimAddress) }}
              </span>
            </div>
            <div v-if="order.merchantUsdtAddress" class="meta-row">
              <span class="meta-label">Merchant USDT:</span>
              <span class="meta-val mono text-break" :title="order.merchantUsdtAddress">
                {{ formatAddress(order.merchantUsdtAddress) }}
              </span>
            </div>
          </div>

          <!-- Items list -->
          <div class="order-items-table">
            <div class="table-header-row">
              <span>Item</span>
              <span class="text-center">Qty</span>
              <span class="text-right">Subtotal</span>
            </div>

            <div v-for="item in order.items" :key="item.id" class="table-data-row">
              <span class="item-title">
                <span class="item-emoji">{{ item.emoji || '🏷️' }}</span>
                {{ item.name }}
              </span>
              <span class="text-center">{{ item.quantity }}</span>
              <span class="text-right font-medium">
                {{ formatNim(item.subtotalNim) }}
                <span v-if="item.subtotalUsdt" class="price-sub-tag">({{ formatUsdt(item.subtotalUsdt) }})</span>
              </span>
            </div>
          </div>

          <!-- Currency Selector if UNPAID -->
          <div v-if="order.status === 'unpaid'" class="currency-picker-section">
            <label class="form-label">Choose Payment Currency:</label>
            <div class="currency-pills">
              <button
                class="currency-pill-btn"
                :class="{ active: selectedCurrency === 'NIM' }"
                @click="selectedCurrency = 'NIM'"
              >
                <svg class="currency-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                </svg>
                <span>NIM (Nimiq)</span>
              </button>
              <button
                v-if="order.merchantUsdtAddress && order.totalUsdt > 0"
                class="currency-pill-btn"
                :class="{ active: selectedCurrency === 'USDT' }"
                @click="selectedCurrency = 'USDT'"
              >
                <svg class="currency-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <path d="M12 6v12M15 9.5a2.5 2.5 0 0 0-5 0c0 1.5 1 2.5 2.5 2.5s2.5 1 2.5 2.5a2.5 2.5 0 0 1-5 0"></path>
                </svg>
                <span>USDT (Polygon)</span>
              </button>
            </div>
          </div>

          <!-- Total display -->
          <div class="order-total-card">
            <div class="total-row">
              <span class="total-title">Total Due:</span>
              <div class="total-amounts">
                <template v-if="selectedCurrency === 'NIM'">
                  <span class="total-nim-big">{{ formatNim(order.totalNim) }}</span>
                  <span class="total-luna-sub">{{ formatLuna(order.totalNim) }}</span>
                </template>
                <template v-else>
                  <span class="total-nim-big">{{ formatUsdt(order.totalUsdt) }}</span>
                  <span class="total-luna-sub">Polygon Mainnet (6 decimals)</span>
                </template>
              </div>
            </div>
          </div>

          <!-- Paid state -->
          <div v-if="order.status === 'paid'" class="paid-success-box">
            <div class="success-header">
              <svg class="check-circle-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
              <h4>Payment Verified!</h4>
            </div>
            <p class="success-desc">
              Payment was confirmed on the {{ order.paymentCurrency === 'USDT' ? 'Polygon' : 'Nimiq' }} blockchain.
            </p>
            <div v-if="order.paymentCurrency === 'NIM'" class="onchain-status-row">
              <span v-if="verifyNimTxStatus === 'polling'" class="onchain-badge polling">
                <span class="spinner-xs"></span>
                <span>Confirming on Nimiq Network...</span>
              </span>
              <span v-else class="onchain-badge confirmed">
                <span>●</span>
                <span>Confirmed on Nimiq Blockchain</span>
              </span>
            </div>
            <div v-if="order.txHash" class="tx-hash-row">
              <span class="tx-label">Tx Hash:</span>
              <a
                :href="getExplorerUrl(order.txHash)"
                target="_blank"
                rel="noopener"
                class="tx-value mono tx-link"
                :title="order.txHash"
              >
                {{ order.txHash }} ↗
              </a>
            </div>
            <div class="success-actions">
              <button class="btn btn-primary" @click="emit('back-to-stall')">
                Back to Cashier
              </button>
              <button class="btn btn-outline" @click="emit('view-orders')">
                View All Orders
              </button>
            </div>
          </div>

          <!-- Unpaid / Pay action -->
          <div v-else class="pay-actions-box">
            <div v-if="payError" class="pay-error-banner">
              <svg class="banner-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                <line x1="12" y1="9" x2="12" y2="13"></line>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
              </svg>
              <span>{{ payError }}</span>
            </div>
            <div v-if="payStatus" class="pay-status-banner">
              {{ payStatus }}
            </div>

            <!-- Warning if not inside Nimiq Pay -->
            <div v-if="!isReady && !hasEthereumProvider()" class="pay-warning-banner">
              <svg class="banner-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              <span>Open this in Nimiq Pay Mini Apps to connect your wallet.</span>
            </div>

            <button
              class="btn btn-accent btn-block btn-lg btn-pay"
              :disabled="isPaying"
              @click="handlePay"
            >
              <span v-if="isPaying" class="spinner"></span>
              <span v-else-if="selectedCurrency === 'NIM'" class="btn-pay-content">
                <svg class="btn-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                </svg>
                <span>Pay {{ formatNim(order.totalNim) }} to Order</span>
              </span>
              <span v-else class="btn-pay-content">
                <svg class="btn-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <path d="M12 6v12M15 9.5a2.5 2.5 0 0 0-5 0c0 1.5 1 2.5 2.5 2.5s2.5 1 2.5 2.5a2.5 2.5 0 0 1-5 0"></path>
                </svg>
                <span>Pay {{ formatUsdt(order.totalUsdt) }} to Order</span>
              </span>
            </button>

            <div class="pay-guarantee-note">
              <svg class="note-lock-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
              </svg>
              <span v-if="selectedCurrency === 'NIM'">
                Value: {{ formatLuna(order.totalNim) }} • Memo: <code>{{ order.id }}</code> • Recipient: {{ formatAddress(order.merchantNimAddress) }}
              </span>
              <span v-else>
                ERC-20 Transfer to {{ formatAddress(order.merchantUsdtAddress || '') }} on Polygon
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
