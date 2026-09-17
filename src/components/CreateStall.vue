<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import type { Stall, StallItem } from '../types';
import {
  connectedNimAccount,
  connectedEvmAccount,
  requestEvmAccount,
  hasEthereumProvider,
  initNimiqProvider,
  payListingFee,
} from '../nimiq';
import { formatNim, formatLuna, formatUsdt } from '../utils';

const props = defineProps<{
  stalls: Stall[];
  activeStallId: string | null;
}>();

const emit = defineEmits<{
  (e: 'save-stall', stall: Stall): void;
  (e: 'create-stall', stall: Stall): void;
  (e: 'delete-stall', stallId: string): void;
  (e: 'reset-all'): void;
  (e: 'select-stall', stallId: string): void;
  (e: 'go-sell'): void;
}>();

const selectedStallId = ref<string | null>(props.activeStallId);

const currentStall = computed<Stall | null>(() => {
  if (selectedStallId.value) {
    const found = props.stalls.find((s) => s.id === selectedStallId.value);
    if (found) return found;
  }
  return props.stalls[0] || null;
});

// Form state
const formName = ref('');
const formDesc = ref('');
const formNimAddress = ref('');
const formUsdtAddress = ref('');
const formItems = ref<StallItem[]>([]);

function syncFormWithStall(stall: Stall | null) {
  if (stall) {
    formName.value = stall.name;
    formDesc.value = stall.description;
    formNimAddress.value = stall.merchantNimAddress || connectedNimAccount.value || '';
    formUsdtAddress.value = stall.merchantUsdtAddress || connectedEvmAccount.value || '';
    formItems.value = JSON.parse(JSON.stringify(stall.items || []));
  } else {
    formName.value = '';
    formDesc.value = '';
    formNimAddress.value = connectedNimAccount.value || '';
    formUsdtAddress.value = connectedEvmAccount.value || '';
    formItems.value = [];
  }
}

onMounted(() => {
  syncFormWithStall(currentStall.value);
});

watch(currentStall, (newStall) => {
  syncFormWithStall(newStall);
});

watch(connectedNimAccount, (newAcc) => {
  if (newAcc && !formNimAddress.value) {
    formNimAddress.value = newAcc;
  }
});

watch(connectedEvmAccount, (newAcc) => {
  if (newAcc && !formUsdtAddress.value) {
    formUsdtAddress.value = newAcc;
  }
});

function handleSelectStall(id: string) {
  selectedStallId.value = id;
  const stall = props.stalls.find((s) => s.id === id) || null;
  syncFormWithStall(stall);
}

async function connectPolygonWallet() {
  try {
    const acc = await requestEvmAccount();
    if (acc) {
      formUsdtAddress.value = acc;
    }
  } catch (err) {
    alert(err instanceof Error ? err.message : String(err));
  }
}

// Add Item form state
const newItemName = ref('');
const newItemPriceNim = ref<number | ''>('');
const newItemPriceUsdt = ref<number | ''>('');
const newItemEmoji = ref('🏷️');
const newItemDesc = ref('');
const showAddItem = ref(false);

const quickEmojis = ['☕', '🥐', '🍵', '🥤', '🥪', '🍕', '🍰', '👕', '🎁', '🎟️', '⚡', '🏷️'];

function selectQuickEmoji(e: string) {
  newItemEmoji.value = e;
}

function addItem() {
  if (!newItemName.value.trim() || !newItemPriceNim.value || newItemPriceNim.value <= 0) {
    alert('Please enter an item name and price in NIM');
    return;
  }

  const newItem: StallItem = {
    id: 'item-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
    name: newItemName.value.trim(),
    priceNim: Number(newItemPriceNim.value),
    priceUsdt: newItemPriceUsdt.value && Number(newItemPriceUsdt.value) > 0 ? Number(newItemPriceUsdt.value) : undefined,
    emoji: newItemEmoji.value || '🏷️',
    description: newItemDesc.value.trim(),
  };

  formItems.value.push(newItem);
  newItemName.value = '';
  newItemPriceNim.value = '';
  newItemPriceUsdt.value = '';
  newItemDesc.value = '';
  showAddItem.value = false;
}

function removeItem(index: number) {
  formItems.value.splice(index, 1);
}

// Inline edit state
const editingItemId = ref<string | null>(null);
const editForm = ref({ name: '', priceNim: 0 as number | '', priceUsdt: '' as number | '', emoji: '', description: '' });

