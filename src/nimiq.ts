import { init, type NimiqProvider, type ErrorResponse } from '@nimiq/mini-app-sdk';
import { ref } from 'vue';

export const isConnecting = ref(false);
export const isReady = ref(false);
export const connectedNimAccount = ref<string | null>(null);
export const connectedEvmAccount = ref<string | null>(null);
export const initError = ref<string | null>(null);
export const verifyNimTxStatus = ref<'idle' | 'polling' | 'confirmed' | 'timeout'>('idle');

// Backward-compatible alias
export const connectedAccount = connectedNimAccount;

let providerInstance: NimiqProvider | null = null;

// Official Polygon PoS USDT Contract (6 decimals)
export const POLYGON_USDT_CONTRACT = '0xc2132D05D31c914a87C6611C10748AEb04B58e8F';
export const POLYGON_CHAIN_ID_HEX = '0x89'; // 137

export function getProviderErrorMessage(value: unknown): string | null {
  if (typeof value !== 'object' || value === null || !('error' in value)) return null;
  const maybeError = (value as { error?: { message?: unknown } }).error;
  if (maybeError && typeof maybeError.message === 'string') return maybeError.message;
  return 'Provider request failed.';
}

export function getLanguage(): string {
  if (typeof window === 'undefined') return 'en';
  return (window as unknown as { nimiqPay?: { language?: string } }).nimiqPay?.language
    || navigator.language?.split('-')[0]
    || 'en';
}

function isErrorResponse(res: unknown): res is ErrorResponse {
  return typeof res === 'object' && res !== null && 'error' in res;
}

export function hasEthereumProvider(): boolean {
  return typeof window !== 'undefined' && typeof window.ethereum !== 'undefined';
}

function getEthereum() {
  if (typeof window === 'undefined' || !window.ethereum) {
    throw new Error('EVM provider not found. Please open this app inside Nimiq Pay.');
  }
  return window.ethereum;
}

export async function initNimiqProvider(): Promise<NimiqProvider | null> {
  if (providerInstance && isReady.value) {
    return providerInstance;
  }

  isConnecting.value = true;
  initError.value = null;

  try {
    const provider = await init({ timeout: 10000 });
    providerInstance = provider;
    isReady.value = true;

    // Fetch merchant NIM address from listAccounts()[0]
    const accountsResult = await provider.listAccounts();
    const accountsError = getProviderErrorMessage(accountsResult);
    if (accountsError) {
      console.warn('listAccounts error:', accountsError);
    } else if (Array.isArray(accountsResult) && accountsResult.length > 0) {
      connectedNimAccount.value = accountsResult[0];
    }

    // Check EVM account if window.ethereum is injected in Nimiq Pay
    if (hasEthereumProvider()) {
      try {
        const accounts = (await getEthereum().request({ method: 'eth_accounts' })) as string[];
        if (Array.isArray(accounts) && accounts.length > 0) {
          connectedEvmAccount.value = accounts[0];
        }
      } catch (err) {
        console.warn('Could not read existing eth_accounts:', err);
      }
    }

    return provider;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn('Nimiq Pay provider not detected or timed out:', msg);
    initError.value = 'Open this in Nimiq Pay Mini Apps';
    isReady.value = false;
    return null;
  } finally {
    isConnecting.value = false;
  }
}

