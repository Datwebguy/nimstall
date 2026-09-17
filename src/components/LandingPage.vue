<script setup lang="ts">
import { ref } from 'vue';

const emit = defineEmits<{
  (e: 'open-stall'): void;
  (e: 'go-create'): void;
}>();

// FAQ accordion state
const openFaq = ref<number | null>(0);

function toggleFaq(index: number) {
  openFaq.value = openFaq.value === index ? null : index;
}

const faqs = [
  {
    q: 'Do I need to create an account or pay platform fees?',
    a: 'No accounts, no email logins, and absolutely 0% platform fees. NimStall is 100% peer-to-peer and client-side. Your Nimiq Pay wallet is your merchant account, and all payments go directly into your wallet on-chain.',
  },
  {
    q: 'How does payment verification work?',
    a: 'When an order is created, an order ID is embedded in the transaction memo/data. When the buyer signs in Nimiq Pay, the transaction hash is verified directly against the Nimiq network and Polygon node to confirm on-chain block inclusion.',
  },
  {
    q: 'Where are my products and order history stored?',
    a: 'All catalog items and order records are stored locally in your browser/device using localStorage. No centralized database or server holds your business data.',
  },
  {
    q: 'How do I accept both NIM and USDT?',
    a: 'Inside Nimiq Pay, your NIM address is automatically loaded via the Mini App SDK (listAccounts). You can also connect your Polygon address with one tap to give buyers the choice between native NIM or USDT on Polygon.',
  },
  {
    q: 'What happens if a buyer opens the order link outside Nimiq Pay?',
    a: 'The order link (#order=...) contains full transaction parameters. If opened in a regular web browser, the app prompts the user to open it inside Nimiq Pay or copy the payment details into their wallet.',
  },
  {
    q: 'Can multiple devices use the same stall?',
    a: 'Yes! When a merchant generates an order QR or share link, all order details (items, prices, merchant payout address) are encoded in the URL hash, allowing any buyer device to render the exact checkout screen.',
  },
];

// Interactive demo preview state
const demoCartCount = ref(2);
const demoTotalNim = ref(12.5);
</script>

