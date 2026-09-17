export function formatNim(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 4,
  }).format(amount) + ' NIM';
}

export function formatLuna(nim: number): string {
  const luna = Math.round(nim * 100000);
  return new Intl.NumberFormat('en-US').format(luna) + ' Luna';
}

export function formatUsdt(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount) + ' USDT';
}

export function formatAddress(address: string): string {
  if (!address) return '';
  if (address.startsWith('0x')) {
    return address.slice(0, 6) + '...' + address.slice(-4);
  }
  const clean = address.replace(/\s+/g, '').toUpperCase();
  const parts = clean.match(/.{1,4}/g);
  return parts ? parts.join(' ') : address;
}

export function generateOrderId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let rand = '';
  for (let i = 0; i < 6; i++) {
    rand += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `ORD-${rand}`;
}

export function formatDate(timestamp: number): string {
  const d = new Date(timestamp);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ', ' + d.toLocaleDateString();
}