export async function requestEvmAccount(): Promise<string | null> {
  try {
    const eth = getEthereum();
    const accounts = (await eth.request({
      method: 'eth_requestAccounts',
    })) as string[];

    if (Array.isArray(accounts) && accounts.length > 0) {
      connectedEvmAccount.value = accounts[0];
      return accounts[0];
    }
    return null;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to connect Polygon wallet: ${msg}`);
  }
}

/**
 * Get or instantiate Nimiq HubApi for browser wallet interactions
 */
export function getHubApi(): any {
  if (typeof window === 'undefined') return null;
  const HubApiClass = (window as any).HubApi;
  if (!HubApiClass) return null;
  try {
    return new HubApiClass('https://hub.nimiq.com');
  } catch (e) {
    console.warn('Failed to initialize HubApi:', e);
    return null;
  }
}

/**
 * Connect Nimiq Wallet via Nimiq Hub chooseAddress popup.
 * Also retrieves user's Nimiq Polygon address if enabled in their Nimiq wallet.
 */
export async function requestNimAccountFromHub(): Promise<{ nimAddress: string; polygonAddress?: string } | null> {
  const hub = getHubApi();
  if (!hub) {
    throw new Error('Nimiq Hub API is not loaded in this browser window.');
  }

  try {
    const res = await hub.chooseAddress({
      appName: 'NimStall POS',
      returnUsdcAddress: true, // returns Nimiq Wallet's Polygon address
    });
    if (res && res.address) {
      connectedNimAccount.value = res.address;
      const poly = res.usdcAddress; // On Nimiq Hub, usdcAddress is the Polygon EVM address
      if (poly) {
        connectedEvmAccount.value = poly;
      }
      return { nimAddress: res.address, polygonAddress: poly };
    }
    return null;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('canceled') || msg.includes('cancelled') || msg.includes('closed')) {
      return null;
    }
    throw new Error(`Failed to connect Nimiq wallet: ${msg}`);
  }
}

/**
 * Pay using NIM on Nimiq blockchain.
 * Uses Nimiq Pay Mini-App provider if inside Nimiq Pay,
 * otherwise falls back seamlessly to Nimiq Hub Web Wallet (hub.nimiq.com / wallet.nimiq.com).
 */
export async function sendNimPayment(params: {
  recipient: string;
  totalNim: number;
  orderId: string;
}): Promise<{ success: boolean; txHash?: string; error?: string }> {
  if (!params.recipient) {
    return { success: false, error: 'Merchant NIM address is missing.' };
  }

  // Value in Luna: 1 NIM = 100,000 Luna
  const valueInLuna = Math.round(params.totalNim * 100000);
  if (valueInLuna <= 0) {
    return { success: false, error: 'Payment amount must be greater than 0.' };
  }

  // 1. Try Nimiq Pay Mini App environment first
  let inNimiqPay = false;
  if (providerInstance && isReady.value) {
    inNimiqPay = true;
  } else {
    try {
      const p = await initNimiqProvider();
      if (p) inNimiqPay = true;
    } catch {
      inNimiqPay = false;
    }
  }

  if (inNimiqPay && providerInstance) {
    try {
      const txResult = await providerInstance.sendBasicTransactionWithData({
        recipient: params.recipient,
        value: valueInLuna,
        data: params.orderId,
      });

      if (isErrorResponse(txResult)) {
        return {
          success: false,
          error: txResult.error.message || 'Transaction rejected in wallet.',
        };
      }

      const txHash = typeof txResult === 'string'
        ? txResult
        : (txResult as { hash?: string; transactionHash?: string })?.hash
          || (txResult as { hash?: string; transactionHash?: string })?.transactionHash
          || String(txResult);

      if (!txHash || txHash === 'undefined' || txHash === '[object Object]') {
        return { success: false, error: 'No transaction hash returned from Nimiq Pay.' };
      }

      verifyNimTxHash(txHash).catch((e) => console.warn('verifyNimTxHash:', e));

      return {
        success: true,
        txHash,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        error: message || 'Transaction failed in Nimiq Pay.',
      };
    }
  }

  // 2. Standard Web Browser: Use official Nimiq Hub checkout popup (hub.nimiq.com / wallet.nimiq.com)
  const hub = getHubApi();
  if (!hub) {
    return {
      success: false,
      error: 'Nimiq Hub API is loading or not available. Please refresh or open in Nimiq Pay.',
    };
  }

  // Format recipient cleanly into standard 9x4 Nimiq address representation: "NQxx xxxx xxxx ..."
  const cleanAddr = params.recipient.replace(/\s+/g, '').toUpperCase();
  const formattedRecipient = cleanAddr.match(/.{1,4}/g)?.join(' ') || params.recipient;

  try {
    const checkoutResult = await hub.checkout({
      appName: 'NimStall POS',
      recipient: formattedRecipient,
      value: valueInLuna,
      extraData: new TextEncoder().encode(params.orderId),
    });

    const txHash = checkoutResult?.hash
      || checkoutResult?.transactionHash
      || (typeof checkoutResult?.serializedTx === 'string' ? checkoutResult.serializedTx : null);

    if (!txHash) {
      return {
        success: false,
        error: 'No transaction hash returned from Nimiq Hub.',
      };
    }

    verifyNimTxHash(txHash).catch((e) => console.warn('verifyNimTxHash:', e));

    return {
      success: true,
      txHash,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes('canceled') || message.includes('cancelled') || message.includes('closed')) {
      return {
        success: false,
        error: 'Payment was cancelled by the user.',
      };
    }
    return {
      success: false,
      error: message || 'Transaction failed in Nimiq Hub.',
    };
  }
}

/**
 * Polls Nimiq network to verify on-chain block inclusion
 */
export async function verifyNimTxHash(txHash: string): Promise<boolean> {
  verifyNimTxStatus.value = 'polling';
  const cleanHash = txHash.trim();

  for (let attempt = 1; attempt <= 10; attempt++) {
    try {
      // 1. Try public Nimiq JSON-RPC
      const rpcRes = await fetch('https://rpc.mainnet.nimiq.com', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'getTransactionByHash',
          params: [cleanHash],
          id: 1,
        }),
      });

      if (rpcRes.ok) {
        const json = await rpcRes.json();
        if (json?.result && (json.result.blockNumber || json.result.blockHeight || json.result.confirmations > 0)) {
          verifyNimTxStatus.value = 'confirmed';
          return true;
        }
      }
    } catch {
      // Continue polling
    }

    try {
      // 2. Try explorer REST fallback
      const watchRes = await fetch(`https://api.nimiq.watch/transactions/${cleanHash}`);
      if (watchRes.ok) {
        const data = await watchRes.json();
        if (data && (data.blockHeight || data.blockNumber || data.timestamp)) {
          verifyNimTxStatus.value = 'confirmed';
          return true;
        }
      }
    } catch {
      // Continue polling
    }

    await new Promise((r) => setTimeout(r, 2500));
  }

  // Set status to timeout if on-chain verification didn't complete within 25 seconds
  verifyNimTxStatus.value = 'timeout';
  return false;
}