function startEditItem(item: StallItem) {
  editingItemId.value = item.id;
  editForm.value = {
    name: item.name,
    priceNim: item.priceNim,
    priceUsdt: item.priceUsdt ?? '',
    emoji: item.emoji || '🏷️',
    description: item.description || '',
  };
}

function cancelEdit() {
  editingItemId.value = null;
}

function saveItemEdit(item: StallItem) {
  if (!editForm.value.name.trim()) {
    alert('Item name cannot be empty');
    return;
  }
  if (!editForm.value.priceNim || Number(editForm.value.priceNim) <= 0) {
    alert('NIM price must be greater than 0');
    return;
  }
  const idx = formItems.value.findIndex((i) => i.id === item.id);
  if (idx === -1) return;
  formItems.value[idx] = {
    ...formItems.value[idx],
    name: editForm.value.name.trim(),
    priceNim: Number(editForm.value.priceNim),
    priceUsdt: editForm.value.priceUsdt !== '' && Number(editForm.value.priceUsdt) > 0 ? Number(editForm.value.priceUsdt) : undefined,
    emoji: editForm.value.emoji || '🏷️',
    description: editForm.value.description.trim(),
  };
  editingItemId.value = null;
}

// Save current stall
const saveSuccess = ref(false);
const showListingModal = ref(false);
const listingCurrency = ref<'NIM' | 'USDT'>('NIM');
const isPayingListing = ref(false);
const listingError = ref<string | null>(null);

async function handleInitiatePublish() {
  if (!formName.value.trim()) {
    alert('Please provide a stall name');
    return;
  }
  if (formItems.value.length === 0) {
    alert('Please add at least one product before publishing');
    return;
  }

  // Connect wallet on-demand if not already connected
  if (!connectedNimAccount.value) {
    const provider = await initNimiqProvider();
    if (!provider || !connectedNimAccount.value) {
      alert('Please open inside Nimiq Pay to connect your wallet for listing.');
      return;
    }
    formNimAddress.value = connectedNimAccount.value;
  }

  // If already activated, just save updates directly
  if (currentStall.value?.isActivated) {
    handleSaveDirectly();
    return;
  }

  // Open $0.10 listing approval modal
  listingError.value = null;
  showListingModal.value = true;
}

async function handleConfirmListingFee() {
  isPayingListing.value = true;
  listingError.value = null;

  try {
    const res = await payListingFee({
      currency: listingCurrency.value,
      stallName: formName.value.trim(),
    });

    if (!res.success) {
      listingError.value = res.error || 'Failed to submit listing fee.';
      return;
    }

    // Save with activation
    const stallId = currentStall.value?.id || 'stall-' + Date.now();
    const updatedStall: Stall = {
      id: stallId,
      name: formName.value.trim(),
      description: formDesc.value.trim(),
      merchantNimAddress: formNimAddress.value.trim() || connectedNimAccount.value || '',
      merchantUsdtAddress: formUsdtAddress.value.trim() || undefined,
      createdAt: currentStall.value?.createdAt || Date.now(),
      items: formItems.value,
      isActivated: true,
      activationTxHash: res.txHash,
      activatedAt: Date.now(),
    };

    emit('save-stall', updatedStall);
    showListingModal.value = false;
    saveSuccess.value = true;
    setTimeout(() => {
      saveSuccess.value = false;
    }, 3000);
  } catch (err) {
    listingError.value = err instanceof Error ? err.message : String(err);
  } finally {
    isPayingListing.value = false;
  }
}

function handleSaveDirectly() {
  const stallId = currentStall.value?.id || 'stall-' + Date.now();
  const updatedStall: Stall = {
    id: stallId,
    name: formName.value.trim(),
    description: formDesc.value.trim(),
    merchantNimAddress: formNimAddress.value.trim() || connectedNimAccount.value || '',
    merchantUsdtAddress: formUsdtAddress.value.trim() || undefined,
    createdAt: currentStall.value?.createdAt || Date.now(),
    items: formItems.value,
    isActivated: currentStall.value?.isActivated,
    activationTxHash: currentStall.value?.activationTxHash,
    activatedAt: currentStall.value?.activatedAt,
  };

  emit('save-stall', updatedStall);
  saveSuccess.value = true;
  setTimeout(() => {
    saveSuccess.value = false;
  }, 2500);
}

