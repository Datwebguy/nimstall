import type { Stall, Order } from './types';

const STORAGE_KEYS = {
  STALLS: 'nimstall_stalls',
  ORDERS: 'nimstall_orders',
  ACTIVE_STALL_ID: 'nimstall_active_stall_id',
};

export function loadStalls(): Stall[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.STALLS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    // Automatically purge legacy hardcoded demo stalls (e.g. 'Single Origin Espresso', 'Butter Croissant')
    const cleaned = parsed.filter((s: Stall) => {
      if (!s || !s.id) return false;
      if (s.id === 'stall-default-cafe' || s.id.includes('default')) return false;
      if (s.name === 'Nimiq Artisan Café') return false;
      const hasMockItems = s.items?.some(
        (it) =>
          it.name === 'Single Origin Espresso' ||
          it.name === 'Butter Croissant' ||
          it.name === 'Ceremonial Matcha Latte'
      );
      return !hasMockItems;
    });

    if (cleaned.length !== parsed.length) {
      saveStalls(cleaned);
    }
    return cleaned;
  } catch (err) {
    console.error('Failed to load stalls from localStorage:', err);
    return [];
  }
}

export function saveStalls(stalls: Stall[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.STALLS, JSON.stringify(stalls));
  } catch (err) {
    console.error('Failed to save stalls to localStorage:', err);
  }
}

export function deleteStall(stallId: string): Stall[] {
  const current = loadStalls();
  const updated = current.filter((s) => s.id !== stallId);
  saveStalls(updated);
  if (loadActiveStallId() === stallId) {
    saveActiveStallId(updated[0]?.id || '');
  }
  return updated;
}

export function clearAllStorage(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.STALLS);
    localStorage.removeItem(STORAGE_KEYS.ORDERS);
    localStorage.removeItem(STORAGE_KEYS.ACTIVE_STALL_ID);
  } catch (err) {
    console.error('Failed to clear storage:', err);
  }
}

export function loadActiveStallId(): string | null {
  try {
    const id = localStorage.getItem(STORAGE_KEYS.ACTIVE_STALL_ID);
    if (id) return id;
  } catch (err) {
    console.error('Failed to load active stall id:', err);
  }
  const stalls = loadStalls();
  return stalls[0]?.id || null;
}

export function saveActiveStallId(id: string): void {
  try {
    localStorage.setItem(STORAGE_KEYS.ACTIVE_STALL_ID, id);
  } catch (err) {
    console.error('Failed to save active stall id:', err);
  }
}

export function loadOrders(): Order[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ORDERS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('Failed to load orders from localStorage:', err);
    return [];
  }
}

export function saveOrders(orders: Order[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));
  } catch (err) {
    console.error('Failed to save orders to localStorage:', err);
  }
}

export function saveOrder(order: Order): void {
  const orders = loadOrders();
  const index = orders.findIndex((o) => o.id === order.id);
  if (index >= 0) {
    orders[index] = order;
  } else {
    orders.unshift(order);
  }
  saveOrders(orders);
}

export function getOrder(id: string): Order | undefined {
  const orders = loadOrders();
  return orders.find((o) => o.id === id);
}