/**
 * Switch network to Polygon PoS Mainnet (137)
 */
async function ensurePolygonNetwork(): Promise<void> {
  const eth = getEthereum();

  try {
    await eth.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: POLYGON_CHAIN_ID_HEX }],
    });
  } catch (switchErr: unknown) {
    const errObj = switchErr as { code?: number; message?: string };
    // 4902 indicates chain has not been added to the wallet
    if (errObj && errObj.code === 4902) {
      await eth.request({
        method: 'wallet_addEthereumChain',
        params: [
          {
            chainId: POLYGON_CHAIN_ID_HEX,
            chainName: 'Polygon Mainnet',
            nativeCurrency: { name: 'POL', symbol: 'POL', decimals: 18 },
            rpcUrls: ['https://polygon-rpc.com/'],
            blockExplorerUrls: ['https://polygonscan.com/'],
          },
        ],
      });
    } else {
      throw switchErr;
    }
  }
}

/**
 * Pay using USDT (ERC-20 on Polygon)
 */
export async function sendUsdtPayment(params: {
  recipient: string;
  totalUsdt: number;
  orderId: string;
}): Promise<{ success: boolean; txHash?: string; error?: string }> {
  if (!params.recipient || !params.recipient.startsWith('0x') || params.recipient.length !== 42) {
    return { success: false, error: 'Invalid merchant USDT Polygon address.' };
  }

  if (params.totalUsdt <= 0) {
    return { success: false, error: 'USDT payment amount must be greater than 0.' };
  }

  if (!hasEthereumProvider()) {
    return {
      success: false,
      error: 'USDT transfers require running inside Nimiq Pay or connecting a Polygon EVM provider. Please switch currency to NIM to pay via Nimiq Hub.',
    };
  }

  try {
    const eth = getEthereum();

    // 1. Ensure Polygon network
    await ensurePolygonNetwork();

    // 2. Request user account
    const accounts = (await eth.request({
      method: 'eth_requestAccounts',
    })) as string[];

    if (!accounts || accounts.length === 0) {
      return { success: false, error: 'No account selected in wallet.' };
    }
    const fromAddress = accounts[0];

    // 3. Encode ERC-20 transfer(address to, uint256 amount)
    // Selector: 0xa9059cbb
    const toParam = params.recipient.toLowerCase().replace(/^0x/, '').padStart(64, '0');
    // USDT has 6 decimals on Polygon
    const rawAmount = BigInt(Math.round(params.totalUsdt * 1_000_000));
    const amountParam = rawAmount.toString(16).padStart(64, '0');
    const transferData = `0xa9059cbb${toParam}${amountParam}`;

    // 4. Send transaction
    const txResult = (await eth.request({
      method: 'eth_sendTransaction',
      params: [
        {
          from: fromAddress,
          to: POLYGON_USDT_CONTRACT,
          data: transferData,
        },
      ],
    })) as string;

    if (!txResult || typeof txResult !== 'string' || !txResult.startsWith('0x')) {
      return { success: false, error: 'Wallet did not return a valid transaction hash.' };
    }

    // 5. Basic confirmation check - wait for hash verification
    const verified = await verifyEvmTxHash(txResult);
    if (!verified) {
      console.warn('Transaction hash submitted but pending confirmation on Polygon:', txResult);
    }

    return {
      success: true,
      txHash: txResult,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      error: message || 'USDT payment rejected or failed.',
    };
  }
}

async function verifyEvmTxHash(txHash: string): Promise<boolean> {
  if (!hasEthereumProvider()) return false;
  const eth = getEthereum();
  // Check that the tx exists in the node
  for (let i = 0; i < 5; i++) {
    try {
      const tx = await eth.request({
        method: 'eth_getTransactionByHash',
        params: [txHash],
      });
      if (tx) return true;
    } catch {
      // ignore
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
}

// Anti-Spam Merchant Stall Listing Fee ($0.10)
export const LISTING_FEE_USD = 0.10;
export const LISTING_FEE_USDT = 0.10;
export const LISTING_FEE_NIM = 1.5;
export const PROTOCOL_TREASURY_NIM = 'NQ04 PCLM S4AG F064 GCSH 9MG4 9Y0K TVV2 031P';
export const PROTOCOL_TREASURY_POLYGON = '0xa72932bfE5Ac54564A8e30d1d8Bea4Da1c4bdb8A';

export async function payListingFee(params: {
  currency: 'NIM' | 'USDT';
  stallName: string;
}): Promise<{ success: boolean; txHash?: string; error?: string }> {
  if (params.currency === 'NIM') {
    return sendNimPayment({
      recipient: PROTOCOL_TREASURY_NIM,
      totalNim: LISTING_FEE_NIM,
      orderId: `LIST-${params.stallName.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8)}`,
    });
  } else {
    return sendUsdtPayment({
      recipient: PROTOCOL_TREASURY_POLYGON,
      totalUsdt: LISTING_FEE_USDT,
      orderId: `LIST-${params.stallName.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8)}`,
    });
  }
}