function createNewStall() {
  const newStall: Stall = {
    id: 'stall-' + Date.now(),
    name: '',
    description: '',
    merchantNimAddress: connectedNimAccount.value || '',
    merchantUsdtAddress: connectedEvmAccount.value || undefined,
    createdAt: Date.now(),
    items: [],
  };

  emit('create-stall', newStall);
  selectedStallId.value = newStall.id;
  syncFormWithStall(newStall);
}

function handleDeleteCurrentStall() {
  if (!currentStall.value) return;
  if (confirm(`Delete stall "${currentStall.value.name || 'Untitled'}"?`)) {
    emit('delete-stall', currentStall.value.id);
  }
}

function handleResetAllData() {
  if (confirm('Are you sure? This will delete all stalls, products, and order history from localStorage.')) {
    emit('reset-all');
  }
}
</script>

<template>
  <div class="screen-container">
    <div class="card stall-editor-card">
      <div class="card-header-row">
        <div>
          <h2 class="section-title">Stall Management</h2>
          <p class="section-subtitle">Configure your merchant profile, accepted currencies, and catalog</p>
        </div>
        <div class="header-actions-group">
          <button
            v-if="currentStall"
            class="btn btn-outline-danger btn-sm"
            type="button"
            title="Delete this stall"
            @click="handleDeleteCurrentStall"
          >
            <svg class="btn-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
            <span>Delete Stall</span>
          </button>
          <button class="btn btn-outline btn-sm" @click="createNewStall">
            + New Stall
          </button>
        </div>
      </div>

      <!-- Stall Switcher if multiple stalls -->
      <div v-if="stalls.length > 1" class="form-group">
        <label class="form-label">Select Stall</label>
        <div class="stall-pills">
          <button
            v-for="s in stalls"
            :key="s.id"
            class="pill-btn"
            :class="{ active: s.id === selectedStallId }"
            @click="handleSelectStall(s.id)"
          >
            {{ s.name || 'Untitled Stall' }}
          </button>
        </div>
      </div>

      <!-- Basic Info -->
      <div class="form-group">
        <label class="form-label" for="stallName">Stall Name *</label>
        <input
          id="stallName"
          v-model="formName"
          type="text"
          class="form-input"
          placeholder="e.g. Beachfront Coffee"
        />
      </div>

      <div class="form-group">
        <label class="form-label" for="stallDesc">Description / Tagline</label>
        <input
          id="stallDesc"
          v-model="formDesc"
          type="text"
          class="form-input"
          placeholder="e.g. Specialty coffee and snacks accepted with NIM & USDT"
        />
      </div>

      <!-- Merchant NIM Address (Runtime from listAccounts()[0]) -->
      <div class="form-group">
        <div class="label-with-action">
          <label class="form-label" for="merchantNimAddr">Merchant NIM Payout Address *</label>
          <span v-if="connectedNimAccount" class="status-badge-live">● Live from Nimiq Pay</span>
        </div>
        <input
          id="merchantNimAddr"
          v-model="formNimAddress"
          type="text"
          class="form-input mono"
          placeholder="Will be auto-detected from Nimiq Pay listAccounts()[0]"
        />
        <p v-if="!connectedNimAccount" class="input-warning">
          <svg class="hint-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
            <line x1="12" y1="9" x2="12" y2="13"></line>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg>
          <span>Open this in Nimiq Pay to automatically load your merchant address from <code>listAccounts()[0]</code>.</span>
        </p>
        <p v-else class="input-hint">
          NIM payments will be routed directly to this recipient on Nimiq.
        </p>
      </div>

      <!-- Merchant USDT Address (Runtime from eth_requestAccounts()[0]) -->
      <div class="form-group">
        <div class="label-with-action">
          <label class="form-label" for="merchantUsdtAddr">Merchant USDT Address (Polygon PoS, Optional)</label>
          <button
            v-if="hasEthereumProvider() && !formUsdtAddress"
            type="button"
            class="text-action-btn"
            @click="connectPolygonWallet"
          >
            Connect Polygon Address
          </button>
        </div>
        <input
          id="merchantUsdtAddr"
          v-model="formUsdtAddress"
          type="text"
          class="form-input mono"
          placeholder="0x... (from Nimiq Pay EVM provider)"
        />
        <p class="input-hint">
          If provided, buyers can choose between paying in NIM or USDT on Polygon.
        </p>
      </div>

      <!-- Items Section -->
      <div class="items-section">
        <div class="items-header">
          <div>
            <h3 class="subsection-title">Products & Menu ({{ formItems.length }})</h3>
            <p class="section-subtitle">Real items you want to sell with NIM and USDT prices</p>
          </div>
          <button
            v-if="!showAddItem"
            class="btn btn-secondary btn-sm"
            @click="showAddItem = true"
          >
            + Add Product
          </button>
        </div>

        <!-- Add Item Inline Form -->
        <div v-if="showAddItem" class="add-item-box">
          <h4 class="box-title">New Product</h4>
          <div class="add-item-grid">
            <div class="form-group">
              <label class="form-label">Emoji Icon</label>
              <div class="emoji-selector">
                <input
                  v-model="newItemEmoji"
                  type="text"
                  class="form-input emoji-input"
                  maxlength="4"
                />
                <div class="quick-emojis">
                  <span
                    v-for="em in quickEmojis"
                    :key="em"
                    class="emoji-choice"
                    @click="selectQuickEmoji(em)"
                  >{{ em }}</span>
                </div>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Product Name *</label>
              <input
                v-model="newItemName"
                type="text"
                class="form-input"
                placeholder="e.g. Cold Brew Coffee"
              />
            </div>

            <div class="form-group">
              <label class="form-label">Price in NIM *</label>
              <input
                v-model.number="newItemPriceNim"
                type="number"
                step="any"
                min="0.0001"
                class="form-input"
                placeholder="25"
              />
              <span v-if="newItemPriceNim && Number(newItemPriceNim) > 0" class="input-hint">
                = {{ formatLuna(Number(newItemPriceNim)) }}
              </span>
            </div>

            <div class="form-group">
              <label class="form-label">Price in USDT (Optional)</label>
              <input
                v-model.number="newItemPriceUsdt"
                type="number"
                step="any"
                min="0.01"
                class="form-input"
                placeholder="1.50"
              />
            </div>

            <div class="form-group full-width">
              <label class="form-label">Description (Optional)</label>
              <input
                v-model="newItemDesc"
                type="text"
                class="form-input"
                placeholder="e.g. 18-hour cold brew draft"
              />
            </div>
          </div>

          <div class="box-actions">
            <button class="btn btn-outline btn-sm" @click="showAddItem = false">
              Cancel
            </button>
            <button class="btn btn-primary btn-sm" @click="addItem">
              Add to Menu
            </button>
          </div>
        </div>

        <!-- Items List -->
        <div v-if="formItems.length === 0" class="empty-items-state">
          <p>No products added yet. Click <strong>+ Add Product</strong> above to build your menu.</p>
        </div>

        <div v-else class="items-list">
          <template v-for="(item, idx) in formItems" :key="item.id">
            <!-- Inline Edit Mode -->
            <div v-if="editingItemId === item.id" class="item-row item-row-edit">
              <input
                v-model="editForm.emoji"
                type="text"
                class="form-input emoji-edit-input"
                maxlength="4"
                title="Emoji Icon"
              />
              <div class="edit-inputs-col">
                <input
                  v-model="editForm.name"
                  type="text"
                  class="form-input form-input-sm"
                  placeholder="Product Name"
                />
                <div class="edit-price-inputs">
                  <div class="input-with-tag">
                    <span class="currency-tag">NIM</span>
                    <input
                      v-model.number="editForm.priceNim"
                      type="number"
                      step="any"
                      min="0.0001"
                      class="form-input form-input-sm"
                      placeholder="NIM"
                    />
                  </div>
                  <div class="input-with-tag">
                    <span class="currency-tag">USDT</span>
                    <input
                      v-model.number="editForm.priceUsdt"
                      type="number"
                      step="any"
                      min="0.01"
                      class="form-input form-input-sm"
                      placeholder="USDT"
                    />
                  </div>
                </div>
              </div>
              <div class="item-edit-actions">
                <button
                  class="item-icon-btn save"
                  type="button"
                  title="Save item"
                  @click="saveItemEdit(item)"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                </button>
                <button
                  class="item-icon-btn cancel"
                  type="button"
                  title="Cancel edit"
                  @click="cancelEdit"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>
            </div>

            <!-- Normal Row Mode -->
            <div v-else class="item-row">
              <div class="item-emoji">{{ item.emoji || '🏷️' }}</div>
              <div class="item-details">
                <div class="item-name">{{ item.name }}</div>
                <div v-if="item.description" class="item-desc">{{ item.description }}</div>
              </div>
              <div class="item-pricing">
                <div class="price-nim">{{ formatNim(item.priceNim) }}</div>
                <div v-if="item.priceUsdt" class="price-usdt">{{ formatUsdt(item.priceUsdt) }}</div>
              </div>
              <div class="item-row-actions">
                <button
                  class="item-icon-btn edit"
                  type="button"
                  title="Edit product"
                  @click="startEditItem(item)"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                  </svg>
                </button>
                <button
                  class="btn-icon-danger"
                  type="button"
                  title="Delete product"
                  @click="removeItem(idx)"
                >
                  ✕
                </button>
              </div>
            </div>
          </template>
        </div>
      </div>

      <!-- Action Footer -->
      <div class="stall-footer-actions">
        <div class="save-status">
          <span v-if="saveSuccess" class="success-tag">
            <svg class="tag-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            <span>Stall Saved</span>
          </span>
          <button class="btn-ghost-danger btn-sm" type="button" @click="handleResetAllData">
            <svg class="btn-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"></path>
              <path d="M21 3v5h-5"></path>
              <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"></path>
              <path d="M3 21v-5h5"></path>
            </svg>
            <span>Wipe All Stalls & Orders</span>
          </button>
        </div>
        <div class="action-buttons">
          <button
            v-if="currentStall?.isActivated"
            class="btn btn-outline"
            type="button"
            @click="handleSaveDirectly"
          >
            Save Updates
          </button>
          <button
            v-else
            class="btn btn-primary btn-publish-stall"
            type="button"
            @click="handleInitiatePublish"
          >
            <svg class="btn-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
            </svg>
            <span>{{ connectedNimAccount ? 'Approve & List Stall ($0.10) ➔' : 'Connect Account & List ($0.10) ➔' }}</span>
          </button>

          <button
            v-if="formItems.length > 0"
            class="btn btn-accent"
            type="button"
            @click="emit('go-sell')"
          >
            Go to Cashier / Sell ➔
          </button>
        </div>
      </div>
    </div>

    <!-- $0.10 Anti-Spam Stall Listing Approval Modal -->
    <div v-if="showListingModal" class="modal-overlay" @click.self="showListingModal = false">
      <div class="modal-card listing-fee-modal">
        <div class="modal-header">
          <div class="modal-badge">
            <svg class="btn-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
            </svg>
            <span>Anti-Spam Verification</span>
          </div>
          <button class="modal-close-btn" type="button" @click="showListingModal = false">✕</button>
        </div>

        <h3 class="modal-title">Approve & Publish Stall</h3>
        <p class="modal-subtitle">
          To prevent spam stalls and activate your on-chain merchant checkout, a one-time protocol listing fee of <strong>$0.10</strong> is required.
        </p>

        <div class="listing-fee-breakdown">
          <div class="fee-row">
            <span>Listing Fee</span>
            <span class="fee-amount">$0.10 USD</span>
          </div>
          <div class="fee-row sub">
            <span>Estimated Gas</span>
            <span>&lt; $0.001</span>
          </div>
        </div>

        <div class="currency-picker-block">
          <label class="form-label">Pay with token in your wallet:</label>
          <div class="currency-pills">
            <button
              type="button"
              class="currency-pill-btn"
              :class="{ active: listingCurrency === 'NIM' }"
              @click="listingCurrency = 'NIM'"
            >
              <svg class="currency-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
              </svg>
              <span>1.5 NIM (~$0.10)</span>
            </button>

            <button
              type="button"
              class="currency-pill-btn"
              :class="{ active: listingCurrency === 'USDT' }"
              @click="listingCurrency = 'USDT'"
            >
              <svg class="currency-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <path d="M12 6v12M15 9.5a2.5 2.5 0 0 0-5 0c0 1.5 1 2.5 2.5 2.5s2.5 1 2.5 2.5a2.5 2.5 0 0 1-5 0"></path>
              </svg>
              <span>0.10 USDT (Polygon)</span>
            </button>
          </div>
        </div>

        <div v-if="listingError" class="modal-error-banner">
          {{ listingError }}
        </div>

        <div class="modal-actions">
          <button class="btn btn-outline" type="button" :disabled="isPayingListing" @click="showListingModal = false">
            Cancel
          </button>
          <button class="btn btn-primary" type="button" :disabled="isPayingListing" @click="handleConfirmListingFee">
            <span v-if="isPayingListing" class="spinner-sm"></span>
            <span v-else>Pay $0.10 to List Stall ➔</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
