<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import type { Stall, StallItem } from '../types';
import {
  connectedNimAccount,
  connectedEvmAccount,
  requestEvmAccount,
  hasEthereumProvider,
} from '../nimiq';
import { formatNim, formatLuna, formatUsdt, compressProductImage } from '../utils';

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

// Add item form state
const newItemName = ref('');
const newItemPriceNim = ref<number | ''>('');
const newItemPriceUsdt = ref<number | ''>('');
const newItemImage = ref('');
const newItemDesc = ref('');
const showAddItem = ref(false);
const itemImageFileInput = ref<HTMLInputElement | null>(null);

async function handleProductImageUpload(e: Event) {
  const target = e.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;
  try {
    const compressed = await compressProductImage(file, 240, 0.82);
    newItemImage.value = compressed;
  } catch (err) {
    alert('Failed to process image file');
  }
}

function triggerProductImageUpload() {
  itemImageFileInput.value?.click();
}

function removeProductImage() {
  newItemImage.value = '';
  if (itemImageFileInput.value) itemImageFileInput.value.value = '';
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
    image: newItemImage.value || undefined,
    description: newItemDesc.value.trim(),
  };

  formItems.value.push(newItem);
  newItemName.value = '';
  newItemPriceNim.value = '';
  newItemPriceUsdt.value = '';
  newItemImage.value = '';
  newItemDesc.value = '';
  showAddItem.value = false;
}

function removeItem(index: number) {
  formItems.value.splice(index, 1);
}

// Inline edit state
const editingItemId = ref<string | null>(null);
const editForm = ref({ name: '', priceNim: 0 as number | '', priceUsdt: '' as number | '', image: '', description: '' });
const editItemImageFileInput = ref<HTMLInputElement | null>(null);

function startEditItem(item: StallItem) {
  editingItemId.value = item.id;
  editForm.value = {
    name: item.name,
    priceNim: item.priceNim,
    priceUsdt: item.priceUsdt ?? '',
    image: item.image || '',
    description: item.description || '',
  };
}

async function handleEditProductImageUpload(e: Event) {
  const target = e.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;
  try {
    const compressed = await compressProductImage(file, 240, 0.82);
    editForm.value.image = compressed;
  } catch (err) {
    alert('Failed to process image file');
  }
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
    image: editForm.value.image || undefined,
    description: editForm.value.description.trim(),
  };
  editingItemId.value = null;
}

// Catalog Backup & Restore
const catalogFileInput = ref<HTMLInputElement | null>(null);

function triggerCatalogImport() {
  catalogFileInput.value?.click();
}

