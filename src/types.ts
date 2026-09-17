export interface StallItem {
  id: string;
  name: string;
  priceNim: number;
  priceUsdt?: number;
  description?: string;
  emoji?: string;
  category?: string;
}

export interface Stall {
  id: string;
  name: string;
  description: string;
  merchantNimAddress: string;
  merchantUsdtAddress?: string;
  createdAt: number;
  items: StallItem[];
  isActivated?: boolean;
  activationTxHash?: string;
  activatedAt?: number;
}

export interface CartItem {
  item: StallItem;
  quantity: number;
}

export interface OrderItem {
  id: string;
  name: string;
  priceNim: number;
  priceUsdt: number;
  quantity: number;
  subtotalNim: number;
  subtotalUsdt: number;
  emoji?: string;
}

export interface Order {
  id: string;
  stallId: string;
  stallName: string;
  merchantNimAddress: string;
  merchantUsdtAddress?: string;
  items: OrderItem[];
  totalNim: number;
  totalLuna: number; // totalNim * 100000
  totalUsdt: number;
  status: 'unpaid' | 'paid' | 'cancelled';
  paymentCurrency?: 'NIM' | 'USDT';
  createdAt: number;
  paidAt?: number;
  txHash?: string;
}

export type ScreenType = 'landing' | 'sell' | 'create' | 'orders' | 'checkout' | 'not-found';

declare global {
  interface Window {
    ethereum?: {
      isMetaMask?: boolean;
      request: (args: { method: string; params?: unknown[] | object }) => Promise<unknown>;
      on?: (event: string, handler: (...args: unknown[]) => void) => void;
      removeListener?: (event: string, handler: (...args: unknown[]) => void) => void;
    };
    nimiqPay?: {
      language?: string;
    };
  }
}