<template>
  <div class="landing-container">
    <!-- Hero Section -->
    <section class="hero-section">
      <div class="hero-content">
        <div class="hero-badge" @click="emit('open-stall')">
          <span class="badge-dot"></span>
          <span class="badge-tag">Open Stall</span>
          <span class="badge-text">Point-of-Sale for Nimiq Pay ➔</span>
        </div>

        <h1 class="hero-title">
          Zero-Friction Crypto POS. <br />
          <span class="hero-gradient-text">Sell Anywhere with NIM & USDT.</span>
        </h1>

        <p class="hero-subtitle">
          Turn any smartphone or laptop into a decentralized checkout terminal in 30 seconds. Accept instant payments on the Nimiq and Polygon blockchains with zero middleman fees.
        </p>

        <div class="hero-actions">
          <button class="btn btn-primary btn-lg hero-cta-btn" type="button" @click="emit('open-stall')">
            <svg class="btn-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="9" cy="21" r="1"></circle>
              <circle cx="20" cy="21" r="1"></circle>
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
            </svg>
            <span>Open Stall Now</span>
          </button>

          <button class="btn btn-outline btn-lg" type="button" @click="emit('go-create')">
            <span>Configure Stall Menu</span>
          </button>
        </div>

        <div class="hero-metrics">
          <div class="metric-item">
            <span class="metric-value">0%</span>
            <span class="metric-label">Platform Fees</span>
          </div>
          <div class="metric-divider"></div>
          <div class="metric-item">
            <span class="metric-value">&lt; 1s</span>
            <span class="metric-label">QR Generation</span>
          </div>
          <div class="metric-divider"></div>
          <div class="metric-item">
            <span class="metric-value">2 Rails</span>
            <span class="metric-label">NIM & Polygon USDT</span>
          </div>
          <div class="metric-divider"></div>
          <div class="metric-item">
            <span class="metric-value">100%</span>
            <span class="metric-label">Self-Custodial</span>
          </div>
        </div>
      </div>

      <!-- Unique Interactive Setup Hero Mockup -->
      <div class="hero-preview-col">
        <div class="preview-terminal-card">
          <div class="terminal-header">
            <div class="terminal-dots">
              <span class="dot red"></span>
              <span class="dot yellow"></span>
              <span class="dot green"></span>
            </div>
            <div class="terminal-pill">
              <span class="live-dot"></span>
              <span>NimStall POS Terminal</span>
            </div>
            <span class="terminal-currency">NIM • USDT</span>
          </div>

          <div class="preview-stall-banner">
            <div>
              <span class="preview-badge">Active Stall</span>
              <h3 class="preview-stall-name">Sunset Artisan Roasters</h3>
              <p class="preview-stall-tagline">Specialty coffee & pastries on Nimiq rails</p>
            </div>
          </div>

          <div class="preview-items-grid">
            <div class="preview-item-card" @click="demoCartCount++; demoTotalNim += 5.5">
              <span class="preview-item-emoji">☕</span>
              <div class="preview-item-info">
                <span class="preview-item-name">Cold Brew Draft</span>
                <span class="preview-item-price">5.5 NIM <small>(~$0.35)</small></span>
              </div>
              <span class="preview-add-btn">+</span>
            </div>

            <div class="preview-item-card" @click="demoCartCount++; demoTotalNim += 7.0">
              <span class="preview-item-emoji">🥐</span>
              <div class="preview-item-info">
                <span class="preview-item-name">Butter Croissant</span>
                <span class="preview-item-price">7.0 NIM <small>(~$0.45)</small></span>
              </div>
              <span class="preview-add-btn">+</span>
            </div>
          </div>

          <div class="preview-cart-summary">
            <div class="preview-cart-row">
              <span>Cart items: <strong>{{ demoCartCount }}</strong></span>
              <span class="preview-total">{{ demoTotalNim.toFixed(1) }} NIM</span>
            </div>
            <button class="btn btn-primary btn-block btn-sm preview-checkout-btn" @click="emit('open-stall')">
              <span>Instant QR Checkout ➔</span>
            </button>
          </div>
        </div>
      </div>
    </section>

    <!-- The Story / Vision Flow -->
    <section class="story-section">
      <div class="section-badge-wrapper">
        <span class="section-mini-badge">Why NimStall</span>
      </div>
      <h2 class="section-heading">Traditional POS is Broken. NimStall Fixes It.</h2>
      <p class="section-intro">
        Card networks take 3% to 5% out of every transaction, hold your revenue for days, and require specialized hardware terminals. NimStall leverages Nimiq's browser-native blockchain to turn any smartphone or tablet into a direct payment terminal with zero middleman.
      </p>

      <div class="story-grid">
        <div class="story-card problem">
          <div class="story-icon">🚫</div>
          <h3>Traditional Card Terminals</h3>
          <ul>
            <li>3–5% swipe and interchange fees</li>
            <li>Costly proprietary hardware and lease contracts</li>
            <li>T+2 to T+5 settlement hold periods</li>
            <li>Chargeback risk and account freezing</li>
          </ul>
        </div>

        <div class="story-card solution">
          <div class="story-icon">⚡</div>
          <h3>NimStall On-Chain POS</h3>
          <ul>
            <li><strong>0% middleman fees</strong> — 100% P2P settlement</li>
            <li><strong>No hardware needed</strong> — runs in any mobile browser</li>
            <li><strong>Instant settlement</strong> directly into your Nimiq Pay wallet</li>
            <li><strong>Dual-currency</strong>: Native NIM + Polygon USDT support</li>
          </ul>
        </div>
      </div>
    </section>

    <!-- How It Works Section -->
    <section class="how-it-works-section">
      <div class="section-badge-wrapper">
        <span class="section-mini-badge">Simple 3-Step Flow</span>
      </div>
      <h2 class="section-heading">How NimStall Works</h2>
      <p class="section-intro">
        From opening your browser to accepting your first on-chain crypto payment in less than a minute.
      </p>

      <div class="steps-container">
        <div class="step-card">
          <div class="step-number">01</div>
          <div class="step-icon-wrapper">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M2 3h20"></path>
              <path d="M21 3v4a3 3 0 0 1-6 0 3 3 0 0 1-6 0 3 3 0 0 1-6 0V3"></path>
              <path d="M4 10v10a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V10"></path>
              <path d="M9 21v-6a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v6"></path>
            </svg>
          </div>
          <h3>Create Your Stall</h3>
          <p>
            Name your stall, add your products, and set pricing in NIM and USDT. Your merchant payout address is automatically pulled from Nimiq Pay.
          </p>
        </div>

        <div class="step-card">
          <div class="step-number">02</div>
          <div class="step-icon-wrapper">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="3" width="7" height="7"></rect>
              <rect x="14" y="3" width="7" height="7"></rect>
              <rect x="14" y="14" width="7" height="7"></rect>
              <rect x="3" y="14" width="7" height="7"></rect>
            </svg>
          </div>
          <h3>Ring Up & Generate QR</h3>
          <p>
            Add products to cart and tap Checkout. NimStall instantly creates a unique order QR code with the amount and order reference memo embedded.
          </p>
        </div>

        <div class="step-card">
          <div class="step-number">03</div>
          <div class="step-icon-wrapper">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
              <polyline points="9 12 11 14 15 10"></polyline>
            </svg>
          </div>
          <h3>Customer Pays On-Chain</h3>
          <p>
            Customer scans with Nimiq Pay or their phone camera, selects NIM or USDT, and confirms. The payment verifies live on the blockchain.
          </p>
        </div>
      </div>
    </section>

    <!-- How To Use Section -->
    <section class="how-to-use-section">
      <div class="section-badge-wrapper">
        <span class="section-mini-badge">User Guides</span>
      </div>
      <h2 class="section-heading">How To Use NimStall</h2>
      <p class="section-intro">
        Whether you are a merchant selling at a market or a buyer paying with your phone.
      </p>

      <div class="guide-split-grid">
        <div class="guide-card">
          <div class="guide-header">
            <span class="guide-role-badge merchant">Merchant Guide</span>
            <h3>Selling at Your Stall</h3>
          </div>
          <ol class="guide-steps">
            <li>
              <strong>Open in Nimiq Pay</strong>
              <span>Launch NimStall inside Nimiq Pay Mini Apps. Your merchant address auto-connects via <code>listAccounts()</code>.</span>
            </li>
            <li>
              <strong>Configure Your Menu</strong>
              <span>Head to <em>Stall Setup</em> to add products, adjust prices in-place, and connect Polygon USDT if you wish.</span>
            </li>
            <li>
              <strong>Ring Up Orders</strong>
              <span>On the <em>Sell & Cart</em> screen, tap products to add them to your cart and tap <em>Checkout</em>.</span>
            </li>
            <li>
              <strong>Present QR & Receive Funds</strong>
              <span>Show the generated payment QR to your customer. Once paid, the receipt status updates live to PAID.</span>
            </li>
          </ol>
        </div>

        <div class="guide-card">
          <div class="guide-header">
            <span class="guide-role-badge buyer">Customer Guide</span>
            <h3>Paying for Your Order</h3>
          </div>
          <ol class="guide-steps">
            <li>
              <strong>Scan the Order QR</strong>
              <span>Open your phone camera or Nimiq Pay QR scanner and scan the merchant's checkout QR code.</span>
            </li>
            <li>
              <strong>Review Order Summary</strong>
              <span>Verify the stall name, items list, and total payable in NIM and USDT equivalent.</span>
            </li>
            <li>
              <strong>Choose Payment Rail</strong>
              <span>Tap <em>NIM (Nimiq)</em> for native zero-fee transfer or <em>USDT (Polygon)</em> for stablecoin settlement.</span>
            </li>
            <li>
              <strong>1-Tap Confirmation</strong>
              <span>Confirm the transaction in Nimiq Pay. The receipt is verified on-chain and saved in your order history.</span>
            </li>
          </ol>
        </div>
      </div>
    </section>

    <!-- FAQ Section -->
    <section class="faq-section">
      <div class="section-badge-wrapper">
        <span class="section-mini-badge">Frequently Asked Questions</span>
      </div>
      <h2 class="section-heading">Everything You Need to Know</h2>

      <div class="faq-accordion">
        <div
          v-for="(faq, idx) in faqs"
          :key="idx"
          class="faq-item"
          :class="{ active: openFaq === idx }"
          @click="toggleFaq(idx)"
        >
          <div class="faq-question">
            <span>{{ faq.q }}</span>
            <span class="faq-toggle">{{ openFaq === idx ? '−' : '+' }}</span>
          </div>
          <div v-show="openFaq === idx" class="faq-answer">
            <p>{{ faq.a }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Bottom CTA Banner -->
    <section class="cta-banner-section">
      <div class="cta-banner-card">
        <h2>Ready to Launch Your Live Stall?</h2>
        <p>Start accepting peer-to-peer crypto payments in Nimiq Pay today. No credit cards, no KYC, no waiting.</p>
        <div class="cta-buttons">
          <button class="btn btn-primary btn-lg" type="button" @click="emit('open-stall')">
            Open Your Stall Now ➔
          </button>
          <button class="btn btn-outline btn-lg" type="button" @click="emit('go-create')">
            Stall Setup
          </button>
        </div>
      </div>
    </section>

    <!-- Comprehensive Footer -->
    <footer class="landing-footer">
      <div class="footer-container">
        <div class="footer-brand-col">
          <div class="footer-brand">
            <img src="/logo.png" alt="NimStall Logo" class="footer-logo" />
            <span class="footer-brand-name">NimStall</span>
          </div>
          <p class="footer-tagline">
            Decentralized Point-of-Sale built for Nimiq Pay Mini Apps and Polygon EVM rails.
          </p>
          <div class="footer-contributor-tag">
            <span>Created by <strong>Datwebguy</strong></span>
          </div>
        </div>

        <div class="footer-links-col">
          <span class="footer-heading">Product</span>
          <a href="#sell" @click.prevent="emit('open-stall')">Open Stall</a>
          <a href="#create" @click.prevent="emit('go-create')">Stall Setup</a>
          <a href="#orders">Order History</a>
        </div>

        <div class="footer-links-col">
          <span class="footer-heading">Ecosystem</span>
          <a href="https://nimiq.com" target="_blank" rel="noopener">Nimiq Network</a>
          <a href="https://nimiq.dev/mini-apps" target="_blank" rel="noopener">Nimiq Mini Apps</a>
          <a href="https://polygon.technology" target="_blank" rel="noopener">Polygon PoS</a>
        </div>

        <div class="footer-links-col">
          <span class="footer-heading">Open Source</span>
          <a href="https://github.com/Datwebguy/nimstall" target="_blank" rel="noopener">GitHub Repository</a>
          <a href="https://github.com/Datwebguy" target="_blank" rel="noopener">@Datwebguy Profile</a>
        </div>
      </div>

      <div class="footer-bottom-bar">
        <span>© 2026 NimStall. Built with Nimiq Mini App SDK. All rights reserved.</span>
        <span class="footer-network-status">● Nimiq & Polygon Mainnet Ready</span>
      </div>
    </footer>
  </div>
</template>