function exportCatalogJson() {
  if (formItems.value.length === 0) {
    alert('No products in catalog to export.');
    return;
  }

  const exportData = {
    stallName: formName.value.trim() || 'Stall',
    exportedAt: new Date().toISOString(),
    version: 1,
    items: formItems.value,
  };

  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const safeName = (formName.value || 'stall').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  a.href = url;
  a.download = `${safeName || 'stall'}-catalog-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

async function handleImportCatalogFile(e: Event) {
  const target = e.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;

  try {
    const text = await file.text();
    const parsed = JSON.parse(text);
    let itemsToImport: any[] = [];

    if (Array.isArray(parsed)) {
      itemsToImport = parsed;
    } else if (parsed && Array.isArray(parsed.items)) {
      itemsToImport = parsed.items;
    } else {
      throw new Error('Expected a JSON file with an array of products or an object with an "items" array.');
    }

    const validItems: StallItem[] = [];
    for (const raw of itemsToImport) {
      if (raw && typeof raw === 'object' && raw.name && typeof raw.name === 'string') {
        const priceNim = Number(raw.priceNim);
        if (!isNaN(priceNim) && priceNim > 0) {
          validItems.push({
            id: 'item-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
            name: raw.name.trim(),
            priceNim: priceNim,
            priceUsdt: raw.priceUsdt && Number(raw.priceUsdt) > 0 ? Number(raw.priceUsdt) : undefined,
            image: raw.image || undefined,
            description: raw.description ? String(raw.description).trim() : '',
          });
        }
      }
    }

    if (validItems.length === 0) {
      alert('No valid products found in the file. Each item must have a name and price in NIM.');
      return;
    }

    if (formItems.value.length > 0) {
      const replace = confirm(
        `Found ${validItems.length} valid product(s).\n\nClick OK to REPLACE your current products list, or CANCEL to APPEND them to your existing catalog.`
      );
      if (replace) {
        formItems.value = validItems;
      } else {
        formItems.value.push(...validItems);
      }
    } else {
      formItems.value = validItems;
    }

    alert(`Successfully loaded ${validItems.length} product(s) into your catalog! Remember to save or publish your stall.`);
  } catch (err) {
    alert('Import failed: ' + (err instanceof Error ? err.message : String(err)));
  } finally {
    target.value = '';
  }
}

// Save current stall
const saveSuccess = ref(false);

function handleSaveDirectly(): boolean {
  if (!formName.value.trim()) {
    alert('Please enter a stall name');
    return false;
  }
  if (!formNimAddress.value.trim() && !connectedNimAccount.value) {
    alert('Please enter your NIM payout address (NQ...) so payments have a destination.');
    return false;
  }

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
    activatedAt: currentStall.value?.activatedAt || Date.now(),
  };

  emit('save-stall', updatedStall);
  saveSuccess.value = true;
  setTimeout(() => {
    saveSuccess.value = false;
  }, 2500);
  return true;
}

function handleSaveAndGoSell() {
  if (handleSaveDirectly()) {
    emit('go-sell');
  }
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
          <h2 class="section-title">Stall Setup</h2>
          <p class="section-subtitle">Configure merchant payout and product catalog</p>
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
        <label class="form-label" for="stallDesc">Tagline / Description</label>
        <input
          id="stallDesc"
          v-model="formDesc"
          type="text"
          class="form-input"
          placeholder="e.g. Specialty coffee & pastries with NIM & USDT"
        />
      </div>

      <!-- Merchant NIM Address -->
      <div class="form-group">
        <div class="label-with-action">
          <label class="form-label" for="merchantNimAddr">NIM Payout Address *</label>
          <div class="label-actions-row">
            <span v-if="connectedNimAccount" class="status-badge-live">● Connected</span>
            <a
              href="https://wallet.nimiq.com"
              target="_blank"
              rel="noopener noreferrer"
              class="text-action-link"
              title="Open or create account at wallet.nimiq.com"
            >
              Get Nimiq Wallet ↗
            </a>
          </div>
        </div>
        <input
          id="merchantNimAddr"
          v-model="formNimAddress"
          type="text"
          class="form-input mono"
          placeholder="NQ... (e.g. NQ12 ABCD 34EF ...)"
        />
        <p class="input-hint">
          Paste your Nimiq address from wallet.nimiq.com or Nimiq Pay. Payments settle directly here.
        </p>
      </div>

      <!-- Merchant USDT Address -->
      <div class="form-group">
        <div class="label-with-action">
          <label class="form-label" for="merchantUsdtAddr">USDT Payout Address (Polygon, Optional)</label>
          <button
            v-if="hasEthereumProvider() && !formUsdtAddress"
            type="button"
            class="text-action-btn"
            @click="connectPolygonWallet"
          >
            Connect Polygon
          </button>
        </div>
        <input
          id="merchantUsdtAddr"
          v-model="formUsdtAddress"
          type="text"
          class="form-input mono"
          placeholder="0x... (Optional Polygon USDT address)"
        />
        <p class="input-hint">
          Optional recipient address for Polygon USDT payments.
        </p>
      </div>

      <!-- Items Section -->
      <div class="items-section">
        <div class="items-header">
          <div>
            <h3 class="subsection-title">Products ({{ formItems.length }})</h3>
          </div>
          <div class="items-header-actions">
            <input
              ref="catalogFileInput"
              type="file"
              accept=".json,application/json"
              style="display: none"
              @change="handleImportCatalogFile"
            />
            <button
              v-if="formItems.length > 0"
              class="btn btn-outline btn-xs"
              type="button"
              title="Export product catalog as JSON backup"
              @click="exportCatalogJson"
            >
              <svg class="btn-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
              <span>Export</span>
            </button>
            <button
              class="btn btn-outline btn-xs"
              type="button"
              title="Import products from JSON backup"
              @click="triggerCatalogImport"
            >
              <svg class="btn-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="17 8 12 3 7 8"></polyline>
                <line x1="12" y1="3" x2="12" y2="15"></line>
              </svg>
              <span>Import</span>
            </button>
            <button
              v-if="!showAddItem"
              class="btn btn-secondary btn-sm"
              type="button"
              @click="showAddItem = true"
            >
              + Add Product
            </button>
          </div>
        </div>

        <!-- Add Item Inline Form -->
        <div v-if="showAddItem" class="add-item-box">
          <h4 class="box-title">New Product</h4>
          <div class="add-item-grid">
            <div class="form-group">
              <label class="form-label">Product Image (Optional)</label>
              <input
                ref="itemImageFileInput"
                type="file"
                accept="image/*"
                style="display: none"
                @change="handleProductImageUpload"
              />
              <div class="image-upload-wrapper">
                <div v-if="newItemImage" class="image-preview-box">
                  <img :src="newItemImage" alt="Preview" class="uploaded-thumb-img" />
                  <button type="button" class="btn-remove-thumb" title="Remove image" @click="removeProductImage">✕</button>
                </div>
                <button
                  v-else
                  type="button"
                  class="btn btn-outline btn-sm upload-box-btn"
                  @click="triggerProductImageUpload"
                >
                  <svg class="btn-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                    <circle cx="8.5" cy="8.5" r="1.5"></circle>
                    <polyline points="21 15 16 10 5 21"></polyline>
                  </svg>
                  <span>Upload Image</span>
                </button>
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
          <p>No products added yet. Tap <strong>+ Add Product</strong> above.</p>
        </div>

        <div v-else class="items-list">
          <template v-for="(item, idx) in formItems" :key="item.id">
            <!-- Inline Edit Mode -->
            <div v-if="editingItemId === item.id" class="item-row item-row-edit">
              <div class="edit-image-col">
                <input
                  ref="editItemImageFileInput"
                  type="file"
                  accept="image/*"
                  style="display: none"
                  @change="handleEditProductImageUpload"
                />
                <div v-if="editForm.image" class="edit-thumb-wrapper" @click="editItemImageFileInput?.click()">
                  <img :src="editForm.image" alt="Thumb" class="row-thumb-img" />
                  <span class="thumb-change-hint">Change</span>
                </div>
                <button
                  v-else
                  type="button"
                  class="btn btn-outline btn-xs"
                  @click="editItemImageFileInput?.click()"
                >
                  + Photo
                </button>
              </div>

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
              <div class="item-media-thumb">
                <img v-if="item.image" :src="item.image" alt="Product" class="row-thumb-img" />
                <div v-else class="item-thumb-placeholder">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                    <circle cx="8.5" cy="8.5" r="1.5"></circle>
                    <polyline points="21 15 16 10 5 21"></polyline>
                  </svg>
                </div>
              </div>
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
        </div>
        <div class="action-buttons">
          <button
            class="btn btn-primary"
            type="button"
            @click="handleSaveDirectly"
          >
            <svg class="btn-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
              <polyline points="17 21 17 13 7 13 7 21"></polyline>
              <polyline points="7 3 7 8 15 8"></polyline>
            </svg>
            <span>Save Stall</span>
          </button>

          <button
            v-if="formItems.length > 0"
            class="btn btn-accent"
            type="button"
            @click="handleSaveAndGoSell"
          >
            Go to Cashier ➔
          </button>
        </div>
      </div>

      <div class="stall-reset-subtle">
        <button class="btn-text-muted btn-xs" type="button" @click="handleResetAllData">
          Reset local demo data
        </button>
      </div>
    </div>
  </div>
</template>
